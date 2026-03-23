const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function debugAssets() {
    const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const activeAssets = await db.all('SELECT type, status, count(*) as count, sum(case when lat is not null and lng is not null then 1 else 0 end) as with_coords FROM media_assets GROUP BY type, status');
    console.log('Media Assets Summary:');
    console.table(activeAssets);

    await db.close();
}

debugAssets().catch(console.error);
