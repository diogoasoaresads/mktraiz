import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function PUT(req: Request, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const data = await req.json();
        
        const db = await getDb();
        
        // Update lat, lng, and geocode_status to "ok" if coordinates are changed,
        // also reset geocode_suspect since user manually confirmed/edited it.
        await db.run(`
            UPDATE media_assets 
            SET lat = ?, lng = ?, geocode_status = 'ok', geocode_suspect = 0
            WHERE id = ?
        `, [
            data.lat !== undefined ? parseFloat(data.lat) : null,
            data.lng !== undefined ? parseFloat(data.lng) : null,
            id
        ]);
        
        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        console.error('Inventory PUT error:', error);
        return NextResponse.json({ success: false, error: 'Falha ao atualizar ativo.' }, { status: 500 });
    }
}
