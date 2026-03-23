import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
        return NextResponse.json({ error: 'campaignId is required' }, { status: 400 });
    }

    const db = await getDb();
    const scenarios = await db.all('SELECT * FROM scenarios WHERE campaign_id = ?', [campaignId]);
    return NextResponse.json(scenarios);
}
