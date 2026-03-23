import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const schoolId = searchParams.get('schoolId');

    const db = await getDb();

    let query = `
        SELECT u.*, s.brand_name 
        FROM units u 
        JOIN schools s ON u.school_id = s.id
    `;
    const params: any[] = [];

    if (schoolId) {
        query += ' WHERE u.school_id = ?';
        params.push(schoolId);
    }

    query += ' ORDER BY s.brand_name, u.unit_name';

    const units = await db.all(query, params);
    const res = NextResponse.json(units);
    res.headers.set('Cache-Control', 'public, s-maxage=5, stale-while-revalidate=15');
    return res;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { school_id, name, address_raw, city, state, code, status, lat, lng } = body;

        if (!school_id || !name || !address_raw) {
            return NextResponse.json({ success: false, error: 'Escola, Nome e Endereço são obrigatórios.' }, { status: 400 });
        }

        const db = await getDb();
        const id = uuidv4();

        // Normalização simplificada de endereço para busca de coordenadas
        const addressNormalized = address_raw.toLowerCase().replace(/\s+/g, ' ');

        const hasCoords = lat !== undefined && lng !== undefined && lat !== null && lng !== null;
        const geocodeStatus = hasCoords ? 'success' : 'pending';

        await db.run(
            `INSERT INTO units (
                id, school_id, unit_name, address_raw, address_normalized,
                city, state, code, is_active, lat, lng, geocode_status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, school_id, name, address_raw, addressNormalized,
                city || null, state || null, code || null,
                status === 'inactive' ? 0 : 1,
                hasCoords ? parseFloat(lat) : null,
                hasCoords ? parseFloat(lng) : null,
                geocodeStatus
            ]
        );

        return NextResponse.json({ success: true, id, message: 'Unidade criada com sucesso.' });
    } catch (error: any) {
        console.error('Error creating unit:', error);
        return NextResponse.json({ success: false, error: 'Erro ao criar a unidade.' }, { status: 500 });
    }
}
