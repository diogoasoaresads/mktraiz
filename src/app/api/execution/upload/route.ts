import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const lineId = formData.get('lineId') as string;
        const docType = formData.get('docType') as string; // 'proposal' | 'contract' | 'invoice'
        const file = formData.get('file') as File;

        if (!lineId || !docType || !file) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        const db = await getDb();
        const line = await db.get('SELECT * FROM plan_lines WHERE id = ?', [lineId]);
        if (!line) return NextResponse.json({ error: 'Line not found' }, { status: 404 });

        // Save file
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'docs');
        await mkdir(uploadDir, { recursive: true });
        const ext = file.name.split('.').pop() || 'pdf';
        const fileName = `${docType}_${lineId.slice(0, 8)}_${Date.now()}.${ext}`;
        const filePath = path.join(uploadDir, fileName);
        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        const publicPath = `/uploads/docs/${fileName}`;

        // Update the correct column
        const columnMap: Record<string, string> = {
            proposal: 'proposal_file_path',
            contract: 'contract_file_path',
            invoice: 'invoice_file_path'
        };
        const column = columnMap[docType];
        if (!column) return NextResponse.json({ error: 'Invalid doc type' }, { status: 400 });

        await db.run(`UPDATE plan_lines SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [publicPath, lineId]);

        // Audit
        await db.run(`
            INSERT INTO audit_events (id, entity_type, entity_id, action, after_json)
            VALUES (?, 'plan_lines', ?, 'upload_document', ?)
        `, [uuidv4(), lineId, JSON.stringify({ docType, filePath: publicPath })]);

        return NextResponse.json({ success: true, path: publicPath });
    } catch (error) {
        console.error('Upload error:', error);
        return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 });
    }
}
