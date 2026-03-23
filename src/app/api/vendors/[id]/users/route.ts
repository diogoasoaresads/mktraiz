import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

function hashPassword(password: string) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
    try {
        const db = await getDb();
        const users = await db.all('SELECT id, email, name, role, created_at FROM vendor_users WHERE vendor_id = ?', [params.id]);
        return NextResponse.json(users);
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao buscar usuários' }, { status: 500 });
    }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
    try {
        const { email, password, name } = await req.json();
        const db = await getDb();

        const id = uuidv4();
        const passwordHash = hashPassword(password);

        await db.run(
            `INSERT INTO vendor_users (id, vendor_id, email, password_hash, name)
             VALUES (?, ?, ?, ?, ?)`,
            [id, params.id, email, passwordHash, name]
        );

        return NextResponse.json({ id, success: true });
    } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
            return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 });
        }
        return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 });
    }
}
