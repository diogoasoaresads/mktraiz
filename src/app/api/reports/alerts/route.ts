import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = await getDb();

        // Items ending in the next 15 days.
        // We compare end_date with the current date.
        const data = await db.all(`
            SELECT 
                l.id,
                l.end_date,
                l.total_price,
                c.name as campaign_name,
                u.unit_name,
                a.type as asset_type,
                v.name as vendor_name
            FROM plan_lines l
            JOIN campaigns c ON l.campaign_id = c.id
            JOIN units u ON l.unit_id = u.id
            JOIN media_assets a ON l.asset_id = a.id
            JOIN vendors v ON a.vendor_id = v.id
            WHERE l.end_date IS NOT NULL 
              AND l.status NOT IN ('suggested', 'rejected', 'finished')
              AND date(l.end_date) <= date('now', '+15 days')
              AND date(l.end_date) >= date('now')
            ORDER BY l.end_date ASC
        `);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Alerts reports error:', error);
        return NextResponse.json([], { status: 200 });
    }
}
