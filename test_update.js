const sqlite3 = require('sqlite3');
const dbInstance = new sqlite3.Database('./data/db.sqlite');

// Promote db to have 'run', 'all', 'get' as promises for easier testing
const db = {
    run: (sql, params = []) => new Promise((resolve, reject) => {
        dbInstance.run(sql, params, function(err) {
            if (err) reject(err);
            else resolve(this);
        });
    }),
    all: (sql, params = []) => new Promise((resolve, reject) => {
        dbInstance.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    }),
    get: (sql, params = []) => new Promise((resolve, reject) => {
        dbInstance.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    }),
    close: () => dbInstance.close()
};

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function detectCoordIssue(lat, lng) {
    if (!isFinite(lat) || !isFinite(lng)) return 'Coordenada inválida';
    if (Math.abs(lng) > 180) return `Longitude absurda (${lng})`;
    if (Math.abs(lat - lng) < 0.0001) return 'Identicas';
    if (lat > 0) return 'Lat positiva';
    if (lng > 0) return 'Lng positiva';
    if (lat < -35.0 || lat > -3.5) return 'Lat fora BR';
    if (lng < -74.0 || lng > -28.0) return 'Lng fora BR';
    return null;
}

async function runTest() {
    console.log('--- STARTING VALIDATION TEST ---');
    try {
        await db.run('ALTER TABLE media_assets ADD COLUMN geocode_suspect INTEGER DEFAULT 0').catch(() => {});
        
        const assets = await db.all("SELECT id, city, state, lat, lng, geocode_confidence FROM media_assets WHERE lat IS NOT NULL AND status = 'active'");
        console.log(`Assets found: ${assets.length}`);

        const cityGroups = {};
        for (const a of assets) {
            const lat = Number(a.lat), lng = Number(a.lng);
            if (detectCoordIssue(lat, lng)) continue;
            const key = `${String(a.city || '').toLowerCase().trim()}|${String(a.state || '').toLowerCase().trim()}`;
            if (key !== '|') {
                if (!cityGroups[key]) cityGroups[key] = [];
                cityGroups[key].push({ lat, lng });
            }
        }

        const cityCentroids = {};
        for (const [key, pts] of Object.entries(cityGroups)) {
            const lats = pts.map(p => p.lat).sort((a, b) => a - b);
            const lngs = pts.map(p => p.lng).sort((a, b) => a - b);
            const mid = Math.floor(pts.length / 2);
            cityCentroids[key] = {
                lat: pts.length % 2 === 0 ? (lats[mid - 1] + lats[mid]) / 2 : lats[mid],
                lng: pts.length % 2 === 0 ? (lngs[mid - 1] + lngs[mid]) / 2 : lngs[mid],
            };
        }

        let suspectCount = 0;
        for (const asset of assets) {
            const lat = Number(asset.lat), lng = Number(asset.lng);
            const issue = detectCoordIssue(lat, lng);
            const lowConf = (asset.geocode_confidence != null ? Number(asset.geocode_confidence) : 1) < 0.4;
            
            let isSuspect = false;
            if (issue || lowConf) isSuspect = true;
            else {
                const key = `${String(asset.city || '').toLowerCase().trim()}|${String(asset.state || '').toLowerCase().trim()}`;
                const centroid = cityCentroids[key];
                if (centroid && haversineKm(lat, lng, centroid.lat, centroid.lng) > 80) isSuspect = true;
            }

            if (isSuspect) {
                await db.run('UPDATE media_assets SET geocode_suspect = 1 WHERE id = ?', [asset.id]);
                suspectCount++;
            } else {
                await db.run('UPDATE media_assets SET geocode_suspect = 0 WHERE id = ?', [asset.id]);
            }
        }

        console.log(`Updated suspects count: ${suspectCount}`);

        // Verify with SELECT
        const verify = await db.get("SELECT COUNT(*) as suspects FROM media_assets WHERE geocode_suspect = 1");
        console.log(`Database count for geocode_suspect=1: ${verify.suspects}`);

    } catch (e) {
        console.error(e);
    } finally {
        db.close();
    }
}

runTest();
