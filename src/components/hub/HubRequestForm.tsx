"use client";

import { useState, useEffect } from 'react';
import { 
    MessageSquare, 
    Send, 
    User, 
    Briefcase,
    Zap,
    Layout,
    AlertCircle,
    CheckCircle2
} from 'lucide-react';

export default function HubRequestForm() {
    const [schools, setSchools] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    
    // Form State
    const [formData, setFormData] = useState({
        schoolId: '',
        unitId: '',
        requesterName: '',
        requesterArea: '',
        demandType: 'feed',
        channel: 'Instagram',
        objective: 'Branding',
        targetAudience: 'Comunidade Escolar',
        desiredPublishDate: '',
        priority: 'média',
        briefingRaw: '',
        tags: '[]'
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('/api/schools');
                const data = await res.json();
                if (data.success) setSchools(data.schools || []);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching schools:', err);
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const fetchUnits = async (schoolId: string) => {
        try {
            const res = await fetch(`/api/units?schoolId=${schoolId}`);
            const data = await res.json();
            if (data.success) setUnits(data.units || []);
        } catch (err) {
            console.error('Error fetching units:', err);
        }
    };

    const handleSchoolChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const id = e.target.value;
        setFormData(prev => ({ ...prev, schoolId: id, unitId: '' }));
        if (id) fetchUnits(id);
        else setUnits([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch('/api/hub/requests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setFormData({
                    schoolId: '',
                    unitId: '',
                    requesterName: '',
                    requesterArea: '',
                    demandType: 'feed',
                    channel: 'Instagram',
                    objective: 'Branding',
                    targetAudience: 'Comunidade Escolar',
                    desiredPublishDate: '',
                    priority: 'média',
                    briefingRaw: '',
                    tags: '[]'
                });
                setTimeout(() => setSuccess(false), 5000);
            }
        } catch (err) {
            console.error('Submit error:', err);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full">
            {success && (
                <div className="mb-8 p-6 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-center gap-4 animate-in zoom-in duration-300">
                    <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <h4 className="text-emerald-900 font-black text-lg">Demanda Enviada!</h4>
                        <p className="text-emerald-700">Sua solicitação já está na triagem e será processada pela equipe de conteúdo.</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 mb-8">
                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1 mb-4 block">Pilares de Conteúdo (Tags)</label>
                    <div className="flex flex-wrap gap-2">
                        {['Relacionamento', 'Captação', 'Acadêmico', 'Esporte', 'Evento', 'Infraestrutura'].map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                    const current = formData.tags ? JSON.parse(formData.tags) : [];
                                    const updated = current.includes(tag) ? current.filter((t: string) => t !== tag) : [...current, tag];
                                    setFormData(prev => ({ ...prev, tags: JSON.stringify(updated) }));
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                                    (formData.tags ? JSON.parse(formData.tags) : []).includes(tag)
                                    ? 'bg-primary-600 text-white border-transparent'
                                    : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Section 1: Identificação */}
                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-slate-50 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                        <User size={120} />
                    </div>
                    
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                            <User size={20} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Identificação</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Marca / Escola</label>
                            <select 
                                required
                                value={formData.schoolId}
                                onChange={handleSchoolChange}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
                            >
                                <option value="">Selecione a Marca</option>
                                {schools.map(s => <option key={s.id} value={s.id}>{s.brand_name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Unidade Técnica</label>
                            <select 
                                value={formData.unitId}
                                onChange={(e) => setFormData(prev => ({ ...prev, unitId: e.target.value }))}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
                            >
                                <option value="">Selecione a Unidade (Opcional)</option>
                                {units.map(u => <option key={u.id} value={u.id}>{u.unit_name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Solicitante</label>
                            <input 
                                required
                                type="text"
                                placeholder="Seu nome completo"
                                value={formData.requesterName}
                                onChange={(e) => setFormData(prev => ({ ...prev, requesterName: e.target.value }))}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Área / Setor</label>
                            <input 
                                required
                                type="text"
                                placeholder="Ex: Marketing, Direção, Comercial"
                                value={formData.requesterArea}
                                onChange={(e) => setFormData(prev => ({ ...prev, requesterArea: e.target.value }))}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 2: Detalhes da Demanda */}
                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8 text-slate-50 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                        <Layout size={120} />
                    </div>

                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                            <Briefcase size={20} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Sobre o Conteúdo</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Demanda</label>
                            <select 
                                value={formData.demandType}
                                onChange={(e) => setFormData(prev => ({ ...prev, demandType: e.target.value }))}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
                            >
                                <option value="feed">Post Feed / Carrossel</option>
                                <option value="stories">Stories</option>
                                <option value="reels">Reels / Vídeo Curto</option>
                                <option value="ads">Anúncio Pago (Ads)</option>
                                <option value="email">E-mail Marketing</option>
                                <option value="whats">Copy para WhatsApp</option>
                                <option value="comunicado">Comunicado Oficial</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Canais</label>
                            <select 
                                value={formData.channel}
                                onChange={(e) => setFormData(prev => ({ ...prev, channel: e.target.value }))}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all cursor-pointer"
                            >
                                <option value="Instagram">Instagram</option>
                                <option value="Facebook">Facebook</option>
                                <option value="Linkedin">LinkedIn</option>
                                <option value="Omnichannel">Todos os Canais</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Data Publicação</label>
                            <input 
                                type="date"
                                value={formData.desiredPublishDate}
                                onChange={(e) => setFormData(prev => ({ ...prev, desiredPublishDate: e.target.value }))}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Objetivo Estratégico</label>
                            <input 
                                type="text"
                                placeholder="Ex: Captação de ALunos, Evento Open Day..."
                                value={formData.objective}
                                onChange={(e) => setFormData(prev => ({ ...prev, objective: e.target.value }))}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Público-Alvo</label>
                            <input 
                                type="text"
                                placeholder="Ex: Pais de alunos do Fundamental I"
                                value={formData.targetAudience}
                                onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
                                className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Section 3: Briefing */}
                <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-8 text-slate-50 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                        <MessageSquare size={120} />
                    </div>

                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600">
                            <MessageSquare size={20} />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Briefing Detalhado</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <AlertCircle size={18} className="text-primary-600 shrink-0 mt-0.5" />
                            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide leading-relaxed">
                                Forneça o máximo de informações possível. Nossa IA usará este texto para sugerir legendas, CTA e o briefing visual para o design.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Conte o que você precisa</label>
                            <textarea 
                                required
                                rows={6}
                                placeholder="Descreva o contexto, as informações fundamentais, das, locais e qual a 'dor' que esse conteúdo resolve..."
                                value={formData.briefingRaw}
                                onChange={(e) => setFormData(prev => ({ ...prev, briefingRaw: e.target.value }))}
                                className="w-full bg-slate-50 border-none rounded-2xl p-6 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all resize-none leading-relaxed"
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-center pt-6">
                    <button
                        type="submit"
                        disabled={submitting}
                        className="group relative flex items-center gap-4 bg-slate-900 text-white px-10 py-5 rounded-full font-black text-lg uppercase tracking-widest hover:bg-primary-600 hover:scale-105 active:scale-95 transition-all shadow-2xl shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {submitting ? (
                            <>
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                <span>Processando...</span>
                            </>
                        ) : (
                            <>
                                <span>Enviar Demanda</span>
                                <Send size={24} className="group-hover:translate-x-2 group-hover:-translate-y-1 transition-transform" />
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
