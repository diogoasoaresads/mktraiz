import { NextResponse } from 'next/server';
import { processGeocodingQueue } from '@/lib/geocoding';

export async function POST() {
    try {
        await processGeocodingQueue();
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Geocoding API error:', error);
        return NextResponse.json({ success: false, error: 'Failed to run geocoding' }, { status: 500 });
    }
}
