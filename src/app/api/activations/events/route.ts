import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
    try {
        const db = await getDb();
        const events = await db.all('SELECT * FROM events ORDER BY start_date ASC');
        return NextResponse.json(events);
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao buscar eventos' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { 
            name, type, description, start_date, end_date, school_ids, 
            team_size, target_leads, budget_planned, budget_executed 
        } = body;

        const db = await getDb();
        const id = uuidv4();

        await db.run(
            `INSERT INTO events (id, name, type, description, start_date, end_date, school_ids, team_size, target_leads, budget_planned, budget_executed) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, name, type, description, start_date, end_date, school_ids, team_size, target_leads, budget_planned, budget_executed]
        );

        return NextResponse.json({ id, message: 'Evento criado com sucesso' });
    } catch (error) {
        console.error('Erro ao criar evento:', error);
        return NextResponse.json({ error: 'Erro ao criar evento' }, { status: 500 });
    }
}
