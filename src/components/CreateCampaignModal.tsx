"use client";

import { useState, useEffect } from 'react';
import { X, Plus, Loader2, Target } from 'lucide-react';

interface School {
    id: string;
    brand_name: string;
}

interface CreateCampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    editingCampaign?: any; // The campaign to edit, if any
}

export default function CreateCampaignModal({ isOpen, onClose, onSuccess, editingCampaign }: CreateCampaignModalProps) {
    const [loading, setLoading] = useState(false);
    const [schools, setSchools] = useState<School[]>([]);
    const [mediaTypes, setMediaTypes] = useState<{ value: string, label: string }[]>([]);
    const [form, setForm] = useState({
        name: '',
        objective: 'Cobertura regional',
        start_date: '',
        end_date: '',
        budget: '',
        radius_km: '5',
        allowed_types: [] as string[],
        target_school_ids: [] as string[]
    });

    useEffect(() => {
        if (isOpen) {
            fetch('/api/schools').then(r => r.json()).then(setSchools).catch(console.error);
            fetch('/api/config/media-types').then(r => r.json()).then(setMediaTypes).catch(console.error);

            if (editingCampaign) {
                setForm({
                    name: editingCampaign.name || '',
                    objective: editingCampaign.objective || 'Cobertura regional',
                    start_date: editingCampaign.start_date || '',
                    end_date: editingCampaign.end_date || '',
                    budget: editingCampaign.budget ? editingCampaign.budget.toString() : '',
                    radius_km: editingCampaign.radius_km ? editingCampaign.radius_km.toString() : '5',
                    allowed_types: typeof editingCampaign.allowed_types === 'string'
                        ? JSON.parse(editingCampaign.allowed_types)
                        : (editingCampaign.allowed_types || []),
                    target_school_ids: typeof editingCampaign.target_school_ids === 'string'
                        ? JSON.parse(editingCampaign.target_school_ids)
                        : (editingCampaign.target_school_ids || [])
                });
            } else {
                setForm({
                    name: '',
                    objective: 'Cobertura regional',
                    start_date: '',
                    end_date: '',
                    budget: '',
                    radius_km: '5',
                    allowed_types: [],
                    target_school_ids: []
                });
            }
        }
    }, [isOpen, editingCampaign]);

    if (!isOpen) return null;



    const toggleType = (type: string) => {
        setForm(prev => ({
            ...prev,
            allowed_types: prev.allowed_types.includes(type)
                ? prev.allowed_types.filter(t => t !== type)
                : [...prev.allowed_types, type]
        }));
    };

    const toggleSchool = (id: string) => {
        setForm(prev => ({
            ...prev,
            target_school_ids: prev.target_school_ids.includes(id)
                ? prev.target_school_ids.filter(s => s !== id)
                : [...prev.target_school_ids, id]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name) return;
        setLoading(true);
        try {
            const endpoint = editingCampaign ? `/api/campaigns/${editingCampaign.id}` : '/api/campaigns';
            const method = editingCampaign ? 'PUT' : 'POST';

            const res = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    budget: parseFloat(form.budget) || 0,
                    radius_km: parseFloat(form.radius_km) || 5,
                    allowed_types: form.allowed_types,
                    target_school_ids: form.target_school_ids,
                    target_unit_ids: editingCampaign && editingCampaign.target_unit_ids
                        ? (typeof editingCampaign.target_unit_ids === 'string' ? JSON.parse(editingCampaign.target_unit_ids) : editingCampaign.target_unit_ids)
                        : []
                })
            });
            if (!res.ok) throw new Error('Erro ao salvar campanha');
            onSuccess();
            onClose();
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-auto m-4">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-600 rounded-2xl flex items-center justify-center text-white">
                            <Target size={20} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900">
                            {editingCampaign ? 'Editar Campanha' : 'Nova Campanha'}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Name */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Campanha *</label>
                        <input
                            type="text"
                            required
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Ex: Matrículas 2027 — São Paulo"
                            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-primary-500/20"
                        />
                    </div>

                    {/* Objective */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objetivo</label>
                        <select
                            value={form.objective}
                            onChange={(e) => setForm({ ...form, objective: e.target.value })}
                            className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
                        >
                            <option>Cobertura regional</option>
                            <option>Impacto máximo</option>
                            <option>Otimização de custos</option>
                            <option>Branding institucional</option>
                            <option>Campanha sazonal</option>
                            <option>Captação</option>
                        </select>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Início</label>
                            <input
                                type="date"
                                value={form.start_date}
                                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Término</label>
                            <input
                                type="date"
                                value={form.end_date}
                                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
                            />
                        </div>
                    </div>

                    {/* Budget & Radius */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                value={form.budget}
                                onChange={(e) => setForm({ ...form, budget: e.target.value })}
                                placeholder="50000"
                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Raio (km)</label>
                            <input
                                type="number"
                                step="0.5"
                                value={form.radius_km}
                                onChange={(e) => setForm({ ...form, radius_km: e.target.value })}
                                className="w-full mt-1 px-4 py-3 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
                            />
                        </div>
                    </div>

                    {/* Media Types */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Tipos de Mídia (deixe vazio = todos)</label>
                        <div className="flex flex-wrap gap-2">
                            {mediaTypes.map(t => (
                                <button
                                    key={t.value}
                                    type="button"
                                    onClick={() => toggleType(t.value)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${form.allowed_types.includes(t.value)
                                        ? 'bg-primary-600 text-white shadow-lg'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target Schools */}
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Marcas Alvo (deixe vazio = todas)</label>
                        <div className="flex flex-wrap gap-2">
                            {schools.map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => toggleSchool(s.id)}
                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${form.target_school_ids.includes(s.id)
                                        ? 'bg-slate-900 text-white shadow-lg'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    {s.brand_name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !form.name}
                        className="w-full h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                        {editingCampaign ? 'Salvar Alterações' : 'Criar Campanha'}
                    </button>
                </form>
            </div>
        </div>
    );
}
