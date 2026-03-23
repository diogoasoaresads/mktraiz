import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { getGeographicMetricsFromIBGE } from '@/lib/geo.server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get('lat') || '0');
    const lng = parseFloat(searchParams.get('lng') || '0');

    // Generate heatmap points around the given center using real IBGE data
    const pointPromises: Promise<object>[] = [];
    for (let i = 0; i < 20; i++) {
        const pLat = lat + (Math.random() - 0.5) * 0.05;
        const pLng = lng + (Math.random() - 0.5) * 0.05;
        pointPromises.push(
            getGeographicMetricsFromIBGE(pLat, pLng).then(m => ({
                lat: pLat,
                lng: pLng,
                intensity: m.flow_index,
                population: m.population,
                avg_income: m.income,
                source: m.source,
            }))
        );
    }

    const points = await Promise.all(pointPromises);

    // Fetch real competitors from database
    let competitors: object[] = [];
    try {
        const db = await getDb();
        const rows = await db.all(
            'SELECT id, name, brand, address, lat, lng, category, estimated_students FROM competitors WHERE lat IS NOT NULL AND lng IS NOT NULL'
        );
        competitors = rows.map(r => ({
            id: r.id,
            name: r.name,
            lat: r.lat,
            lng: r.lng,
            kind: 'competitor',
            meta: {
                brand_name: r.brand || r.name,
                category: r.category || 'escola',
                address: r.address,
                estimated_students: r.estimated_students,
            }
        }));
    } catch (err) {
        console.warn('[IBGE route] Could not load competitors from DB:', err);
    }

    return NextResponse.json({ points, competitors });
}
