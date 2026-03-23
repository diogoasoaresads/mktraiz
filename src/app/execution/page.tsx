"use client";

import { useState, useEffect, useRef } from 'react';
import {
    Activity,
    FileText,
    Camera,
    CheckCircle2,
    Clock,
    AlertCircle,
    Download,
    Upload,
    Image,
    X,
    Filter,
    Search,
    ChevronDown
} from 'lucide-react';

interface ExecutionLine {
    id: string;
    campaign_id: string;
    campaign_name: string;
    unit_name: string;
    brand_name?: string;
    type: string;
    vendor_name: string;
    status: string;
    negotiated_price: number;
    address_raw: string;
    proposal_file_path?: string;
    contract_file_path?: string;
    invoice_file_path?: string;
    start_date?: string;
    proofs_count?: number;
    updated_at?: string;
}

export default function ExecutionPage() {
    const [lines, setLines] = useState<ExecutionLine[]>([]);
    const [loading, setLoading] = useState(true);
    const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
    const [campaigns, setCampaigns] = useState<{ id: string; name: string; brand_name?: string }[]>([]);
    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
    const [uploadingProof, setUploadingProof] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCampaign, setFilterCampaign] = useState('');
    const [filterBrand, setFilterBrand] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const fetchExecution = async () => {
        try {
            const res = await fetch('/api/execution');
            const data = await res.json();
            setLines(Array.isArray(data) ? data : data.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchExecution();
        fetch('/api/vendors').then(r => r.json()).then(setVendors).catch(console.error);
        fetch('/api/campaigns').then(r => r.json()).then(d => setCampaigns(Array.isArray(d) ? d : d.data || [])).catch(console.error);
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        await fetch('/api/planner/status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lineId: id, status: newStatus })
        });
        fetchExecution();
    };

    const uploadDocument = async (lineId: string, docType: string, file: File) => {
        setUploadingDoc(lineId);
        try {
            const formData = new FormData();
            formData.append('lineId', lineId);
            formData.append('docType', docType);
            formData.append('file', file);
            await fetch('/api/execution/upload', { method: 'POST', body: formData });
            fetchExecution();
        } finally { setUploadingDoc(null); }
    };

    const uploadProofs = async (lineId: string, files: FileList) => {
        setUploadingProof(lineId);
        try {
            const formData = new FormData();
            formData.append('lineId', lineId);
            Array.from(files).forEach(f => formData.append('files', f));
            await fetch('/api/execution/proofs', { method: 'POST', body: formData });
            fetchExecution();
        } finally { setUploadingProof(null); }
    };

    const exportPI = async (vendorId?: string, campaignId?: string) => {
        setIsExporting(true);
        try {
            const params = new URLSearchParams();
            if (vendorId) params.set('vendorId', vendorId);
            if (campaignId) params.set('campaignId', campaignId);
            const url = `/api/reports/pi?${params.toString()}`;
            const res = await fetch(url);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                alert(err.error || 'Nenhum dado encontrado para os filtros selecionados.');
                return;
            }
            const contentDisposition = res.headers.get('Content-Disposition') || '';
            const match = contentDisposition.match(/filename="(.+?)"/);
            const filename = match?.[1] || `PI_${new Date().toISOString().slice(0, 10)}.xlsx`;
            const blob = await res.blob();
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            URL.revokeObjectURL(a.href);
        } catch (err) {
            console.error(err);
            alert('Erro ao exportar PI. Tente novamente.');
        } finally {
            setIsExporting(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const colors: Record<string, string> = {
            selected: 'bg-amber-100 text-amber-700',
            approved: 'bg-primary-100 text-primary-700',
            purchased: 'bg-blue-100 text-blue-700',
            running: 'bg-emerald-100 text-emerald-700',
            completed: 'bg-slate-900 text-white'
        };
        return (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${colors[status] || 'bg-slate-100 text-slate-600'}`}>
                {status}
            </span>
        );
    };

    const getSlaBadge = (line: ExecutionLine) => {
        if (line.status !== 'running' || !line.start_date) return null;
        const days = Math.floor((Date.now() - new Date(line.start_date).getTime()) / (1000 * 60 * 60 * 24));
        if (days >= 3 && (line.proofs_count || 0) === 0) {
            return <div className="flex items-center gap-1 text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[9px] font-black uppercase mt-1"><AlertCircle size={10} /> SLA Atrasado (&gt;3d)</div>;
        }
        if ((line.proofs_count || 0) === 0) {
            return <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[9px] font-black uppercase mt-1"><Clock size={10} /> SLA: {days}d (Prazo: 3d)</div>;
        }
        return null;
    };

    // Unique brands derived from campaigns
    const brands = Array.from(new Set(campaigns.map(c => c.brand_name).filter(Boolean)));

    // Filter campaigns by selected brand
    const filteredCampaigns = filterBrand
        ? campaigns.filter(c => c.brand_name === filterBrand)
        : campaigns;

    // Apply filters to lines
    const filteredLines = lines.filter(line => {
        if (filterCampaign && line.campaign_id !== filterCampaign) return false;
        if (filterBrand && line.brand_name !== filterBrand) return false;
        if (searchTerm) {
            const s = searchTerm.toLowerCase();
            if (!line.type.toLowerCase().includes(s) &&
                !line.vendor_name.toLowerCase().includes(s) &&
                !line.address_raw.toLowerCase().includes(s) &&
                !line.campaign_name.toLowerCase().includes(s)) return false;
        }
        return true;
    });

    const activeFilterCount = [filterCampaign, filterBrand, searchTerm].filter(Boolean).length;

    return (
        <div className="p-10 max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Execução e Auditoria <span className="text-primary-600">(Pipeline)</span></h1>
                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <Activity size={16} />
                        <p>Controle de veiculação, documentos e provas</p>
                    </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <button
                        onClick={() => exportPI(undefined, filterCampaign || undefined)}
                        disabled={isExporting}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-primary-600 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg disabled:opacity-60"
                    >
                        <Download size={16} />
                        {isExporting ? 'Gerando...' : filterCampaign ? 'Exportar PI (Campanha)' : 'Exportar PI (Todos)'}
                    </button>
                    {vendors.length > 0 && (
                        <select
                            onChange={(e) => e.target.value && exportPI(e.target.value)}
                            className="px-4 py-2.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white outline-none cursor-pointer"
                            defaultValue=""
                        >
                            <option value="" disabled>PI por Fornecedor</option>
                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    )}
                </div>
            </header>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Aprovados', count: filteredLines.filter(l => l.status === 'selected' || l.status === 'approved').length, color: 'border-primary-500' },
                    { label: 'Comprados', count: filteredLines.filter(l => l.status === 'purchased').length, color: 'border-blue-500' },
                    { label: 'Em Veiculação', count: filteredLines.filter(l => l.status === 'running').length, color: 'border-emerald-500' },
                    { label: 'Concluídos', count: filteredLines.filter(l => l.status === 'completed').length, color: 'border-slate-900' },
                ].map(stat => (
                    <div key={stat.label} className={`premium-card p-6 border-l-4 ${stat.color}`}>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
                        <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.count}</h3>
                    </div>
                ))}
            </div>

            {/* Search + Filters */}
            <div className="space-y-3">
                <div className="flex gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Buscar por tipo, fornecedor, endereço ou campanha..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                        />
                        {searchTerm && (
                            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl border font-bold text-sm transition-all ${activeFilterCount > 0 ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Filter size={16} />
                        Filtros
                        {activeFilterCount > 0 && <span className="bg-primary-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">{activeFilterCount}</span>}
                        <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {showFilters && (
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        {/* Filter: Marca */}
                        <div className="flex-1 min-w-[200px] space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marca</label>
                            <select
                                value={filterBrand}
                                onChange={e => { setFilterBrand(e.target.value); setFilterCampaign(''); }}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                                <option value="">Todas as Marcas</option>
                                {brands.map(b => <option key={b} value={b!}>{b}</option>)}
                            </select>
                        </div>

                        {/* Filter: Campanha */}
                        <div className="flex-1 min-w-[200px] space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Campanha</label>
                            <select
                                value={filterCampaign}
                                onChange={e => setFilterCampaign(e.target.value)}
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                                <option value="">Todas as Campanhas</option>
                                {filteredCampaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={() => { setFilterBrand(''); setFilterCampaign(''); setSearchTerm(''); }}
                                className="px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 bg-slate-50 rounded-xl border border-transparent hover:border-red-100 transition-all"
                            >
                                Limpar Filtros
                            </button>
                        </div>
                    </div>
                )}

                {/* Active filter pills */}
                {(filterBrand || filterCampaign) && (
                    <div className="flex gap-2 flex-wrap">
                        {filterBrand && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-primary-50 border border-primary-200 text-primary-700 rounded-full text-xs font-bold">
                                Marca: {filterBrand}
                                <button onClick={() => { setFilterBrand(''); setFilterCampaign(''); }}><X size={12} /></button>
                            </span>
                        )}
                        {filterCampaign && (
                            <span className="flex items-center gap-1.5 px-3 py-1 bg-primary-50 border border-primary-200 text-primary-700 rounded-full text-xs font-bold">
                                Campanha: {campaigns.find(c => c.id === filterCampaign)?.name || filterCampaign}
                                <button onClick={() => setFilterCampaign('')}><X size={12} /></button>
                            </span>
                        )}
                        <span className="text-xs text-slate-400 font-medium self-center">{filteredLines.length} resultado{filteredLines.length !== 1 ? 's' : ''}</span>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-400">
                        <Activity size={24} className="animate-pulse mr-3" />
                        <span className="font-bold text-sm">Carregando pipeline...</span>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativo</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Campanha / Unidade</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Documentos</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLines.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-20 text-center text-slate-400 font-bold">
                                        {lines.length === 0 ? 'Nenhum item em execução.' : 'Nenhum resultado para os filtros selecionados.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredLines.map(line => (
                                    <tr key={line.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                                        <td className="p-5">
                                            <p className="font-bold text-slate-900">{line.type}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{line.vendor_name}</p>
                                            <p className="text-xs text-slate-500 mt-1 truncate max-w-[200px]">{line.address_raw}</p>
                                        </td>
                                        <td className="p-5">
                                            <p className="text-sm font-bold text-slate-700">{line.campaign_name}</p>
                                            {line.brand_name && <p className="text-[10px] text-primary-500 font-black uppercase tracking-widest">{line.brand_name}</p>}
                                            <p className="text-xs text-slate-400 font-medium tracking-tight">Escola: {line.unit_name}</p>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex gap-1.5 flex-wrap">
                                                {[
                                                    { key: 'proposal', label: 'Prop', has: line.proposal_file_path },
                                                    { key: 'contract', label: 'Contr', has: line.contract_file_path },
                                                    { key: 'invoice', label: 'NF', has: line.invoice_file_path }
                                                ].map(doc => (
                                                    <label key={doc.key} className="cursor-pointer">
                                                        <input type="file" className="hidden"
                                                            onChange={(e) => { if (e.target.files?.[0]) uploadDocument(line.id, doc.key, e.target.files[0]); }} />
                                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all ${doc.has ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400 hover:bg-primary-50 hover:text-primary-600'}`}>
                                                            {doc.has ? <CheckCircle2 size={10} /> : <Upload size={10} />}
                                                            {doc.label}
                                                        </span>
                                                    </label>
                                                ))}
                                                <label className="cursor-pointer">
                                                    <input type="file" multiple accept="image/*" className="hidden"
                                                        onChange={(e) => { if (e.target.files?.length) uploadProofs(line.id, e.target.files); }} />
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[9px] font-black uppercase bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all">
                                                        <Camera size={10} /> Prova {line.proofs_count ? `(${line.proofs_count})` : ''}
                                                    </span>
                                                </label>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="flex flex-col items-start gap-1">
                                                {getStatusBadge(line.status)}
                                                {getSlaBadge(line)}
                                            </div>
                                        </td>
                                        <td className="p-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                {(line.status === 'selected' || line.status === 'approved') && (
                                                    <button onClick={() => updateStatus(line.id, 'purchased')}
                                                        className="flex items-center gap-1.5 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                                                        <FileText size={12} /> Comprar
                                                    </button>
                                                )}
                                                {line.status === 'purchased' && (
                                                    <button onClick={() => updateStatus(line.id, 'running')}
                                                        className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                                                        <Activity size={12} /> Iniciar
                                                    </button>
                                                )}
                                                {line.status === 'running' && (
                                                    <button onClick={() => updateStatus(line.id, 'completed')}
                                                        className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                                                        <CheckCircle2 size={12} /> Finalizar
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
