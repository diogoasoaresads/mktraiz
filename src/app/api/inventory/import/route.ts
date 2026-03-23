import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const { vendor_id, assets, file_name } = await req.json();

        if (!vendor_id) {
            return NextResponse.json({ success: false, error: 'Fornecedor não informado.' }, { status: 400 });
        }

        const db = await getDb();
        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        let invalid = 0;

        const fingerprintCounts: Record<string, number> = {};

        for (const asset of assets) {
            const id = uuidv4();
            const addressRaw = String(asset.address_raw || '').trim();
            if (!addressRaw) {
                invalid++;
                continue;
            }

            const addressNormalized = addressRaw.toLowerCase().replace(/\s+/g, ' ');

            const baseHashString = `${vendor_id}-${asset.external_code || ''}-${addressNormalized}-${asset.type}`;
            const baseFingerprint = crypto.createHash('md5')
                .update(baseHashString)
                .digest('hex');

            fingerprintCounts[baseFingerprint] = (fingerprintCounts[baseFingerprint] || 0) + 1;
            const fingerprint = `${baseFingerprint}-${fingerprintCounts[baseFingerprint]}`;

            try {
                const hasCoords = asset.lat !== null && asset.lng !== null && !isNaN(asset.lat) && !isNaN(asset.lng);
                const geocodeStatus = hasCoords ? 'ok' : 'pending';

                await db.run(`
                    INSERT INTO media_assets (
                        id, vendor_id, type, address_raw, address_normalized, 
                        city, state, base_price, fingerprint_hash, status, lat, lng, geocode_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    id, vendor_id, asset.type, asset.address_raw, addressNormalized,
                    asset.city || null, asset.state || null, asset.base_price || 0,
                    fingerprint, 'active',
                    hasCoords ? asset.lat : null,
                    hasCoords ? asset.lng : null,
                    geocodeStatus
                ]);
                inserted++;
            } catch (err: any) {
                if (err.message?.includes('UNIQUE constraint failed')) {
                    const hasCoords = asset.lat !== null && asset.lng !== null && !isNaN(asset.lat) && !isNaN(asset.lng);
                    // Upsert: update price, status, and coords for existing assets
                    await db.run(`
                        UPDATE media_assets SET 
                            base_price = COALESCE(?, base_price),
                            city = COALESCE(?, city),
                            state = COALESCE(?, state),
                            lat = COALESCE(?, lat),
                            lng = COALESCE(?, lng),
                            geocode_status = CASE WHEN ? = 1 THEN 'ok' ELSE geocode_status END,
                            status = 'active',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE fingerprint_hash = ?
                    `, [
                        asset.base_price || null, asset.city || null, asset.state || null,
                        hasCoords ? asset.lat : null, hasCoords ? asset.lng : null,
                        hasCoords ? 1 : 0,
                        fingerprint
                    ]);
                    updated++;
                    continue;
                }
                throw err;
            }
        }

        // Record in vendor_imports
        const importId = uuidv4();
        await db.run(`
            INSERT INTO vendor_imports (id, vendor_id, file_name, file_path, row_count_total, row_count_inserted, row_count_updated, row_count_invalid)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [importId, vendor_id, file_name || 'upload', '', assets.length, inserted, updated, invalid]);

        return NextResponse.json({
            success: true,
            inserted,
            updated,
            skipped,
            invalid,
            total: assets.length
        });
    } catch (error) {
        console.error('Import Inventory Error:', error);
        return NextResponse.json({ success: false, error: 'Falha na importação.' }, { status: 500 });
    }
}
