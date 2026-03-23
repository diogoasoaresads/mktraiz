import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

// Get saved mapping template for a vendor
export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const vendorId = searchParams.get('vendorId');
        if (!vendorId) return NextResponse.json({ error: 'Vendor ID required' }, { status: 400 });

        const db = await getDb();
        const template = await db.get('SELECT column_map_json FROM vendor_import_templates WHERE vendor_id = ?', [vendorId]);

        if (template && template.column_map_json) {
            return NextResponse.json(JSON.parse(template.column_map_json));
        }
        return NextResponse.json(null);
    } catch (error) {
        console.error('Template GET error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}

// Save mapping template for a vendor
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { vendor_id, column_map } = body;
        if (!vendor_id || !column_map) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

        const db = await getDb();

        await db.run(`
            INSERT INTO vendor_import_templates (vendor_id, column_map_json, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(vendor_id) DO UPDATE SET 
                column_map_json = excluded.column_map_json,
                updated_at = CURRENT_TIMESTAMP
        `, [vendor_id, JSON.stringify(column_map)]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Template POST error:', error);
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    }
}
