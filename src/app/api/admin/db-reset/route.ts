import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { action } = await req.json();
        const db = await getDb();

        switch (action) {
            case 'reset_units':
                await db.run('DELETE FROM units');
                // Reset schools status as well
                await db.run("UPDATE schools SET units_status = 'units_missing'");
                return NextResponse.json({ success: true, message: 'Todas as unidades foram removidas.' });

            case 'reset_inventory':
                await db.run('DELETE FROM media_assets');
                return NextResponse.json({ success: true, message: 'Todo o inventário foi removido.' });

            case 'reset_vendors':
                await db.run('DELETE FROM vendors');
                return NextResponse.json({ success: true, message: 'Todos os fornecedores foram removidos.' });

            case 'reset_campaigns':
                await db.run('DELETE FROM plan_proofs');
                await db.run('DELETE FROM plan_lines');
                await db.run('DELETE FROM scenarios');
                await db.run('DELETE FROM campaigns');
                return NextResponse.json({ success: true, message: 'Todas as campanhas e planos foram removidos.' });

            case 'reset_all':
                await db.run('DELETE FROM plan_proofs');
                await db.run('DELETE FROM plan_lines');
                await db.run('DELETE FROM scenarios');
                await db.run('DELETE FROM campaigns');
                await db.run('DELETE FROM media_assets');
                await db.run('DELETE FROM vendor_import_templates');
                await db.run('DELETE FROM vendor_imports');
                await db.run('DELETE FROM vendors');
                await db.run('DELETE FROM units');
                await db.run('DELETE FROM audit_events');
                await db.run("UPDATE schools SET units_status = 'units_missing'");
                return NextResponse.json({ success: true, message: 'BANCO DE DADOS REINICIADO COMPLETAMENTE.' });

            default:
                return NextResponse.json({ success: false, error: 'Ação inválida' }, { status: 400 });
        }
    } catch (error) {
        console.error('DB Reset API error:', error);
        return NextResponse.json({ success: false, error: 'Falha ao executar reset.' }, { status: 500 });
    }
}
