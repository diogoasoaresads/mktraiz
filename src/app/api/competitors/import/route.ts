import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { geocodeAddress } from '@/lib/geocoding';
import { v4 as uuidv4 } from 'uuid';

export interface ImportRow {
    name: string;
    brand?: string;
    address: string;
    category?: string;
    estimated_students?: number | null;
    lat?: string | number | null;
    lng?: string | number | null;
}

export async function POST(req: Request) {
    try {
        const { rows }: { rows: ImportRow[] } = await req.json();

        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            return NextResponse.json({ success: false, error: 'Nenhuma linha válida encontrada.' }, { status: 400 });
        }

        const db = await getDb();
        const results: { name: string; status: 'ok' | 'error'; reason?: string; geo: boolean }[] = [];

        for (const row of rows) {
            if (!row.name?.trim() || !row.address?.trim()) {
                results.push({ name: row.name || '(sem nome)', status: 'error', reason: 'Nome ou endereço ausente.', geo: false });
                continue;
            }

            try {
                let lat: number | null = null;
                let lng: number | null = null;

                // Use provided coordinates if valid, otherwise geocode
                const providedLat = row.lat ? parseFloat(String(row.lat)) : NaN;
                const providedLng = row.lng ? parseFloat(String(row.lng)) : NaN;

                if (!isNaN(providedLat) && !isNaN(providedLng) && Math.abs(providedLat) <= 90 && Math.abs(providedLng) <= 180) {
                    lat = providedLat;
                    lng = providedLng;
                } else {
                    const geo = await geocodeAddress(row.address.trim());
                    if (geo) { lat = geo.lat; lng = geo.lng; }
                }

                const id = uuidv4();
                const category = row.category?.trim() || 'escola';
                const students = row.estimated_students ? Number(row.estimated_students) : null;

                await db.run(
                    `INSERT INTO competitors (id, name, brand, address, lat, lng, category, estimated_students)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                     ON CONFLICT DO NOTHING`,
                    [id, row.name.trim(), row.brand?.trim() || null, row.address.trim(), lat, lng, category, students]
                );

                results.push({ name: row.name.trim(), status: 'ok', geo: !!(lat && lng) });
            } catch {
                results.push({ name: row.name?.trim() || '?', status: 'error', reason: 'Erro ao inserir.', geo: false });
            }
        }

        const ok = results.filter(r => r.status === 'ok').length;
        const errors = results.filter(r => r.status === 'error').length;
        const geoOk = results.filter(r => r.geo).length;

        return NextResponse.json({ success: true, ok, errors, geoOk, results });
    } catch (error) {
        console.error('[import API]', error);
        return NextResponse.json({ success: false, error: 'Erro interno na importação.' }, { status: 500 });
    }
}
