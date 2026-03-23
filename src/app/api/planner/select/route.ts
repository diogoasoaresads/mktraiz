import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { lineId, selected } = await req.json();
        const db = await getDb();

        const status = selected ? 'selected' : 'suggested';

        await db.run('UPDATE plan_lines SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, lineId]);

        return NextResponse.json({ success: true, status });
    } catch (error) {
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
