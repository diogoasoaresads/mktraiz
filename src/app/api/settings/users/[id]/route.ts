import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const db = await getDb();
        
        await db.run('DELETE FROM users WHERE id = ?', [id]);
        
        return NextResponse.json({ success: true, message: 'Usuário removido' });
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ success: false, error: 'Erro ao deletar usuário' }, { status: 500 });
    }
}
