import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { processGeocodingQueue } from '@/lib/geocoding';

export async function POST(req: Request) {
    try {
        const { action } = await req.json();
        const db = await getDb();

        if (action === 'reset_all') {
            await db.run(`
                UPDATE media_assets 
                SET lat = NULL, lng = NULL, geocode_status = "pending", geocode_confidence = NULL
            `);
            const result = await db.get('SELECT COUNT(*) as count FROM media_assets WHERE geocode_status = "pending"');
            return NextResponse.json({ success: true, count: result?.count || 0, message: 'Todos os ativos foram resetados para reprocessamento.' });

        } else if (action === 'reset_errors') {
            await db.run(`
                UPDATE media_assets 
                SET geocode_status = "pending" 
                WHERE geocode_status = "error" OR lat IS NULL
            `);
            const result = await db.get('SELECT COUNT(*) as count FROM media_assets WHERE geocode_status = "pending"');
            return NextResponse.json({ success: true, count: result?.count || 0, message: 'Ativos com erro foram resetados.' });

        } else if (action === 'reset_suspects') {
            await db.run(`
                UPDATE media_assets 
                SET lat = NULL, lng = NULL, geocode_status = "pending", geocode_confidence = NULL
                WHERE geocode_suspect = 1
            `);
            const result = await db.get('SELECT COUNT(*) as count FROM media_assets WHERE geocode_status = "pending"');
            return NextResponse.json({ success: true, count: result?.count || 0, message: 'Ativos suspeitos foram resetados para re-processamento.' });

        } else if (action === 'process_batch') {
            // Process up to 10 assets (and 10 units) according to geocoding.ts
            await processGeocodingQueue();

            // Check remaining
            const result = await db.get(`
                SELECT COUNT(*) as count 
                FROM media_assets 
                WHERE geocode_status = "pending"
            `);

            return NextResponse.json({
                success: true,
                remaining: result?.count || 0
            });

        } else {
            return NextResponse.json({ success: false, error: 'Ação inválida.' }, { status: 400 });
        }
    } catch (error: any) {
        console.error('Force Geocode Error:', error);
        return NextResponse.json(
            { success: false, error: 'Falha ao processar geocodificação.' },
            { status: 500 }
        );
    }
}
