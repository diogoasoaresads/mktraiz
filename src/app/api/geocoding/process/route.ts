import { NextResponse } from 'next/server';
import { processGeocodingQueue } from '@/lib/geocoding';

export async function POST() {
    try {
        await processGeocodingQueue();
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Geocoding process failed' }, { status: 500 });
    }
}
