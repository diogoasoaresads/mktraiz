"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
    Search,
    Filter,
    Map as MapIcon,
    Layers,
    Navigation,
    Loader2,
    MapPin,
    Building2,
    ChevronRight,
    X
} from 'lucide-react';

// Dynamic import for Leaflet (client-side only)
const MapComponent = dynamic(() => import('@/components/Map/MapComponent'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-slate-100 animate-pulse rounded-3xl flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando Mapa...</div>
});

interface Unit {
    id: string;
    unit_name: string;
    brand_name: string;
    school_id: string;
    lat: number;
    lng: number;
    address_raw: string;
    city: string;
    state: string;
}

interface School {
    id: string;
    brand_name: string;
}

export default function MapPage() {
    const [units, setUnits] = useState<Unit[]>([]);
    const [schools, setSchools] = useState<School[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSchoolId, setSelectedSchoolId] = useState<string>('all');
    const [stats, setStats] = useState({ total: 0, geocoded: 0, invTotal: 0, invGeocoded: 0 });
    const [mapCenter, setMapCenter] = useState<[number, number]>([-22.9068, -43.1729]);

    useEffect(() => {
        async function fetchData() {
            try {
                const [unitsRes, schoolsRes, invRes] = await Promise.all([
                    fetch('/api/units'),
                    fetch('/api/schools'),
                    fetch('/api/inventory/map')
                ]);
                const unitsData = await unitsRes.json();
                const schoolsData = await schoolsRes.json();
                const invData = await invRes.json();

                setUnits(unitsData);
                setSchools(schoolsData);
                setInventory(Array.isArray(invData) ? invData : []);

                const geocoded = unitsData.filter((u: any) => u.lat && u.lng).length;
                const invGeocoded = invData.filter((i: any) => i.lat && i.lng).length;
                setStats({ total: unitsData.length, geocoded, invTotal: invData.length, invGeocoded });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const filteredUnits = units.filter(u => {
        const matchesSearch =
            u.unit_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.brand_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.address_raw.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesSchool = selectedSchoolId === 'all' || u.school_id === selectedSchoolId;

        return matchesSearch && matchesSchool;
    });

    const displayUnits = filteredUnits.filter(u => u.lat && u.lng);

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-slate-50">
            {/* Header com Filtros */}
            <div className="bg-white border-b border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 z-10 shadow-sm">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <MapIcon className="text-primary-600" size={28} />
                        Mapa de Inteligência <span className="text-primary-600">OOH</span>
                    </h1>
                    <p className="text-xs text-slate-500 font-medium">Visualização geoespacial de toda a rede Grupo Raiz</p>
                </div>

                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar unidade ou endereço..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all"
                        />
                    </div>

                    <div className="relative w-full md:w-48">
                        <select
                            value={selectedSchoolId}
                            onChange={(e) => setSelectedSchoolId(e.target.value)}
                            className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                        >
                            <option value="all">Todas as Escolas</option>
                            {schools.map(school => (
                                <option key={school.id} value={school.id}>{school.brand_name}</option>
                            ))}
                        </select>
                        <Filter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden relative">
                {/* Lateral Panel (Stats & List) */}
                <div className="w-96 bg-white border-r border-slate-100 flex flex-col">
                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Encontradas</p>
                                <p className="text-xl font-black text-slate-900 mt-1">{filteredUnits.length}</p>
                            </div>
                            <div className="p-4 bg-primary-50 rounded-2xl border border-primary-100">
                                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">No Mapa</p>
                                <p className="text-xl font-black text-primary-700 mt-1">{displayUnits.length}</p>
                            </div>
                        </div>

                        {loading && (
                            <div className="flex flex-col items-center justify-center py-10 space-y-3">
                                <Loader2 className="animate-spin text-primary-600" size={32} />
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Processando Pontos...</p>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-3">
                        {filteredUnits.length === 0 && !loading ? (
                            <div className="py-20 text-center space-y-4">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                                    <MapPin className="text-slate-200" size={32} />
                                </div>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Nenhuma unidade encontrada<br />com esses filtros.</p>
                            </div>
                        ) : (
                            filteredUnits.map(unit => (
                                <div
                                    key={unit.id}
                                    onClick={() => {
                                        if (unit.lat && unit.lng) {
                                            setMapCenter([unit.lat, unit.lng]);
                                        }
                                    }}
                                    className={`p-4 rounded-2xl border transition-all duration-300 group cursor-pointer ${unit.lat && unit.lng
                                        ? 'bg-white border-slate-100 hover:border-primary-200 hover:shadow-lg hover:shadow-primary-500/5 hover:-translate-y-1'
                                        : 'bg-slate-50 border-slate-100 opacity-60 grayscale'
                                        }`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="space-y-0.5">
                                            <p className="text-[9px] font-black text-primary-600 uppercase tracking-widest leading-none">{unit.brand_name}</p>
                                            <h4 className="text-sm font-black text-slate-900 tracking-tight group-hover:text-primary-600 transition-colors">{unit.unit_name}</h4>
                                        </div>
                                        {unit.lat && unit.lng ? (
                                            <button
                                                className="w-8 h-8 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 flex items-center justify-center transition-colors"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setMapCenter([unit.lat, unit.lng]);
                                                }}
                                            >
                                                <Navigation size={14} />
                                            </button>
                                        ) : (
                                            <div className="w-2 h-2 rounded-full bg-red-400 mt-1" title="Sem localização" />
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 font-medium leading-tight line-clamp-2">{unit.address_raw}</p>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Map Area */}
                <div className="flex-1 p-6 relative bg-slate-50">
                    <MapComponent units={displayUnits} inventory={inventory.filter(i => i.lat && i.lng)} center={mapCenter} />

                    {/* Floating Info */}
                    <div className="absolute top-10 right-10 z-10 flex flex-col gap-3">
                        <div className="bg-white/90 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl space-y-1 w-48 border-b-4 border-b-primary-600">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Cobertura Atual</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tighter">
                                {stats.total > 0 ? ((stats.geocoded / stats.total) * 100).toFixed(0) : 0}% <span className="text-xs text-slate-400 ml-1 font-bold italic">Rede</span>
                            </p>
                        </div>
                        <div className="bg-white/90 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-2xl space-y-1 w-48 border-b-4 border-b-amber-500">
                            <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest leading-none">Mídias no Mapa</p>
                            <p className="text-2xl font-black text-slate-900 tracking-tighter">
                                {stats.invGeocoded} <span className="text-xs text-slate-400 ml-1 font-bold italic">de {stats.invTotal}</span>
                            </p>
                        </div>
                    </div>

                    {/* Legenda */}
                    <div className="absolute bottom-10 right-10 z-10">
                        <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/50 space-y-2 min-w-[160px]">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Legenda</h4>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-slate-900 border border-white" />
                                <span className="text-xs font-bold text-slate-600">Unidade Escolar</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-3 h-3 rounded-full bg-amber-500 border border-white" />
                                <span className="text-xs font-bold text-slate-600">Mídia OOH</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
