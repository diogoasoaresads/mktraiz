const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function migrate() {
    const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
    console.log('Connecting to database at:', dbPath);

    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    console.log('Checking units table...');
    const unitColumns = await db.all("PRAGMA table_info(units)");

    let changed = false;
    if (!unitColumns.find(c => c.name === 'lat')) {
        console.log('Adding lat to units...');
        await db.run("ALTER TABLE units ADD COLUMN lat REAL");
        changed = true;
    }
    if (!unitColumns.find(c => c.name === 'lng')) {
        console.log('Adding lng to units...');
        await db.run("ALTER TABLE units ADD COLUMN lng REAL");
        changed = true;
    }

    if (changed) {
        console.log('Migration successful: Columns added.');
    } else {
        console.log('No migration needed: Columns already exist.');
    }

    await db.close();
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
