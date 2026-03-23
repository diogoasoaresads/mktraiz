const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

async function debug() {
    const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const campaignId = 'e2bef830-e9a9-4a3a-8ace-75a353c995a0';
    console.log(`Campaign ID: ${campaignId}`);

    const campaign = await db.get('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
    console.log('Campaign Setup:', {
        id: campaign?.id,
        name: campaign?.name,
        target_school_ids: campaign?.target_school_ids,
        target_unit_ids: campaign?.target_unit_ids,
        allowed_types: campaign?.allowed_types
    });

    if (campaign) {
        const targetSchoolIds = JSON.parse(campaign.target_school_ids || '[]');
        const targetUnitIds = JSON.parse(campaign.target_unit_ids || '[]');

        let units = [];
        if (targetUnitIds.length > 0) {
            units = await db.all(`SELECT id, unit_name, lat, lng FROM units WHERE id IN (${targetUnitIds.map(() => '?').join(',')})`, targetUnitIds);
            console.log(`Found ${units.length} target units by ID.`);
        } else if (targetSchoolIds.length > 0) {
            units = await db.all(`SELECT id, unit_name, lat, lng FROM units WHERE school_id IN (${targetSchoolIds.map(() => '?').join(',')}) AND is_active = 1`, targetSchoolIds);
            console.log(`Found ${units.length} target units by School ID (active only).`);
        }

        const allowedTypes = JSON.parse(campaign.allowed_types || '[]');
        let query = 'SELECT id, type, lat, lng FROM media_assets WHERE status = "active" AND lat IS NOT NULL AND lng IS NOT NULL';
        const params = [];
        if (allowedTypes.length > 0) {
            query += ` AND type IN (${allowedTypes.map(() => '?').join(',')})`;
            params.push(...allowedTypes);
        }
        const assets = await db.all(query, params);
        console.log(`Found ${assets.length} eligible assets.`);
    }

    const planLines = await db.all('SELECT COUNT(*) as count FROM plan_lines WHERE campaign_id = ?', [campaignId]);
    console.log(`Lines generated for campaign: ${planLines[0].count}`);

    await db.close();
}

debug().catch(console.error);
