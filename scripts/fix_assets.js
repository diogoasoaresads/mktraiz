const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'db.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Connecting to', dbPath);

db.all('SELECT id, city FROM media_assets WHERE lat IS NULL OR lng IS NULL', [], (err, rows) => {
    if (err) {
        console.error('Error fetching assets:', err);
        return;
    }

    console.log(`Found ${rows.length} assets without coordinates.`);

    if (rows.length === 0) {
        db.close();
        return;
    }

    let count = 0;

    // Base coordinates for Rio de Janeiro roughly around the units
    const baseLat = -22.9068;
    const baseLng = -43.1729;

    rows.forEach(row => {
        // Randomize slightly around RJ
        const lat = baseLat + (Math.random() - 0.5) * 0.4;
        const lng = baseLng + (Math.random() - 0.5) * 0.4;

        db.run('UPDATE media_assets SET lat = ?, lng = ? WHERE id = ?', [lat, lng, row.id], (err2) => {
            if (err2) {
                console.error('Update error:', err2);
            }
            count++;
            if (count === rows.length) {
                console.log(`Updated ${count} assets with mock coordinates.`);
                db.close();
            }
        });
    });
});
