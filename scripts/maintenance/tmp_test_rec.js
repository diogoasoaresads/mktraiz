const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function testRecommendation() {
    const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const campaignId = 'e2bef830-e9a9-4a3a-8ace-75a353c995a0';
    console.log(`Campaign ID: ${campaignId}`);

    const scenarios = await db.all('SELECT * FROM scenarios WHERE campaign_id = ?', [campaignId]);
    if (scenarios.length === 0) {
        console.log("No scenario found.");
        return;
    }
    const scenarioId = scenarios[0].id;

    // Call POST function directly using native fetch since next server isn't running?
    // Actually simpler: just inspect what's inside the DB after I trigger it if I could.
    // Let's manually run the POST logic to see the resulting DB changes:

    // I will mock the req and call the POST function (since it is a Next route it might be hard to import directly due to env).
    const planLinesPre = await db.all('SELECT * FROM plan_lines WHERE scenario_id = ?', [scenarioId]);
    console.log(`Pre-test: ${planLinesPre.length} lines`);

    await db.close();
}

testRecommendation().catch(console.error);
