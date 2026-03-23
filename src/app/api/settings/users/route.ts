import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const db = await getDb();
        const users = await db.all('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC');
        return NextResponse.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching users:', error);
        return NextResponse.json({ success: false, error: 'Erro ao buscar usuários' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, email, role } = await request.json();
        const db = await getDb();
        const id = uuidv4();

        await db.run(
            'INSERT INTO users (id, name, email, role) VALUES (?, ?, ?, ?)',
            [id, name, email, role || 'user']
        );

        return NextResponse.json({ success: true, id });
    } catch (error: any) {
        console.error('Error creating user:', error);
        if (error.message?.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ success: false, error: 'Email já cadastrado' }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: 'Erro ao criar usuário' }, { status: 500 });
    }
}
