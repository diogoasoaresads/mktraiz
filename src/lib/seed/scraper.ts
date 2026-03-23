import { parse } from 'node-html-parser';
import getDb from '../db';
import { v4 as uuidv4 } from 'uuid';
import { searchUnitsInOSM } from './search-provider';

interface ScrapedUnit {
    unit_name?: string;
    address_raw: string;
    city?: string;
    state?: string;
}

const UNIT_PAGE_PATTERNS = [
    '/unidades',
    '/nossas-unidades',
    '/contato',
    '/enderecos',
    '/onde-estamos'
];

export async function scrapeUnitsForBrand(schoolId: string, website: string) {
    const db = await getDb();
    const url = website ? (website.startsWith('http') ? website : `https://${website}`) : null;

    try {
        // 0. Get Brand Name for Search
        const school = await db.get('SELECT brand_name FROM schools WHERE id = ?', [schoolId]);
        const brandName = school?.brand_name || website;

        console.log(`Starting Hybrid Sync for ${brandName}...`);

        const allUnits: (ScrapedUnit & { lat?: number, lng?: number })[] = [];

        // 1. WEB SCRAPING (Optional/Legacy)
        if (url) {
            try {
                const response = await fetch(url);
                const html = await response.text();
                const root = parse(html);

                let unitsUrl = url;
                const links = root.querySelectorAll('a');
                for (const link of links) {
                    const href = link.getAttribute('href');
                    if (href && UNIT_PAGE_PATTERNS.some(p => href.toLowerCase().includes(p))) {
                        unitsUrl = href.startsWith('http') ? href : new URL(href, url).toString();
                        break;
                    }
                }

                const unitsResponse = await fetch(unitsUrl);
                const unitsHtml = await unitsResponse.text();
                const unitsRoot = parse(unitsHtml);

                const candidates = unitsRoot.querySelectorAll('p, div, address, li');
                for (const el of candidates) {
                    const text = el.text.trim();
                    if (text.length > 20 && (text.includes('Rua') || text.includes('Av.') || text.includes('Avenida') || text.includes('CEP'))) {
                        if (/\d+/.test(text)) {
                            allUnits.push({ address_raw: text });
                        }
                    }
                }
            } catch (err) {
                console.warn(`Web Scraping failed for ${website}, continuing with Search...`, err);
            }
        }

        // 2. PUBLIC SEARCH SYNC (OSM / Overpass)
        try {
            console.log(`Searching OSM for ${brandName}...`);
            const osmResults = await searchUnitsInOSM(brandName);
            for (const res of osmResults) {
                allUnits.push({
                    unit_name: res.name,
                    address_raw: res.address,
                    lat: res.lat,
                    lng: res.lng,
                    city: res.city,
                    state: res.state
                });
            }
        } catch (err) {
            console.error('OSM Search failed:', err);
        }

        // 3. Deduplicate and save
        const normalize = (addr: string) => addr
            .toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/endereco:|ola,|tudo bem\?|seja bem-vindo|estamos localizados na|unidade:|logradouro:/gi, '')
            .replace(/\(\d{2}\)\s?\d{4,5}-?\d{4}/g, '')
            .replace(/cep:\s?\d{5}-?\d{3}/gi, '')
            .replace(/[^\w\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const seenNorms = new Set<string>();
        const uniqueUnits: (ScrapedUnit & { lat?: number, lng?: number })[] = [];

        for (const u of allUnits) {
            const norm = normalize(u.address_raw);
            if (norm.length < 15) continue;

            let isDuplicate = false;
            for (const existing of Array.from(seenNorms)) {
                if (norm.includes(existing) || existing.includes(norm)) {
                    isDuplicate = true;
                    break;
                }
            }

            if (!isDuplicate) {
                seenNorms.add(norm);
                uniqueUnits.push(u);
            }
        }

        if (uniqueUnits.length === 0) {
            await db.run('UPDATE schools SET units_status = ? WHERE id = ?', ['units_missing', schoolId]);
            return;
        }

        for (const unit of uniqueUnits) {
            const addressNormalized = normalize(unit.address_raw);

            await db.run(`
                INSERT INTO units (
                    id, school_id, unit_name, address_raw, address_normalized, 
                    lat, lng, city, state, geocode_status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(school_id, address_normalized, unit_name) DO UPDATE SET
                    lat = COALESCE(excluded.lat, units.lat),
                    lng = COALESCE(excluded.lng, units.lng),
                    geocode_status = CASE WHEN excluded.lat IS NOT NULL THEN 'success' ELSE units.geocode_status END
            `, [
                uuidv4(),
                schoolId,
                unit.unit_name || 'Unidade',
                unit.address_raw,
                addressNormalized,
                unit.lat || null,
                unit.lng || null,
                unit.city || null,
                unit.state || null,
                unit.lat ? 'success' : 'pending'
            ]);
        }

        await db.run('UPDATE schools SET units_status = ? WHERE id = ?', ['seeded_ok', schoolId]);
        console.log(`Successfully synced ${uniqueUnits.length} units for ${brandName}`);

    } catch (error) {
        console.error(`Error syncing ${website}:`, error);
        await db.run('UPDATE schools SET units_status = ? WHERE id = ?', ['seed_error', schoolId]);
    }
}
