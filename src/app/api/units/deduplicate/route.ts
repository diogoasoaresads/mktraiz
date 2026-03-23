import { NextResponse } from 'next/server';
import { performDeduplication } from '@/lib/units/deduplicate';

export async function POST() {
    try {
        const result = await performDeduplication();
        return NextResponse.json(result);
    } catch (error) {
        console.error('Deduplication error:', error);
        return NextResponse.json({ success: false, error: 'Failed to deduplicate' }, { status: 500 });
    }
}
