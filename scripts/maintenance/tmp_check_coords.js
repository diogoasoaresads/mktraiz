const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/db.sqlite');

db.all("SELECT id, address_raw, lat, lng, geocode_status FROM media_assets WHERE lat IS NOT NULL AND lng IS NOT NULL AND geocode_status != 'success' LIMIT 20", (err, rows) => {
    if (err) console.error(err);
    else console.log('Assets with coordinates but not success:', JSON.stringify(rows, null, 2));
    db.close();
});
