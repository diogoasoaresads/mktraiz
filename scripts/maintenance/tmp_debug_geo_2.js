const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/db.sqlite');

db.all("SELECT DISTINCT geocode_status FROM media_assets", (err, rows) => {
    if (err) console.error(err);
    else console.log('Distinct statuses:', rows);

    db.all("SELECT address_raw, city, state, geocode_status FROM media_assets LIMIT 5", (err2, rows2) => {
        if (err2) console.error(err2);
        else console.log('First 5 assets:', JSON.stringify(rows2, null, 2));
        db.close();
    });
});
