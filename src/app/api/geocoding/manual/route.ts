import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { id, source, lat, lng } = await req.json();
        // source = 'unit' | 'asset'
        if (!id || !source || lat == null || lng == null) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const db = await getDb();
        const table = source === 'unit' ? 'units' : 'media_assets';

        await db.run(`
            UPDATE ${table} SET 
                lat = ?, lng = ?, geocode_status = 'manual', geocode_confidence = 1.0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [lat, lng, id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Manual geocode error:', error);
        return NextResponse.json({ success: false, error: 'Failed' }, { status: 500 });
    }
}
