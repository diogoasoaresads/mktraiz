import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    try {
        const { password } = await req.json();

        const expectedPassword = process.env.PLANNER_PASSWORD || 'raiz2024';
        const secretToken = process.env.AUTH_SECRET_TOKEN || 'raiz-ooh360-secret';

        if (password !== expectedPassword) {
            return NextResponse.json({ success: false, error: 'Senha incorreta.' }, { status: 401 });
        }

        const response = NextResponse.json({ success: true });

        // Set HttpOnly cookie that expires in 8 hours
        response.cookies.set('auth_token', secretToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 8, // 8 hours
            path: '/',
        });

        return response;
    } catch {
        return NextResponse.json({ success: false, error: 'Erro interno.' }, { status: 500 });
    }
}

export async function DELETE() {
    const response = NextResponse.json({ success: true });
    response.cookies.delete('auth_token');
    return response;
}
