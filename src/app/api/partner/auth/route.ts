import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import crypto from 'crypto';

// Helper to hash password
function hashPassword(password: string) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 });
        }

        const db = await getDb();
        const hashedPassword = hashPassword(password);
        
        const user = await db.get(
            `SELECT u.*, v.name as vendor_name 
             FROM vendor_users u 
             JOIN vendors v ON u.vendor_id = v.id 
             WHERE u.email = ? AND u.password_hash = ?`, 
            [email, hashedPassword]
        );

        if (!user) {
            return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
        }

        const response = NextResponse.json({ 
            success: true, 
            vendorName: user.vendor_name,
            userName: user.name 
        });
        
        // Set cookie with the vendor ID (token)
        response.cookies.set('partner_token', user.vendor_id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7 // 1 week
        });

        return response;
    } catch (error) {
        console.error('Auth error:', error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}

export async function DELETE() {
    const response = NextResponse.json({ success: true });
    response.cookies.set('partner_token', '', { maxAge: 0 });
    return response;
}
