import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '0');
    const limit = parseInt(searchParams.get('limit') || '0');

    const db = await getDb();

    const baseQuery = `
        FROM plan_lines l
        JOIN campaigns c ON l.campaign_id = c.id
        JOIN units u ON l.unit_id = u.id
        JOIN schools s ON u.school_id = s.id
        JOIN media_assets a ON l.asset_id = a.id
        JOIN vendors v ON a.vendor_id = v.id
        WHERE l.status NOT IN ('suggested', 'rejected')
    `;
    const selectFields = `l.*, c.name as campaign_name, u.unit_name, s.brand_name, a.type, v.name as vendor_name, a.address_raw, (SELECT COUNT(*) FROM plan_proofs WHERE plan_line_id = l.id) as proofs_count`;

    if (page > 0 && limit > 0) {
        const offset = (page - 1) * limit;
        const countResult = await db.get(`SELECT COUNT(*) as total ${baseQuery}`);
        const total = countResult?.total || 0;
        const lines = await db.all(`SELECT ${selectFields} ${baseQuery} ORDER BY l.updated_at DESC LIMIT ? OFFSET ?`, [limit, offset]);
        return NextResponse.json({ data: lines, total, page, totalPages: Math.ceil(total / limit) });
    }

    const lines = await db.all(`SELECT ${selectFields} ${baseQuery} ORDER BY l.updated_at DESC`);
    return NextResponse.json(lines);
}
