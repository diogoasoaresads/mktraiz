import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { event_id, point_id, status, team_notes, cost, impact_leads } = body;

        const db = await getDb();
        const id = uuidv4();

        await db.run(
            `INSERT INTO activations (id, event_id, point_id, status, team_notes, cost, impact_leads) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id, event_id, point_id, status || 'planejado', team_notes, cost || 0, impact_leads || 0]
        );

        return NextResponse.json({ id, message: 'Ativação agendada com sucesso' });
    } catch (error) {
        console.error('Erro ao agendar ativação:', error);
        return NextResponse.json({ error: 'Erro ao agendar ativação' }, { status: 500 });
    }
}
