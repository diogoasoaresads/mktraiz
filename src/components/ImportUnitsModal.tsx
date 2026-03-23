"use client";

import { useState, useEffect } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2, Plus, Replace, ArrowRight } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ImportUnitsModalProps {
    isOpen: boolean;
    onClose: () => void;
    brandName: string;
    schoolId: string;
    onSuccess: () => void;
}

interface School {
    id: string;
    brand_name: string;
}

export default function ImportUnitsModal({ isOpen, onClose, brandName, schoolId, onSuccess }: ImportUnitsModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState<'idle' | 'parsing' | 'mapping' | 'preview' | 'uploading' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
    const [importResult, setImportResult] = useState<{ inserted: number; mode: string } | null>(null);
    const [schools, setSchools] = useState<School[]>([]);

    // Mapping state
    const [fileData, setFileData] = useState<any[]>([]);
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [columnMap, setColumnMap] = useState<Record<string, string>>({
        brand_name: '',
        unit_name: '',
        address_raw: '',
        city: '',
        state: '',
        website: '',
        lat: '',
        lng: ''
    });
    const [previewData, setPreviewData] = useState<any[]>([]);

    const isGlobal = schoolId === 'global';

    useEffect(() => {
        if (isOpen) {
            fetch('/api/schools')
                .then(res => res.json())
                .then(data => setSchools(data))
                .catch(err => console.error('Erro ao buscar escolas:', err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setProgress('idle');
            setImportResult(null);
            setFileData([]);
            setFileHeaders([]);
        }
    };

    const handleDataParsed = (data: any[], meta?: Papa.ParseMeta) => {
        const headers = meta?.fields || (data[0] ? Object.keys(data[0]) : []);
        setFileData(data);
        setFileHeaders(headers);

        const findHeader = (names: string[]) => {
            const normalizedNames = names.map(n => n.toLowerCase());
            return headers.find(h => {
                const normH = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
                return normalizedNames.some(n => normH.includes(n)) || normalizedNames.some(n => n.includes(normH));
            }) || '';
        };

        setColumnMap({
            brand_name: findHeader(['marca', 'brand', 'escola', 'school']),
            unit_name: findHeader(['unidade', 'unit', 'nome', 'name']),
            address_raw: findHeader(['endereco', 'address', 'localizacao', 'local', 'rua']),
            city: findHeader(['cidade', 'city', 'municipio']),
            state: findHeader(['uf', 'estado', 'state']),
            website: findHeader(['site', 'website', 'url']),
            lat: findHeader(['lat', 'latitude']),
            lng: findHeader(['lng', 'longitude', 'long', 'lon'])
        });

        setProgress('mapping');
        setIsImporting(false);
    };

    const generatePreview = () => {
        if (!columnMap.address_raw) {
            setError('A coluna de Endereço é obrigatória.');
            return;
        }

        const formatted = fileData.map(row => {
            const address = row[columnMap.address_raw];
            if (!address) return null;

            return {
                unit_name: columnMap.unit_name ? row[columnMap.unit_name] : 'Unidade Importada',
                brand_name: columnMap.brand_name ? row[columnMap.brand_name] : (isGlobal ? null : brandName),
                address_raw: address,
                city: columnMap.city ? row[columnMap.city] : null,
                state: columnMap.state ? row[columnMap.state] : null,
                website: columnMap.website ? row[columnMap.website] : null,
                lat: columnMap.lat ? parseFloat(String(row[columnMap.lat]).replace(',', '.')) || null : null,
                lng: columnMap.lng ? parseFloat(String(row[columnMap.lng]).replace(',', '.')) || null : null,
                school_id: isGlobal ? null : schoolId
            };
        }).filter(Boolean);

        if (formatted.length === 0) {
            setError('Nenhum dado válido encontrado para importação.');
            return;
        }

        setPreviewData(formatted);
        setProgress('preview');
    };

    const confirmImport = async () => {
        try {
            setProgress('uploading');
            setIsImporting(true);

            const res = await fetch('/api/units/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    schoolId,
                    units: previewData,
                    mode: importMode,
                    confirmGlobalReplace: importMode === 'replace' && isGlobal
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.details || 'Erro ao salvar unidades no servidor.');
            }

            const result = await res.json();
            setImportResult(result);
            setProgress('success');
            setTimeout(() => {
                onSuccess();
                onClose();
                setFile(null);
                setProgress('idle');
            }, 2000);
        } catch (err: any) {
            setError(err.message);
            setProgress('error');
        } finally {
            setIsImporting(false);
        }
    };

    const processImport = async () => {
        if (!file) return;

        if (importMode === 'replace') {
            const msg = isGlobal
                ? `AVISO CRÍTICO: Você selecionou "Substituir Tudo" para TODAS as marcas.\n\nIsso apagará TODAS as unidades do sistema inteiro e substituirá pelas da planilha.\n\nESTA AÇÃO É IRREVERSÍVEL. Deseja continuar?`
                : `AVISO: Você selecionou "Substituir Tudo".\n\nIsso apagará todas as unidades da marca "${brandName}" antes de importar.\n\nDeseja continuar?`;

            const confirmed = window.confirm(msg);
            if (!confirmed) return;
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
                    setError('Erro ao ler o arquivo CSV: ' + err.message);
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
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                handleDataParsed(jsonData);
            };
            reader.readAsBinaryString(file);
        } else {
            setError('Formato não suportado. Use .csv ou .xlsx');
            setProgress('error');
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="premium-card w-full max-w-lg bg-white overflow-hidden shadow-2xl scale-in duration-300">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight text-left">Importar Unidades</h3>
                        <p className="text-xs font-bold text-primary-600 uppercase tracking-widest text-left">{brandName}</p>
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
                            <div>
                                <h4 className="font-black text-slate-900 uppercase tracking-tighter text-xl">Sucesso!</h4>
                                <p className="text-sm text-slate-500 font-medium">
                                    {importResult
                                        ? `${importResult.inserted} unidades processadas.`
                                        : 'Importação concluída.'}
                                </p>
                            </div>
                        </div>
                    ) : progress === 'mapping' ? (
                        <div className="space-y-6">
                            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-start gap-3 text-left">
                                <AlertCircle className="text-amber-500 shrink-0" size={20} />
                                <div>
                                    <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-1">Mapeamento de Colunas</p>
                                    <p className="text-[10px] text-amber-600 font-medium">Associe os campos do sistema às colunas da sua planilha.</p>
                                </div>
                            </div>

                            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar text-left">
                                {[
                                    { key: 'address_raw', label: 'Endereço (Obrigatório)', required: true },
                                    { key: 'brand_name', label: 'Nome da Marca' },
                                    { key: 'unit_name', label: 'Nome da Unidade' },
                                    { key: 'city', label: 'Cidade' },
                                    { key: 'state', label: 'Estado (UF)' },
                                    { key: 'website', label: 'Site/Website' },
                                    { key: 'lat', label: 'Latitude' },
                                    { key: 'lng', label: 'Longitude' },
                                ].map(field => (
                                    <div key={field.key} className="flex flex-col gap-1.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                        <label className="text-[10px] font-black text-slate-600 uppercase flex items-center gap-1">
                                            {field.label} {field.required && <span className="text-red-500">*</span>}
                                        </label>
                                        <select
                                            value={columnMap[field.key] || ''}
                                            onChange={(e) => setColumnMap({ ...columnMap, [field.key]: e.target.value })}
                                            className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm"
                                        >
                                            <option value="">Não importar / Usar padrão</option>
                                            {fileHeaders.map(h => (
                                                <option key={h} value={h}>{h}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={generatePreview}
                                disabled={!columnMap.address_raw}
                                className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                Avançar para Pré-Visualização <ArrowRight size={16} />
                            </button>
                        </div>
                    ) : progress === 'preview' ? (
                        <div className="space-y-4 text-left">
                            <div className="space-y-1">
                                <p className="text-sm font-black text-slate-900 uppercase">Pré-Visualização ({previewData.length} unidades)</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Confira os dados antes de salvar no sistema</p>
                            </div>
                            <div className="overflow-auto max-h-60 border border-slate-100 rounded-2xl bg-slate-50/50 shadow-inner">
                                <table className="w-full text-left text-[10px]">
                                    <thead className="bg-white sticky top-0 shadow-sm">
                                        <tr>
                                            <th className="p-3 font-black text-slate-400 uppercase tracking-widest">Marca</th>
                                            <th className="p-3 font-black text-slate-400 uppercase tracking-widest">Unidade</th>
                                            <th className="p-3 font-black text-slate-400 uppercase tracking-widest">Endereço</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {previewData.slice(0, 10).map((item, idx) => (
                                            <tr key={idx} className="bg-transparent hover:bg-white transition-colors">
                                                <td className="p-3 font-bold text-slate-700">{item.brand_name || '-'}</td>
                                                <td className="p-3 font-medium text-slate-600">{item.unit_name}</td>
                                                <td className="p-3 text-slate-500 max-w-[200px] truncate">{item.address_raw}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {previewData.length > 10 && (
                                <p className="text-[10px] text-slate-400 text-center font-bold">Mostrando 10 de {previewData.length} unidades.</p>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setProgress('mapping')}
                                    className="flex-1 h-12 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:bg-slate-50"
                                >
                                    Voltar
                                </button>
                                <button
                                    onClick={confirmImport}
                                    disabled={isImporting}
                                    className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isImporting ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar Importação'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-4">
                                <div className="space-y-2 text-left">
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest text-left">Modo de Importação</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button
                                            onClick={() => setImportMode('append')}
                                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 ${importMode === 'append'
                                                ? 'border-primary-500 bg-primary-50/50 shadow-lg shadow-primary-500/10'
                                                : 'border-slate-100 hover:border-slate-200 bg-white'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${importMode === 'append' ? 'bg-primary-500 text-white' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                <Plus size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className={`text-sm font-bold ${importMode === 'append' ? 'text-primary-700' : 'text-slate-600'}`}>Acrescentar</p>
                                                <p className="text-[10px] text-slate-400 font-medium leading-tight">Adiciona aos existentes</p>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => setImportMode('replace')}
                                            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all duration-300 ${importMode === 'replace'
                                                ? 'border-amber-500 bg-amber-50/50 shadow-lg shadow-amber-500/10'
                                                : 'border-slate-100 hover:border-slate-200 bg-white'
                                                }`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${importMode === 'replace' ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-400'
                                                }`}>
                                                <Replace size={20} />
                                            </div>
                                            <div className="text-left">
                                                <p className={`text-sm font-bold ${importMode === 'replace' ? 'text-amber-700' : 'text-slate-600'}`}>Substituir</p>
                                                <p className="text-[10px] text-slate-400 font-medium leading-tight">Apaga unidades atuais</p>
                                            </div>
                                        </button>
                                    </div>
                                </div>

                                {importMode === 'replace' && (
                                    <div className="flex flex-col gap-2 p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-200 animate-in slide-in-from-top-2 shadow-sm text-left">
                                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest">
                                            <AlertCircle size={16} className="shrink-0" />
                                            <span>Atenção: Ação Irreversível</span>
                                        </div>
                                        <p className="text-xs font-bold leading-relaxed">
                                            {isGlobal
                                                ? "Isso apagará TODAS as unidades de TODAS as marcas do sistema."
                                                : `Todas as unidades da marca ${brandName} serão removidas.`}
                                        </p>
                                    </div>
                                )}

                                <div className="relative group">
                                    <input
                                        type="file"
                                        accept=".csv, .xlsx, .xls"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    />
                                    <div className={`p-10 border-2 border-dashed rounded-3xl flex flex-col items-center justify-center gap-4 transition-all duration-300 ${file ? 'border-primary-500 bg-primary-50/10' : 'border-slate-200 hover:border-primary-400 hover:bg-slate-50'}`}>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${file ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-slate-100 text-slate-400 group-hover:bg-primary-100 group-hover:text-primary-500'}`}>
                                            <Upload size={24} />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-bold text-slate-700">{file ? file.name : "Clique ou arraste sua planilha"}</p>
                                            <p className="text-xs text-slate-400 font-medium">{file ? `${(file.size / 1024).toFixed(1)} KB` : "Arquivos .csv ou .xlsx"}</p>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-bold animate-in slide-in-from-top-2 text-left">
                                        <AlertCircle size={16} className="shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={processImport}
                                disabled={!file || isImporting}
                                className={`w-full h-14 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-30 shadow-xl ${importMode === 'replace' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-primary-600'}`}
                            >
                                {isImporting ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span>Lendo Arquivo...</span>
                                    </>
                                ) : (
                                    <>
                                        Avançar para Mapeamento <ArrowRight size={18} />
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
