import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const brand = searchParams.get('brand');
        const period = searchParams.get('period'); // Expected format: YYYY-MM

        const db = await getDb();

        let query = `
            SELECT 
                strftime('%m', pl.start_date) as month,
                strftime('%Y', pl.start_date) as year,
                COUNT(pl.id) as active_count,
                SUM(pl.total_price) as total_value
            FROM plan_lines pl
            LEFT JOIN units u ON pl.unit_id = u.id
            LEFT JOIN schools s ON u.school_id = s.id
            WHERE pl.start_date IS NOT NULL 
              AND pl.status NOT IN ('suggested', 'rejected')
        `;

        const params: string[] = [];

        if (brand) {
            query += ` AND s.brand_name = ?`;
            params.push(brand);
        }

        if (period) {
            query += ` AND strftime('%Y-%m', pl.start_date) = ?`;
            params.push(period);
        }

        query += `
            GROUP BY year, month
            ORDER BY year DESC, month DESC
        `;

        const data = await db.all(query, params);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Monthly reports error:', error);
        return NextResponse.json([], { status: 200 });
    }
}
