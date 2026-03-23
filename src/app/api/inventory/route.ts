import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '200');
    const offset = (page - 1) * limit;

    // Server-side filters (reduces round-trip data)
    const vendorId = searchParams.get('vendor_id') || '';
    const type = searchParams.get('type') || '';
    const search = searchParams.get('search') || '';
    const suspectsOnly = searchParams.get('suspects_only') === 'true';

    const db = await getDb();

    let where = 'WHERE 1=1';
    const params: any[] = [];

    if (vendorId) {
        where += ' AND a.vendor_id = ?';
        params.push(vendorId);
    }
    if (type) {
        where += ' AND a.type = ?';
        params.push(type);
    }
    if (suspectsOnly) {
        where += ' AND a.geocode_suspect = 1';
    }
    if (search) {
        where += ` AND (a.address_raw LIKE ? OR a.city LIKE ? OR v.name LIKE ? OR a.type LIKE ?)`;
        const term = `%${search}%`;
        params.push(term, term, term, term);
    }

    const countResult = await db.get(
        `SELECT COUNT(*) as total FROM media_assets a JOIN vendors v ON a.vendor_id = v.id ${where}`,
        params
    );
    const total = countResult?.total || 0;

    const assets = await db.all(`
        SELECT a.id, a.vendor_id, a.type, a.address_raw, a.city, a.state, 
               a.lat, a.lng, a.geocode_status, a.geocode_suspect, a.base_price, a.status,
               a.fingerprint_hash, a.created_at,
               v.name as vendor_name 
        FROM media_assets a
        JOIN vendors v ON a.vendor_id = v.id
        ${where}
        ORDER BY a.created_at DESC
        LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const res = NextResponse.json({ data: assets, total, page, totalPages: Math.ceil(total / limit) });
    // Short cache to avoid hammering DB mid-session (5s stale, 10s max)
    res.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=10');
    return res;
}

export async function POST(req: Request) {
    try {
        const data = await req.json();
        const db = await getDb();

        const id = uuidv4();
        const addressNormalized = data.address_raw.toLowerCase().trim().replace(/\s+/g, ' ');

        const fingerprint = crypto.createHash('md5')
            .update(`${data.vendor_id}-${addressNormalized}-${data.type}`)
            .digest('hex');

        await db.run(`
            INSERT INTO media_assets (
                id, vendor_id, type, address_raw, address_normalized, 
                city, state, base_price, fingerprint_hash, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            id, data.vendor_id, data.type, data.address_raw, addressNormalized,
            data.city || null, data.state || null, data.base_price || 0, fingerprint, 'active'
        ]);

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        console.error('Inventory POST error:', error);
        if (error.message?.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ success: false, error: 'Este ativo já está cadastrado para este fornecedor.' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Falha ao criar ativo.' }, { status: 500 });
    }
}
