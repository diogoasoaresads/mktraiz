import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const { scenarioId, campaignId, items } = await req.json();

        if (!scenarioId || !campaignId || !items || !Array.isArray(items)) {
            return NextResponse.json({ error: 'Faltam parâmetros ou formato inválido' }, { status: 400 });
        }

        const db = await getDb();

        // 1. Pegar unidades da campanha para achar a mais próxima (cache para performance)
        const campaign = await db.get('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
        if (!campaign) return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });

        const targetUnitIds = JSON.parse(campaign.target_unit_ids || '[]');
        const targetSchoolIds = JSON.parse(campaign.target_school_ids || '[]');

        let units = [];
        if (targetUnitIds.length > 0) {
            units = await db.all(`SELECT * FROM units WHERE id IN (${targetUnitIds.map(() => '?').join(',')})`, targetUnitIds);
        } else if (targetSchoolIds.length > 0) {
            units = await db.all(`SELECT * FROM units WHERE school_id IN (${targetSchoolIds.map(() => '?').join(',')})`, targetSchoolIds);
        }

        if (units.length === 0) {
            // Se não houver alvos específicos, pega todas as unidades ativas para não quebrar a importação
            units = await db.all('SELECT * FROM units WHERE is_active = 1');
        }

        // Função Haversine
        const getDist = (lat1: number, lon1: number, lat2: number, lon2: number) => {
            const R = 6371;
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        };

        const results = {
            success: 0,
            errors: [] as string[],
            ignored: 0
        };

        // Inicia transação para performance e integridade
        await db.run('BEGIN TRANSACTION');

        for (const item of items) {
            const { externalCode, startDate, endDate, unitPrice } = item;

            if (!externalCode) {
                results.ignored++;
                continue;
            }

            // Achar o ativo via external_code
            const asset = await db.get('SELECT * FROM media_assets WHERE external_code = ?', [externalCode]);
            
            if (!asset) {
                results.errors.push(`Face ID ${externalCode} não encontrado.`);
                continue;
            }

            // Achar a unidade mais próxima
            let nearestUnit = units[0];
            let minDist = getDist(asset.lat, asset.lng, units[0].lat, units[0].lng);

            for (const u of units) {
                const d = getDist(asset.lat, asset.lng, u.lat, u.lng);
                if (d < minDist) {
                    minDist = d;
                    nearestUnit = u;
                }
            }

            // Inserir na plan_lines
            const lineId = uuidv4();
            const start = startDate || campaign.start_date;
            const end = endDate || campaign.end_date;
            const price = unitPrice || asset.base_price || 0;

            await db.run(`
                INSERT INTO plan_lines (
                    id, scenario_id, campaign_id, unit_id, asset_id, 
                    distance_km, score_final, status,
                    unit_price, total_price, start_date, end_date
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                lineId, scenarioId, campaignId, nearestUnit.id, asset.id,
                minDist, 1.0, 'selected',
                price, price, start, end
            ]);

            results.success++;
        }

        await db.run('COMMIT');

        return NextResponse.json({ 
            success: true, 
            summary: results 
        });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Erro ao processar importação' }, { status: 500 });
    }
}
