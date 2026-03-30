import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const db = await getDb();
        const pipelines = await db.all('SELECT * FROM hub_pipelines ORDER BY created_at DESC');
        return NextResponse.json({ success: true, pipelines });
    } catch (error) {
        console.error('Error fetching pipelines:', error);
        return NextResponse.json({ success: false, error: 'Erro ao buscar quadros' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const { name, description, stages } = await request.json();
        const db = await getDb();
        const id = name.toLowerCase().replace(/\s+/g, '-');

        await db.run(
            'INSERT INTO hub_pipelines (id, name, description, stages_json) VALUES (?, ?, ?, ?)',
            [id, name, description, JSON.stringify(stages)]
        );

        return NextResponse.json({ success: true, id });
    } catch (error) {
        console.error('Error creating pipeline:', error);
        return NextResponse.json({ success: false, error: 'Erro ao criar quadro' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const { requestId, newStatus } = await request.json();
        const db = await getDb();
        
        // Buscar status antigo para o log
        const oldData = await db.get('SELECT status FROM hub_content_requests WHERE id = ?', [requestId]);
        const oldStatus = oldData?.status || 'desconhecido';

        await db.run(
            'UPDATE hub_content_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [newStatus, requestId]
        );

        // Registrar no histórico
        await db.run(`
            INSERT INTO hub_request_history (id, request_id, actor_name, action, description, old_status, new_status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            uuidv4(), 
            requestId, 
            'Sistema', 
            'mudanca_status', 
            `Status alterado de ${oldStatus} para ${newStatus}`,
            oldStatus,
            newStatus
        ]);

        return NextResponse.json({ success: true, message: 'Status atualizado' });
    } catch (error) {
        console.error('PATCH Pipeline Error:', error);
        return NextResponse.json({ success: false, error: 'Erro ao atualizar status' }, { status: 500 });
    }
}
