import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'hub');
        await mkdir(uploadDir, { recursive: true });

        const ext = file.name.split('.').pop();
        const fileName = `hub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const filePath = path.join(uploadDir, fileName);
        
        const bytes = await file.arrayBuffer();
        await writeFile(filePath, Buffer.from(bytes));

        const publicPath = `/uploads/hub/${fileName}`;

        return NextResponse.json({ 
            success: true, 
            path: publicPath,
            name: file.name
        });
    } catch (error) {
        console.error('Upload Hub Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
