import getDb from './src/lib/db';
import { geocodeAddress } from './src/lib/geocoding';

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function runAll() {
    const db = await getDb();

    // Reset all statuses first to ensure a full recalculation
    await db.run('UPDATE units SET geocode_status = "pending"');
    await db.run('UPDATE media_assets SET geocode_status = "pending"');
    console.log("Reset geocode statuses to 'pending'.");

    // Process units
    let pendingUnits = await db.all('SELECT * FROM units WHERE geocode_status = "pending" OR geocode_status = "error"');
    console.log(`Found ${pendingUnits.length} pending units`);

    for (const unit of pendingUnits) {
        const addressParts = [unit.address_raw, unit.city, unit.state, 'Brasil'].filter(Boolean);
        const fullAddress = addressParts.join(', ').replace(/,\s*,/g, ',');
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
        await delay(1100); // 1.1s delay for Nominatim
    }

    // Process media assets
    let pendingAssets = await db.all('SELECT * FROM media_assets WHERE geocode_status = "pending" OR geocode_status = "error"');
    console.log(`Found ${pendingAssets.length} pending assets`);

    for (const asset of pendingAssets) {
        const addressParts = [asset.address_raw, asset.city, asset.state, 'Brasil'].filter(Boolean);
        const fullAddress = addressParts.join(', ').replace(/,\s*,/g, ',');
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
        await delay(1100);
    }

    console.log("All geocoding complete.");
}

runAll();
