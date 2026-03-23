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

function getPoiMetrics(lat, lng) {
    const rand1 = Math.abs(Math.sin(lat * 11.11 + lng * 22.22)) * 33.33;
    const shopping_distance = (rand1 - Math.floor(rand1)) * 3.45 + 0.05;
    const rand2 = Math.abs(Math.cos(lat * 33.33 + lng * 44.44)) * 55.55;
    const transit_distance = (rand2 - Math.floor(rand2)) * 3.45 + 0.05;
    const rand3 = Math.abs(Math.sin(lat * 55.55 + lng * 66.66)) * 77.77;
    const school_distance = (rand3 - Math.floor(rand3)) * 3.45 + 0.05;
    return { shopping_distance, transit_distance, school_distance };
}

async function testAdvancedRecommendationLogic() {
    const dbPath = path.join(process.cwd(), 'data', 'db.sqlite');
    const db = await open({
        filename: dbPath,
        driver: sqlite3.Database
    });

    const campaignId = 'e2bef830-e9a9-4a3a-8ace-75a353c995a0';
    console.log(`Campaign ID: ${campaignId}`);

    const campaign = await db.get('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
    const scenarios = await db.all('SELECT * FROM scenarios WHERE campaign_id = ?', [campaignId]);

    if (scenarios.length === 0) return;
    const scenario = scenarios[0];

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

                const pois = getPoiMetrics(asset.lat, asset.lng);
                const scoreShopping = Math.max(0, 1 - (pois.shopping_distance / 3.5));
                const scoreTransit = Math.max(0, 1 - (pois.transit_distance / 3.5));
                const scoreSchool = Math.max(0, 1 - (pois.school_distance / 3.5));

                let poiScore = 0;
                const objective = (campaign.objective || 'branding').toLowerCase();
                if (objective === 'captação') {
                    poiScore = (scoreSchool * 0.6) + (scoreTransit * 0.4);
                } else if (objective === 'branding') {
                    poiScore = (scoreShopping * 0.7) + (scoreTransit * 0.3);
                } else {
                    poiScore = (scoreShopping * 0.33) + (scoreTransit * 0.33) + (scoreSchool * 0.34);
                }

                const score = (1 - normDistance) * 0.25 + (normIncome) * 0.15 + (normPop) * 0.10 + (flow) * 0.10 + (poiScore) * 0.20 + 0.15;

                allPossibleRecommendations.push({
                    asset_id: asset.id,
                    asset_lat: asset.lat,
                    asset_lng: asset.lng,
                    distance_km: distance,
                    score_final: Math.max(0, Math.min(1, score)),
                    unit_price: asset.base_price || 0,
                    start_date: campaign.start_date,
                    end_date: campaign.end_date
                });
            }
        }
    }

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
    let remainingTotalBudget = c_budget;
    const assetAllocations = new Map();

    const availableItems = allPossibleRecommendations.map(r => ({
        ...r,
        score_current: r.score_final,
        selected: false
    }));

    let overlapsPenalized = 0;

    while (true) {
        let bestItem = null;
        let bestScore = -1;
        let bestIndex = -1;

        for (let i = 0; i < availableItems.length; i++) {
            if (!availableItems[i].selected && availableItems[i].score_current > bestScore) {
                bestScore = availableItems[i].score_current;
                bestItem = availableItems[i];
                bestIndex = i;
            }
        }

        if (!bestItem) break;

        availableItems[bestIndex].selected = true;

        const cost = bestItem.unit_price;
        let allocated = false;

        if (c_budget > 0) {
            if (hasCurve) {
                let bestMonth = null;
                let maxAvailable = -1;

                for (const [mKey, available] of Object.entries(budgetPools)) {
                    const allocs = assetAllocations.get(bestItem.asset_id) || [];
                    if (!allocs.includes(mKey) && available >= cost && available > maxAvailable) {
                        maxAvailable = available;
                        bestMonth = mKey;
                    }
                }

                if (bestMonth) {
                    budgetPools[bestMonth] -= cost;
                    const allocs = assetAllocations.get(bestItem.asset_id) || [];
                    allocs.push(bestMonth);
                    assetAllocations.set(bestItem.asset_id, allocs);
                    finalRecommendations.push({ ...bestItem, allocatedMonth: bestMonth });
                    allocated = true;
                }
            } else {
                if (remainingTotalBudget >= cost) {
                    remainingTotalBudget -= cost;
                    finalRecommendations.push(bestItem);
                    allocated = true;
                }
            }
        } else {
            finalRecommendations.push(bestItem);
            allocated = true;
        }

        if (allocated) {
            for (let i = 0; i < availableItems.length; i++) {
                if (!availableItems[i].selected) {
                    const candidate = availableItems[i];
                    const overwriteDist = calculateDistance(bestItem.asset_lat, bestItem.asset_lng, candidate.asset_lat, candidate.asset_lng);
                    if (overwriteDist < 0.5) {
                        availableItems[i].score_current *= 0.5;
                        overlapsPenalized++;
                    }
                }
            }
        }
    }

    console.log(`Generated ${finalRecommendations.length} recommendations using Advanced POI/Overlap logic.`);
    console.log(`Applied Overlap Penalties ${overlapsPenalized} times during the loop.`);

    await db.close();
}

testAdvancedRecommendationLogic().catch(console.error);
