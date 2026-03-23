"use client";

import { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, ArrowRight, Download } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ImportInventoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

interface Vendor {
    id: string;
    name: string;
}

export default function ImportInventoryModal({ isOpen, onClose, onSuccess }: ImportInventoryModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState<'idle' | 'parsing' | 'mapping' | 'preview' | 'uploading' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<{ inserted: number; updated: number; invalid: number; total: number } | null>(null);

    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedVendorId, setSelectedVendorId] = useState<string>('');

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

    useEffect(() => {
        if (isOpen) {
            fetch('/api/vendors')
                .then(res => res.json())
                .then(data => setVendors(data))
                .catch(err => console.error('Erro ao buscar fornecedores:', err));
        }
    }, [isOpen]);

    // Fetch saved mapping when vendor changes
    useEffect(() => {
        if (selectedVendorId) {
            fetch(`/api/inventory/template/mapping?vendorId=${selectedVendorId}`)
                .then(res => res.json())
                .then(data => {
                    if (data && !data.error) {
                        setColumnMap(data);
                    } else {
                        setColumnMap({ type: '', address_raw: '', city: '', state: '', base_price: '', lat: '', lng: '' });
                    }
                })
                .catch(() => setColumnMap({ type: '', address_raw: '', city: '', state: '', base_price: '', lat: '', lng: '' }));
        }
    }, [selectedVendorId]);

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
        // Remove currency symbols and whitespace
        str = str.replace(/[R$\s]/g, '');
        // Detect format: if there's a comma after a dot (1.000,50) -> Brazilian
        if (/\.\d{3}/.test(str) && str.includes(',')) {
            str = str.replace(/\./g, '').replace(',', '.');
        } else {
            str = str.replace(',', '.');
        }
        return parseFloat(str) || 0;
    };

    const parseLat = (val: any): number | null => {
        if (val === null || val === undefined || val === '') return null;
        let str = String(val).trim().replace(',', '.');
        const num = parseFloat(str);
        if (isNaN(num) || num < -90 || num > 90) return null;
        return num;
    };

    const parseLng = (val: any): number | null => {
        if (val === null || val === undefined || val === '') return null;
        let str = String(val).trim().replace(',', '.');
        const num = parseFloat(str);
        if (isNaN(num) || num < -180 || num > 180) return null;
        return num;
    };

    const mapRowToAsset = (row: any, map: Record<string, string>) => {
        return {
            type: map.type ? row[map.type] : 'Outdoor',
            address_raw: map.address_raw ? row[map.address_raw] : null,
            city: map.city ? row[map.city] : null,
            state: map.state ? row[map.state] : null,
            base_price: parsePrice(map.base_price ? row[map.base_price] : '0'),
            lat: map.lat ? parseLat(row[map.lat]) : null,
            lng: map.lng ? parseLng(row[map.lng]) : null
        };
    };

    const [previewData, setPreviewData] = useState<any[]>([]);

    const showPreview = (data: any[], map: Record<string, string>) => {
        if (!selectedVendorId) {
            setError('Por favor, selecione um fornecedor.');
            setProgress('error');
            return;
        }
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
        if (!selectedVendorId) {
            setError('Por favor, selecione um fornecedor.');
            setProgress('error');
            return;
        }

        try {
            setProgress('uploading');
            setIsImporting(true);

            if (previewData.length === 0) {
                setIsImporting(false);
                setProgress('mapping');
                setError('Nenhum dado válido para importar.');
                return;
            }

            const res = await fetch('/api/inventory/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vendor_id: selectedVendorId,
                    assets: previewData,
                    file_name: file?.name || 'upload'
                })
            });

            if (!res.ok) throw new Error('Erro ao salvar inventário no servidor.');

            // Save column mapping
            await fetch('/api/inventory/template/mapping', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vendor_id: selectedVendorId, column_map: columnMap })
            });

            const result = await res.json();
            setImportResult(result);
            setProgress('success');
            setTimeout(() => {
                onSuccess();
                onClose();
                setFile(null);
                setSelectedVendorId('');
                setProgress('idle');
                setPreviewData([]);
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
                return normalizedNames.some(n => normH.includes(n)) || normalizedNames.some(n => n.includes(normH));
            }) || '';
        };

        const autoMap = {
            type: columnMap.type || findHeader(['tipo', 'type', 'midia', 'media', 'formato', 'meio']),
            address_raw: columnMap.address_raw || findHeader(['endereco', 'address', 'localizacao', 'local', 'logradouro', 'rua', 'avenida', 'localizacao']),
            city: columnMap.city || findHeader(['cidade', 'city', 'municipio', 'distrito', 'localidade']),
            state: columnMap.state || findHeader(['uf', 'estado', 'state', 'regiao']),
            base_price: columnMap.base_price || findHeader(['preco', 'price', 'valor', 'custo', 'tabela', 'montante']),
            lat: columnMap.lat || findHeader(['lat', 'latitude', 'coord_x', 'coordx', 'posicao_x', 'posicaox', 'cx', 'latitude_x', 'lat_x']),
            lng: columnMap.lng || findHeader(['lng', 'longitude', 'long', 'lon', 'coord_y', 'coordy', 'posicao_y', 'posicaoy', 'cy', 'longitude_y', 'long_y', 'lng_y'])
        };

        setColumnMap(autoMap);

        // Always go to mapping stage to allow user verification
        setIsImporting(false);
        setProgress('mapping');
    };

    const processImport = async () => {
        if (!file) return;
        if (!selectedVendorId) {
            setError('Por favor, selecione um fornecedor antes de importar.');
            return;
        }

        setIsImporting(true);
        setProgress('parsing');

        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => handleDataParsed(results.data, results.meta),
                error: (err) => {
                    setError('Erro ao ler CSV: ' + err.message);
                    setProgress('error');
                    setIsImporting(false);
                }
            });
        } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);
                handleDataParsed(jsonData);
            };
            reader.readAsBinaryString(file);
        } else {
            setError('Formato não suportado. Use CSV ou XLSX.');
            setProgress('error');
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="premium-card w-full max-w-lg bg-white overflow-hidden shadow-2xl scale-in duration-300">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Importar Inventário</h3>
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest text-left">Upload de Peças de Mídia</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    {progress === 'success' ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center animate-bounce">
                                <CheckCircle2 size={32} />
                            </div>
                            <h4 className="font-black text-slate-900 uppercase tracking-tighter text-xl">Sucesso!</h4>
                            <p className="text-sm text-slate-500 font-medium">{importResult?.inserted} ativos importados.</p>
                        </div>
                    ) : progress === 'mapping' ? (
                        <div className="space-y-6">
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3">
                                <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                <div>
                                    <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-1">Mapeamento Necessário</p>
                                    <p className="text-[10px] text-amber-600 font-medium">As colunas da planilha não foram reconhecidas automaticamente. Associe-as abaixo.</p>
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {[
                                    { key: 'address_raw', label: 'Endereço (Obrigatório)' },
                                    { key: 'type', label: 'Tipo de Mídia (Ex: Outdoor)' },
                                    { key: 'city', label: 'Cidade' },
                                    { key: 'state', label: 'Estado (UF)' },
                                    { key: 'base_price', label: 'Valor Base / Unitário' },
                                    { key: 'lat', label: 'Latitude (Recomendado)' },
                                    { key: 'lng', label: 'Longitude (Recomendado)' }
                                ].map(field => (
                                    <div key={field.key} className="flex flex-col gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1">
                                            {field.label}
                                            {field.key === 'address_raw' && <span className="text-red-500">*</span>}
                                        </label>
                                        <select
                                            value={columnMap[field.key] || ''}
                                            onChange={(e) => setColumnMap({ ...columnMap, [field.key]: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm"
                                        >
                                            <option value="">Não importar (Usar valor padrão)</option>
                                            {fileHeaders.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => showPreview(fileData, columnMap)}
                                disabled={!columnMap.address_raw || isImporting}
                                className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isImporting ? <Loader2 size={20} className="animate-spin" /> : (
                                    <>
                                        Pré-Visualizar Importação <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    ) : progress === 'preview' ? (
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <p className="text-sm font-black text-slate-900">Pré-Visualização ({previewData.length} itens)</p>
                                <p className="text-xs text-slate-500">Confira os dados antes de importar.</p>
                            </div>
                            <div className="overflow-auto max-h-60 border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 sticky top-0">
                                        <tr>
                                            <th className="p-2 font-black text-slate-400 text-[10px] uppercase">Tipo</th>
                                            <th className="p-2 font-black text-slate-400 text-[10px] uppercase">Endereço</th>
                                            <th className="p-2 font-black text-slate-400 text-[10px] uppercase">Cidade</th>
                                            <th className="p-2 font-black text-slate-400 text-[10px] uppercase">UF</th>
                                            <th className="p-2 font-black text-slate-400 text-[10px] uppercase">Lat/Lng</th>
                                            <th className="p-2 font-black text-slate-400 text-[10px] uppercase text-right">Preço</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {previewData.slice(0, 10).map((item, idx) => (
                                            <tr key={idx} className="border-t border-slate-100">
                                                <td className="p-2 font-semibold text-slate-700">{item.type}</td>
                                                <td className="p-2 text-slate-600 max-w-[200px] truncate">{item.address_raw}</td>
                                                <td className="p-2 text-slate-500">{item.city || '-'}</td>
                                                <td className="p-2 text-slate-500">{item.state || '-'}</td>
                                                <td className="p-2">
                                                    {item.lat !== null && item.lng !== null && !isNaN(item.lat) && !isNaN(item.lng) ? (
                                                        <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                                                            {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
                                                        </span>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">Busca Automática</span>
                                                    )}
                                                </td>
                                                <td className="p-2 text-right font-bold text-slate-900">
                                                    {item.base_price > 0 ? `R$ ${item.base_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {previewData.length > 10 && (
                                <p className="text-[10px] text-slate-400 text-center">Mostrando 10 de {previewData.length} itens.</p>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setProgress('mapping')}
                                    className="flex-1 h-12 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:border-slate-400"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={confirmImport}
                                    disabled={isImporting}
                                    className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isImporting ? <Loader2 size={20} className="animate-spin" /> : (
                                        <>
                                            Confirmar Importação <ArrowRight size={16} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                                    <span>Fornecedor Responsável</span>
                                    <span className="text-primary-600">Obrigatório</span>
                                </label>
                                <select
                                    value={selectedVendorId}
                                    onChange={(e) => setSelectedVendorId(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20"
                                >
                                    <option value="">Selecione o fornecedor...</option>
                                    {vendors.map(v => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-2xl border border-primary-100/50">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-600 shadow-sm">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-xs font-black text-primary-600 uppercase tracking-widest">Colunas Recomendadas</p>
                                    <p className="text-[10px] text-slate-500 leading-tight font-medium">endereco, tipo, cidade, uf, preco, lat, lng</p>
                                </div>
                                <a
                                    href="/api/inventory/template"
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-lg text-[10px] font-black uppercase text-primary-600 shadow-sm hover:bg-primary-50 transition-colors shrink-0"
                                >
                                    <Download size={14} /> Baixar Modelo
                                </a>
                            </div>

                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".csv, .xlsx, .xls"
                                    onChange={handleFileChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                />
                                <div className={`p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 transition-all duration-300 ${file ? 'border-primary-500 bg-primary-50/10' : 'border-slate-200 hover:border-primary-400 hover:bg-slate-50'}`}>
                                    <Upload size={24} className={file ? 'text-primary-500' : 'text-slate-400'} />
                                    <div className="text-center">
                                        <p className="font-bold text-slate-700">{file ? file.name : "Clique ou arraste a planilha"}</p>
                                        <p className="text-xs text-slate-400 font-medium">CSV ou XLSX</p>
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-bold">
                                    <AlertCircle size={16} />
                                    <span>{error}</span>
                                </div>
                            )}

                            <button
                                onClick={processImport}
                                disabled={!file || !selectedVendorId || isImporting}
                                className="w-full h-14 bg-slate-900 hover:bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-30"
                            >
                                {isImporting ? <Loader2 size={20} className="animate-spin m-auto" /> : 'Avançar'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
