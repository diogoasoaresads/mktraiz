const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/db.sqlite');

// Replicate the same logic from the API
function detectCoordIssue(lat, lng) {
    if (!isFinite(lat) || !isFinite(lng)) return 'Coordenada invalida';
    if (Math.abs(lng) > 180) return `Longitude fora do range valido (${lng})`;
    if (Math.abs(lat - lng) < 0.0001) return 'Lat e lng identicas';
    if (lat > 0) return `Latitude positiva (${lat})`;
    if (lng > 0) return `Longitude positiva (${lng})`;
    if (lat < -35.0 || lat > -3.5) return `Latitude fora do Brasil (${lat})`;
    if (lng < -74.0 || lng > -28.0) return `Longitude fora do Brasil (${lng})`;
    return null;
}

db.all(
    `SELECT id, address_raw, city, lat, lng FROM media_assets WHERE lat IS NOT NULL AND status='active' LIMIT 500`,
    (err, rows) => {
        if (err) { console.error(err); db.close(); return; }
        
        const suspects = rows.filter(r => detectCoordIssue(Number(r.lat), Number(r.lng)));
        console.log(`Total assets: ${rows.length}`);
        console.log(`Suspects detected: ${suspects.length}`);
        suspects.forEach(r => {
            const issue = detectCoordIssue(Number(r.lat), Number(r.lng));
            console.log(` - ${r.city}: lat=${r.lat}, lng=${r.lng} => ${issue}`);
            console.log(`   (${r.address_raw.substring(0, 60)})`);
        });
        db.close();
    }
);
