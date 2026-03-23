import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { geocodeAddress } from '@/lib/geocoding';
import { v4 as uuidv4 } from 'uuid';

// GET: List all competitors
export async function GET() {
    try {
        const db = await getDb();
        const competitors = await db.all('SELECT * FROM competitors ORDER BY name ASC');
        return NextResponse.json({ success: true, competitors });
    } catch (error) {
        console.error('[API competitors GET]', error);
        return NextResponse.json({ success: false, error: 'Erro ao buscar concorrentes.' }, { status: 500 });
    }
}

// POST: Create a new competitor
export async function POST(req: Request) {
    try {
        const { name, brand, address, category, estimated_students } = await req.json();

        if (!name || !address) {
            return NextResponse.json({ success: false, error: 'Nome e endereço são obrigatórios.' }, { status: 400 });
        }

        const db = await getDb();

        // Geocode address
        let lat: number | null = null;
        let lng: number | null = null;

        const geo = await geocodeAddress(address);
        if (geo) {
            lat = geo.lat;
            lng = geo.lng;
        }

        const id = uuidv4();

        await db.run(
            `INSERT INTO competitors (id, name, brand, address, lat, lng, category, estimated_students)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, brand || null, address, lat, lng, category || 'escola', estimated_students || null]
        );

        const competitor = await db.get('SELECT * FROM competitors WHERE id = ?', [id]);

        return NextResponse.json({ success: true, competitor });
    } catch (error) {
        console.error('[API competitors POST]', error);
        return NextResponse.json({ success: false, error: 'Erro ao cadastrar concorrente.' }, { status: 500 });
    }
}
