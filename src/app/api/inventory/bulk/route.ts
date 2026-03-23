import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function DELETE(req: Request) {
    try {
        const { assetIds } = await req.json();

        if (!Array.isArray(assetIds) || assetIds.length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhum ativo selecionado.' }, { status: 400 });
        }

        const db = await getDb();

        const placeholders = assetIds.map(() => '?').join(',');

        // Opting not to forcefully cascade delete plan_lines, 
        // but if foreign keys block it, we must delete from plan_lines first.
        // Let's delete the plan_lines first to be safe, so we can actually delete the assets.
        await db.run(`
            DELETE FROM plan_lines WHERE asset_id IN (${placeholders})
        `, [...assetIds]);

        const result = await db.run(`
            DELETE FROM media_assets WHERE id IN (${placeholders})
        `, [...assetIds]);

        return NextResponse.json({ success: true, deleted: result.changes });
    } catch (error: any) {
        console.error('Bulk Delete Inventory Error:', error);
        return NextResponse.json(
            { success: false, error: 'Falha ao excluir os ativos selecionados.' },
            { status: 500 }
        );
    }
}
