import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { cookies } from 'next/headers';

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    const partnerId = cookies().get('partner_token')?.value;
    if (!partnerId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    try {
        const { id } = params;
        const db = await getDb();

        // Verificar se o ativo pertence ao parceiro (extra segurança)
        const asset = await db.get('SELECT vendor_id FROM media_assets WHERE id = ?', [id]);
        if (!asset) return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 });
        
        if (asset.vendor_id.toLowerCase() !== partnerId.toLowerCase()) {
            return NextResponse.json({ error: 'Você não tem permissão para excluir este ativo' }, { status: 403 });
        }

        await db.run('DELETE FROM media_assets WHERE id = ?', [id]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete error:', error);
        return NextResponse.json({ error: 'Erro ao excluir ativo' }, { status: 500 });
    }
}
