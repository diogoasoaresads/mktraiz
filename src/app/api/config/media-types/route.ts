import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = await getDb();
        const rows = await db.all('SELECT DISTINCT type FROM media_assets WHERE type IS NOT NULL AND type != "" ORDER BY type ASC');

        const mediaTypes = rows.map(row => ({
            value: row.type,
            label: row.type
        }));

        return NextResponse.json(mediaTypes);
    } catch (error) {
        console.error('Error fetching media types:', error);
        return NextResponse.json({ error: 'Failed to fetch media types' }, { status: 500 });
    }
}
