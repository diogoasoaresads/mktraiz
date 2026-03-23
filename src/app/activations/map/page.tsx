"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
    MapPin, 
    Search, 
    Filter, 
    Plus, 
    Navigation, 
    Building2, 
    ShoppingBag, 
    Train, 
    Sparkles,
    CheckCircle2,
    Clock,
    ChevronRight,
    Loader2,
    Maximize2,
    List as ListIcon,
    Layout as LayoutIcon
} from 'lucide-react';

const MapView = dynamic(() => import('@/components/Map/MapView'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center animate-pulse">
            <Loader2 className="animate-spin text-slate-300" size={48} />
        </div>
    )
});

interface MapPoint {
    id: string;
    lat: number;
    lng: number;
    name: string;
    kind: 'unit' | 'asset' | 'suggested' | 'selected' | 'ibge' | 'competitor' | 'poi';
    address?: string;
    meta?: any;
}

export default function ActivationMapPage() {
    const [points, setPoints] = useState<MapPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [schools, setSchools] = useState<any[]>([]);
    const [pois, setPois] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPoi, setNewPoi] = useState({ name: '', type: 'shopping', address_raw: '', lat: '', lng: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [mapViewport, setMapViewport] = useState({ center: [-22.9068, -43.1729] as [number, number], zoom: 13 });
    const [viewMode, setViewMode] = useState<'both' | 'list' | 'map'>('both');

    const [selectedPoi, setSelectedPoi] = useState<any>(null);
    const [calcConfig, setCalcConfig] = useState({ days: 1, teamSize: 2, eventId: '' });
    const [events, setEvents] = useState<any[]>([]);

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    };

    useEffect(() => {
        fetchData();
        fetchEvents();
    }, []);

    const fetchData = async () => {
        try {
            const schoolRes = await fetch('/api/units');
            const schoolData = await schoolRes.json();
            
            const poiRes = await fetch('/api/activations/points');
            const poiData = await poiRes.json();

            setSchools(schoolData || []);
            setPois(poiData || []);
            setLoading(false);
        } catch (error) {
            console.error('Erro ao buscar dados:', error);
            setLoading(false);
        }
    };

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/activations/events');
            const data = await res.json();
            setEvents(data || []);
            if (data.length > 0) setCalcConfig(prev => ({ ...prev, eventId: data[0].id }));
        } catch (error) {
            console.error('Erro ao buscar eventos:', error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/activations/points', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...newPoi,
                    lat: parseFloat(newPoi.lat),
                    lng: parseFloat(newPoi.lng),
                    flow_intensity: 0.8
                })
            });

            if (res.ok) {
                setIsModalOpen(false);
                setNewPoi({ name: '', type: 'shopping', address_raw: '', lat: '', lng: '' });
                fetchData();
            }
        } catch (error) {
            console.error('Erro ao salvar ponto:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handlePointClick = (point: any) => {
        setSelectedPoi(point);
        setMapViewport({
            center: [point.lat, point.lng],
            zoom: 16
        });
        if (viewMode === 'list') setViewMode('both');
    };

    const handleScheduleActivation = async () => {
        if (!selectedPoi || !calcConfig.eventId) return;
        setIsSaving(true);
        try {
            const reach = calculateReach();
            const res = await fetch('/api/activations/schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    event_id: calcConfig.eventId,
                    point_id: selectedPoi.id,
                    status: 'planejado',
                    team_notes: `Agendado via Otimizador. Equipe de ${calcConfig.teamSize} pessoas por ${calcConfig.days} dias.`,
                    cost: calcConfig.days * calcConfig.teamSize * 150, // Estimativa simples de custo
                    impact_leads: reach.leads
                })
            });

            if (res.ok) {
                alert('Ativação agendada com sucesso!');
                setSelectedPoi(null);
            }
        } catch (error) {
            console.error('Erro ao agendar:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const calculateReach = () => {
        if (!selectedPoi) return { total: 0, leads: 0 };
        // Lógica: fluxo base * dias * (equipe * multiplicador) * (1 se perto de escola, 0.7 se longe)
        const baseFlow = (selectedPoi.flow_intensity || 0.5) * 1000;
        const proximityMod = selectedPoi.distance < 3 ? 1.2 : 0.8;
        const total = Math.round(baseFlow * calcConfig.days * (calcConfig.teamSize * 0.5) * proximityMod);
        const leads = Math.round(total * 0.05); // 5% de conversão estimada
        return { total, leads };
    };

    const filteredPois = pois.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address_raw.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const hotspotsWithDistance = filteredPois.map((poi: any) => {
        let closestSchool = null;
        let minDistance = Infinity;

        schools.forEach((school: any) => {
            const dist = calculateDistance(poi.lat, poi.lng, school.lat, school.lng);
            if (dist < minDistance) {
                minDistance = dist;
                closestSchool = school.name;
            }
        });

        return { ...poi, closestSchool, distance: minDistance };
    });

    const filteredPoints = [
        ...schools.map((s: any) => ({
            id: s.id,
            lat: s.lat,
            lng: s.lng,
            name: s.name,
            kind: 'unit' as const,
            address: s.address,
            meta: { type: 'Unidade Escolar' }
        })),
        ...hotspotsWithDistance.map((p: any) => ({
            id: p.id,
            lat: p.lat,
            lng: p.lng,
            name: p.name,
            kind: 'poi' as const,
            address: p.address_raw,
            meta: { type: p.type, flow: p.flow_intensity, school: p.closestSchool, dist: p.distance }
        }))
    ];

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-white">
                <Loader2 className="animate-spin text-secondary-600" size={48} />
            </div>
        );
    }

    const reach = calculateReach();

    return (
        <div className="flex h-[calc(100vh)] bg-white overflow-hidden relative">
            
            {/* Control Panel (List) */}
            {(viewMode === 'both' || viewMode === 'list') && (
                <div className={`${viewMode === 'list' ? 'w-full' : 'w-96'} bg-white border-r border-slate-200 flex flex-col z-10 shadow-xl transition-all duration-300`}>
                    <div className="p-8 border-b border-slate-50">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className="text-secondary-600" />
                                <span className="text-[10px] font-black text-secondary-600 uppercase tracking-[0.2em]">Otimizador</span>
                            </div>
                            {/* View Selectors */}
                            <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                                    <ListIcon size={14} />
                                </button>
                                <button onClick={() => setViewMode('both')} className={`p-1.5 rounded-md transition-all ${viewMode === 'both' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                                    <LayoutIcon size={14} />
                                </button>
                                <button onClick={() => setViewMode('map')} className={`p-1.5 rounded-md transition-all ${viewMode === 'map' ? 'bg-white shadow text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}>
                                    <Maximize2 size={14} />
                                </button>
                            </div>
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Hotspots Raiz</h1>
                    </div>

                    <div className="p-6 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
                        {selectedPoi ? (
                            <div className="space-y-6 animate-in slide-in-from-left duration-300">
                                <button 
                                    onClick={() => setSelectedPoi(null)}
                                    className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                                >
                                    <ChevronRight size={14} className="rotate-180" /> Voltar para lista
                                </button>

                                <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="p-3 bg-white rounded-2xl text-secondary-600 shadow-sm">
                                            {selectedPoi.type === 'shopping' ? <ShoppingBag size={24} /> : 
                                             selectedPoi.type === 'metro' ? <Train size={24} /> : <Building2 size={24} />}
                                        </div>
                                        <div className="text-[10px] font-black bg-secondary-100 text-secondary-600 px-3 py-1 rounded-full uppercase tracking-tighter">
                                            {selectedPoi.type}
                                        </div>
                                    </div>
                                    <h2 className="text-xl font-black text-slate-900 uppercase leading-tight mb-2">{selectedPoi.name}</h2>
                                    <p className="text-[11px] text-slate-500 font-bold uppercase">{selectedPoi.address_raw}</p>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculadora de Alcance</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Duração (Dias)</p>
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={calcConfig.days}
                                                onChange={e => setCalcConfig({...calcConfig, days: parseInt(e.target.value) || 1})}
                                                className="w-full text-xl font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0"
                                            />
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Equipe (Pessoas)</p>
                                            <input 
                                                type="number" 
                                                min="1"
                                                value={calcConfig.teamSize}
                                                onChange={e => setCalcConfig({...calcConfig, teamSize: parseInt(e.target.value) || 1})}
                                                className="w-full text-xl font-black text-slate-900 bg-transparent border-none p-0 focus:ring-0"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Evento Vinculado</p>
                                        <select 
                                            value={calcConfig.eventId}
                                            onChange={e => setCalcConfig({...calcConfig, eventId: e.target.value})}
                                            className="w-full text-xs font-bold text-slate-900 bg-transparent border-none p-0 focus:ring-0 uppercase"
                                        >
                                            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-secondary-600 p-4 rounded-3xl text-white shadow-xl shadow-secondary-600/20">
                                            <p className="text-[8px] font-black opacity-60 uppercase tracking-widest mb-1">Impacto Estimado</p>
                                            <p className="text-xl font-black">{reach.total.toLocaleString()}</p>
                                            <p className="text-[8px] font-black opacity-60 uppercase tracking-widest mt-1">Pessoas</p>
                                        </div>
                                        <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl shadow-slate-900/20">
                                            <p className="text-[8px] font-black opacity-60 uppercase tracking-widest mb-1">Leads Estimados</p>
                                            <p className="text-xl font-black">{reach.leads.toLocaleString()}</p>
                                            <p className="text-[8px] font-black opacity-60 uppercase tracking-widest mt-1">Potenciais</p>
                                        </div>
                                    </div>

                                    <button 
                                        disabled={isSaving}
                                        onClick={handleScheduleActivation}
                                        className="w-full bg-secondary-600 text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-secondary-600/20 hover:bg-secondary-500 transition-all disabled:opacity-50"
                                    >
                                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                        Agendar Ativação
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                        <input 
                                            type="text" 
                                            placeholder="Buscar ponto de ativação..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full bg-slate-50 border-none pl-12 pr-4 py-4 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-secondary-500/20 transition-all"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => setIsModalOpen(true)}
                                            className="flex-1 bg-secondary-600 text-white px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-secondary-600/20 hover:bg-secondary-500 transition-all"
                                        >
                                            <Plus size={14} /> Novo Ponto
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pontos de Interesse ({hotspotsWithDistance.length})</h3>
                                    <div className="grid grid-cols-1 gap-3">
                                        {hotspotsWithDistance.map(poi => (
                                            <div 
                                                key={poi.id} 
                                                onClick={() => handlePointClick(poi)}
                                                className="group bg-white p-4 rounded-3xl border border-slate-100 hover:border-secondary-500/30 hover:shadow-xl hover:shadow-secondary-500/5 transition-all cursor-pointer"
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="p-2 bg-secondary-50 rounded-xl text-secondary-600">
                                                        {poi.type === 'shopping' ? <ShoppingBag size={18} /> : 
                                                         poi.type === 'metro' ? <Train size={18} /> : <Building2 size={18} />}
                                                    </div>
                                                    <div className="text-[9px] font-black bg-slate-50 text-slate-500 px-2 py-1 rounded-full uppercase tracking-tighter">
                                                        {poi.type}
                                                    </div>
                                                </div>
                                                <p className="font-black text-slate-900 text-xs mb-1 group-hover:text-secondary-600 transition-colors uppercase">{poi.name}</p>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase truncate">{poi.address_raw}</p>
                                                
                                                {poi.closestSchool && poi.distance < 3 && (
                                                    <div className="mt-3 pt-3 border-t border-slate-50 flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-secondary-500"></div>
                                                        <p className="text-[9px] font-black text-secondary-600 uppercase tracking-tighter">
                                                            {poi.distance.toFixed(1)}km de {poi.closestSchool}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Map Area */}
            {(viewMode === 'both' || viewMode === 'map') && (
                <div className="flex-1 relative h-full">
                    <MapView 
                        points={filteredPoints} 
                        zoom={mapViewport.zoom} 
                        center={mapViewport.center}
                    />

                    {/* View Switcher for Map Only Mode */}
                    {viewMode === 'map' && (
                        <div className="absolute top-6 left-6 z-[1000] flex bg-white/95 backdrop-blur shadow-xl border border-slate-200 p-1 rounded-xl">
                            <button onClick={() => setViewMode('list')} className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100">
                                <ListIcon size={18} />
                            </button>
                            <button onClick={() => setViewMode('both')} className="p-2 text-slate-400 hover:text-slate-900 rounded-lg hover:bg-slate-100">
                                <LayoutIcon size={18} />
                            </button>
                            <button onClick={() => setViewMode('map')} className="p-2 bg-secondary-600 text-white rounded-lg shadow-sm">
                                <Maximize2 size={18} />
                            </button>
                        </div>
                    )}

                    <div className="absolute top-8 right-8 z-[500] flex gap-4">
                        <div className="bg-white/95 backdrop-blur shadow-2xl rounded-2xl p-4 border border-slate-200">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Unidades</p>
                            <p className="text-xl font-black text-slate-900">{schools.length}</p>
                        </div>
                        <div className="bg-white/95 backdrop-blur shadow-2xl rounded-2xl p-4 border border-slate-200">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Hotspots</p>
                            <p className="text-xl font-black text-secondary-600">{hotspotsWithDistance.length}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Novo Ponto (Restored partially for brevity, keeping the same structure as before) */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Novo Hotspot</h2>
                                <p className="text-[10px] font-black text-secondary-600 uppercase tracking-widest mt-1">Cadastro de ponto de interesse</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nome do Local</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Ex: Shopping Center"
                                        value={newPoi.name}
                                        onChange={e => setNewPoi({...newPoi, name: e.target.value})}
                                        className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-secondary-500/20"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Latitude</label>
                                        <input required type="text" value={newPoi.lat} onChange={e => setNewPoi({...newPoi, lat: e.target.value})} className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Longitude</label>
                                        <input required type="text" value={newPoi.lng} onChange={e => setNewPoi({...newPoi, lng: e.target.value})} className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tipo</label>
                                    <select value={newPoi.type} onChange={e => setNewPoi({...newPoi, type: e.target.value})} className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold">
                                        <option value="shopping">Shopping</option>
                                        <option value="metro">Metrô/Trem</option>
                                        <option value="praca">Praça/Parque</option>
                                        <option value="comercio">Comércio</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Endereço</label>
                                    <input required type="text" value={newPoi.address_raw} onChange={e => setNewPoi({...newPoi, address_raw: e.target.value})} className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold" />
                                </div>
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase text-slate-400">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] bg-secondary-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase shadow-lg disabled:opacity-50">
                                    {isSaving ? 'Salvando...' : 'Salvar Ponto'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
}
