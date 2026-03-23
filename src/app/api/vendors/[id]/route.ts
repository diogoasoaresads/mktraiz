import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const data = await req.json();
        const db = await getDb();

        await db.run(`
            UPDATE vendors 
            SET name = ?, 
                contact_name = ?, 
                contact_email = ?, 
                contact_phone = ?, 
                cities_covered = ?,
                payment_terms = ?,
                lead_time_days = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            data.name,
            data.contact_name,
            data.contact_email,
            data.contact_phone,
            data.cities_covered,
            data.payment_terms,
            data.lead_time_days,
            params.id
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update vendor error:', error);
        return NextResponse.json({ success: false, error: 'Falha ao atualizar fornecedor.' }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const db = await getDb();
        // Check if there are assets linked to this vendor
        const assets = await db.get('SELECT COUNT(*) as count FROM media_assets WHERE vendor_id = ?', [params.id]);
        if (assets.count > 0) {
            return NextResponse.json({
                success: false,
                error: 'Não é possível excluir este fornecedor pois existem ativos vinculados a ele. Remova o inventário primeiro.'
            }, { status: 400 });
        }

        await db.run('DELETE FROM vendors WHERE id = ?', [params.id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete vendor error:', error);
        return NextResponse.json({ success: false, error: 'Falha ao excluir fornecedor.' }, { status: 500 });
    }
}
