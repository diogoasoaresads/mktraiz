"use client";

import { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ImportPartnerInventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ImportPartnerInventoryModal({ isOpen, onClose, onSuccess }: ImportPartnerInventoryModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState<'idle' | 'parsing' | 'mapping' | 'preview' | 'uploading' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<{ inserted: number; total: number } | null>(null);

    // Mapping state
    const [fileData, setFileData] = useState<any[]>([]);
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [columnMap, setColumnMap] = useState<Record<string, string>>({
        type: '',
        address_raw: '',
        city: '',
        state: '',
        base_price: '',
        lat: '',
        lng: ''
    });

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setProgress('idle');
            setFileHeaders([]);
            setFileData([]);
            setColumnMap({ type: '', address_raw: '', city: '', state: '', base_price: '', lat: '', lng: '' });
        }
    };

    const parsePrice = (raw: any): number => {
        if (raw == null || raw === '') return 0;
        let str = String(raw).trim();
        str = str.replace(/[R$\s]/g, '').replace(',', '.');
        return parseFloat(str) || 0;
    };

    const mapRowToAsset = (row: any, map: Record<string, string>) => {
        return {
            type: map.type ? row[map.type] : 'Outdoor',
            address_raw: map.address_raw ? row[map.address_raw] : null,
            city: map.city ? row[map.city] : null,
            state: map.state ? row[map.state] : null,
            base_price: parsePrice(map.base_price ? row[map.base_price] : '0'),
            lat: map.lat ? parseFloat(String(row[map.lat]).replace(',', '.')) : null,
            lng: map.lng ? parseFloat(String(row[map.lng]).replace(',', '.')) : null
        };
    };

    const [previewData, setPreviewData] = useState<any[]>([]);

    const showPreview = (data: any[], map: Record<string, string>) => {
        const formatted = data.map(r => mapRowToAsset(r, map)).filter(a => a.address_raw);
        if (formatted.length === 0) {
            setProgress('mapping');
            setError('A coluna "Endereço" precisa ter valores.');
            return;
        }
        setPreviewData(formatted);
        setProgress('preview');
    };

    const confirmImport = async () => {
        try {
            setProgress('uploading');
            setIsImporting(true);

            // Fetch current partner ID from auth status or just rely on backend session/cookie
            const res = await fetch('/api/partner/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bulk: true, assets: previewData })
            });

            if (!res.ok) throw new Error('Erro ao salvar inventário.');

            const result = await res.json();
            setImportResult({ inserted: result.count || previewData.length, total: previewData.length });
            setProgress('success');
            setTimeout(() => {
                onSuccess();
                onClose();
            }, 3000);
        } catch (err: any) {
            setError(err.message);
            setProgress('error');
        } finally {
            setIsImporting(false);
        }
    };

    const handleDataParsed = (data: any[], meta?: Papa.ParseMeta) => {
        const headers = meta?.fields || Object.keys(data[0] || {});
        setFileData(data);
        setFileHeaders(headers);

        const findHeader = (names: string[]) => {
            const normalizedNames = names.map(n => n.toLowerCase());
            return headers.find(h => {
                const normH = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                return normalizedNames.some(n => normH.includes(n));
            }) || '';
        };

        setColumnMap({
            type: findHeader(['tipo', 'type', 'midia']),
            address_raw: findHeader(['endereco', 'address', 'local']),
            city: findHeader(['cidade', 'city']),
            state: findHeader(['uf', 'estado', 'state']),
            base_price: findHeader(['preco', 'price', 'valor', 'tabela']),
            lat: findHeader(['lat', 'latitude']),
            lng: findHeader(['lng', 'longitude'])
        });

        setProgress('mapping');
    };

    const processImport = async () => {
        if (!file) return;
        setIsImporting(true);
        setProgress('parsing');

        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => handleDataParsed(results.data, results.meta),
                error: (err) => { setError(err.message); setProgress('error'); }
            });
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const jsonData = XLSX.utils.sheet_to_json<any>(workbook.Sheets[workbook.SheetNames[0]]);
                handleDataParsed(jsonData);
            };
            reader.readAsBinaryString(file);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900 uppercase">Importar Planilha</h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {progress === 'success' ? (
                        <div className="flex flex-col items-center py-10 text-center">
                            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h4 className="font-black text-slate-900 uppercase text-xl">Importado!</h4>
                            <p className="text-slate-500">{importResult?.inserted} ativos adicionados.</p>
                        </div>
                    ) : progress === 'mapping' ? (
                        <div className="space-y-6">
                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                {Object.entries(columnMap).map(([key, value]) => (
                                    <div key={key} className="flex flex-col gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-600 uppercase">{key.replace('_', ' ')}</label>
                                        <select
                                            value={value}
                                            onChange={(e) => setColumnMap({ ...columnMap, [key]: e.target.value })}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold"
                                        >
                                            <option value="">(Ignorar)</option>
                                            {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => showPreview(fileData, columnMap)} className="w-full bg-primary-600 text-white py-4 rounded-2xl font-black uppercase text-xs">Pré-Visualizar</button>
                        </div>
                    ) : progress === 'preview' ? (
                        <div className="space-y-4">
                            <h4 className="text-sm font-black text-slate-900 uppercase">Total: {previewData.length} itens</h4>
                            <div className="overflow-auto max-h-40 border border-slate-200 rounded-xl">
                                <table className="w-full text-[10px] text-left">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="p-2">TIPO</th>
                                            <th className="p-2">ENDEREÇO</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 5).map((d, i) => (
                                            <tr key={i} className="border-t border-slate-50">
                                                <td className="p-2 font-bold">{d.type}</td>
                                                <td className="p-2">{d.address_raw}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setProgress('mapping')} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs">Voltar</button>
                                <button onClick={confirmImport} className="flex-1 bg-primary-600 text-white py-4 rounded-2xl font-black uppercase text-xs">Confirmar</button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="relative border-2 border-dashed border-slate-200 rounded-[2rem] p-12 flex flex-col items-center justify-center gap-4 hover:border-primary-400 transition-all">
                                <input type="file" onChange={handleFileChange} className="absolute inset-0 opacity-0 cursor-pointer" accept=".csv, .xlsx, .xls" />
                                <Upload size={32} className="text-slate-300" />
                                <p className="text-sm font-bold text-slate-500">{file ? file.name : "Clique para selecionar sua planilha"}</p>
                            </div>
                            {error && <p className="text-red-500 text-xs font-bold text-center">{error}</p>}
                            <button onClick={processImport} disabled={!file} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-xs disabled:opacity-30">Avançar</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
