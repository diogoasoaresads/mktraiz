import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const scenarioId = searchParams.get('scenarioId');

    if (!scenarioId) {
        return NextResponse.json({ error: 'scenarioId is required' }, { status: 400 });
    }

    const db = await getDb();

    // 1. Get Scenario and Campaign details
    const scenario = await db.get(`
        SELECT s.*, c.start_date as c_start, c.end_date as c_end, c.budget as c_budget
        FROM scenarios s
        JOIN campaigns c ON s.campaign_id = c.id
        WHERE s.id = ?
    `, [scenarioId]);

    if (!scenario) return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });

    // 2. Parse current curve (or initialize)
    let curve: Record<string, number> = {};
    try {
        curve = JSON.parse(scenario.budget_curve || '{}');
    } catch (e) {
        curve = {};
    }

    // 3. Get all selected/suggested lines for calculation
    const lines = await db.all(`
        SELECT total_price, start_date, end_date 
        FROM plan_lines 
        WHERE scenario_id = ? AND total_price > 0
    `, [scenarioId]);

    // 4. Generate month list between campaign dates
    const months = [];
    const start = new Date(scenario.c_start);
    const end = new Date(scenario.c_end);

    let current = new Date(start.getFullYear(), start.getMonth(), 1);
    while (current <= end) {
        const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        months.push(monthKey);
        current.setMonth(current.getMonth() + 1);
    }

    // 5. Calculate Used Budget per Month
    const monthlyData = months.map(mKey => {
        const [year, month] = mKey.split('-').map(Number);
        const monthStart = new Date(year, month - 1, 1);
        const monthEnd = new Date(year, month, 0);

        let used = 0;
        lines.forEach(line => {
            const lStart = new Date(line.start_date);
            const lEnd = new Date(line.end_date);

            // Overlap check
            const overlapStart = new Date(Math.max(monthStart.getTime(), lStart.getTime()));
            const overlapEnd = new Date(Math.min(monthEnd.getTime(), lEnd.getTime()));

            if (overlapStart <= overlapEnd) {
                const totalDays = Math.ceil((lEnd.getTime() - lStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                const overlapDays = Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                used += (overlapDays / totalDays) * line.total_price;
            }
        });

        const targetPct = curve[mKey] || 0;
        const targetVal = (targetPct / 100) * scenario.c_budget;

        return {
            month: mKey,
            target_pct: targetPct,
            target_val: targetVal,
            used_val: Math.round(used * 100) / 100,
            balance: Math.round((targetVal - used) * 100) / 100
        };
    });

    return NextResponse.json({
        total_budget: scenario.c_budget,
        monthly: monthlyData
    });
}

export async function POST(req: Request) {
    try {
        const { scenarioId, curve } = await req.json();
        const db = await getDb();

        await db.run('UPDATE scenarios SET budget_curve = ? WHERE id = ?', [
            JSON.stringify(curve),
            scenarioId
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error saving budget curve:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
