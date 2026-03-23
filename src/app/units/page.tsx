"use client";

import { useState, useEffect, useRef } from 'react';
import {
    MapPin,
    Search,
    Filter,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Clock,
    Trash2,
    Pencil,
    X,
    Map as MapIcon,
    List
} from 'lucide-react';
import dynamic from 'next/dynamic';
import EditUnitModal from '@/components/EditUnitModal';
import AddUnitModal from '@/components/AddUnitModal';
import { exportToExcel } from '@/lib/exportExcel';

// Dynamic import para evitar SSR do Leaflet
const MapView = dynamic(() => import('@/components/Map'), { ssr: false });

interface Unit {
    id: string;
    brand_name: string;
    unit_name: string;
    address_raw: string;
    city: string;
    state: string;
    lat: number | null;
    lng: number | null;
    geocode_status: 'pending' | 'success' | 'low_confidence' | 'error';
    geocode_confidence: number | null;
}

export default function UnitsPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [isDeduplicating, setIsDeduplicating] = useState(false);
    const [dedupeMessage, setDedupeMessage] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingUnit, setEditingUnit] = useState<Unit | null>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    async function fetchUnits() {
        try {
            const res = await fetch('/api/units');
            const data = await res.json();
            setUnits(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchUnits();
    }, []);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredUnits.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(filteredUnits.map(u => u.id));
        }
    };

    async function handleBatchDelete() {
        if (!confirm(`Tem certeza que deseja excluir as ${selectedIds.length} unidades selecionadas?`)) return;
        try {
            const res = await fetch('/api/units/batch-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selectedIds })
            });
            if (res.ok) {
                setSelectedIds([]);
                await fetchUnits();
            }
        } catch (err) { console.error(err); }
    }

    async function runGeocoding() {
        setIsGeocoding(true);
        try {
            await fetch('/api/units/geocode', { method: 'POST' });
            await fetchUnits();
        } finally { setIsGeocoding(false); }
    }

    async function runDeduplicate() {
        if (!confirm('Tem certeza que deseja remover endereços duplicados?')) return;
        setIsDeduplicating(true);
        setDedupeMessage(null);
        try {
            const res = await fetch('/api/units/deduplicate', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setDedupeMessage(`✅ ${data.removed} duplicata(s) removida(s). ${data.remaining} unidades restantes.`);
                await fetchUnits();
            }
        } finally {
            setIsDeduplicating(false);
            setTimeout(() => setDedupeMessage(null), 5000);
        }
    }

    async function handleDeleteUnit(unitId: string) {
        if (!confirm('Tem certeza que deseja excluir esta unidade?')) return;
        const res = await fetch(`/api/units/${unitId}`, { method: 'DELETE' });
        if (res.ok) await fetchUnits();
    }

    const openEditModal = (unit: Unit) => {
        setEditingUnit(unit);
        setIsEditModalOpen(true);
    };

    const getGeocodeBadge = (status: string) => {
        switch (status) {
            case 'success':
                return <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight"><CheckCircle2 size={12} /> Localizado</div>;
            case 'error':
                return <div className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight"><AlertCircle size={12} /> Erro</div>;
            default:
                return <div className="flex items-center gap-1 text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tight"><Clock size={12} /> Pendente</div>;
        }
    };

    const filteredUnits = units.filter(u =>
        u.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.unit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.address_raw.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Map points — only units with valid lat/lng
    const mapPoints = filteredUnits
        .filter(u => u.lat !== null && u.lng !== null)
        .map(u => ({
            id: u.id,
            lat: u.lat as number,
            lng: u.lng as number,
            name: u.unit_name,
            kind: 'unit' as const,
            address: u.address_raw,
            meta: { brand_name: u.brand_name, geocode_status: u.geocode_status }
        }));

    const geocodedCount = units.filter(u => u.lat !== null && u.lng !== null).length;

    return (
        <div className="flex flex-col h-[calc(100vh-40px)]">
            {/* Header */}
            <header className="p-8 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 flex-shrink-0">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Unidades <span className="text-primary-600">(Points of Interest)</span></h1>
                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <MapPin size={16} />
                        <p>Geolocalização e inteligência espacial por escola</p>
                    </div>
                </div>

                <div className="flex gap-3 flex-wrap items-center">
                    {/* View toggle */}
                    <div className="bg-slate-100 p-1 rounded-xl flex">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-sm font-bold ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <List size={16} /> Lista
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-sm font-bold ${viewMode === 'map' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <MapIcon size={16} /> Mapa {geocodedCount > 0 && <span className="bg-primary-100 text-primary-700 text-[10px] px-1.5 py-0.5 rounded-full">{geocodedCount}</span>}
                        </button>
                    </div>

                    <button
                        onClick={() => exportToExcel(
                            filteredUnits.map(u => ({
                                'Marca': u.brand_name,
                                'Unidade': u.unit_name,
                                'Endereço': u.address_raw,
                                'Cidade': u.city || '',
                                'Estado': u.state || '',
                                'Latitude': u.lat || '',
                                'Longitude': u.lng || '',
                                'Status Geo': u.geocode_status
                            })),
                            'unidades_escolares'
                        )}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-slate-600 px-5 py-3 rounded-2xl font-bold transition-all duration-300 shadow-sm"
                    >
                        ↓ Excel
                    </button>
                    {selectedIds.length > 0 && (
                        <button
                            onClick={handleBatchDelete}
                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-2xl font-bold transition-all duration-300 shadow-xl shadow-red-600/20"
                        >
                            <Trash2 size={18} />
                            Excluir {selectedIds.length}
                        </button>
                    )}
                    <button
                        onClick={runDeduplicate}
                        disabled={isDeduplicating}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-600 hover:text-red-600 px-5 py-3 rounded-2xl font-bold transition-all duration-300 shadow-sm disabled:opacity-50"
                    >
                        <Trash2 size={18} className={isDeduplicating ? "animate-pulse" : ""} />
                        {isDeduplicating ? "Limpando..." : "Remover Duplicatas"}
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-primary-600 text-white px-5 py-3 rounded-2xl font-bold transition-all duration-300 shadow-xl shadow-slate-900/10 hover:shadow-primary-600/20"
                    >
                        <MapPin size={18} />
                        Nova Unidade
                    </button>
                    <button
                        onClick={runGeocoding}
                        disabled={isGeocoding}
                        className="group relative flex items-center gap-2 bg-white border border-slate-200 hover:border-primary-200 hover:bg-primary-50 text-slate-600 hover:text-primary-600 px-5 py-3 rounded-2xl font-bold transition-all duration-300 shadow-sm disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={isGeocoding ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
                        {isGeocoding ? "Buscando..." : "Localizar Mapa"}
                    </button>
                </div>
            </header>

            {/* Alerts */}
            <div className="px-8 flex-shrink-0 space-y-2">
                {dedupeMessage && (
                    <div className="flex items-center gap-2 p-4 bg-green-50 text-green-700 rounded-2xl border border-green-100 text-sm font-bold animate-in slide-in-from-top-2">
                        <CheckCircle2 size={18} />
                        <span>{dedupeMessage}</span>
                    </div>
                )}
                {viewMode === 'map' && mapPoints.length === 0 && !loading && (
                    <div className="flex items-center gap-2 p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 text-sm font-bold">
                        <AlertCircle size={18} />
                        <span>Nenhuma unidade com coordenadas para exibir no mapa. Execute "Localizar Mapa" para geocodificar.</span>
                    </div>
                )}
            </div>

            {/* Search bar */}
            <div className="px-8 py-4 flex-shrink-0">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar unidade, marca ou endereço..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-10 py-3 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary-500/10 transition-all text-sm font-medium"
                    />
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600">
                            <X size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Main content — list or map */}
            <main className="flex-1 px-8 pb-8 min-h-0">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <div className="w-8 h-8 border-2 border-primary-600/20 border-t-primary-600 rounded-full animate-spin" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-3">Processando Unidades...</p>
                    </div>
                ) : viewMode === 'map' ? (
                    /* MAP VIEW */
                    <div className="w-full h-full relative z-0">
                        <MapView
                            points={mapPoints}
                            centerOnPoints={mapPoints.length > 0}
                            center={[-15.7801, -47.9292]}
                            zoom={5}
                        />
                    </div>
                ) : (
                    /* LIST VIEW */
                    <div className="premium-card overflow-hidden flex flex-col h-full">
                        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="sticky top-0 bg-white z-10">
                                    <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase tracking-widest text-slate-400 font-black">
                                        <th className="px-6 py-5 w-10">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-slate-200 text-primary-600 focus:ring-primary-500 accent-primary-600 cursor-pointer"
                                                checked={selectedIds.length === filteredUnits.length && filteredUnits.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </th>
                                        <th className="px-6 py-5">Status</th>
                                        <th className="px-6 py-5">Escola / Marca</th>
                                        <th className="px-6 py-5">Unidade</th>
                                        <th className="px-6 py-5">Endereço</th>
                                        <th className="px-6 py-5">Lat / Lng</th>
                                        <th className="px-6 py-5 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredUnits.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <Search size={32} className="opacity-20" />
                                                    <p className="text-sm font-medium">Nenhuma unidade encontrada para sua busca.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredUnits.map((unit) => (
                                        <tr key={unit.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(unit.id) ? 'bg-primary-50/20' : ''}`}>
                                            <td className="px-6 py-5">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-slate-200 text-primary-600 focus:ring-primary-500 accent-primary-600 cursor-pointer"
                                                    checked={selectedIds.includes(unit.id)}
                                                    onChange={() => toggleSelect(unit.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-5">{getGeocodeBadge(unit.geocode_status)}</td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center font-bold text-xs">
                                                        {unit.brand_name.charAt(0)}
                                                    </div>
                                                    <span className="text-sm font-bold text-slate-700">{unit.brand_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-sm font-medium text-slate-600">{unit.unit_name}</td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-slate-500 max-w-xs truncate font-medium" title={unit.address_raw}>
                                                        {unit.address_raw}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                                                        {unit.city || 'Cidade N/D'} • {unit.state || 'UF'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                {unit.lat !== null && unit.lat !== undefined && unit.lng !== null && unit.lng !== undefined ? (
                                                    <div className="text-[10px] font-mono text-slate-400 leading-tight">
                                                        <div>{unit.lat.toFixed(6)}</div>
                                                        <div>{unit.lng.toFixed(6)}</div>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-300 italic">N/D</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                    <button
                                                        onClick={() => openEditModal(unit)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-primary-50 text-slate-400 hover:text-primary-600 transition-colors"
                                                        title="Editar Unidade"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUnit(unit.id)}
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors"
                                                        title="Excluir Unidade"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/20 flex justify-between items-center">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Exibindo <span className="text-slate-900">{filteredUnits.length}</span> de <span className="text-slate-900">{units.length}</span> unidades
                                {geocodedCount > 0 && <span className="ml-2 text-green-600">• {geocodedCount} geocodificadas</span>}
                            </p>
                        </div>
                    </div>
                )}
            </main>

            {isEditModalOpen && editingUnit && (
                <EditUnitModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    unit={editingUnit}
                    onSuccess={fetchUnits}
                />
            )}

            <AddUnitModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchUnits}
            />
        </div>
    );
}
