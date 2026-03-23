import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = await getDb();
        const data = await db.all(`
            SELECT 
                c.name as campaign_name,
                u.unit_name,
                v.name as vendor_name,
                a."type" as asset_type,
                a.address_raw as address,
                l."status",
                COALESCE(l.negotiated_price, a.base_price) as price,
                l.updated_at as last_update,
                (SELECT pp.file_path FROM plan_proofs pp WHERE pp.plan_line_id = l.id ORDER BY pp.created_at DESC LIMIT 1) as proof_photo
            FROM plan_lines l
            JOIN campaigns c ON l.campaign_id = c.id
            JOIN units u ON l.unit_id = u.id
            JOIN media_assets a ON l.asset_id = a.id
            JOIN vendors v ON a.vendor_id = v.id
            WHERE l."status" NOT IN ('suggested', 'rejected')
            ORDER BY c.name, u.unit_name
        `);
        return NextResponse.json(data);
    } catch (error) {
        console.error('Reports data error:', error);
        return NextResponse.json([], { status: 200 });
    }
}
