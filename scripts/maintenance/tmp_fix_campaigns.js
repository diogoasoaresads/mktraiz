const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function fixCampaigns() {
    const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    await db.run('UPDATE campaigns SET allowed_types = "[]"');
    console.log('Campaigns updated successfully to allow all media types by default.');
    await db.close();
}

fixCampaigns().catch(console.error);
