import * as XLSX from 'xlsx';

/**
 * Exports any array of objects to an Excel file (.xlsx).
 * @param data - Array of objects to export
 * @param fileName - Name of the file (without extension)
 * @param sheetName - Name of the sheet inside the file
 */
export function exportToExcel(data: Record<string, any>[], fileName: string, sheetName = 'Dados') {
    if (!data || data.length === 0) {
        alert('Nenhum dado para exportar.');
        return;
    }

    // Build the worksheet from JSON
    const ws = XLSX.utils.json_to_sheet(data);

    // Auto-size columns
    const colWidths = Object.keys(data[0]).map(key => ({
        wch: Math.max(key.length, ...data.map(row => String(row[key] ?? '').length))
    }));
    ws['!cols'] = colWidths;

    // Create workbook and append sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Download file
    XLSX.writeFile(wb, `${fileName}.xlsx`);
}
