import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const db = await getDb();

        // 1. Fetch original campaign
        const original = await db.get('SELECT * FROM campaigns WHERE id = ?', [params.id]);
        if (!original) {
            return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
        }

        // 2. Insert new campaign
        const newCampaignId = uuidv4();
        await db.run(`
            INSERT INTO campaigns (
                id, name, objective, start_date, end_date, budget, radius_km, 
                allowed_types, target_school_ids, target_unit_ids, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            newCampaignId,
            `${original.name} (Cópia)`,
            original.objective,
            original.start_date,
            original.end_date,
            original.budget,
            original.radius_km,
            original.allowed_types || '[]',
            original.target_school_ids || '[]',
            original.target_unit_ids || '[]',
            'draft'
        ]);

        // 3. Fetch original scenarios and duplicate them
        const scenarios = await db.all('SELECT * FROM scenarios WHERE campaign_id = ?', [original.id]);

        for (const s of scenarios) {
            const newScenarioId = uuidv4();
            await db.run(`
                INSERT INTO scenarios (id, campaign_id, name, score_weights, is_active, budget_curve)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                newScenarioId,
                newCampaignId,
                s.name,
                s.score_weights,
                s.is_active,
                s.budget_curve
            ]);

            // 4. Duplicate plan_lines for this scenario
            const lines = await db.all('SELECT * FROM plan_lines WHERE scenario_id = ?', [s.id]);
            for (const l of lines) {
                await db.run(`
                    INSERT INTO plan_lines (
                        id, scenario_id, campaign_id, unit_id, asset_id,
                        target_id, custom_lat, custom_lng, custom_address,
                        status, score_final, distance_km,
                        start_date, end_date, unit_price, total_price,
                        discount_pct, impressions_est, frequency_est
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    uuidv4(),
                    newScenarioId,
                    newCampaignId,
                    l.unit_id,
                    l.asset_id,
                    l.target_id,
                    l.custom_lat,
                    l.custom_lng,
                    l.custom_address,
                    l.status,
                    l.score_final,
                    l.distance_km,
                    l.start_date,
                    l.end_date,
                    l.unit_price,
                    l.total_price,
                    l.discount_pct,
                    l.impressions_est,
                    l.frequency_est
                ]);
            }
        }

        return NextResponse.json({ id: newCampaignId, success: true });
    } catch (error) {
        console.error('Error duplicating campaign:', error);
        return NextResponse.json({ error: 'Erro ao duplicar campanha' }, { status: 500 });
    }
}
