import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
    const db = await getDb();

    const schoolsCount = await db.get('SELECT COUNT(*) as count FROM schools');
    const unitsCount = await db.get('SELECT COUNT(*) as count FROM units');
    const assetsCount = await db.get('SELECT COUNT(*) as count FROM media_assets');
    const vendorsCount = await db.get('SELECT COUNT(*) as count FROM vendors');
    const campaignsCount = await db.get('SELECT COUNT(*) as count FROM campaigns WHERE status != "archived"');

    const geocodeStats = await db.all('SELECT geocode_status, COUNT(*) as count FROM media_assets GROUP BY geocode_status');
    const typeStats = await db.all('SELECT type, COUNT(*) as count FROM media_assets GROUP BY type');

    // Recent Campaigns
    const recentCampaigns = await db.all('SELECT id, name, status FROM campaigns WHERE status != "archived" ORDER BY created_at DESC LIMIT 5');

    // Budget aggregation by brand
    const schools = await db.all('SELECT id, brand_name FROM schools');
    const campaigns = await db.all('SELECT id, budget, target_school_ids FROM campaigns WHERE status != "archived"');
    const expenses = await db.all(`
        SELECT campaign_id, SUM(COALESCE(negotiated_price, 0)) as spent 
        FROM plan_lines 
        WHERE status IN ('selected', 'approved', 'purchased', 'running')
        GROUP BY campaign_id
    `);

    const budgetsByBrand = schools.map((school: any) => {
        const brandCampaigns = campaigns.filter((c: any) => {
            try {
                const ids = JSON.parse(c.target_school_ids || '[]');
                return ids.includes(school.id);
            } catch { return false; }
        });

        const budgeted = brandCampaigns.reduce((sum: number, c: any) => sum + (c.budget || 0), 0);
        const spent = brandCampaigns.reduce((sum: number, c: any) => {
            const exp = expenses.find((e: any) => e.campaign_id === c.id);
            return sum + (exp?.spent || 0);
        }, 0);

        return {
            brand: school.brand_name,
            budgeted,
            used: spent,
            remaining: budgeted - spent
        };
    });

    // ===== NEW METRICS =====

    // Assets per unit (avg)
    const avgAssetsPerUnit = await db.get(`
        SELECT ROUND(CAST(COUNT(DISTINCT l.asset_id) AS FLOAT) / NULLIF(COUNT(DISTINCT l.unit_id), 0), 1) as avg
        FROM plan_lines l
        WHERE l.status NOT IN ('suggested', 'rejected')
    `);

    // Average distance
    const avgDistance = await db.get(`
        SELECT ROUND(AVG(distance_km), 1) as avg
        FROM plan_lines 
        WHERE distance_km IS NOT NULL AND status NOT IN ('suggested', 'rejected')
    `);

    // Investment by vendor
    const investmentByVendor = await db.all(`
        SELECT v.name as vendor, SUM(COALESCE(l.total_price, l.negotiated_price, 0)) as total
        FROM plan_lines l
        JOIN media_assets a ON l.asset_id = a.id
        JOIN vendors v ON a.vendor_id = v.id
        WHERE l.status NOT IN ('suggested', 'rejected')
        GROUP BY v.name
        ORDER BY total DESC
        LIMIT 10
    `);

    // Investment by type
    const investmentByType = await db.all(`
        SELECT a.type, SUM(COALESCE(l.total_price, l.negotiated_price, 0)) as total
        FROM plan_lines l
        JOIN media_assets a ON l.asset_id = a.id
        WHERE l.status NOT IN ('suggested', 'rejected')
        GROUP BY a.type
        ORDER BY total DESC
    `);

    // % with proof
    const proofStats = await db.get(`
        SELECT 
            COUNT(DISTINCT l.id) as total_lines,
            COUNT(DISTINCT pp.plan_line_id) as with_proof
        FROM plan_lines l
        LEFT JOIN plan_proofs pp ON l.id = pp.plan_line_id
        WHERE l.status NOT IN ('suggested', 'rejected')
    `);

    // Media mix (dynamic)
    const mediaMix = await db.all(`
        SELECT a.type, COUNT(*) as count
        FROM media_assets a
        WHERE a.status = 'active'
        GROUP BY a.type
        ORDER BY count DESC
    `);
    const totalMix = mediaMix.reduce((s: number, m: any) => s + m.count, 0);
    const mediaMixPercent = mediaMix.map((m: any) => ({
        type: m.type,
        count: m.count,
        percent: totalMix > 0 ? Math.round((m.count / totalMix) * 100) : 0
    }));

    return NextResponse.json({
        counts: {
            schools: schoolsCount.count,
            units: unitsCount.count,
            assets: assetsCount.count,
            vendors: vendorsCount.count,
            campaigns: campaignsCount.count
        },
        geocodeStats,
        typeStats,
        recentCampaigns,
        budgetsByBrand,
        // New metrics
        avgAssetsPerUnit: avgAssetsPerUnit?.avg || 0,
        avgDistance: avgDistance?.avg || 0,
        investmentByVendor,
        investmentByType,
        proofPercent: proofStats?.total_lines > 0 ? Math.round((proofStats.with_proof / proofStats.total_lines) * 100) : 0,
        mediaMix: mediaMixPercent
    });
}
