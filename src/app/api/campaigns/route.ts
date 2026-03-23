import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    const db = await getDb();
    const campaigns = await db.all(`
        SELECT c.*,
            (SELECT s.brand_name FROM units u 
             JOIN schools s ON u.school_id = s.id 
             WHERE JSON_EXTRACT(c.target_unit_ids, '$[0]') = u.id LIMIT 1) as brand_name
        FROM campaigns c 
        ORDER BY c.created_at DESC
    `);
    return NextResponse.json(campaigns);
}

export async function POST(req: Request) {
    try {
        const db = await getDb();
        const data = await req.json();

        const id = uuidv4();
        await db.run(`
            INSERT INTO campaigns (
                id, name, objective, start_date, end_date, budget, radius_km, 
                allowed_types, target_school_ids, target_unit_ids, status, budget_mode
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id,
            data.name,
            data.objective || 'captação',
            data.start_date || null,
            data.end_date || null,
            data.budget || 0,
            data.radius_km || 5,
            JSON.stringify(data.allowed_types || []),
            JSON.stringify(data.target_school_ids || []),
            JSON.stringify(data.target_unit_ids || []),
            'draft',
            data.budget_mode || 'total'
        ]);

        // Automatically create a default scenario
        await db.run(`
            INSERT INTO scenarios (id, campaign_id, name, score_weights)
            VALUES (?, ?, ?, ?)
        `, [
            uuidv4(),
            id,
            'Cenário A (Padrão)',
            JSON.stringify({
                w_distance: 0.55,
                w_city: 0.10,
                w_type: 0.10,
                w_price: 0.20,
                w_vendor_diversity: 0.03,
                w_availability: 0.02
            })
        ]);

        return NextResponse.json({ id, success: true });
    } catch (error) {
        console.error('Campaign Create Error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
