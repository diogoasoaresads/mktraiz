const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./data/db.sqlite');

db.all('SELECT geocode_status, COUNT(*) as count FROM media_assets GROUP BY geocode_status', (err, rows) => {
    if (err) console.error(err);
    else console.log('Status Counts:', rows);
    db.close();
});
