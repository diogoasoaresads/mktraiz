"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    LayoutDashboard,
    School,
    Database,
    Users,
    Target,
    MapPin,
    Activity,
    ArrowUpRight,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Plus
} from 'lucide-react';

interface Stats {
    counts: {
        schools: number;
        units: number;
        assets: number;
        vendors: number;
        campaigns: number;
    };
    geocodeStats: { geocode_status: string, count: number }[];
    typeStats: { type: string, count: number }[];
    recentCampaigns: { id: string, name: string, status: string }[];
    budgetsByBrand: { brand: string, budgeted: number, used: number, remaining: number }[];
}

export default function DashboardPage() {
    const router = useRouter();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('/api/stats/dashboard');
                const data = await res.json();
                setStats(data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    const kpis = [
        { label: 'Unidades Ativas', value: stats?.counts.units || 0, icon: <MapPin size={24} />, color: 'bg-slate-900', trend: '+2 este mês', href: '/units' },
        { label: 'Inventário OOH', value: stats?.counts.assets || 0, icon: <Database size={24} />, color: 'bg-primary-600', trend: 'Auditando...', href: '/inventory' },
        { label: 'Fornecedores', value: stats?.counts.vendors || 0, icon: <Users size={24} />, color: 'bg-emerald-600', trend: 'Parceiros', href: '/vendors' },
        { label: 'Campanhas', value: stats?.counts.campaigns || 0, icon: <Target size={24} />, color: 'bg-amber-500', trend: 'Em execução', href: '/campaigns' },
    ];

    if (loading) return (
        <div className="p-10 flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-primary-600/20 border-t-primary-600 rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="p-10 max-w-7xl mx-auto space-y-10">
            <header className="flex justify-between items-end">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard <span className="text-primary-600">Overview</span></h1>
                    <p className="text-slate-500 font-medium">Bem-vindo ao OOH Planner do Grupo Raiz Educação</p>
                </div>
                <button
                    onClick={() => router.push('/campaigns/create')}
                    className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary-600/20"
                >
                    <Plus size={18} />
                    Criar Nova Campanha
                </button>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpis.map((kpi, i) => (
                    <div key={i} onClick={() => router.push(kpi.href)} className="premium-card p-6 flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300 cursor-pointer">
                        <div className="flex justify-between items-start">
                            <div className={`w-12 h-12 ${kpi.color} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                                {kpi.icon}
                            </div>
                            <span className="flex items-center text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full uppercase tracking-widest">
                                <TrendingUp size={10} className="mr-1" /> {kpi.trend}
                            </span>
                        </div>
                        <div className="mt-6">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                            <h2 className="text-4xl font-black text-slate-900 mt-1">{kpi.value}</h2>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-400 group-hover:text-primary-600 transition-colors">
                            Ver detalhes <ArrowUpRight size={14} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <div className="premium-card p-8">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Saúde dos Dados</h3>
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">Status de Geoprocessamento</p>
                            </div>
                            <Activity size={20} className="text-slate-300" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {['success', 'low_confidence', 'error', 'pending'].map(status => {
                                const count = stats?.geocodeStats.find(s => s.geocode_status === status)?.count || 0;
                                return (
                                    <div key={status} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className={`w-2 h-2 rounded-full ${status === 'success' ? 'bg-green-500' : status === 'pending' ? 'bg-slate-300' : 'bg-red-500'}`}></span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{status}</span>
                                        </div>
                                        <p className="text-2xl font-black text-slate-900">{count}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="premium-card p-8">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 font-primary">Inventário por Tipo</h3>
                        <div className="space-y-4">
                            {stats?.typeStats.map(type => (
                                <div key={type.type} className="flex items-center gap-4">
                                    <div className="w-24 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{type.type}</div>
                                    <div className="flex-1 h-3 bg-slate-50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary-500 transition-all duration-1000"
                                            style={{ width: `${(type.count / (stats?.counts.assets || 1)) * 100}%` }}
                                        />
                                    </div>
                                    <div className="w-12 text-sm font-black text-slate-900 leading-none">{type.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="premium-card p-8">
                        <h3 className="text-xl font-bold text-slate-900 mb-6 font-primary">Budget por Marca</h3>
                        <div className="space-y-6">
                            {stats?.budgetsByBrand.map(b => (
                                <div key={b.brand} className="space-y-3">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{b.brand}</p>
                                            <p className="text-sm font-black text-slate-900 mt-1">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.used)}
                                                <span className="text-slate-400 font-medium ml-2">de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.budgeted)}</span>
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest">Restante</p>
                                            <p className="text-sm font-black text-primary-600 mt-1">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(b.remaining)}</p>
                                        </div>
                                    </div>
                                    <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary-600 transition-all duration-1000"
                                            style={{ width: `${Math.min((b.used / (b.budgeted || 1)) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                            {stats?.budgetsByBrand.length === 0 && (
                                <p className="text-sm text-slate-400 italic">Nenhum dado de budget disponível.</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="premium-card p-8 bg-slate-900 text-white">
                        <h3 className="text-lg font-bold mb-6">Campanhas Recentes</h3>
                        <div className="space-y-6">
                            {stats?.recentCampaigns.map(campaign => (
                                <div
                                    key={campaign.id}
                                    onClick={() => router.push(`/planner?campaignId=${campaign.id}`)}
                                    className="flex gap-4 items-start border-l-2 border-primary-500 pl-4 hover:bg-white/5 p-2 rounded-r-xl transition-colors cursor-pointer"
                                >
                                    <div>
                                        <p className="text-sm font-bold">{campaign.name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">{campaign.status}</p>
                                    </div>
                                </div>
                            ))}
                            {stats?.recentCampaigns.length === 0 && (
                                <p className="text-xs text-slate-500 italic">Nenhuma campanha recente.</p>
                            )}
                        </div>
                        <button onClick={() => router.push('/campaigns')} className="w-full mt-10 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                            Ver Todas as Campanhas
                        </button>
                    </div>

                    <div className="premium-card p-8 bg-primary-600 text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Budget Total Orçado</p>
                            <h4 className="text-3xl font-black mt-2">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.budgetsByBrand.reduce((sum, b) => sum + b.budgeted, 0) || 0)}
                            </h4>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mt-6">Total Utilizado</p>
                            <h4 className="text-2xl font-black mt-1">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats?.budgetsByBrand.reduce((sum, b) => sum + b.used, 0) || 0)}
                            </h4>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <TrendingUp size={120} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
