import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { unit_name, address_raw, city, state, lat, lng } = await req.json();
        const db = await getDb();

        const address_normalized = address_raw.toLowerCase().trim().replace(/\s+/g, ' ');

        let latVal = lat !== undefined ? lat : null;
        let lngVal = lng !== undefined ? lng : null;
        let geocodeStatusCalc = `CASE WHEN address_raw != (SELECT address_raw FROM units WHERE id = '${params.id}') THEN 'pending' ELSE geocode_status END`;

        if (latVal !== null && lngVal !== null) {
            geocodeStatusCalc = "'success'";
        }

        await db.run(`
            UPDATE units 
            SET unit_name = ?, 
                address_raw = ?, 
                address_normalized = ?, 
                city = ?, 
                state = ?,
                lat = ?,
                lng = ?,
                geocode_status = ${geocodeStatusCalc},
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [unit_name, address_raw, address_normalized, city, state, latVal, lngVal, params.id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update unit error:', error);
        return NextResponse.json({ success: false, error: 'Falha ao atualizar unidade.' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const db = await getDb();
        await db.run('DELETE FROM units WHERE id = ?', [params.id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete unit error:', error);
        return NextResponse.json({ success: false, error: 'Falha ao excluir unidade.' }, { status: 500 });
    }
}
