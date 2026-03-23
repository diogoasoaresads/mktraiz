"use client";

import { useState, useEffect } from 'react';
import { 
    Calendar as CalendarIcon, 
    ChevronLeft, 
    ChevronRight, 
    Plus, 
    Search,
    Filter,
    MapPin,
    Users,
    Sparkles,
    Loader2,
    CheckCircle2,
    Clock
} from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Event {
    id: string;
    name: string;
    type: string;
    description: string;
    start_date: string;
    end_date: string | null;
}

export default function CalendarPage() {
    const [collapsed, setCollapsed] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [brands, setBrands] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [newEvent, setNewEvent] = useState({
        name: '',
        type: 'sazonal',
        description: '',
        start_date: format(new Date(), 'yyyy-MM-dd'),
        end_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
        school_ids: '', 
        unit_ids: '',
        team_size: 2,
        budget_planned: 0,
        budget_executed: 0,
        target_leads: 0
    });

    // Calculate goals and CPL
    const calculateMetrics = () => {
        try {
            const start = new Date(newEvent.start_date + 'T12:00:00');
            const end = new Date((newEvent.end_date || newEvent.start_date) + 'T12:00:00');
            const days = eachDayOfInterval({ start, end }).length;
            const targetLeads = newEvent.team_size * days * 30;
            
            const cplPlanned = targetLeads > 0 ? (newEvent.budget_planned / targetLeads) : 0;
            const cplExecuted = targetLeads > 0 ? (newEvent.budget_executed / targetLeads) : 0;

            return { targetLeads, cplPlanned, cplExecuted };
        } catch (e) {
            return { targetLeads: 0, cplPlanned: 0, cplExecuted: 0 };
        }
    };

    const metrics = calculateMetrics();

    useEffect(() => {
        if (newEvent.target_leads !== metrics.targetLeads) {
            setNewEvent(prev => ({ ...prev, target_leads: metrics.targetLeads }));
        }
    }, [newEvent.start_date, newEvent.end_date, newEvent.team_size, metrics.targetLeads]);

    useEffect(() => {
        fetchEvents();
        fetchAuxData();
    }, []);

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/activations/events');
            const data = await res.json();
            setEvents(data || []);
        } catch (error) {
            console.error('Erro ao buscar eventos:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAuxData = async () => {
        try {
            const [brandsRes, unitsRes] = await Promise.all([
                fetch('/api/schools'),
                fetch('/api/units')
            ]);
            const brandsData = await brandsRes.json();
            const unitsData = await unitsRes.json();
            setBrands(brandsData || []);
            setUnits(unitsData || []);
        } catch (error) {
            console.error('Erro ao buscar marcas/unidades:', error);
        }
    };

    const handleSaveEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch('/api/activations/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newEvent)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setNewEvent({
                    name: '',
                    type: 'sazonal',
                    description: '',
                    start_date: format(new Date(), 'yyyy-MM-dd'),
                    end_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
                    school_ids: '',
                    unit_ids: '',
                    team_size: 2,
                    budget_planned: 0,
                    budget_executed: 0,
                    target_leads: 0
                });
                fetchEvents();
            }
        } catch (error) {
            console.error('Erro ao salvar evento:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDayClick = (day: Date) => {
        setNewEvent(prev => ({ 
            ...prev, 
            start_date: format(day, 'yyyy-MM-dd'),
            end_date: format(addDays(day, 1), 'yyyy-MM-dd')
        }));
        setIsModalOpen(true);
    };

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfMonth(monthStart);
    const endDate = endOfMonth(monthEnd);

    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const getEventsForDay = (day: Date) => {
        return events.filter(event => isSameDay(new Date(event.start_date + 'T12:00:00'), day));
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'escolar': return 'bg-primary-500';
            case 'sazonal': return 'bg-secondary-500';
            case 'promocional': return 'bg-amber-500';
            default: return 'bg-slate-500';
        }
    };

    // Filter units based on selected brand
    const filteredUnits = newEvent.school_ids 
        ? units.filter(u => u.school_id === newEvent.school_ids)
        : units;

    return (
        <div className="flex min-h-screen bg-slate-50 relative">
            <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
            
            <main className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-72'} p-8`}>
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Sparkles size={16} className="text-primary-600" />
                            <span className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em]">Inteligência Sazonal</span>
                        </div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Calendário Raiz</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-1 flex">
                            <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                                <ChevronLeft size={20} />
                            </button>
                            <div className="px-4 flex items-center justify-center font-black text-slate-900 text-sm uppercase tracking-widest min-w-[150px]">
                                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                            </div>
                            <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-slate-900 transition-all">
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <button 
                            onClick={() => setIsModalOpen(true)}
                            className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-primary-600/20 flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Novo Evento
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                    {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                        <div key={day} className="bg-slate-50 py-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {day}
                        </div>
                    ))}
                    {days.map((day, idx) => {
                        const dayEvents = getEventsForDay(day);
                        const isCurrentMonth = isSameMonth(day, monthStart);
                        
                        return (
                            <div 
                                key={idx} 
                                onClick={() => handleDayClick(day)}
                                className={`min-h-[140px] bg-white p-3 transition-all hover:bg-slate-50 cursor-pointer group ${!isCurrentMonth ? 'bg-slate-50/50 grayscale-[0.5] opacity-50' : ''}`}
                            >
                                <div className={`text-sm font-black mb-2 flex items-center justify-between`}>
                                    <span className={isSameDay(day, new Date()) ? 'text-primary-600 flex items-center justify-center w-7 h-7 bg-primary-50 rounded-full' : 'text-slate-400'}>
                                        {format(day, 'd')}
                                    </span>
                                    <Plus size={12} className="text-slate-200 opacity-0 group-hover:opacity-100 transition-all" />
                                </div>
                                <div className="space-y-1">
                                    {dayEvents.map(event => (
                                        <div key={event.id} className={`${getTypeColor(event.type)} text-white p-1.5 rounded-lg text-[10px] font-bold leading-tight shadow-sm truncate`}>
                                            {event.name}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                                <Clock size={20} />
                            </div>
                            <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Próximas Datas</h3>
                        </div>
                        <div className="space-y-4">
                            {events.slice(0, 3).map(event => (
                                <div key={event.id} className="flex gap-4 items-start p-3 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                                    <div className={`w-2 h-10 rounded-full ${getTypeColor(event.type)} shrink-0 mt-0.5`} />
                                    <div>
                                        <p className="font-black text-slate-900 text-xs uppercase mb-1">{event.name}</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{format(new Date(event.start_date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-secondary-50 rounded-xl flex items-center justify-center text-secondary-600">
                                <MapPin size={20} />
                            </div>
                            <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Ativações Próximas</h3>
                        </div>
                        <div className="flex flex-col items-center justify-center h-48 text-center px-6">
                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                                <Loader2 size={24} className="animate-spin" />
                            </div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Carregando locais recomendados...</p>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                                <Users size={20} />
                            </div>
                            <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Insights de Público</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="bg-amber-50/50 p-4 rounded-3xl border border-amber-100/50">
                                <p className="text-[11px] text-amber-900 font-bold leading-relaxed italic">
                                    "Período de volta às aulas concentra 65% do fluxo em shoppings próximos às unidades Barra e Recreio."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Modal Novo Evento */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Novo Evento</h2>
                                <p className="text-[10px] font-black text-primary-600 uppercase tracking-widest mt-1">Inteligência de Calendário</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                                <Plus size={24} className="rotate-45" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSaveEvent} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nome do Evento</label>
                                    <input 
                                        required
                                        type="text" 
                                        placeholder="Ex: Volta às Aulas 2026"
                                        value={newEvent.name}
                                        onChange={e => setNewEvent({...newEvent, name: e.target.value})}
                                        className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-500/20"
                                    />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Data de Início</label>
                                        <input 
                                            required 
                                            type="date" 
                                            value={newEvent.start_date} 
                                            onChange={e => setNewEvent({...newEvent, start_date: e.target.value})} 
                                            className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Data de Término</label>
                                        <input 
                                            required 
                                            type="date" 
                                            value={newEvent.end_date} 
                                            onChange={e => setNewEvent({...newEvent, end_date: e.target.value})} 
                                            className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold" 
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tamanho da Equipe</label>
                                        <input 
                                            required 
                                            type="number" 
                                            min="1"
                                            value={newEvent.team_size} 
                                            onChange={e => setNewEvent({...newEvent, team_size: parseInt(e.target.value) || 0})} 
                                            className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tipo de Evento</label>
                                        <select 
                                            value={newEvent.type} 
                                            onChange={e => setNewEvent({...newEvent, type: e.target.value})} 
                                            className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold"
                                        >
                                            <option value="escolar">Escolar</option>
                                            <option value="sazonal">Sazonal</option>
                                            <option value="promocional">Promocional</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Valor Orçado (R$)</label>
                                        <input 
                                            required 
                                            type="number" 
                                            step="0.01"
                                            value={newEvent.budget_planned} 
                                            onChange={e => setNewEvent({...newEvent, budget_planned: parseFloat(e.target.value) || 0})} 
                                            className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold" 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Valor Realizado (R$)</label>
                                        <input 
                                            required 
                                            type="number" 
                                            step="0.01"
                                            value={newEvent.budget_executed} 
                                            onChange={e => setNewEvent({...newEvent, budget_executed: parseFloat(e.target.value) || 0})} 
                                            className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold" 
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Marca (Escola)</label>
                                        <select 
                                            value={newEvent.school_ids} 
                                            onChange={e => setNewEvent({...newEvent, school_ids: e.target.value, unit_ids: ''})} 
                                            className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold"
                                        >
                                            <option value="">Selecione...</option>
                                            {brands.map(brand => (
                                                <option key={brand.id} value={brand.id}>{brand.brand_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Unidade</label>
                                        <select 
                                            value={newEvent.unit_ids} 
                                            onChange={e => setNewEvent({...newEvent, unit_ids: e.target.value})} 
                                            className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold"
                                        >
                                            <option value="">Todas as unidades</option>
                                            {filteredUnits.map(unit => (
                                                <option key={unit.id} value={unit.id}>{unit.unit_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Descrição (Opcional)</label>
                                    <textarea 
                                        placeholder="Detalhes sobre o evento..."
                                        value={newEvent.description}
                                        onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                                        className="w-full bg-slate-50 border-none px-6 py-4 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-500/20 h-24 resize-none"
                                    />
                                </div>

                                {/* Resumo de Performance */}
                                <div className="bg-primary-50/50 p-6 rounded-[2rem] border border-primary-100 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em]">Resumo de Performance</span>
                                        <div className="flex items-center gap-1.5">
                                            <Sparkles size={12} className="text-primary-600" />
                                            <span className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Estimativa IA</span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-primary-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest font-mono">Meta de Leads</p>
                                            <p className="text-sm font-black text-primary-600">{metrics.targetLeads}</p>
                                        </div>
                                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-primary-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest font-mono">CPL Orçado</p>
                                            <p className="text-sm font-black text-slate-900">
                                                R$ {metrics.cplPlanned.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-primary-100">
                                            <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest font-mono">CPL Realizado</p>
                                            <p className="text-sm font-black text-secondary-600">
                                                R$ {metrics.cplExecuted.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 rounded-2xl font-black text-xs uppercase text-slate-400">Cancelar</button>
                                <button type="submit" disabled={isSaving} className="flex-[2] bg-primary-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase shadow-lg disabled:opacity-50 flex items-center justify-center gap-2">
                                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                    {isSaving ? 'Salvando...' : 'Criar Evento'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
