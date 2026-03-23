"use client";

import { useState, useEffect } from 'react';
import { 
    Share2, 
    TrendingUp, 
    Users, 
    MousePointer2, 
    DollarSign, 
    BarChart3, 
    Zap, 
    ArrowUpRight, 
    ArrowDownRight,
    Download,
    Filter,
    AlertCircle,
    FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const METRICS_CARDS = [
    { label: 'Alcance Total', value: '1.2M', change: '+12%', trend: 'up', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Engajamento Médio', value: '4.8%', change: '+0.5%', trend: 'up', icon: Share2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Cliques Ads', value: '45.2k', change: '-2%', trend: 'down', icon: MousePointer2, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'CPL Médio', value: 'R$ 14,20', change: '-15%', trend: 'up', icon: DollarSign, color: 'text-indigo-500', bg: 'bg-indigo-50' },
];

export default function HubPerformance() {
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    const handleExportPDF = async () => {
        setIsExporting(true);
        const element = document.getElementById('performance-dashboard');
        if (!element) return;

        try {
            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#0a0c10'
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save(`Relatorio_Performance_Raiz_${format(new Date(), 'MMMM_yyyy')}.pdf`);
        } catch (error) {
            console.error('Error exporting PDF:', error);
        } finally {
            setIsExporting(false);
        }
    };
    const [timeRange, setTimeRange] = useState('30d');

    useEffect(() => {
        setTimeout(() => setLoading(false), 800);
    }, []);

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
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest mb-4 border border-emerald-100">
                                <TrendingUp size={12} className="fill-current" />
                                Real-time Insights
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Performance & Métricas</h1>
                            <p className="text-slate-500 font-medium mt-2">Visão consolidada da produção e desempenho das escolas Raiz.</p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <select 
                                value={timeRange}
                                onChange={(e) => setTimeRange(e.target.value)}
                                className="bg-white border border-slate-200 rounded-full px-6 py-3 text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                            >
                                <option value="7d">Últimos 7 dias</option>
                                <option value="30d">Últimos 30 dias</option>
                                <option value="90d">Últimos 90 dias</option>
                            </select>
                            <button 
                                onClick={handleExportPDF}
                                disabled={isExporting}
                                className="flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg disabled:opacity-50"
                            >
                                {isExporting ? <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rounded-full" /> : <Download size={16} />}
                                <span>{isExporting ? 'Processando...' : 'Exportar PDF'}</span>
                            </button>
                        </div>
                    </div>

                    <div id="performance-dashboard" className="space-y-10">
                        {/* Alerta de Performance (Fase 4) */}
                        <div className="bg-rose-500/10 border border-rose-500/20 p-6 rounded-[2rem] flex items-center justify-between group animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-rose-500/20 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-500/30">
                                    <AlertCircle size={24} />
                                </div>
                                <div>
                                    <h4 className="text-sm font-black text-rose-600 uppercase tracking-tight leading-none mb-1">Alerta: Queda de Alcance Organic</h4>
                                    <p className="text-xs text-rose-500 font-medium">A unidade **Apogeu** teve uma queda de 18% no Reels. Sugerimos reforçar pilares acadêmicos.</p>
                                </div>
                            </div>
                            <button className="px-5 py-2.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20">
                                Gerar Insights IA
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {METRICS_CARDS.map((card, i) => (
                                <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/40 relative overflow-hidden group">
                                    <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300`}>
                                        <card.icon size={24} />
                                    </div>
                                    <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{card.label}</h3>
                                    <div className="flex items-end gap-3">
                                        <span className="text-3xl font-black text-slate-900">{card.value}</span>
                                        <div className={`flex items-center gap-1 text-[11px] font-bold mb-1.5 ${card.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {card.trend === 'up' ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                            {card.change}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Charts & AI Insights Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        
                        {/* Main Performance Chart Area */}
                        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 min-h-[400px]">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Evolução de Performance</h3>
                                <div className="flex gap-2">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        Orgânico
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        Pago
                                    </div>
                                </div>
                            </div>
                            
                            {/* Chart Illustration */}
                            <div className="h-64 flex items-end gap-4 px-4">
                                {[40, 60, 45, 90, 65, 80, 50, 70, 85, 95, 60, 75].map((h, i) => (
                                    <div key={i} className="flex-1 group relative">
                                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            {h}%
                                        </div>
                                        <div 
                                            style={{ height: `${h}%` }} 
                                            className="w-full bg-slate-100 rounded-t-xl group-hover:bg-primary-500 transition-all duration-500"
                                        ></div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <span>Jan</span>
                                <span>Fev</span>
                                <span>Mar</span>
                                <span>Abr</span>
                                <span>Mai</span>
                                <span>Jun</span>
                                <span>Jul</span>
                                <span>Ago</span>
                                <span>Set</span>
                                <span>Out</span>
                                <span>Nov</span>
                                <span>Dez</span>
                            </div>
                        </div>

                        {/* AI Insights Sidebar */}
                        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col h-full">
                            <div className="absolute top-0 right-0 p-8 text-primary-500 opacity-20 pointer-events-none transform rotate-12">
                                <Zap size={100} />
                            </div>

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="flex items-center gap-2 text-primary-400 font-black text-[10px] uppercase tracking-[0.2em] mb-6">
                                    <Zap size={14} fill="currentColor" />
                                    AI Hub Insights
                                </div>
                                
                                <h3 className="text-2xl font-black mb-6 leading-tight">Sugestões de Otimização</h3>

                                <div className="space-y-6 flex-1">
                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                                        <h4 className="text-xs font-black uppercase text-primary-400 mb-2">Melhor Horário</h4>
                                        <p className="text-sm text-slate-300 leading-relaxed font-medium">Seus posts sugerem um engajamento 40% maior às **Terças feiras às 19h**.</p>
                                    </div>

                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                                        <h4 className="text-xs font-black uppercase text-amber-400 mb-2">Formato Vencedor</h4>
                                        <p className="text-sm text-slate-300 leading-relaxed font-medium">Os **Reels com depoimentos de alunos** estão com CPL 20% abaixo da média.</p>
                                    </div>

                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 transition-colors cursor-pointer group">
                                        <h4 className="text-xs font-black uppercase text-emerald-400 mb-2">Insight Estratégico</h4>
                                        <p className="text-sm text-slate-300 leading-relaxed font-medium">A unidade **Apogeu** está saturando o público. Sugerimos trocar o criativo para "Novas Matrículas".</p>
                                    </div>
                                </div>

                                <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-10 mb-4 px-2">Análise de Sentimento (IA)</h4>
                                <div className="space-y-4 px-2">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">😊</span>
                                                <span className="text-xs font-bold text-slate-300">Positivo</span>
                                            </div>
                                            <span className="text-xs font-black text-emerald-500">72%</span>
                                        </div>
                                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-emerald-500 h-full w-[72%]"></div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">😐</span>
                                                <span className="text-xs font-bold text-slate-300">Netro</span>
                                            </div>
                                            <span className="text-xs font-black text-slate-500">22%</span>
                                        </div>
                                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-slate-500 h-full w-[22%]"></div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg">😡</span>
                                                <span className="text-xs font-bold text-slate-300">Negativo</span>
                                            </div>
                                            <span className="text-xs font-black text-rose-500">6%</span>
                                        </div>
                                        <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-rose-500 h-full w-[6%]"></div>
                                        </div>
                                    </div>
                                </div>

                                <button className="mt-8 w-full py-4 bg-primary-600 hover:bg-primary-500 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary-600/20">
                                    Extrair Insights de Vendas
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    );
}
