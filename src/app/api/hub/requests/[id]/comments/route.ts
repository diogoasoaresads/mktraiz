import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const db = await getDb();
        
        const comments = await db.all(
            'SELECT * FROM hub_request_comments WHERE request_id = ? ORDER BY created_at ASC',
            [id]
        );
        
        return NextResponse.json({ success: true, comments });
    } catch (error) {
        console.error('Comments API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const id = params.id;
        const { text, userName, attachmentUrl, attachmentName } = await req.json();
        const db = await getDb();
        
        const commentId = uuidv4();
        
        await db.run(`
            INSERT INTO hub_request_comments (
                id, request_id, user_name, text, attachment_url, attachment_name
            ) VALUES (?, ?, ?, ?, ?, ?)
        `, [commentId, id, userName || 'Sistema', text, attachmentUrl || null, attachmentName || null]);
        
        // Also log in history
        await db.run(`
            INSERT INTO hub_request_history (id, request_id, actor_name, action, description)
            VALUES (?, ?, ?, ?, ?)
        `, [uuidv4(), id, userName || 'Sistema', 'comentario', `Comentário adicionado: ${text.slice(0, 30)}...`]);
        
        return NextResponse.json({ success: true, commentId });
    } catch (error) {
        console.error('Comments API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
