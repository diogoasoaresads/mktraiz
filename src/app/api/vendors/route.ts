import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    const db = await getDb();

    // Single query avoids N+1 individual counts per vendor
    const results = await db.all(`
        SELECT v.*, COUNT(a.id) as assetsCount
        FROM vendors v
        LEFT JOIN media_assets a ON a.vendor_id = v.id
        GROUP BY v.id
        ORDER BY v.name
    `);

    const res = NextResponse.json(results);
    res.headers.set('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=30');
    return res;
}

export async function POST(req: Request) {
    const db = await getDb();
    const data = await req.json();

    const id = uuidv4();
    await db.run(`
        INSERT INTO vendors (id, name, contact_name, contact_email, contact_phone, payment_terms, lead_time_days, cities_covered)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
        id,
        data.name,
        data.contact_name,
        data.contact_email,
        data.contact_phone,
        data.payment_terms,
        data.lead_time_days,
        data.cities_covered
    ]);

    return NextResponse.json({ id, success: true });
}
