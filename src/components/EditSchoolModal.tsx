"use client";

import { useState, useEffect } from 'react';
import { X, Save, Trash2, AlertCircle, Loader2 } from 'lucide-react';

interface EditSchoolModalProps {
    isOpen: boolean;
    onClose: () => void;
    school: {
        id: string;
        brand_name: string;
        website: string;
        notes?: string;
    } | null;
    onSuccess: () => void;
}

export default function EditSchoolModal({ isOpen, onClose, school, onSuccess }: EditSchoolModalProps) {
    const [name, setName] = useState('');
    const [website, setWebsite] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (school) {
            setName(school.brand_name || '');
            setWebsite(school.website || '');
            setNotes(school.notes || '');
            setError(null);
        }
    }, [school, isOpen]);

    if (!isOpen || !school) return null;

    const handleSave = async () => {
        if (!name.trim()) {
            setError('O nome da marca é obrigatório.');
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            const res = await fetch(`/api/schools/${school.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    brand_name: name,
                    website: website,
                    notes: notes
                })
            });

            if (!res.ok) throw new Error('Erro ao atualizar marca.');

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        const confirmed = window.confirm(`ATENÇÃO: Isso apagará a marca "${school.brand_name}" e TODAS as suas unidades.\n\nEsta ação é irreversível. Deseja continuar?`);
        if (!confirmed) return;

        setIsDeleting(true);
        setError(null);

        try {
            const res = await fetch(`/api/schools/${school.id}`, {
                method: 'DELETE'
            });

            if (!res.ok) throw new Error('Erro ao excluir marca.');

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="premium-card w-full max-w-md bg-white overflow-hidden shadow-2xl scale-in duration-300">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Editar Marca</h3>
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Configurações Base</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome da Marca</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                                placeholder="Ex: Raiz Educação"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Website (sem https://)</label>
                            <input
                                type="text"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all"
                                placeholder="Ex: www.raizeducacao.com.br"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Observações</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all resize-none"
                                placeholder="Notas internas..."
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-bold animate-in slide-in-from-top-2">
                            <AlertCircle size={16} className="shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={handleDelete}
                            disabled={isSaving || isDeleting}
                            className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-100 rounded-2xl transition-all duration-300 disabled:opacity-50"
                            title="Excluir Marca"
                        >
                            {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={isSaving || isDeleting}
                            className="flex-1 h-12 bg-slate-900 hover:bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10 hover:shadow-primary-600/20 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Salvando...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={16} />
                                    <span>Salvar Alterações</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
