"use client";

import { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

interface ImportVendorsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ImportVendorsModal({ isOpen, onClose, onSuccess }: ImportVendorsModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState<'idle' | 'parsing' | 'uploading' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [importResult, setImportResult] = useState<{ inserted: number } | null>(null);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setProgress('idle');
        }
    };

    const mapRowToVendor = (row: any) => {
        return {
            name: row.nome || row.empresa || row.name || row.vendor || row.Fornecedor || row.Empresa || row.Nome,
            contact_name: row.contato || row.contact || row.Nome_Contato || null,
            contact_email: row.email || row.mail || row.Email || null,
            contact_phone: row.telefone || row.phone || row.celular || row.Telefone || null,
            cities_covered: row.cidades || row.cobertura || row.cities || null
        };
    };

    const processData = async (data: any[]) => {
        try {
            setProgress('uploading');
            const formattedVendors = data.map(mapRowToVendor).filter(v => v.name);

            if (formattedVendors.length === 0) {
                throw new Error('Nenhum fornecedor válido encontrado. Certifique-se de ter colunas como "nome" ou "empresa".');
            }

            const res = await fetch('/api/vendors/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vendors: formattedVendors })
            });

            if (!res.ok) throw new Error('Erro ao salvar fornecedores no servidor.');

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
        setIsImporting(true);
        setProgress('parsing');

        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.csv')) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => processData(results.data),
                error: (err) => {
                    setError('Erro ao ler CSV: ' + err.message);
                    setProgress('error');
                    setIsImporting(false);
                }
            });
        } else if (fileName.endsWith('.xlsx')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: 'binary' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                processData(jsonData);
            };
            reader.readAsBinaryString(file);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="premium-card w-full max-w-lg bg-white overflow-hidden shadow-2xl scale-in duration-300">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Importar Fornecedores</h3>
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest text-left">Upload de Planilha Global</p>
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
                            <p className="text-sm text-slate-500 font-medium">{importResult?.inserted} fornecedores importados.</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-2xl border border-primary-100/50">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary-600 shadow-sm">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-xs font-black text-primary-600 uppercase tracking-widest">Colunas Recomendadas</p>
                                    <p className="text-[10px] text-slate-500 leading-tight font-medium">nome, contato, email, telefone, cidades</p>
                                </div>
                            </div>

                            <div className="relative group">
                                <input
                                    type="file"
                                    accept=".csv, .xlsx"
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
                                disabled={!file || isImporting}
                                className="w-full h-14 bg-slate-900 hover:bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-30"
                            >
                                {isImporting ? <Loader2 size={20} className="animate-spin m-auto" /> : 'Confirmar Importação'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
