const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const crypto = require('crypto');

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function getGeographicMetrics(lat, lng) {
    const hash = Math.abs(Math.sin(lat * 12.9898 + lng * 78.233)) * 43758.5453;
    const deterministicRandom = hash - Math.floor(hash);
    const income = Math.floor(deterministicRandom * 10000) + 1500;
    const population = Math.floor((1 - deterministicRandom) * 10000) + 500;
    const flowHash = Math.abs(Math.cos(lat * 45.123 + lng * 12.345)) * 98765.123;
    const flow_index = flowHash - Math.floor(flowHash);
    return { income, population, flow_index };
}

async function testRecommendationLogic() {
    const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const campaignId = 'e2bef830-e9a9-4a3a-8ace-75a353c995a0';
    console.log(`Campaign ID: ${campaignId}`);

    const campaign = await db.get('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
    const scenarios = await db.all('SELECT * FROM scenarios WHERE campaign_id = ?', [campaignId]);

    if (scenarios.length === 0) {
        console.log("No scenario found.");
        return;
    }
    const scenario = scenarios[0];
    const scenarioId = scenario.id;

    console.log("Budget Curve:", scenario.budget_curve);

    const weights = {};
    const allowedTypes = JSON.parse(campaign.allowed_types || '[]');
    const targetSchoolIds = JSON.parse(campaign.target_school_ids || '[]');

    let units = await db.all(`SELECT * FROM units WHERE school_id IN (${targetSchoolIds.map(() => '?').join(',')}) AND is_active = 1`, targetSchoolIds);
    let query = 'SELECT a.*, v.name as vendor_name FROM media_assets a JOIN vendors v ON a.vendor_id = v.id WHERE a.status = "active" AND a.lat IS NOT NULL AND a.lng IS NOT NULL';
    const params = [];
    if (allowedTypes.length > 0) {
        query += ` AND a.type IN (${allowedTypes.map(() => '?').join(',')})`;
        params.push(...allowedTypes);
    }
    const assets = await db.all(query, params);

    const allPossibleRecommendations = [];
    const radiusKm = 5;

    for (const unit of units) {
        for (const asset of assets) {
            const distance = calculateDistance(unit.lat, unit.lng, asset.lat, asset.lng);
            if (distance <= radiusKm) {
                const normDistance = Math.min(distance / radiusKm, 1);
                const metrics = getGeographicMetrics(asset.lat, asset.lng);
                const normIncome = Math.min(metrics.income / 10000, 1);
                const normPop = Math.min(metrics.population / 10000, 1);
                const flow = metrics.flow_index;
                const score = (1 - normDistance) * 0.35 + (normIncome) * 0.15 + (normPop) * 0.10 + (flow) * 0.15 + 0.15;

                allPossibleRecommendations.push({
                    asset_id: asset.id,
                    distance_km: distance,
                    score_final: Math.max(0, Math.min(1, score)),
                    unit_price: asset.base_price || 0,
                    start_date: campaign.start_date,
                    end_date: campaign.end_date
                });
            }
        }
    }

    allPossibleRecommendations.sort((a, b) => b.score_final - a.score_final);

    const curve = JSON.parse(scenario.budget_curve || '{}');
    const c_budget = campaign.budget || 0;
    const budgetPools = {};
    let hasCurve = false;

    if (c_budget > 0 && Object.keys(curve).length > 0) {
        for (const [mKey, pct] of Object.entries(curve)) {
            if (pct > 0) {
                budgetPools[mKey] = (pct / 100) * c_budget;
                hasCurve = true;
            }
        }
    }

    const finalRecommendations = [];
    const assetAllocations = new Map();

    for (const rec of allPossibleRecommendations) {
        const cost = rec.unit_price;
        if (hasCurve) {
            let bestMonth = null;
            let maxAvailable = -1;

            for (const [mKey, available] of Object.entries(budgetPools)) {
                const allocs = assetAllocations.get(rec.asset_id) || [];
                if (!allocs.includes(mKey) && available >= cost && available > maxAvailable) {
                    maxAvailable = available;
                    bestMonth = mKey;
                }
            }

            if (bestMonth) {
                budgetPools[bestMonth] -= cost;
                const allocs = assetAllocations.get(rec.asset_id) || [];
                allocs.push(bestMonth);
                assetAllocations.set(rec.asset_id, allocs);
                finalRecommendations.push(Object.assign({}, rec, { allocated_month: bestMonth }));
            }
        } else {
            finalRecommendations.push(rec);
        }
    }

    console.log(`Generated ${finalRecommendations.length} recommendations. Output pools state:`);
    console.log(budgetPools);

    await db.close();
}

testRecommendationLogic().catch(console.error);
