import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const lineId = formData.get('lineId') as string;
        const note = (formData.get('note') as string) || '';
        const files = formData.getAll('files') as File[];

        if (!lineId || files.length === 0) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const db = await getDb();
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proofs');
        await mkdir(uploadDir, { recursive: true });

        const saved: string[] = [];
        for (const file of files) {
            const ext = file.name.split('.').pop() || 'jpg';
            const fileName = `proof_${lineId.slice(0, 8)}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
            const filePath = path.join(uploadDir, fileName);
            const bytes = await file.arrayBuffer();
            await writeFile(filePath, Buffer.from(bytes));
            const publicPath = `/uploads/proofs/${fileName}`;

            await db.run(`
                INSERT INTO plan_proofs (id, plan_line_id, file_path, note, taken_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            `, [uuidv4(), lineId, publicPath, note]);

            saved.push(publicPath);
        }

        return NextResponse.json({ success: true, count: saved.length, paths: saved });
    } catch (error) {
        console.error('Proof upload error:', error);
        return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
    }
}

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const lineId = searchParams.get('lineId');
        if (!lineId) return NextResponse.json([]);

        const db = await getDb();
        const proofs = await db.all('SELECT * FROM plan_proofs WHERE plan_line_id = ? ORDER BY created_at DESC', [lineId]);
        return NextResponse.json(proofs);
    } catch (error) {
        console.error('Proof GET error:', error);
        return NextResponse.json([]);
    }
}
