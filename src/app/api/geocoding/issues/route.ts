import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const table = searchParams.get('table') || 'all';
        const status = searchParams.get('status') || '';

        const db = await getDb();
        const results: any[] = [];

        // Safe parameterized filter (no string interpolation)
        const validStatuses = ['pending', 'error', 'low_confidence'];
        const useStatus = status && validStatuses.includes(status);
        const statusFilter = useStatus
            ? `AND geocode_status = ?`
            : `AND geocode_status IN ('pending', 'error', 'low_confidence')`;

        if (table === 'units' || table === 'all') {
            const units = await db.all(`
                SELECT id, 'unit' as source, unit_name as name, address_raw, city, state, lat, lng, geocode_status, geocode_confidence
                FROM units
                WHERE 1=1 ${statusFilter}
                ORDER BY geocode_status, created_at DESC
            `, useStatus ? [status] : []);
            results.push(...units);
        }

        if (table === 'assets' || table === 'all') {
            const assets = await db.all(`
                SELECT a.id, 'asset' as source, (a.type || ' - ' || v.name) as name, a.address_raw, a.city, a.state, a.lat, a.lng, a.geocode_status, a.geocode_confidence
                FROM media_assets a
                JOIN vendors v ON a.vendor_id = v.id
                WHERE 1=1 ${statusFilter}
                ORDER BY a.geocode_status, a.created_at DESC
            `, useStatus ? [status] : []);
            results.push(...assets);
        }

        return NextResponse.json(results);
    } catch (error) {
        console.error('Geocoding issues error:', error);
        return NextResponse.json([], { status: 200 });
    }
}
