import getDb from './db';
import crypto from 'crypto';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Clean address for better geocoding hits
 * Removes common OOH descriptors that confuse Nominatim
 */
export function cleanAddressForGeocoding(address: string): string {
    if (!address) return '';

    let clean = address;

    // Remove content in parentheses (sentido centro, lado par, etc)
    clean = clean.replace(/\([^)]*\)/g, ' ');

    // Replace " X " or " esquina com " with comma to indicate intersection for some geocoders
    // but for Nominatim, often the first street + city works better. 
    // Let's try to keep both streets but simpler.
    clean = clean.replace(/(\s+X\s+|\s+esquina\s+com\s+|\s+esq\.\s+com\s+|\s+esq\s+)/gi, ', ');

    // Remove noisy terms
    const noise = [
        /lado\s+oposto/gi,
        /S\/N/gi,
        /s\/nº/gi,
        /nº\s+/gi,
        /frente\s+ao/gi,
        /p[eé]rto\s+de/gi,
        /pr[óo]ximo\s+ao/gi,
        /altura\s+do/gi,
        /km\s+\d+/gi
    ];

    noise.forEach(regex => {
        clean = clean.replace(regex, ' ');
    });

    // Clean up multiple spaces and trailing commas
    clean = clean.replace(/\s*,+\s*/g, ', ').replace(/\s+/g, ' ').trim();

    return clean;
}

/**
 * Basic Geocoding Service using Nominatim (OpenStreetMap)
 * Now with persistent cache in SQLite
 */
export async function geocodeAddress(address: string) {
    const db = await getDb();

    // 1. Generate hash for the address to use as cache key
    const hash = crypto.createHash('sha256').update(address.toLowerCase().trim()).digest('hex');

    try {
        // 2. Check cache first
        const cached = await db.get('SELECT * FROM geocoding_cache WHERE address_hash = ?', [hash]);
        if (cached) {
            console.log(`Cache hit for: ${address}`);
            return {
                lat: cached.lat,
                lng: cached.lng,
                confidence: cached.confidence,
                place_id: cached.place_id,
                status: 'success',
                cached: true
            };
        }

        console.log(`Geocoding address (API call): ${address}`);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=br&limit=1`, {
            headers: {
                'User-Agent': 'OOHPlannerRaiz/1.0'
            }
        });

        if (!response.ok) {
            console.error(`Nominatim API returned status: ${response.status}`);
            return { status: 'error' };
        }

        const data = await response.json();

        if (data && data.length > 0) {
            const result = {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon),
                confidence: 1.0,
                place_id: data[0].place_id.toString(),
                status: 'success'
            };

            // 3. Save to cache
            await db.run(`
                INSERT INTO geocoding_cache (address_hash, address_raw, lat, lng, confidence, provider, place_id)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [hash, address, result.lat, result.lng, result.confidence, 'nominatim', result.place_id]);

            return result;
        }

        console.warn(`No results for: ${address}`);
        return { status: 'error' };
    } catch (error) {
        console.error('Geocoding Error:', error);
        return { status: 'error' };
    }
}

/**
 * Process pending geocoding items in the database
 */
export async function processGeocodingQueue() {
    const db = await getDb();

    try {
        // Process units
        const pendingUnits = await db.all('SELECT * FROM units WHERE geocode_status = "pending" LIMIT 10');
        console.log(`Found ${pendingUnits.length} pending units`);
        for (const unit of pendingUnits) {
            // Priority: if it already has coordinates, just set to success
            if (unit.lat && unit.lng) {
                await db.run('UPDATE units SET geocode_status = "success" WHERE id = ?', [unit.id]);
                continue;
            }

            const cleanAddress = cleanAddressForGeocoding(unit.address_raw);
            const addressParts = [cleanAddress, unit.city, unit.state, 'Brasil'].filter(Boolean);
            const fullAddress = addressParts.join(', ').replace(/,\s*,/g, ',');

            await sleep(1100); // Respect Nominatim 1 request/s limit
            const result = await geocodeAddress(fullAddress);
            if (result.status === 'success') {
                await db.run(`
                    UPDATE units SET 
                        lat = ?, lng = ?, geocode_status = ?, geocode_confidence = ?, geocode_place_id = ?
                    WHERE id = ?
                `, [result.lat, result.lng, result.status, result.confidence, result.place_id, unit.id]);
            } else {
                await db.run('UPDATE units SET geocode_status = "error" WHERE id = ?', [unit.id]);
            }
        }

        // Process media assets
        // First check if media_assets table exists and has pending items
        const pendingAssets = await db.all('SELECT * FROM media_assets WHERE geocode_status = "pending" LIMIT 10');
        console.log(`Found ${pendingAssets.length} pending assets`);
        for (const asset of pendingAssets) {
            // Priority: if it already has coordinates, just set to success
            if (asset.lat && asset.lng) {
                await db.run('UPDATE media_assets SET geocode_status = "success" WHERE id = ?', [asset.id]);
                continue;
            }

            const cleanAddress = cleanAddressForGeocoding(asset.address_raw);
            const addressParts = [cleanAddress, asset.city, asset.state, 'Brasil'].filter(Boolean);
            const fullAddress = addressParts.join(', ').replace(/,\s*,/g, ',');

            await sleep(1100); // Respect Nominatim 1 request/s limit
            const result = await geocodeAddress(fullAddress);
            if (result.status === 'success') {
                await db.run(`
                    UPDATE media_assets SET 
                        lat = ?, lng = ?, geocode_status = ?, geocode_confidence = ?
                    WHERE id = ?
                `, [result.lat, result.lng, result.status, result.confidence, asset.id]);
            } else {
                await db.run('UPDATE media_assets SET geocode_status = "error" WHERE id = ?', [asset.id]);
            }
        }
    } catch (err) {
        console.error('Queue Processing Error:', err);
        throw err;
    }
}
