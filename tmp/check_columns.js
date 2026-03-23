const sqlite3 = require('sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
const db = new sqlite3.Database(dbPath);

db.all("PRAGMA table_info(hub_request_history)", (err, rows) => {
    if (err) {
        console.error(err);
        process.exit(1);
    }
    console.log(JSON.stringify(rows, null, 2));
    db.close();
});
