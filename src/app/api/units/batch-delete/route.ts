import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { ids } = await req.json();

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ success: false, error: 'Lista de IDs inválida.' }, { status: 400 });
        }

        const db = await getDb();

        // SQLite doesn't support arrays directly in WHERE IN, 
        // so we build the placeholders.
        const placeholders = ids.map(() => '?').join(',');
        const query = `DELETE FROM units WHERE id IN (${placeholders})`;

        const result = await db.run(query, ids);

        return NextResponse.json({
            success: true,
            deleted: result?.changes || 0
        });
    } catch (error) {
        console.error('Batch delete error:', error);
        return NextResponse.json({ success: false, error: 'Erro ao excluir unidades em massa.' }, { status: 500 });
    }
}
