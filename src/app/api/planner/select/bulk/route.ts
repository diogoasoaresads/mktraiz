import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { lineIds, status } = await req.json();

        if (!Array.isArray(lineIds) || lineIds.length === 0 || !status) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const db = await getDb();

        const placeholders = lineIds.map(() => '?').join(',');
        await db.run(
            `UPDATE plan_lines SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id IN (${placeholders})`,
            [status, ...lineIds]
        );

        return NextResponse.json({ success: true, count: lineIds.length });
    } catch (error) {
        console.error('Bulk update error:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
