"use client";

import { useState, useEffect } from 'react';
import { 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    Clock, 
    Building2,
    Zap,
    MessageSquare,
    Filter,
    Layers
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function HubCalendar() {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDay, setSelectedDay] = useState<Date | null>(null);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/hub/requests');
            const data = await res.json();
            if (data.success) {
                // Filter requests with dates
                setRequests(data.requests.filter((r: any) => r.desired_publish_date));
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching data:', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const renderHeader = () => {
        return (
            <div className="flex items-center justify-between mb-8 px-2">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary-600/10 rounded-2xl flex items-center justify-center text-primary-500 border border-primary-600/20 shadow-lg shadow-primary-500/5">
                        <CalendarIcon size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none">Calendário Editorial</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Planejamento Raiz • {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
                    <button onClick={prevMonth} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-500">
                        <ChevronLeft size={20} />
                    </button>
                    <div className="px-4 text-sm font-black text-slate-700 min-w-[150px] text-center uppercase tracking-widest">
                        {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
                    </div>
                    <button onClick={nextMonth} className="p-2.5 hover:bg-slate-50 rounded-xl transition-all text-slate-500">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>
        );
    };

    const renderDays = () => {
        const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        return (
            <div className="grid grid-cols-7 mb-2 border-b border-slate-100 pb-4">
                {days.map(d => (
                    <div key={d} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        {d}
                    </div>
                ))}
            </div>
        );
    };

    const renderCells = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);

        const rows = [];
        let days = [];
        let day = startDate;
        let formattedDate = "";

        while (day <= endDate) {
            for (let i = 0; i < 7; i++) {
                formattedDate = format(day, "d");
                const cloneDay = day;
                const dailyRequests = requests.filter(r => isSameDay(parseISO(r.desired_publish_date), cloneDay));

                days.push(
                    <div
                        key={day.toString()}
                        className={`min-h-[140px] p-4 border-r border-b border-slate-100 transition-all cursor-pointer hover:bg-slate-50/50 group ${
                            !isSameMonth(day, monthStart) ? "bg-slate-50/30 grayscale" : ""
                        } ${isSameDay(day, new Date()) ? "bg-primary-50/30" : ""}`}
                        onClick={() => setSelectedDay(cloneDay)}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <span className={`text-sm font-black ${
                                isSameDay(day, new Date()) ? "w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/20" : 
                                isSameMonth(day, monthStart) ? "text-slate-800" : "text-slate-300"
                            }`}>
                                {formattedDate}
                            </span>
                            {dailyRequests.length > 0 && (
                                <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                                    {dailyRequests.length} POSTS
                                </span>
                            )}
                        </div>

                        <div className="space-y-1.5 overflow-hidden">
                            {dailyRequests.slice(0, 3).map(r => (
                                <div key={r.id} className="text-[9px] font-bold bg-white border border-slate-100 p-2 rounded-lg shadow-sm truncate flex items-center gap-2 group-hover:border-primary-200 transition-all">
                                    <div className={`w-1.5 h-1.5 rounded-full ${
                                        r.status === 'finalizada' ? 'bg-emerald-500' : 
                                        r.status === 'ia' ? 'bg-indigo-500 animate-pulse' : 
                                        'bg-amber-500'
                                    }`} />
                                    <span className="text-slate-700 uppercase tracking-tighter truncate">{r.brand_name} • {r.demand_type}</span>
                                </div>
                            ))}
                            {dailyRequests.length > 3 && (
                                <div className="text-[9px] font-black text-slate-400 text-center pt-1 uppercase tracking-widest">
                                    + {dailyRequests.length - 3} itens
                                </div>
                            )}
                        </div>
                    </div>
                );
                day = addDays(day, 1);
            }
            rows.push(
                <div className="grid grid-cols-7" key={day.toString()}>
                    {days}
                </div>
            );
            days = [];
        }
        return <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl shadow-slate-200/50 overflow-hidden">{rows}</div>;
    };

    if (loading) {
        return (
            <div className="flex h-screen bg-[#F8FAFC] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto min-h-screen bg-[#F8FAFC]">
            {renderHeader()}
            
            <div className="flex gap-8">
                {/* Main Calendar View */}
                <div className="flex-1">
                    {renderDays()}
                    {renderCells()}
                </div>

                {/* Sidebar Info - Fases 3/4 Style */}
                <div className="w-80 space-y-6">
                    <div className="bg-slate-900 text-white p-8 rounded-[2rem] shadow-xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none group-hover:scale-110 transition-transform">
                            <Zap size={100} />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 text-primary-400 font-black text-[10px] uppercase tracking-widest mb-4">
                                <Zap size={14} className="fill-current" />
                                IA Sugestão de Pauta
                            </div>
                            <h3 className="text-lg font-black leading-tight mb-4">Aumente sua frequência em Março!</h3>
                            <p className="text-xs text-slate-400 leading-relaxed mb-6 font-medium">
                                Identificamos um vácuo de pauta entre os dias 15 e 20. Sugerimos criar conteúdos de **Relacionamento** para as marcas Escola Raiz e Sá Pereira.
                            </p>
                            <button className="w-full py-3 bg-primary-600 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-primary-500 transition-all shadow-lg shadow-primary-500/20">
                                Gerar Pautas IA
                            </button>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-lg">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 px-2">Resumo da Quinzena</h4>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                                        <MessageSquare size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase">Posts Totais</p>
                                        <p className="text-[10px] font-medium text-slate-500">Prontos para disparar</p>
                                    </div>
                                </div>
                                <span className="text-xl font-black text-slate-900">{requests.length}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                                        <Zap size={20} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900 uppercase">Eficiência</p>
                                        <p className="text-[10px] font-medium text-slate-500">Média de aprovação</p>
                                    </div>
                                </div>
                                <span className="text-xl font-black text-slate-900">88%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Day Detail Modal (Conceptual) */}
            {selectedDay && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedDay(null)}></div>
                    <div className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-10 animate-in zoom-in duration-300">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Postagens do Dia</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{format(selectedDay, "dd 'de' MMMM", { locale: ptBR })}</p>
                            </div>
                            <button onClick={() => setSelectedDay(null)} className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all">
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {requests.filter(r => isSameDay(parseISO(r.desired_publish_date), selectedDay)).map(r => (
                                <div key={r.id} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 flex items-center justify-between group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 border border-slate-100 shadow-sm font-black uppercase text-lg">
                                            {r.brand_name?.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight">{r.brand_name}</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{r.demand_type} • {r.channel}</p>
                                        </div>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                        r.status === 'finalizada' ? 'bg-emerald-100 text-emerald-700' : 'bg-primary-100 text-primary-700'
                                    }`}>
                                        {r.status}
                                    </div>
                                </div>
                            ))}
                            {requests.filter(r => isSameDay(parseISO(r.desired_publish_date), selectedDay)).length === 0 && (
                                <div className="text-center py-10">
                                    <CalendarIcon size={40} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Nenhuma postagem agendada</p>
                                </div>
                            )}
                        </div>

                        <button className="w-full mt-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-primary-600 transition-all shadow-xl shadow-primary-400/10">
                            Abrir nova demanda para este dia
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function X({ size, className }: { size: number, className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
        </svg>
    );
}
