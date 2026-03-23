"use client";

import { useState, useEffect, useRef, FormEvent } from 'react';
import {
    Shield, Plus, Trash2, MapPin, Users, Search,
    AlertCircle, CheckCircle2, X, Loader2,
    Upload, FileSpreadsheet, Download, ChevronRight,
    RefreshCw
} from 'lucide-react';

interface Competitor {
    id: string;
    name: string;
    brand: string | null;
    address: string;
    lat: number | null;
    lng: number | null;
    category: string;
    estimated_students: number | null;
}

interface PreviewRow {
    name: string;
    brand?: string;
    address: string;
    category?: string;
    estimated_students?: string;
    lat?: string;
    lng?: string;
    _valid: boolean;
    _error?: string;
}

interface ImportResult {
    name: string;
    status: 'ok' | 'error';
    reason?: string;
    geo: boolean;
}

type ActiveView = 'list' | 'form' | 'import';

// --- Utility: Parse CSV / XLSX ---
async function parseSpreadsheet(file: File): Promise<PreviewRow[]> {
    const XLSX = await import('xlsx');
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json: Record<string, string>[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

    const normalize = (s: string) => s?.trim().toLowerCase()
        .replace(/[áàãâä]/g, 'a').replace(/[éèêë]/g, 'e')
        .replace(/[íìîï]/g, 'i').replace(/[óòõôö]/g, 'o')
        .replace(/[úùûü]/g, 'u').replace(/[ç]/g, 'c');

    const matchKey = (row: Record<string, string>, candidates: string[]) => {
        const keys = Object.keys(row);
        for (const cand of candidates) {
            const found = keys.find(k => normalize(k) === normalize(cand));
            if (found) return row[found];
        }
        return '';
    };

    return json.map(row => {
        const name = matchKey(row, ['nome', 'name', 'escola', 'escola_nome', 'nome da escola']);
        const address = matchKey(row, ['endereco', 'address', 'endereço', 'endereço completo', 'logradouro']);
        const brand = matchKey(row, ['marca', 'brand', 'rede', 'grupo', 'marca rede']);
        const category = matchKey(row, ['categoria', 'category', 'tipo', 'type']);
        const estimated_students = matchKey(row, ['alunos', 'students', 'alunos_estimados', 'alunos estimados', 'qtd alunos']);
        const lat = matchKey(row, ['latitude', 'lat']);
        const lng = matchKey(row, ['longitude', 'lng', 'lon', 'long']);

        const _valid = !!(name?.trim() && address?.trim());
        return {
            name: name?.trim() || '',
            brand: brand?.trim() || '',
            address: address?.trim() || '',
            category: category?.trim() || 'escola',
            estimated_students: estimated_students?.trim() || '',
            lat: lat?.trim() || '',
            lng: lng?.trim() || '',
            _valid,
            _error: !name?.trim() ? 'Nome ausente' : !address?.trim() ? 'Endereço ausente' : undefined,
        };
    });
}

// --- Template download ---
function downloadTemplate() {
    const csv = [
        'nome,marca,endereço,categoria,alunos estimados,latitude,longitude',
        'Colégio Rio Branco,Rio Branco,Av. Higienópolis 996 São Paulo SP,escola,2500,-23.5489,-46.6388',
        'Escola Pingo de Gente,Pingo,Rua das Flores 200 Campinas SP,colegio_bilingual,800,,',
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'modelo_concorrentes.csv';
    a.click();
}

export default function CompetitorsPage() {
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeView, setActiveView] = useState<ActiveView>('list');
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [form, setForm] = useState({ name: '', brand: '', address: '', category: 'escola', estimated_students: '' });

    // Import state
    const fileRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<PreviewRow[]>([]);
    const [isParsing, setIsParsing] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importReport, setImportReport] = useState<{ ok: number; errors: number; geoOk: number; results: ImportResult[] } | null>(null);

    useEffect(() => { fetchCompetitors(); }, []);

    const fetchCompetitors = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/competitors');
            const data = await res.json();
            if (data.success) setCompetitors(data.competitors);
        } catch { showToast('error', 'Erro ao carregar concorrentes.'); }
        finally { setIsLoading(false); }
    };

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    // Single form submit
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/competitors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, estimated_students: form.estimated_students ? Number(form.estimated_students) : null }),
            });
            const data = await res.json();
            if (data.success) {
                setCompetitors(prev => [...prev, data.competitor]);
                setForm({ name: '', brand: '', address: '', category: 'escola', estimated_students: '' });
                setActiveView('list');
                showToast('success', `${data.competitor.name} cadastrado com sucesso!`);
            } else { showToast('error', data.error || 'Erro ao cadastrar.'); }
        } catch { showToast('error', 'Erro de conexão.'); }
        finally { setIsSaving(false); }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Remover "${name}" da lista de concorrentes?`)) return;
        try {
            await fetch(`/api/competitors/${id}`, { method: 'DELETE' });
            setCompetitors(prev => prev.filter(c => c.id !== id));
            showToast('success', `${name} removido.`);
        } catch { showToast('error', 'Erro ao remover.'); }
    };

    // File handling
    const handleFile = async (file: File) => {
        const allowed = ['csv', 'xlsx', 'xls', 'ods'];
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        if (!allowed.includes(ext)) {
            showToast('error', 'Formato inválido. Use CSV, XLSX, XLS ou ODS.');
            return;
        }
        setImportFile(file);
        setIsParsing(true);
        setImportReport(null);
        try {
            const rows = await parseSpreadsheet(file);
            setPreview(rows);
        } catch {
            showToast('error', 'Não foi possível ler a planilha. Verifique o formato.');
        } finally { setIsParsing(false); }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    // Import submit
    const handleImport = async () => {
        const validRows = preview.filter(r => r._valid);
        if (validRows.length === 0) { showToast('error', 'Nenhuma linha válida para importar.'); return; }
        setIsImporting(true);
        try {
            const res = await fetch('/api/competitors/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows: validRows }),
            });
            const data = await res.json();
            if (data.success) {
                setImportReport({ ok: data.ok, errors: data.errors, geoOk: data.geoOk, results: data.results });
                await fetchCompetitors();
                showToast('success', `${data.ok} concorrentes importados com sucesso!`);
            } else { showToast('error', data.error || 'Erro na importação.'); }
        } catch { showToast('error', 'Erro de conexão.'); }
        finally { setIsImporting(false); }
    };

    const resetImport = () => {
        setImportFile(null);
        setPreview([]);
        setImportReport(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    const filtered = competitors.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const validCount = preview.filter(r => r._valid).length;
    const invalidCount = preview.filter(r => !r._valid).length;

    return (
        <div className="flex-1 p-8 bg-slate-50 min-h-screen">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-xl text-white text-sm font-medium ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
                    {toast.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    {toast.message}
                    <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={14} /></button>
                </div>
            )}

            {/* Header */}
            <div className="mb-8 flex items-start justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center border border-red-500/20">
                        <Shield className="text-red-500" size={22} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900">Concorrentes</h1>
                        <p className="text-slate-500 text-sm mt-0.5">Mapeie escolas rivais para análise de Share-of-Voice no mapa</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setActiveView(activeView === 'import' ? 'list' : 'import'); resetImport(); }}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all border ${activeView === 'import' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-violet-600 border-violet-200 hover:bg-violet-50'}`}
                    >
                        <FileSpreadsheet size={15} />
                        Importar Planilha
                    </button>
                    <button
                        onClick={() => setActiveView(activeView === 'form' ? 'list' : 'form')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-sm ${activeView === 'form' ? 'bg-slate-200 text-slate-700' : 'bg-primary-600 text-white hover:bg-primary-700 shadow-primary-600/25'}`}
                    >
                        <Plus size={15} />
                        {activeView === 'form' ? 'Cancelar' : 'Cadastrar'}
                    </button>
                </div>
            </div>

            {/* Form: Single competitor */}
            {activeView === 'form' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-black text-slate-800 mb-5">Novo Concorrente</h2>
                    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Nome da Escola *</label>
                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="Ex: Colégio Rio Branco"
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 outline-none transition-all" />
                        </div>
                        <div className="col-span-2 md:col-span-1">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Marca / Rede</label>
                            <input value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} placeholder="Ex: Colégio Rio Branco"
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 outline-none transition-all" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Endereço Completo *</label>
                            <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} required placeholder="Ex: Rua Vergueiro, 1000, São Paulo - SP"
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 outline-none transition-all" />
                            <p className="text-xs text-slate-400 mt-1">Geocoding automático via OpenStreetMap</p>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Categoria</label>
                            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none transition-all bg-white focus:border-primary-500">
                                <option value="escola">Escola Regular</option>
                                <option value="colegio_bilingual">Colégio Bilíngue</option>
                                <option value="sistema_ensino">Sistema de Ensino</option>
                                <option value="pre_vestibular">Pré-Vestibular</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-1.5">Alunos Estimados</label>
                            <input type="number" value={form.estimated_students} onChange={e => setForm(f => ({ ...f, estimated_students: e.target.value }))} placeholder="Ex: 1200"
                                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 outline-none transition-all" />
                        </div>
                        <div className="col-span-2 flex justify-end gap-3 pt-2">
                            <button type="button" onClick={() => setActiveView('list')} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Cancelar</button>
                            <button type="submit" disabled={isSaving} className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white text-sm font-bold rounded-xl hover:bg-primary-700 disabled:opacity-60 transition-all">
                                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                                {isSaving ? 'Geocodificando...' : 'Salvar'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Import panel */}
            {activeView === 'import' && (
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 mb-6 space-y-5">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-800">Importar por Planilha</h2>
                            <p className="text-sm text-slate-500 mt-0.5">Carregue um arquivo CSV ou Excel com a lista de concorrentes.</p>
                        </div>
                        <button onClick={downloadTemplate}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all">
                            <Download size={14} />
                            Baixar modelo CSV
                        </button>
                    </div>

                    {/* Columns hint */}
                    <div className="flex flex-wrap gap-2">
                        {['nome *', 'endereço *', 'marca', 'categoria', 'alunos estimados'].map(col => (
                            <span key={col} className={`px-2.5 py-1 rounded-lg text-xs font-bold ${col.includes('*') ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {col}
                            </span>
                        ))}
                        <span className="text-xs text-slate-400 self-center ml-1">* obrigatórios</span>
                    </div>

                    {/* Drop zone */}
                    {!importFile && (
                        <div
                            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileRef.current?.click()}
                            className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
                                ${isDragging ? 'border-violet-400 bg-violet-50' : 'border-slate-200 hover:border-violet-300 hover:bg-violet-50/30'}`}
                        >
                            <Upload className="mx-auto mb-3 text-slate-300" size={36} />
                            <p className="font-bold text-slate-600 text-sm">Arraste seu arquivo aqui ou <span className="text-violet-600">clique para selecionar</span></p>
                            <p className="text-xs text-slate-400 mt-1">CSV, XLSX, XLS, ODS</p>
                            <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.ods" className="hidden"
                                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]); }} />
                        </div>
                    )}

                    {/* Parsing spinner */}
                    {isParsing && (
                        <div className="flex items-center justify-center py-8 gap-3 text-slate-500">
                            <Loader2 className="animate-spin" size={20} />
                            <span className="font-medium text-sm">Lendo planilha...</span>
                        </div>
                    )}

                    {/* Preview table */}
                    {!isParsing && preview.length > 0 && !importReport && (
                        <div className="space-y-4">
                            {/* Summary bar */}
                            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                                <FileSpreadsheet className="text-violet-500" size={18} />
                                <span className="font-bold text-slate-700 text-sm">{importFile?.name}</span>
                                <div className="flex gap-3 ml-auto text-sm">
                                    <span className="text-emerald-600 font-bold">{validCount} válidas</span>
                                    {invalidCount > 0 && <span className="text-red-500 font-bold">{invalidCount} com erro</span>}
                                </div>
                                <button onClick={resetImport} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="Trocar arquivo"><RefreshCw size={14} /></button>
                            </div>

                            {/* Rows preview */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                                        <tr>
                                            <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest">Status</th>
                                            <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest">Nome</th>
                                            <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest">Endereço</th>
                                            <th className="px-3 py-2.5 text-left font-black text-slate-500 uppercase tracking-widest">Categoria</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {preview.map((row, i) => (
                                            <tr key={i} className={row._valid ? 'hover:bg-slate-50' : 'bg-red-50/60'}>
                                                <td className="px-3 py-2.5">
                                                    {row._valid
                                                        ? <CheckCircle2 size={14} className="text-emerald-500" />
                                                        : <span className="flex items-center gap-1 text-red-500 font-bold"><AlertCircle size={12} />{row._error}</span>}
                                                </td>
                                                <td className="px-3 py-2.5 font-medium text-slate-800">{row.name || <span className="text-slate-300 italic">vazio</span>}</td>
                                                <td className="px-3 py-2.5 text-slate-600 max-w-xs truncate">{row.address || <span className="text-slate-300 italic">vazio</span>}</td>
                                                <td className="px-3 py-2.5 text-slate-500">{row.category || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Action */}
                            <div className="flex items-center justify-between pt-1">
                                <p className="text-xs text-slate-400">O geocoding será feito automaticamente para cada endereço.</p>
                                <div className="flex gap-3">
                                    <button onClick={resetImport} className="px-5 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all">Trocar arquivo</button>
                                    <button
                                        onClick={handleImport}
                                        disabled={isImporting || validCount === 0}
                                        className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 disabled:opacity-60 transition-all shadow-sm"
                                    >
                                        {isImporting ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                                        {isImporting ? `Importando ${validCount} concorrentes...` : `Importar ${validCount} concorrentes`}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Import report */}
                    {importReport && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Importados', value: importReport.ok, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                                    { label: 'Geocodificados', value: importReport.geoOk, color: 'text-blue-600 bg-blue-50 border-blue-200' },
                                    { label: 'Com erro', value: importReport.errors, color: 'text-red-500 bg-red-50 border-red-200' },
                                ].map(s => (
                                    <div key={s.label} className={`rounded-xl border p-4 text-center ${s.color}`}>
                                        <p className="text-3xl font-black">{s.value}</p>
                                        <p className="text-xs font-bold mt-1">{s.label}</p>
                                    </div>
                                ))}
                            </div>
                            {importReport.errors > 0 && (
                                <div className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-1">
                                    <p className="text-xs font-black text-red-600 uppercase tracking-widest mb-2">Linhas com erro</p>
                                    {importReport.results.filter(r => r.status === 'error').map((r, i) => (
                                        <p key={i} className="text-xs text-red-700">• <b>{r.name}</b>: {r.reason}</p>
                                    ))}
                                </div>
                            )}
                            <div className="flex justify-between items-center pt-1">
                                <button onClick={() => { resetImport(); setActiveView('list'); }}
                                    className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:underline">
                                    <ChevronRight size={14} className="rotate-180" /> Ver lista de concorrentes
                                </button>
                                <button onClick={resetImport} className="px-5 py-2.5 text-sm font-bold bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-all">
                                    + Importar outra planilha
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Search */}
            <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Buscar concorrente..."
                    className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-3 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500/30 outline-none transition-all shadow-sm" />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                    { label: 'Total de Concorrentes', value: competitors.length, icon: Shield, color: 'text-red-500 bg-red-50' },
                    { label: 'Com Geolocalização', value: competitors.filter(c => c.lat && c.lng).length, icon: MapPin, color: 'text-emerald-600 bg-emerald-50' },
                    { label: 'Alunos Mapeados', value: competitors.reduce((acc, c) => acc + (c.estimated_students || 0), 0).toLocaleString('pt-BR'), icon: Users, color: 'text-blue-600 bg-blue-50' },
                ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stat.color}`}><stat.icon size={18} /></div>
                        <div>
                            <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                            <p className="text-xs text-slate-500 font-medium">{stat.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-20 text-slate-400">
                        <Loader2 className="animate-spin mr-3" size={20} />Carregando concorrentes...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <Shield className="mx-auto text-slate-300 mb-4" size={40} />
                        <p className="text-slate-500 font-medium">
                            {searchTerm ? 'Nenhum concorrente encontrado para este filtro.' : 'Nenhum concorrente cadastrado ainda.'}
                        </p>
                        {!searchTerm && (
                            <div className="flex items-center justify-center gap-3 mt-4">
                                <button onClick={() => setActiveView('form')} className="text-primary-600 text-sm font-bold hover:underline">+ Cadastrar um</button>
                                <span className="text-slate-300">ou</span>
                                <button onClick={() => setActiveView('import')} className="text-violet-600 text-sm font-bold hover:underline flex items-center gap-1"><FileSpreadsheet size={13} />importar planilha</button>
                            </div>
                        )}
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                {['Escola', 'Endereço', 'Categoria', 'Alunos', 'Geo', ''].map(h => (
                                    <th key={h} className="text-left px-5 py-3.5 text-xs font-black text-slate-500 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                                    <td className="px-5 py-4">
                                        <p className="font-bold text-slate-800">{c.name}</p>
                                        {c.brand && c.brand !== c.name && <p className="text-xs text-slate-400">{c.brand}</p>}
                                    </td>
                                    <td className="px-5 py-4 text-slate-600 max-w-xs truncate">{c.address}</td>
                                    <td className="px-5 py-4">
                                        <span className="px-2.5 py-1 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold capitalize">
                                            {c.category?.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-slate-700 font-medium">
                                        {c.estimated_students ? c.estimated_students.toLocaleString('pt-BR') : '—'}
                                    </td>
                                    <td className="px-5 py-4">
                                        {c.lat && c.lng
                                            ? <span className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold"><MapPin size={12} />OK</span>
                                            : <span className="text-red-400 text-xs font-bold">Sem geo</span>}
                                    </td>
                                    <td className="px-5 py-4">
                                        <button onClick={() => handleDelete(c.id, c.name)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Remover">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
