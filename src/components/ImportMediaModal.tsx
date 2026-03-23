"use client";

import React, { useState, useRef } from 'react';
import { 
    X, 
    Upload, 
    FileText, 
    Download, 
    AlertCircle, 
    CheckCircle2, 
    Loader2,
    Database
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ImportMediaModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    scenarioId: string;
    campaignId: string;
}

export default function ImportMediaModal({ isOpen, onClose, onSuccess, scenarioId, campaignId }: ImportMediaModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<any | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleDownloadTemplate = () => {
        const headers = ["externalCode", "startDate", "endDate", "unitPrice"];
        const exampleData = [
            ["F001", "2024-05-01", "2024-05-31", "1500.00"],
            ["F002", "2024-06-01", "2024-06-30", "2200.00"]
        ];
        
        const csvContent = [headers.join(","), ...exampleData.map(e => e.join(","))].join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "template_importacao_midia.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const processFile = async () => {
        if (!file) return;
        setIsParsing(true);
        setError(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const data = e.target?.result;
            let items: any[] = [];

            try {
                if (file.name.endsWith('.csv')) {
                    const csvData = Papa.parse(data as string, { header: true, skipEmptyLines: true });
                    items = csvData.data;
                } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    items = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                }

                // Normalizar campos (mapear variantes de nomes de colunas)
                const normalizedItems = items.map(item => ({
                    externalCode: item.externalCode || item.external_code || item.ID || item.FaceID,
                    startDate: item.startDate || item.start_date || item.inicio || item.Inicio,
                    endDate: item.endDate || item.end_date || item.fim || item.Fim,
                    unitPrice: parseFloat(item.unitPrice || item.unit_price || item.preco || item.Preco || 0)
                }));

                await sendToApi(normalizedItems);
            } catch (err) {
                console.error(err);
                setError("Erro ao processar o arquivo. Verifique o formato.");
                setIsParsing(false);
            }
        };

        if (file.name.endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            reader.readAsBinaryString(file);
        }
    };

    const sendToApi = async (items: any[]) => {
        setIsImporting(true);
        try {
            const res = await fetch('/api/planner/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenarioId, campaignId, items })
            });

            const data = await res.json();
            if (res.ok) {
                setSummary(data.summary);
            } else {
                setError(data.error || "Erro na importação.");
            }
        } catch (err) {
            setError("Erro de conexão com a API.");
        } finally {
            setIsParsing(false);
            setIsImporting(false);
        }
    };

    const reset = () => {
        setFile(null);
        setSummary(null);
        setError(null);
        onClose();
        if (summary?.success > 0) onSuccess();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[4000] flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
                <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
                            <Database size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">Importar Mídia</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Acrescentar itens contratados ao plano</p>
                        </div>
                    </div>
                    <button onClick={reset} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </header>

                <div className="p-8 space-y-6">
                    {summary ? (
                        <div className="space-y-6 py-4">
                            <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                                <CheckCircle2 size={40} />
                            </div>
                            <div className="text-center space-y-1">
                                <h3 className="text-xl font-black text-slate-900">Importação Concluída!</h3>
                                <p className="text-sm text-slate-500 font-medium font-inter">Seu plano de mídia foi atualizado com sucesso.</p>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 text-center">
                                    <span className="block text-2xl font-black text-emerald-600 leading-none">{summary.success}</span>
                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mt-1">Importados</span>
                                </div>
                                <div className="bg-rose-50/50 p-4 rounded-2xl border border-rose-100 text-center">
                                    <span className="block text-2xl font-black text-rose-600 leading-none">{summary.errors.length}</span>
                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mt-1">Erros</span>
                                </div>
                                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 text-center">
                                    <span className="block text-2xl font-black text-slate-600 leading-none">{summary.ignored}</span>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Ignorados</span>
                                </div>
                            </div>

                            {summary.errors.length > 0 && (
                                <div className="max-h-32 overflow-y-auto p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                    <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <AlertCircle size={12} /> Detalhes dos erros:
                                    </p>
                                    <ul className="space-y-1">
                                        {summary.errors.map((err: string, idx: number) => (
                                            <li key={idx} className="text-xs text-rose-500 font-medium">• {err}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={reset}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10"
                            >
                                Fechar e Atualizar Plano
                            </button>
                        </div>
                    ) : (
                        <>
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className={`group relative border-2 border-dashed rounded-[32px] p-12 text-center transition-all cursor-pointer bg-slate-50/30
                                    ${file ? 'border-primary-500 bg-primary-50/20' : 'border-slate-200 hover:border-primary-400 hover:bg-slate-50'}
                                `}
                            >
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept=".csv,.xlsx,.xls"
                                    className="hidden" 
                                />
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-300
                                    ${file ? 'bg-primary-600 text-white scale-110' : 'bg-white text-slate-400 group-hover:scale-110 shadow-sm'}
                                `}>
                                    {isParsing ? <Loader2 size={32} className="animate-spin" /> : <Upload size={32} />}
                                </div>
                                
                                {file ? (
                                    <div className="space-y-1">
                                        <p className="text-sm font-black text-slate-900">{file.name}</p>
                                        <p className="text-xs text-primary-600 font-bold">Arquivo selecionado</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-base font-black text-slate-900">Clique para selecionar ou arraste o arquivo</p>
                                        <p className="text-xs text-slate-400 font-medium">Formatos aceitos: CSV, XLSX ou XLS</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-4">
                                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                                    <span className="flex items-center gap-2">
                                        <FileText size={12} />
                                        Mapeamento Automático
                                    </span>
                                    <button 
                                        onClick={handleDownloadTemplate}
                                        className="flex items-center gap-1.5 text-primary-600 hover:text-primary-700 transition-colors"
                                    >
                                        <Download size={12} />
                                        Baixar Planilha Modelo
                                    </button>
                                </div>

                                {error && (
                                    <div className="p-3 bg-rose-50 text-rose-500 rounded-xl flex items-center gap-3 text-xs font-bold border border-rose-100">
                                        <AlertCircle size={16} />
                                        {error}
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={reset}
                                        className="py-4 bg-white border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={processFile}
                                        disabled={!file || isParsing || isImporting}
                                        className={`py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3
                                            ${!file || isParsing || isImporting 
                                                ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' 
                                                : 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-600/20'}
                                        `}
                                    >
                                        {(isParsing || isImporting) ? <Loader2 size={18} className="animate-spin" /> : <Database size={18} />}
                                        {(isParsing || isImporting) ? 'Processando...' : 'Iniciar Importação'}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
