import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: Request) {
    try {
        const db = await getDb();
        const { searchParams } = new URL(req.url);
        const schoolId = searchParams.get('schoolId');
        
        let query = 'SELECT l.*, s.brand_name FROM hub_brand_library l JOIN schools s ON l.school_id = s.id';
        const params: any[] = [];
        
        if (schoolId) {
            query += ' WHERE l.school_id = ?';
            params.push(schoolId);
        }
        
        const library = await db.all(query, params);
        
        return NextResponse.json({ success: true, library });
    } catch (error) {
        console.error('Library API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
