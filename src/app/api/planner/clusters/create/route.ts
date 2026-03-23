import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const { lineIds, scenarioId, campaignId } = await req.json();

        if (!lineIds || !Array.isArray(lineIds) || lineIds.length === 0) {
            return NextResponse.json({ error: 'lineIds array is required' }, { status: 400 });
        }

        const db = await getDb();
        const clusterId = uuidv4();

        // 1. Create the cluster record
        await db.run(
            'INSERT INTO asset_clusters (id, name, type, scenario_id, campaign_id) VALUES (?, ?, ?, ?, ?)',
            [clusterId, 'Cluster de Dominância', 'dominance', scenarioId, campaignId]
        );

        // 2. Update all selected lines with this cluster_id and set overlap_mode to dominance
        const placeholders = lineIds.map(() => '?').join(',');
        await db.run(`
            UPDATE plan_lines 
            SET cluster_id = ?, 
                overlap_mode = 'dominance',
                status = 'selected',
                updated_at = CURRENT_TIMESTAMP
            WHERE id IN (${placeholders})
        `, [clusterId, ...lineIds]);

        return NextResponse.json({ success: true, clusterId });
    } catch (error) {
        console.error('Error creating cluster:', error);
        return NextResponse.json({ error: 'Erro ao criar cluster' }, { status: 500 });
    }
}
