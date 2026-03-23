import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const { scenarioId, assetIds } = await req.json();

        if (!scenarioId || !Array.isArray(assetIds) || assetIds.length === 0) {
            return NextResponse.json({ success: false, error: 'Dados inválidos para adição em massa.' }, { status: 400 });
        }

        const db = await getDb();

        // Get the campaign ID from the scenario
        const scenario = await db.get('SELECT campaign_id FROM scenarios WHERE id = ?', [scenarioId]);
        if (!scenario) {
            return NextResponse.json({ success: false, error: 'Cenário não encontrado.' }, { status: 404 });
        }
        const campaignId = scenario.campaign_id;

        // Fetch assets to get base price
        const placeholders = assetIds.map(() => '?').join(',');
        const assets = await db.all(`SELECT id, base_price FROM media_assets WHERE id IN (${placeholders})`, assetIds);

        const newLines = assets.map(asset => ({
            id: uuidv4(),
            scenario_id: scenarioId,
            campaign_id: campaignId,
            unit_id: 'manual_addition', // A placeholder or null since it's added manually independent of a specific unit radius initially
            asset_id: asset.id,
            distance_km: 0,
            eta_minutes: 0,
            score_final: 100, // Manual additions get automatic high score
            unit_price: asset.base_price || 0,
            total_price: asset.base_price || 0,
            quantity: 1,
            status: 'suggested'
        }));

        // Insert into plan_lines
        const stmt = await db.prepare(`
            INSERT INTO plan_lines (
                id, scenario_id, campaign_id, unit_id, asset_id, 
                distance_km, eta_minutes, score_final, unit_price, total_price, quantity, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const line of newLines) {
            await stmt.run([
                line.id, line.scenario_id, line.campaign_id, line.unit_id, line.asset_id,
                line.distance_km, line.eta_minutes, line.score_final, line.unit_price, line.total_price, line.quantity, line.status
            ]);
        }
        await stmt.finalize();

        return NextResponse.json({ success: true, added: newLines.length });
    } catch (error: any) {
        console.error('Bulk Add Plan Error:', error);
        return NextResponse.json(
            { success: false, error: 'Falha ao adicionar ativos ao plano.' },
            { status: 500 }
        );
    }
}
