import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function POST(req: Request) {
    try {
        const { lineId, unitPrice, negotiatedPrice, startDate, endDate, overlapMode, clusterId } = await req.json();

        if (!lineId) {
            return NextResponse.json({ error: 'lineId is required' }, { status: 400 });
        }

        const db = await getDb();

        // Calcular total_price
        let total_price = unitPrice || 0;
        if (startDate && endDate) {
            const start = new Date(startDate);
            const end = new Date(endDate);
            const diffTime = Math.abs(end.getTime() - start.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            total_price = (unitPrice || 0) * (diffDays / 30);
        }

        await db.run(`
            UPDATE plan_lines 
            SET unit_price = ?, 
                negotiated_price = ?,
                total_price = ?, 
                start_date = ?, 
                end_date = ?,
                overlap_mode = COALESCE(?, overlap_mode),
                cluster_id = COALESCE(?, cluster_id),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [
            unitPrice, 
            negotiatedPrice !== undefined ? negotiatedPrice : null, 
            total_price, 
            startDate, 
            endDate, 
            overlapMode, 
            clusterId, 
            lineId
        ]);

        return NextResponse.json({ success: true, total_price });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Erro ao atualizar linha' }, { status: 500 });
    }
}
