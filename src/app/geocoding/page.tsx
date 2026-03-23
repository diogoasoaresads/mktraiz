"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
    MapPin,
    AlertTriangle,
    CheckCircle2,
    RefreshCw,
    Filter,
    Search,
    Navigation,
    Loader2,
    X,
    Save
} from 'lucide-react';

const MapView = dynamic(() => import('@/components/Map'), { ssr: false });

interface GeoIssue {
    id: string;
    source: 'unit' | 'asset';
    name: string;
    address_raw: string;
    city: string;
    state: string;
    lat: number | null;
    lng: number | null;
    geocode_status: string;
    geocode_confidence: number | null;
}

export default function GeocodingPage() {
    const [issues, setIssues] = useState<GeoIssue[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterTable, setFilterTable] = useState('all');
    const [filterStatus, setFilterStatus] = useState('');
    const [selectedItem, setSelectedItem] = useState<GeoIssue | null>(null);
    const [editLat, setEditLat] = useState('');
    const [editLng, setEditLng] = useState('');
    const [saving, setSaving] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchIssues = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/geocoding/issues?table=${filterTable}&status=${filterStatus}`);
            setIssues(await res.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchIssues(); }, [filterTable, filterStatus]);

    const handleReprocess = async () => {
        setProcessing(true);
        try {
            await fetch('/api/geocoding/process', { method: 'POST' });
            await fetchIssues();
        } catch (err) {
            console.error(err);
        } finally {
            setProcessing(false);
        }
    };

    const handleSelectItem = (item: GeoIssue) => {
        setSelectedItem(item);
        setEditLat(item.lat?.toString() || '');
        setEditLng(item.lng?.toString() || '');
    };

    const handleSaveManual = async () => {
        if (!selectedItem) return;
        setSaving(true);
        try {
            await fetch('/api/geocoding/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: selectedItem.id,
                    source: selectedItem.source,
                    lat: parseFloat(editLat),
                    lng: parseFloat(editLng)
                })
            });
            setSelectedItem(null);
            await fetchIssues();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleMapClick = (point: any) => {
        if (selectedItem) {
            setEditLat(point.lat?.toString() || point.meta?.lat?.toString() || '');
            setEditLng(point.lng?.toString() || point.meta?.lng?.toString() || '');
        }
    };

    const statusBadge = (status: string) => {
        const styles: any = {
            pending: 'bg-amber-100 text-amber-700',
            error: 'bg-red-100 text-red-700',
            low_confidence: 'bg-orange-100 text-orange-700',
            success: 'bg-emerald-100 text-emerald-700',
            manual: 'bg-blue-100 text-blue-700'
        };
        return (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
                {status}
            </span>
        );
    };

    const filtered = issues.filter(i =>
        searchQuery === '' ||
        i.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.address_raw?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const mapPoints = filtered
        .filter(i => i.lat && i.lng)
        .map(i => ({
            id: i.id,
            lat: i.lat!,
            lng: i.lng!,
            name: i.name,
            kind: i.geocode_status === 'error' ? 'suggested' as const : 'asset' as const,
            address: i.address_raw,
            meta: i
        }));

    return (
        <div className="p-6 max-w-full mx-auto space-y-6">
            <header className="flex justify-between items-center">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                        Qualidade de Dados <span className="text-primary-600">(Geocoding)</span>
                    </h1>
                    <p className="text-slate-500 font-medium flex items-center gap-2">
                        <MapPin size={16} />
                        {issues.length} itens com problemas de geolocalização
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleReprocess}
                        disabled={processing}
                        className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={processing ? 'animate-spin' : ''} />
                        {processing ? 'Processando...' : 'Reprocessar Pendentes'}
                    </button>
                </div>
            </header>

            {/* Filters */}
            <div className="flex gap-3 items-center">
                <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 flex-1 max-w-sm">
                    <Search size={16} className="text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nome ou endereço..."
                        className="bg-transparent outline-none text-sm font-medium text-slate-700 w-full"
                    />
                </div>
                <select
                    value={filterTable}
                    onChange={(e) => setFilterTable(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white outline-none"
                >
                    <option value="all">Todos</option>
                    <option value="units">Unidades</option>
                    <option value="assets">Mídia / Inventário</option>
                </select>
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-white outline-none"
                >
                    <option value="">Todos os Status</option>
                    <option value="pending">Pendente</option>
                    <option value="error">Erro</option>
                    <option value="low_confidence">Baixa Confiança</option>
                </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" style={{ height: '70vh' }}>
                {/* Table */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {filtered.length} itens encontrados
                        </span>
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white/95 backdrop-blur-md z-10">
                                <tr className="border-b border-slate-100">
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                    <th className="p-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(item => (
                                    <tr
                                        key={`${item.source}-${item.id}`}
                                        className={`border-b border-slate-50 hover:bg-slate-50/50 transition-all cursor-pointer ${selectedItem?.id === item.id ? 'bg-primary-50/50 border-l-2 border-l-primary-500' : ''}`}
                                        onClick={() => handleSelectItem(item)}
                                    >
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${item.source === 'unit' ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                {item.source === 'unit' ? 'Unidade' : 'Mídia'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-sm font-bold text-slate-900 max-w-[150px] truncate">{item.name}</td>
                                        <td className="p-3 text-xs text-slate-500 max-w-[200px] truncate">{item.address_raw}</td>
                                        <td className="p-3">{statusBadge(item.geocode_status)}</td>
                                        <td className="p-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleSelectItem(item); }}
                                                className="text-primary-600 hover:text-primary-800 text-[10px] font-black uppercase tracking-widest"
                                            >
                                                Corrigir
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filtered.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-slate-400 text-sm">
                                            <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-400" />
                                            Nenhum problema de geocoding encontrado!
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Map + Editor */}
                <div className="flex flex-col gap-4">
                    <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200">
                        <MapView
                            points={mapPoints}
                            onPointClick={handleMapClick}
                            centerOnPoints={mapPoints.length > 0}
                        />
                    </div>

                    {selectedItem && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-black text-slate-900 text-sm">{selectedItem.name}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">{selectedItem.address_raw}</p>
                                </div>
                                <button onClick={() => setSelectedItem(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                                    <X size={16} className="text-slate-400" />
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={editLat}
                                        onChange={(e) => setEditLat(e.target.value)}
                                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary-500/20"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Longitude</label>
                                    <input
                                        type="number"
                                        step="0.000001"
                                        value={editLng}
                                        onChange={(e) => setEditLng(e.target.value)}
                                        className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary-500/20"
                                    />
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 italic">
                                💡 Dica: Clique no mapa para definir a localização, ou insira as coordenadas manualmente.
                            </p>
                            <button
                                onClick={handleSaveManual}
                                disabled={saving || !editLat || !editLng}
                                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                            >
                                <Save size={16} />
                                {saving ? 'Salvando...' : 'Salvar Localização Manual'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
