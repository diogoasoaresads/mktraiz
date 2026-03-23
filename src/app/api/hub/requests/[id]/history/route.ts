import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const db = await getDb();
        
        const history = await db.all(
            'SELECT * FROM hub_request_history WHERE request_id = ? ORDER BY created_at DESC',
            [id]
        );
        
        return NextResponse.json({ success: true, history });
    } catch (error) {
        console.error('History API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
