import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function PATCH(req: Request) {
    try {
        const { lineId, status, negotiated_price } = await req.json();
        const db = await getDb();

        const current = await db.get('SELECT * FROM plan_lines WHERE id = ?', [lineId]);
        if (!current) return NextResponse.json({ error: 'Line not found' }, { status: 404 });

        await db.run(`
            UPDATE plan_lines SET 
                status = ?, 
                negotiated_price = COALESCE(?, negotiated_price),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [status, negotiated_price || null, lineId]);

        // Audit the change
        const crypto = await import('crypto');
        await db.run(`
            INSERT INTO audit_events (id, entity_type, entity_id, action, before_json, after_json)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            crypto.randomUUID(),
            'plan_lines',
            lineId,
            'status_change',
            JSON.stringify({ status: current.status }),
            JSON.stringify({ status })
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Status Update Error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
