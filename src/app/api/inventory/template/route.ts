import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
    try {
        const data = [
            {
                tipo: 'Outdoor',
                endereco: 'Av. Paulista, 1000 - Bela Vista',
                cidade: 'São Paulo',
                estado: 'SP',
                preco_base: '1500,00',
                latitude: -23.5614,
                longitude: -46.6559,
                observacao: 'Frente ao MASP (Exemplo)'
            },
            {
                tipo: 'Painel LED',
                endereco: 'Rua das Flores, 123',
                cidade: 'Rio de Janeiro',
                estado: 'RJ',
                preco_base: '3200,00',
                latitude: -22.9068,
                longitude: -43.1729,
                observacao: ''
            }
        ];

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo');

        // Set column widths
        worksheet['!cols'] = [
            { wch: 15 }, // tipo
            { wch: 40 }, // endereco
            { wch: 20 }, // cidade
            { wch: 10 }, // estado
            { wch: 15 }, // preco
            { wch: 30 }  // obs
        ];

        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

        return new Response(buffer, {
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': 'attachment; filename="Modelo_Importacao_OOH.xlsx"'
            }
        });
    } catch (error) {
        console.error('Template export error:', error);
        return NextResponse.json({ success: false, error: 'Export failed' }, { status: 500 });
    }
}
