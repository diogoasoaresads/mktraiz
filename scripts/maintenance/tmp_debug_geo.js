const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/db.sqlite');

console.log('--- ERROR SAMPLES ---');
db.all("SELECT address_raw, city, state, geocode_status FROM media_assets WHERE geocode_status = 'error' LIMIT 10", (err, rows) => {
    if (err) console.error(err);
    else console.log(JSON.stringify(rows, null, 2));

    console.log('\n--- PENDING SAMPLES ---');
    db.all("SELECT address_raw, city, state, geocode_status FROM media_assets WHERE geocode_status = 'pending' LIMIT 20", (err2, rows2) => {
        if (err2) console.error(err2);
        else console.log(JSON.stringify(rows2, null, 2));

        db.close();
    });
});
