import { NextResponse } from 'next/server';
import getDb from '@/lib/db';
import * as XLSX from 'xlsx';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const vendorId = searchParams.get('vendorId');
        const campaignId = searchParams.get('campaignId');

        const db = await getDb();

        let query = `
            SELECT 
                v.name as fornecedor,
                c.name as campanha,
                u.unit_name as unidade,
                a.type as tipo_midia,
                a.address_raw as endereco,
                l.start_date as inicio,
                l.end_date as termino,
                COALESCE(l.unit_price, a.base_price, 0) as preco_unitario,
                l.total_price as preco_total,
                l.status,
                l.quantity as quantidade,
                l.cluster_id,
                l.overlap_mode
            FROM plan_lines l
            JOIN campaigns c ON l.campaign_id = c.id
            JOIN units u ON l.unit_id = u.id
            JOIN media_assets a ON l.asset_id = a.id
            JOIN vendors v ON a.vendor_id = v.id
            WHERE l.status IN ('selected', 'approved', 'purchased', 'running', 'completed')
        `;
        const params: any[] = [];

        if (vendorId) {
            query += ' AND a.vendor_id = ?';
            params.push(vendorId);
        }
        if (campaignId) {
            query += ' AND l.campaign_id = ?';
            params.push(campaignId);
        }

        query += ' ORDER BY v.name, u.unit_name';

        const rawData = await db.all(query, params);

        // Agrupamento por Cluster (Dominância)
        const consolidatedData: any[] = [];
        const clusters: Record<string, any> = {};

        rawData.forEach((item: any) => {
            if (item.cluster_id && item.overlap_mode === 'dominance') {
                if (!clusters[item.cluster_id]) {
                    clusters[item.cluster_id] = {
                        ...item,
                        tipo_midia: `[BLOCO] ${item.tipo_midia}`,
                        endereco: `${item.endereco} (+ cluster)`,
                        preco_total: 0
                    };
                    consolidatedData.push(clusters[item.cluster_id]);
                }
                clusters[item.cluster_id].preco_total += item.preco_total;
            } else {
                consolidatedData.push(item);
            }
        });

        // Limpar campos técnicos antes de gerar XLSX
        const finalData = consolidatedData.map(({ cluster_id, overlap_mode, ...rest }) => rest);

        if (finalData.length === 0) {
            return NextResponse.json({ error: 'Nenhum dado encontrado para os filtros selecionados.' }, { status: 404 });
        }

        // Generate XLSX
        const worksheet = XLSX.utils.json_to_sheet(finalData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Plano de Inserção');

        // Set column widths
        worksheet['!cols'] = [
            { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 15 },
            { wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
            { wch: 15 }, { wch: 12 }, { wch: 10 }
        ];

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        const vendorName = vendorId ? finalData[0]?.fornecedor?.replace(/\s+/g, '_') : 'todos';
        const fileName = `PI_${vendorName}_${new Date().toISOString().slice(0, 10)}.xlsx`;

        return new Response(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="${fileName}"`
            }
        });
    } catch (error) {
        console.error('PI export error:', error);
        return NextResponse.json({ success: false, error: 'Export failed' }, { status: 500 });
    }
}
