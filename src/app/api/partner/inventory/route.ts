import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';

export async function GET(req: Request) {
    const partnerId = cookies().get('partner_token')?.value;
    if (!partnerId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const db = await getDb();
    // Use LOWER to handle any case mismatch in IDs and ensure fresh data
    const assets = await db.all(
        'SELECT * FROM media_assets WHERE LOWER(vendor_id) = LOWER(?) ORDER BY created_at DESC', 
        [partnerId]
    );
    
    return NextResponse.json(assets, {
        headers: {
            'Cache-Control': 'no-store, max-age=0'
        }
    });
}

export async function POST(req: Request) {
    const partnerId = cookies().get('partner_token')?.value;
    if (!partnerId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    try {
        const data = await req.json();
        const db = await getDb();

        if (data.bulk && Array.isArray(data.assets)) {
            const stmt = await db.prepare(
                `INSERT INTO media_assets (id, vendor_id, type, address_raw, city, state, base_price, lat, lng, geocode_status, fingerprint_hash)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`
            );
            for (const asset of data.assets) {
                const fingerprint = `${asset.address_raw}-${asset.type}`.toLowerCase();
                await stmt.run([uuidv4(), partnerId, asset.type, asset.address_raw, asset.city, asset.state, asset.base_price, asset.lat || null, asset.lng || null, fingerprint]);
            }
            await stmt.finalize();
            return NextResponse.json({ success: true, count: data.assets.length });
        }

        const id = uuidv4();
        const fingerprint = `${data.address_raw}-${data.type}`.toLowerCase();
        await db.run(
            `INSERT INTO media_assets (id, vendor_id, type, address_raw, city, state, base_price, lat, lng, geocode_status, fingerprint_hash)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id, 
                partnerId, 
                data.type, 
                data.address_raw, 
                data.city, 
                data.state, 
                data.base_price, 
                data.lat ? parseFloat(data.lat) : null,
                data.lng ? parseFloat(data.lng) : null,
                data.lat && data.lng ? 'success' : 'pending',
                fingerprint
            ]
        );

        return NextResponse.json({ id, success: true });
    } catch (error) {
        console.error('Insert error:', error);
        return NextResponse.json({ error: 'Erro ao inserir ativo' }, { status: 500 });
    }
}

// Suporte para Edição Individual
export async function PUT(req: Request) {
    const partnerId = cookies().get('partner_token')?.value;
    if (!partnerId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    try {
        const data = await req.json();
        const { id, type, address_raw, city, state, base_price, lat, lng } = data;
        
        if (!id) return NextResponse.json({ error: 'ID do ativo é obrigatório' }, { status: 400 });

        const db = await getDb();
        
        // Verificar se o ativo pertence ao parceiro
        const asset = await db.get('SELECT vendor_id FROM media_assets WHERE id = ?', [id]);
        if (!asset) return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 });
        if (asset.vendor_id.toLowerCase() !== partnerId.toLowerCase()) {
            return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
        }

        const fingerprint = `${address_raw}-${type}`.toLowerCase();
        const geocodeStatus = lat && lng ? 'success' : 'pending';

        await db.run(
            `UPDATE media_assets 
             SET type = ?, address_raw = ?, city = ?, state = ?, base_price = ?, lat = ?, lng = ?, fingerprint_hash = ?, geocode_status = ?
             WHERE id = ? AND LOWER(vendor_id) = LOWER(?)`,
            [
                type, 
                address_raw, 
                city, 
                state, 
                base_price, 
                lat ? parseFloat(lat) : null, 
                lng ? parseFloat(lng) : null, 
                fingerprint, 
                geocodeStatus,
                id, 
                partnerId
            ]
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: 'Erro ao atualizar ativo' }, { status: 500 });
    }
}
