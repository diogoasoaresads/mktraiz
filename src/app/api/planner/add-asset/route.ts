import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
    try {
        const { scenarioId, assetId, campaignId } = await req.json();

        if (!scenarioId || !assetId || !campaignId) {
            return NextResponse.json({ error: 'Faltam parâmetros' }, { status: 400 });
        }

        const db = await getDb();

        // 1. Pegar dados do ativo
        const asset = await db.get('SELECT * FROM media_assets WHERE id = ?', [assetId]);
        if (!asset) return NextResponse.json({ error: 'Ativo não encontrado' }, { status: 404 });

        // 2. Pegar unidades da campanha para achar a mais próxima
        const campaign = await db.get('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
        const targetUnitIds = JSON.parse(campaign.target_unit_ids || '[]');
        const targetSchoolIds = JSON.parse(campaign.target_school_ids || '[]');

        let units = [];
        if (targetUnitIds.length > 0) {
            units = await db.all(`SELECT * FROM units WHERE id IN (${targetUnitIds.map(() => '?').join(',')})`, targetUnitIds);
        } else if (targetSchoolIds.length > 0) {
            units = await db.all(`SELECT * FROM units WHERE school_id IN (${targetSchoolIds.map(() => '?').join(',')})`, targetSchoolIds);
        }

        if (units.length === 0) {
            return NextResponse.json({ error: 'Nenhuma unidade alvo encontrada para esta campanha' }, { status: 400 });
        }

        // Função Haversine simples
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

        let nearestUnit = units[0];
        let minDist = getDist(asset.lat, asset.lng, units[0].lat, units[0].lng);

        for (const u of units) {
            const d = getDist(asset.lat, asset.lng, u.lat, u.lng);
            if (d < minDist) {
                minDist = d;
                nearestUnit = u;
            }
        }

        // 3. Inserir na plan_lines
        const lineId = uuidv4();
        const unitPrice = asset.base_price || 0;
        const startDate = campaign.start_date;
        const endDate = campaign.end_date;

        // Calcular total_price (baseado em meses ou dias?)
        // Por enquanto, se tiver datas, vamos assumir 1 mês se não soubermos melhor, ou apenas o unit_price
        const totalPrice = unitPrice; // Simplificação inicial

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
            unitPrice, totalPrice, startDate, endDate
        ]);

        return NextResponse.json({ success: true, lineId });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Erro ao adicionar ativo' }, { status: 500 });
    }
}
