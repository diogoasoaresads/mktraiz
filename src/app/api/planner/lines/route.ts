import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const scenarioId = searchParams.get('scenarioId');

    if (!scenarioId) {
        return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 });
    }

    const db = await getDb();

    // Fetch scenario and its plan lines
    const scenario = await db.get('SELECT * FROM scenarios WHERE id = ?', [scenarioId]);
    if (!scenario) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });

    const lines = await db.all(`
        SELECT l.*, a.type, a.address_raw, a.lat, a.lng, a.base_price, v.name as vendor_name, u.unit_name
        FROM plan_lines l
        JOIN media_assets a ON l.asset_id = a.id
        JOIN vendors v ON a.vendor_id = v.id
        JOIN units u ON l.unit_id = u.id
        WHERE l.scenario_id = ?
        ORDER BY l.score_final DESC
    `, [scenarioId]);

    return NextResponse.json({ scenario, lines });
}
