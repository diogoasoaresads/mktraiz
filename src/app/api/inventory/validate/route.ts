import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

// Haversine formula km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Detects obviously wrong coordinates for Brazil-based OOH assets.
 */
function detectCoordIssue(lat: number, lng: number): string | null {
    if (!isFinite(lat) || !isFinite(lng)) return 'Coordenada inválida';
    if (Math.abs(lng) > 180) return 'Longitude absurda';
    if (Math.abs(lat - lng) < 0.0001) return 'Lat e lng idênticas';
    if (lat > 0) return 'Latitude positiva (hemisfério norte)';
    if (lng > 0) return 'Longitude positiva (hemisfério leste)';
    if (lat < -35.0 || lat > -3.5) return 'Latitude fora do Brasil';
    if (lng < -74.0 || lng > -28.0) return 'Longitude fora do Brasil';
    return null;
}

async function ensureColumn(db: any) {
    try {
        await db.run('ALTER TABLE media_assets ADD COLUMN geocode_suspect INTEGER DEFAULT 0');
    } catch {
        // Already exists
    }
}

export async function POST() {
    try {
        const db = await getDb();
        await ensureColumn(db);

        const MAX_DIST_KM = 80;
        const assets: any[] = await db.all(`
            SELECT id, city, state, lat, lng, geocode_confidence
            FROM media_assets
            WHERE lat IS NOT NULL AND lng IS NOT NULL AND status = 'active'
        `);

        // Build city centroids skipping clear outliers
        const cityGroups: Record<string, { lat: number; lng: number }[]> = {};
        for (const a of assets) {
            const lat = Number(a.lat), lng = Number(a.lng);
            if (detectCoordIssue(lat, lng)) continue;
            const key = `${String(a.city || '').toLowerCase().trim()}|${String(a.state || '').toLowerCase().trim()}`;
            if (key !== '|') {
                if (!cityGroups[key]) cityGroups[key] = [];
                cityGroups[key].push({ lat, lng });
            }
        }

        const cityCentroids: Record<string, { lat: number; lng: number }> = {};
        for (const [key, pts] of Object.entries(cityGroups)) {
            const lats = pts.map(p => p.lat).sort((a, b) => a - b);
            const lngs = pts.map(p => p.lng).sort((a, b) => a - b);
            const mid = Math.floor(pts.length / 2);
            cityCentroids[key] = {
                lat: pts.length % 2 === 0 ? (lats[mid - 1] + lats[mid]) / 2 : lats[mid],
                lng: pts.length % 2 === 0 ? (lngs[mid - 1] + lngs[mid]) / 2 : lngs[mid],
            };
        }

        let suspectCount = 0, clearCount = 0;
        for (const asset of assets) {
            const lat = Number(asset.lat), lng = Number(asset.lng);
            const issue = detectCoordIssue(lat, lng);
            const lowConf = (asset.geocode_confidence != null ? Number(asset.geocode_confidence) : 1) < 0.4;
            
            let isSuspect = false;
            if (issue || lowConf) isSuspect = true;
            else {
                const key = `${String(asset.city || '').toLowerCase().trim()}|${String(asset.state || '').toLowerCase().trim()}`;
                const centroid = cityCentroids[key];
                if (centroid && haversineKm(lat, lng, centroid.lat, centroid.lng) > MAX_DIST_KM) isSuspect = true;
            }

            await db.run('UPDATE media_assets SET geocode_suspect = ? WHERE id = ?', [isSuspect ? 1 : 0, asset.id]);
            if (isSuspect) suspectCount++; else clearCount++;
        }

        return NextResponse.json({
            success: true,
            suspects: suspectCount,
            cleared: clearCount,
            message: `Validação concluída: ${suspectCount} suspeito(s) encontrado(s), ${clearCount} válido(s).`
        });
    } catch (err: any) {
        console.error('[validate POST]', err);
        return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
}

export async function GET() {
    try {
        const db = await getDb();
        await ensureColumn(db);

        const result: any = await db.get(`
            SELECT COUNT(*) as total,
                   SUM(CASE WHEN geocode_suspect = 1 THEN 1 ELSE 0 END) as suspects
            FROM media_assets 
            WHERE status = 'active' AND lat IS NOT NULL
        `);

        const total = Number(result?.total || 0);
        const suspects = Number(result?.suspects || 0);

        // Force no cache headers
        return new NextResponse(JSON.stringify({
            total,
            suspects,
            suspect_percentage: total > 0 ? Math.round((suspects / total) * 100) : 0,
            timestamp: Date.now()
        }), {
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });
    } catch (err: any) {
        console.error('[validate GET]', err);
        return NextResponse.json({ total: 0, suspects: 0, suspect_percentage: 0 });
    }
}
