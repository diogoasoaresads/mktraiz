import { NextResponse } from 'next/server';
import { runFullSeed } from '@/lib/seed';

export async function POST() {
    try {
        await runFullSeed();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Seed API error:', error);
        return NextResponse.json({ success: false, error: 'Failed to run seed' }, { status: 500 });
    }
}
