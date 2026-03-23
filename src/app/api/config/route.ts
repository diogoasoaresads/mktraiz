import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
    try {
        const db = await getDb();
        const configs = await db.all('SELECT key, value FROM app_config');
        const configMap: Record<string, string> = {};
        configs.forEach((c: any) => { configMap[c.key] = c.value; });
        return NextResponse.json(configMap);
    } catch (error) {
        console.error('Config GET error:', error);
        return NextResponse.json({}, { status: 200 });
    }
}

export async function POST(req: Request) {
    try {
        const { key, value } = await req.json();
        if (!key) return NextResponse.json({ error: 'Key is required' }, { status: 400 });

        const db = await getDb();
        await db.run(`
            INSERT INTO app_config (key, value, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `, [key, value]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Config POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save config' }, { status: 500 });
    }
}
