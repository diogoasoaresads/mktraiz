import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { calculateDistance, getGeographicMetrics, getPoiMetrics } from '@/lib/geo';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const { 
            campaignId, 
            scenarioId, 
            radiusKm: customRadius, 
            minIncome: customMinIncome, 
            customWeights, 
            budgetMode: customBudgetMode,
            overlapMode: customOverlapMode
        } = await req.json();
        const db = await getDb();

        const campaign = await db.get('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
        const scenario = await db.get('SELECT * FROM scenarios WHERE id = ?', [scenarioId]);

        if (!campaign || !scenario) {
            return NextResponse.json({ success: false, error: 'Campaign or Scenario not found' }, { status: 404 });
        }

        const weights = customWeights || JSON.parse(scenario.score_weights || '{}');
        const allowedTypes = JSON.parse(campaign.allowed_types || '[]');
        const targetSchoolIds = JSON.parse(campaign.target_school_ids || '[]');
        const targetUnitIds = JSON.parse(campaign.target_unit_ids || '[]');

        // 1. Get targets (units)
        let units = [];
        if (targetUnitIds.length > 0) {
            units = await db.all(`SELECT * FROM units WHERE id IN (${targetUnitIds.map(() => '?').join(',')})`, targetUnitIds);
        } else if (targetSchoolIds.length > 0) {
            units = await db.all(`SELECT * FROM units WHERE school_id IN (${targetSchoolIds.map(() => '?').join(',')}) AND is_active = 1`, targetSchoolIds);
        } else {
            return NextResponse.json({ success: false, error: 'No target units defined for this campaign' }, { status: 400 });
        }

        // 2. Get all active assets with valid lat/lng
        let query = 'SELECT a.*, v.name as vendor_name FROM media_assets a JOIN vendors v ON a.vendor_id = v.id WHERE a.status = "active" AND a.lat IS NOT NULL AND a.lng IS NOT NULL';
        const params: any[] = [];

        if (allowedTypes.length > 0) {
            query += ` AND a.type IN (${allowedTypes.map(() => '?').join(',')})`;
            params.push(...allowedTypes);
        }

        const assets = await db.all(query, params);

        // 3. Match Assets to Units within radius
        const allPossibleRecommendations = [];
        const radiusKm = customRadius || campaign.radius_km || 5;
        const minIncome = customMinIncome || 0;

        // Clear existing suggested plan lines for this scenario to avoid duplicates on re-run
        await db.run('DELETE FROM plan_lines WHERE scenario_id = ? AND status = "suggested"', [scenarioId]);

        for (const unit of units) {
            for (const asset of assets) {
                const distance = calculateDistance(unit.lat, unit.lng, asset.lat, asset.lng);

                if (distance <= radiusKm) {
                    // Calculate Score
                    const normDistance = Math.min(distance / radiusKm, 1);
                    const cityMatch = (unit.city && asset.city && unit.city.toLowerCase() === asset.city.toLowerCase()) ? 1 : 0;

                    // IBGE Logic
                    const metrics = getGeographicMetrics(asset.lat, asset.lng);

                    if (minIncome > 0 && metrics.income < minIncome) {
                        continue; // Skip if below requested income
                    }

                    // Score calculation using normalized IBGE metrics
                    const normIncome = Math.min(metrics.income / 10000, 1);
                    const normPop = Math.min(metrics.population / 10000, 1);
                    const flow = metrics.flow_index;

                    // POI Logic (Dynamic Affinity based on objective)
                    const pois = getPoiMetrics(asset.lat, asset.lng);
                    // Normalize POI distances (0 is best, 3.5km is worst) -> Score from 1 to 0
                    const scoreShopping = Math.max(0, 1 - (pois.shopping_distance / 3.5));
                    const scoreTransit = Math.max(0, 1 - (pois.transit_distance / 3.5));
                    const scoreSchool = Math.max(0, 1 - (pois.school_distance / 3.5));

                    let poiScore = 0;
                    const objective = (campaign.objective || 'branding').toLowerCase();
                    if (objective === 'captação' || objective === 'captacao') {
                        // For student acquisition: heavily favor proximity to schools and transit
                        poiScore = (scoreSchool * 0.6) + (scoreTransit * 0.4);
                    } else if (objective === 'branding') {
                        // For brand awareness: heavily favor shoppings and transit hubs
                        poiScore = (scoreShopping * 0.7) + (scoreTransit * 0.3);
                    } else {
                        // General mix
                        poiScore = (scoreShopping * 0.33) + (scoreTransit * 0.33) + (scoreSchool * 0.34);
                    }

                    // Weights configuration
                    const wDistance = weights.w_distance ?? 0.25;
                    const wCity = weights.w_city ?? 0.10;
                    const wPrice = weights.w_price ?? 0.10;
                    const wIncome = 0.15;
                    const wPop = 0.10;
                    const wFlow = 0.10;
                    const wPoi = 0.20; // 20% weight for dynamic POI affinity

                    const score =
                        (1 - normDistance) * wDistance +
                        (cityMatch) * wCity +
                        (normIncome) * wIncome +
                        (normPop) * wPop +
                        (flow) * wFlow +
                        (poiScore) * wPoi +
                        (asset.base_price ? wPrice : 0.05);

                    allPossibleRecommendations.push({
                        id: uuidv4(),
                        scenario_id: scenarioId,
                        campaign_id: campaignId,
                        unit_id: unit.id,
                        asset_id: asset.id,
                        asset_lat: asset.lat,
                        asset_lng: asset.lng,
                        distance_km: distance,
                        score_final: Math.max(0, Math.min(1, score)),
                        status: 'suggested',
                        unit_price: asset.base_price || 0,
                        start_date: campaign.start_date,
                        end_date: campaign.end_date
                    });
                }
            }
        }

        // 4. Budget & Curve Allocation (with Equal Per Unit support)
        const curve = JSON.parse(scenario.budget_curve || '{}');
        const c_budget = campaign.budget || 0;
        const budgetMode = customBudgetMode || campaign.budget_mode || 'total';
        const overlapMode = customOverlapMode || 'avoid';
        const budgetPerUnit = (budgetMode === 'equal_per_unit' && units.length > 0) ? (c_budget / units.length) : Infinity;

        // Track budget used per unit for "equal_per_unit" mode
        const unitBudgetUsed = new Map<string, number>();

        // Build monthly budget pools
        const budgetPools: Record<string, number> = {};
        let hasCurve = false;
        if (c_budget > 0 && Object.keys(curve).length > 0) {
            for (const [mKey, pct] of Object.entries(curve)) {
                if ((pct as number) > 0) {
                    budgetPools[mKey] = ((pct as number) / 100) * c_budget;
                    hasCurve = true;
                }
            }
        }

        const finalRecommendations = [];
        let remainingTotalBudget = c_budget;

        // Map<asset_id, array of month keys> to prevent allocating same asset twice in same month
        const assetAllocations = new Map<string, string[]>();

        // Wrap available items with a dynamic score state
        const availableItems = allPossibleRecommendations.map(r => ({
            ...r,
            score_current: r.score_final,
            selected: false,
            cluster_opportunity: false as boolean
        }));

        while (true) {
            let bestItem = null;
            let bestScore = -1;
            let bestIndex = -1;

            // Find the highest scoring item still available
            for (let i = 0; i < availableItems.length; i++) {
                if (!availableItems[i].selected && availableItems[i].score_current > bestScore) {
                    bestScore = availableItems[i].score_current;
                    bestItem = availableItems[i];
                    bestIndex = i;
                }
            }

            if (!bestItem) break; // Finished processing all candidates

            // Mark as selected so we don't evaluate it infinitely if we skip it due to budget
            availableItems[bestIndex].selected = true;

            const cost = bestItem.unit_price;
            let allocated = false;

            // Check if unit has budget remaining in "equal_per_unit" mode
            const currentUnitUsed = unitBudgetUsed.get(bestItem.unit_id) || 0;
            if (budgetMode === 'equal_per_unit' && (currentUnitUsed + cost) > (budgetPerUnit + 0.01)) {
                continue; // Skip this asset-unit pair, unit budget exhausted
            }

            if (c_budget > 0) {
                if (hasCurve) {
                    // Try to find the best month for this asset (highest remaining budget)
                    let bestMonth = null;
                    let maxAvailable = -1;

                    for (const [mKey, available] of Object.entries(budgetPools)) {
                        const allocs = assetAllocations.get(bestItem.asset_id) || [];
                        if (!allocs.includes(mKey) && available >= cost && available > maxAvailable) {
                            maxAvailable = available;
                            bestMonth = mKey;
                        }
                    }

                    // Strict budget enforcement: only allocate if there's enough budget
                    if (bestMonth && budgetPools[bestMonth] >= cost) {
                        budgetPools[bestMonth] -= cost;

                        const allocs = assetAllocations.get(bestItem.asset_id) || [];
                        allocs.push(bestMonth);
                        assetAllocations.set(bestItem.asset_id, allocs);

                        // Set start and end dates to that specific month
                        const [year, month] = bestMonth.split('-').map(Number);
                        const startObj = new Date(year, month - 1, 1);
                        const endObj = new Date(year, month, 0); // last day

                        const allocatedRec = { ...bestItem };
                        allocatedRec.id = uuidv4(); // fresh ID
                        allocatedRec.start_date = startObj.toISOString().split('T')[0];
                        allocatedRec.end_date = endObj.toISOString().split('T')[0];
                        allocatedRec.score_final = bestItem.score_current; // Record penalized score visually

                        finalRecommendations.push(allocatedRec);
                        allocated = true;
                    }
                } else {
                    // Total budget limit but no curve
                    // Strict enforcement: only allocate if there is enough total budget
                    if (remainingTotalBudget >= cost) {
                        remainingTotalBudget -= cost;
                        const allocatedRec = { ...bestItem, score_final: bestItem.score_current };

                        finalRecommendations.push(allocatedRec);
                        allocated = true;
                    }
                }
            } else {
                // No budget limit, add all
                const allocatedRec = { ...bestItem, score_final: bestItem.score_current };

                finalRecommendations.push(allocatedRec);
                allocated = true;
            }

            // If allocated, update unit budget tracking
            if (allocated) {
                unitBudgetUsed.set(bestItem.unit_id, currentUnitUsed + cost);

                // ANTI-OVERLAP, DOMINANCE & MAX REACH REDUNDANCY LOGIC:
                // We check for neighboring assets and apply penalties.
                for (let i = 0; i < availableItems.length; i++) {
                    if (!availableItems[i].selected) {
                        const candidate = availableItems[i];
                        const distance = calculateDistance(bestItem.asset_lat, bestItem.asset_lng, candidate.asset_lat, candidate.asset_lng);

                        // Thresholds for intelligence
                        const sameLocation = distance < 0.005; // ~5 meters, considered same address/spot
                        const vicinity = distance < 0.3;      // ~300 meters, competitive overlap
                        const reachOverlap = distance < 1.0;  // ~1km, audience redundancy zone

                        if (sameLocation) {
                            if (overlapMode === 'avoid') {
                                availableItems[i].score_current *= 0.3; // Stricter penalty for same spot
                            } else if (overlapMode === 'dominance') {
                                availableItems[i].score_current *= 1.5; // Bonus for same spot in Dominance mode
                            }
                            // In 'allow' mode, we do nothing (no penalty)
                            availableItems[i].cluster_opportunity = true;
                        } else if (vicinity) {
                            if (overlapMode === 'avoid') {
                                availableItems[i].score_current *= 0.6; // Competitive penalty
                            }
                        } else if (reachOverlap) {
                            if (overlapMode === 'avoid') {
                                // Max Reach Penalty: favor new areas
                                availableItems[i].score_current *= 0.85; 
                            }
                        }
                    }
                }
            }
        }

        // 5. Calculate Impact Metrics (Estimates)
        let totalGrossImpressions = 0;
        let estimatedReach = 0;
        const selectedPoints: {lat: number, lng: number, pop: number}[] = [];

        finalRecommendations.forEach(r => {
            const metrics = getGeographicMetrics(r.asset_lat, r.asset_lng);
            // Impressions based on flow index and population (normalized to a month)
            const impressions = metrics.population * (metrics.flow_index * 2 + 0.5) * 4; 
            totalGrossImpressions += impressions;
            
            // Reach logic: we sum population but penalize overlap
            let reachContribution = metrics.population;
            let maxOverlap = 0;
            for (const p of selectedPoints) {
                const dist = calculateDistance(r.asset_lat, r.asset_lng, p.lat, p.lng);
                if (dist < 2.0) { // If within 2km of another point, they share audience
                    const overlap = Math.max(0, 1 - (dist / 2.0));
                    maxOverlap = Math.max(maxOverlap, overlap);
                }
            }
            reachContribution *= (1 - (maxOverlap * 0.7)); // Up to 70% deduplication
            estimatedReach += reachContribution;
            selectedPoints.push({ lat: r.asset_lat, lng: r.asset_lng, pop: metrics.population });
        });

        const frequency = estimatedReach > 0 ? (totalGrossImpressions / estimatedReach) : 0;
        const grps = (estimatedReach / 1000000) * 100; // Mocked GRP calculation against 1M pop

        // 5. Batch insert plan_lines
        if (finalRecommendations.length > 0) {
            const placeholders = finalRecommendations.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
            const flatParams = finalRecommendations.flatMap(r => {
                let totalPrice = r.unit_price;
                if (r.start_date && r.end_date) {
                    const start = new Date(r.start_date);
                    const end = new Date(r.end_date);
                    const months = Math.max(1, (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth()));
                    totalPrice = r.unit_price * months;
                }

                return [
                    r.id, r.scenario_id, r.campaign_id, r.unit_id, r.asset_id,
                    r.distance_km, r.score_final, r.status,
                    r.unit_price, totalPrice, r.start_date, r.end_date,
                    overlapMode, null // overlap_mode, cluster_id
                ];
            });

            await db.run(`
                INSERT INTO plan_lines (
                    id, scenario_id, campaign_id, unit_id, asset_id, 
                    distance_km, score_final, status,
                    unit_price, total_price, start_date, end_date,
                    overlap_mode, cluster_id
                ) VALUES ${placeholders}
            `, flatParams);
        }

        return NextResponse.json({
            success: true,
            count: finalRecommendations.length,
            metrics: {
                totalGrossImpressions,
                estimatedReach,
                frequency,
                grps
            }
        });


    } catch (error) {
        console.error('Recommendation Engine Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
