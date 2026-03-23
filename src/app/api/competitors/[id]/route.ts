import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

// DELETE: Remove a competitor
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
    try {
        const db = await getDb();
        await db.run('DELETE FROM competitors WHERE id = ?', [params.id]);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API competitors DELETE]', error);
        return NextResponse.json({ success: false, error: 'Erro ao remover concorrente.' }, { status: 500 });
    }
}
