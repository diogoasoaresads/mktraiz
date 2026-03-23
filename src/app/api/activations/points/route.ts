import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const db = await getDb();
        const points = await db.all('SELECT * FROM activation_points ORDER BY name ASC');
        return NextResponse.json(points);
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao buscar pontos de ativação' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, type, address_raw, lat, lng, flow_intensity, notes } = body;

        const db = await getDb();
        const id = uuidv4();

        await db.run(
            `INSERT INTO activation_points (id, name, type, address_raw, lat, lng, flow_intensity, notes) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, type, address_raw, lat, lng, flow_intensity, notes]
        );

        return NextResponse.json({ id, message: 'Ponto de ativação criado com sucesso' });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao criar ponto de ativação' }, { status: 500 });
    }
}
