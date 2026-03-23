import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    const db = await getDb();

    // Single query with LEFT JOIN + COUNT to avoid N+1 pattern
    const results = await db.all(`
        SELECT 
            s.*,
            COUNT(u.id) as unitsCount
        FROM schools s
        LEFT JOIN units u ON u.school_id = s.id
        GROUP BY s.id
        ORDER BY s.brand_name
    `);

    const res = NextResponse.json(results);
    res.headers.set('Cache-Control', 'no-store');
    return res;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { brand_name, website } = body;

        if (!brand_name) {
            return NextResponse.json({ success: false, error: 'O nome da marca é obrigatório.' }, { status: 400 });
        }

        const db = await getDb();
        const id = uuidv4();

        await db.run(
            'INSERT INTO schools (id, brand_name, website, units_status, last_sync) VALUES (?, ?, ?, ?, ?)',
            [id, brand_name, website || null, 'seeded_ok', new Date().toISOString()]
        );

        return NextResponse.json({ success: true, id, message: 'Marca criada com sucesso.' });
    } catch (error: any) {
        console.error('Error creating school:', error);
        return NextResponse.json({ success: false, error: 'Erro ao criar a marca.' }, { status: 500 });
    }
}
