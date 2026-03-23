const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'data', 'db.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Connecting to database at:', dbPath);

db.serialize(() => {
    db.run("ALTER TABLE campaigns ADD COLUMN budget_mode TEXT DEFAULT 'total'", (err) => {
        if (err) {
            if (err.message.includes('duplicate column name')) {
                console.log('Column "budget_mode" already exists in "campaigns" table.');
            } else {
                console.error('Error adding column:', err.message);
            }
        } else {
            console.log('Column "budget_mode" successfully added to "campaigns" table.');
        }
    });

    // Update schema.sql as well for new installs
    const fs = require('fs');
    const schemaPath = path.join(__dirname, 'src', 'lib', 'db', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
        let schema = fs.readFileSync(schemaPath, 'utf8');
        if (!schema.includes('budget_mode')) {
            schema = schema.replace(
                'status TEXT NOT NULL DEFAULT \'draft\',',
                'budget_mode TEXT DEFAULT \'total\', -- total | equal_per_unit\n    status TEXT NOT NULL DEFAULT \'draft\','
            );
            fs.writeFileSync(schemaPath, schema);
            console.log('schema.sql updated with budget_mode.');
        }
    }
});

db.close();
