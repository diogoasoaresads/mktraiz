const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('data/db.sqlite');

db.serialize(() => {
    db.all('SELECT id FROM media_assets WHERE external_code IS NULL LIMIT 10', (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        
        rows.forEach(row => {
            const code = 'F' + row.id.substring(0, 4);
            db.run('UPDATE media_assets SET external_code = ? WHERE id = ?', [code, row.id]);
            console.log(`Updated ${row.id} with code ${code}`);
        });
        
        db.close();
    });
});
