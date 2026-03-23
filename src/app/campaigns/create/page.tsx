"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Target,
    Calendar,
    DollarSign,
    MapPin,
    ChevronRight,
    ArrowLeft,
    Layers,
    CheckCircle2,
    Loader2,
    Plus,
    X,
    School,
    FileText
} from 'lucide-react';

interface SchoolItem {
    id: string;
    brand_name: string;
}

export default function CreateCampaignPage() {
    const router = useRouter();
    const [schools, setSchools] = useState<SchoolItem[]>([]);
    const [mediaTypes, setMediaTypes] = useState<{ value: string, label: string }[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        name: '',
        objective: 'captação',
        start_date: '',
        end_date: '',
        budget: '',
        radius_km: '5',
        target_school_ids: [] as string[],
        allowed_types: [] as string[],
        budget_mode: 'total' as 'total' | 'equal_per_unit'
    });

    useEffect(() => {
        fetch('/api/schools')
            .then(res => res.json())
            .then(data => setSchools(data));

        fetch('/api/config/media-types')
            .then(res => res.json())
            .then(data => setMediaTypes(data));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleSchool = (id: string) => {
        setFormData(prev => ({
            ...prev,
            target_school_ids: prev.target_school_ids.includes(id)
                ? prev.target_school_ids.filter(s => s !== id)
                : [...prev.target_school_ids, id]
        }));
    };

    const toggleType = (type: string) => {
        setFormData(prev => ({
            ...prev,
            allowed_types: prev.allowed_types.includes(type)
                ? prev.allowed_types.filter(t => t !== type)
                : [...prev.allowed_types, type]
        }));
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/campaigns', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    budget: parseFloat(formData.budget) || 0,
                    radius_km: parseFloat(formData.radius_km) || 5,
                    allowed_types: formData.allowed_types
                })
            });

            if (res.ok) {
                const data = await res.json();
                router.push(`/planner?campaignId=${data.id}`);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="p-10 max-w-4xl mx-auto space-y-10">
            <header className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400">
                            <ArrowLeft size={20} />
                        </button>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Criar Nova <span className="text-primary-600">Campanha</span></h1>
                    </div>
                    <p className="text-slate-500 font-medium ml-12">Configure os objetivos e o público-alvo da sua estratégia de OOH.</p>
                </div>
            </header>

            {/* Stepper */}
            <div className="flex items-center gap-4">
                {[1, 2, 3].map(s => (
                    <div key={s} className="flex items-center gap-4 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all duration-500 ${step >= s ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/20' : 'bg-slate-100 text-slate-400'
                            }`}>
                            {s}
                        </div>
                        {s < 3 && <div className={`flex-1 h-1 rounded-full transition-all duration-500 ${step > s ? 'bg-primary-600' : 'bg-slate-100'}`} />}
                    </div>
                ))}
            </div>

            <div className="premium-card p-10">
                {step === 1 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                <FileText className="text-primary-600" size={24} />
                                Informações Básicas
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Campanha</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="Ex: Matrículas 2026 - Regional RJ"
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objetivo</label>
                                    <select
                                        name="objective"
                                        value={formData.objective}
                                        onChange={handleChange}
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none"
                                    >
                                        <option value="captação">Captação de Alunos</option>
                                        <option value="branding">Reconhecimento de Marca</option>
                                        <option value="inauguracao">Inauguração de Unidade</option>
                                        <option value="evento">Evento Específico</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Início</label>
                                    <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Término</label>
                                    <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold" />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-6">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!formData.name}
                                className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary-600 transition-all disabled:opacity-30 shadow-xl"
                            >
                                Próximo Passo <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                <Target className="text-primary-600" size={24} />
                                Público & Alcance
                            </h3>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Selecionar Escolas Alvo</label>
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    {schools.map(school => (
                                        <button
                                            key={school.id}
                                            onClick={() => toggleSchool(school.id)}
                                            className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${formData.target_school_ids.includes(school.id)
                                                ? 'bg-primary-600/10 border-primary-500 text-primary-700'
                                                : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200'
                                                }`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${formData.target_school_ids.includes(school.id) ? 'bg-primary-500 text-white' : 'bg-slate-50 text-slate-300'}`}>
                                                <School size={16} />
                                            </div>
                                            <span className="text-xs font-bold">{school.brand_name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-50">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Tipos de Mídia Desejados (Opcional)</label>
                                <div className="flex flex-wrap gap-2">
                                    {mediaTypes.map(type => (
                                        <button
                                            key={type.value}
                                            onClick={() => toggleType(type.value)}
                                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${formData.allowed_types.includes(type.value)
                                                ? 'bg-primary-600 border-primary-600 text-white shadow-md'
                                                : 'bg-white border-slate-200 text-slate-500 hover:border-primary-300'
                                                }`}
                                        >
                                            {type.label}
                                        </button>
                                    ))}
                                    {mediaTypes.length === 0 && <p className="text-[10px] text-slate-400 italic">Nenhum tipo de mídia cadastrado no inventário.</p>}
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium italic">💡 Deixe vazio para sugerir todos os tipos disponíveis.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Raio de Influência (km)</label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="1"
                                            max="20"
                                            name="radius_km"
                                            value={formData.radius_km}
                                            onChange={handleChange}
                                            className="flex-1 accent-primary-600"
                                        />
                                        <span className="w-12 h-12 bg-primary-50 text-primary-600 rounded-xl flex items-center justify-center font-black text-sm">{formData.radius_km}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-medium">Distância máxima das unidades para seleção de mídia.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget Estimado (R$)</label>
                                    <div className="relative">
                                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">R$</div>
                                        <input
                                            type="number"
                                            name="budget"
                                            value={formData.budget}
                                            onChange={handleChange}
                                            placeholder="50.000,00"
                                            className="w-full pl-12 pr-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:outline-none"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-1 md:col-span-2 space-y-4 pt-2">
                                    <div className="flex items-center justify-between p-5 bg-primary-50/50 rounded-3xl border border-primary-100/50">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black text-slate-900">Orçamento Igual para Todas as Unidades</label>
                                            <p className="text-[10px] text-slate-500 font-medium italic">Divide os R$ {formData.budget || '0'} igualmente entre as unidades das marcas selecionadas.</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, budget_mode: prev.budget_mode === 'total' ? 'equal_per_unit' : 'total' }))}
                                            className={`w-14 h-8 rounded-full transition-all relative shrink-0 ${formData.budget_mode === 'equal_per_unit' ? 'bg-primary-600 shadow-lg shadow-primary-600/30' : 'bg-slate-200'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all ${formData.budget_mode === 'equal_per_unit' ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-6">
                            <button onClick={() => setStep(1)} className="flex items-center gap-2 text-slate-400 font-bold hover:text-slate-600 transition-colors">
                                <ArrowLeft size={18} /> Voltar
                            </button>
                            <button
                                onClick={() => setStep(3)}
                                disabled={formData.target_school_ids.length === 0}
                                className="flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary-600 transition-all shadow-xl"
                            >
                                Revisar Configuração <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-10 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                                <CheckCircle2 className="text-primary-600" size={24} />
                                Revisão Final
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-6 bg-slate-50 rounded-3xl space-y-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estratégia</p>
                                    <div className="space-y-1">
                                        <h4 className="text-lg font-black text-slate-900">{formData.name}</h4>
                                        <p className="text-sm font-bold text-primary-600">{formData.objective.toUpperCase()}</p>
                                    </div>
                                    <div className="flex gap-4 pt-4 border-t border-slate-200">
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Budget</p>
                                            <p className="text-sm font-black text-slate-900">R$ {parseFloat(formData.budget || '0').toLocaleString('pt-BR')}</p>
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Raio</p>
                                            <p className="text-sm font-black text-slate-900">{formData.radius_km} km</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 bg-white border border-slate-100 rounded-3xl space-y-4">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Marcas Alvo ({formData.target_school_ids.length})</p>
                                    <div className="flex flex-wrap gap-2">
                                        {formData.target_school_ids.map(id => {
                                            const school = schools.find(s => s.id === id);
                                            return (
                                                <span key={id} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black uppercase tracking-tight">
                                                    {school?.brand_name}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-between pt-6 border-t border-slate-50">
                            <button onClick={() => setStep(2)} className="flex items-center gap-2 text-slate-400 font-bold hover:text-slate-600 transition-colors">
                                <ArrowLeft size={18} /> Voltar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex items-center gap-3 bg-primary-600 text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/20"
                            >
                                {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Layers size={18} />}
                                {isSubmitting ? 'Salvando...' : 'Confirmar e Abrir Planejador'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
