import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const assetId = searchParams.get('assetId');
        if (!assetId) return NextResponse.json([]);

        const db = await getDb();
        const history = await db.all(`
            SELECT 
                l.id,
                c.name as campaign_name,
                u.unit_name,
                l.start_date,
                l.end_date,
                COALESCE(l.negotiated_price, l.unit_price, 0) as price,
                l.status,
                l.created_at
            FROM plan_lines l
            JOIN campaigns c ON l.campaign_id = c.id
            JOIN units u ON l.unit_id = u.id
            WHERE l.asset_id = ?
            ORDER BY l.created_at DESC
        `, [assetId]);

        return NextResponse.json(history);
    } catch (error) {
        console.error('History error:', error);
        return NextResponse.json([]);
    }
}
