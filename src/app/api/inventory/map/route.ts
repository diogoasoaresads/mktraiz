import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Lightweight endpoint that returns ONLY geocoded inventory items
 * with minimal fields needed for map rendering.
 * No pagination — returns all items at once for fast map loading.
 */
export async function GET() {
    const db = await getDb();

    const assets = await db.all(`
        SELECT a.id, a.type, a.lat, a.lng, a.address_raw, a.base_price,
               a.geocode_suspect,
               v.name as vendor_name
        FROM media_assets a
        JOIN vendors v ON a.vendor_id = v.id
        WHERE a.lat IS NOT NULL AND a.lng IS NOT NULL
          AND a.status = 'active'
        ORDER BY a.type
    `);

    const res = NextResponse.json(assets);
    res.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return res;
}
