"use client";

import { useState, useEffect } from 'react';
import { 
    Calendar, 
    Target, 
    Users, 
    DollarSign, 
    BarChart3, 
    TrendingUp, 
    MapPin, 
    ChevronRight,
    Search,
    Plus,
    Tag,
    AlertCircle
} from 'lucide-react';

export default function HubEvents() {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const res = await fetch('/api/activations/events');
                const data = await res.json();
                if (Array.isArray(data)) {
                    setEvents(data);
                }
                setLoading(false);
            } catch (err) {
                console.error('Error fetching events:', err);
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const filteredEvents = events.filter(e => 
        e.name.toLowerCase().includes(search.toLowerCase())
    );

    const calculateCPL = (budget: number, leads: number) => {
        if (!leads || leads === 0) return 0;
        return budget / leads;
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-[#F8FAFC] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-black uppercase tracking-widest mb-4 border border-amber-100">
                                <Calendar size={12} className="fill-current" />
                                Gestão de Campo
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Eventos & Ativações</h1>
                            <p className="text-slate-500 font-medium mt-2">Controle financeiro e performance de leads em tempo real.</p>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="relative group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                                <input 
                                    type="text"
                                    placeholder="Buscar evento..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-white border border-slate-200 rounded-full pl-12 pr-6 py-3 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all w-64 shadow-sm"
                                />
                            </div>
                            <button className="bg-slate-900 text-white p-3 rounded-full hover:bg-primary-600 transition-all shadow-lg">
                                <Plus size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/30 border border-slate-50">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Investimento Total (Plan)</h4>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-black text-slate-900">
                                    R$ {events.reduce((acc, curr) => acc + (curr.budget_planned || 0), 0).toLocaleString('pt-BR')}
                                </span>
                                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                    <DollarSign size={20} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/30 border border-slate-50">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Meta Global de Leads</h4>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-black text-slate-900">
                                    {events.reduce((acc, curr) => acc + (curr.target_leads || 0), 0)}
                                </span>
                                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                                    <Target size={20} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/30 border border-slate-50">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">CPL Médio Geral</h4>
                            <div className="flex items-center justify-between">
                                <span className="text-3xl font-black text-slate-900 text-primary-600">
                                    R$ {(events.reduce((acc, curr) => acc + (curr.budget_executed || 0), 0) / 
                                        Math.max(1, events.reduce((acc, curr) => acc + (curr.target_leads || 0), 0))).toFixed(2)}
                                </span>
                                <div className="w-10 h-10 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center">
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Events Table/List */}
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Lista de Eventos Ativos</h3>
                            <button className="text-xs font-bold text-primary-600 hover:underline">Ver Histórico Completo</button>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Evento</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status / Data</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Budget (Alt vs Real)</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Leads / Meta</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">CPL</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredEvents.map(event => (
                                        <tr key={event.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white text-sm font-black">
                                                        {event.name.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-900 text-sm leading-tight uppercase tracking-tight">{event.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{event.type}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                        <span className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">Live</span>
                                                    </div>
                                                    <span className="text-xs font-bold text-slate-400">{new Date(event.start_date).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900">R$ {event.budget_executed?.toLocaleString('pt-BR')}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">P: R$ {event.budget_planned?.toLocaleString('pt-BR')}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-900">{event.target_leads}</span>
                                                    <span className="text-[10px] font-bold text-slate-400">Meta: {event.target_leads}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className={`inline-flex px-3 py-1 rounded-lg text-xs font-black ring-1 ring-inset ${
                                                    calculateCPL(event.budget_planned, event.target_leads) < 50 ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                                                }`}>
                                                    R$ {calculateCPL(event.budget_executed || event.budget_planned, event.target_leads).toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <button className="p-2 text-slate-300 hover:text-slate-900 transition-all">
                                                    <ChevronRight size={20} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Meta Detail Alert */}
                    <div className="mt-12 p-8 bg-indigo-900 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl shadow-indigo-900/40">
                        <div className="absolute top-0 right-0 p-10 text-white/10 pointer-events-none transform rotate-12 scale-150">
                            <TrendingUp size={140} />
                        </div>
                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                            <div className="max-w-xl">
                                <div className="flex items-center gap-2 text-primary-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                    <AlertCircle size={14} className="fill-current" />
                                    Insight de Meta
                                </div>
                                <h3 className="text-2xl font-black mb-4">Meta por Pessoas/Dias</h3>
                                <p className="text-indigo-200 font-medium leading-relaxed">
                                    O cálculo de meta está sendo otimizado para considerar o esforço da equipe e a duração do evento. 
                                    Eventos com mais de 3 dias e equipe maior que 5 pessoas possuem bonificação de 15% na meta de leads.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                                    <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-1">CPL Global Previsto</p>
                                    <p className="text-2xl font-black">R$ 18,40</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
    );
}
