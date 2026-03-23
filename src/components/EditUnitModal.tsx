"use client";

import { useState } from 'react';
import { X, Save, AlertCircle, Loader2 } from 'lucide-react';

interface Unit {
    id: string;
    brand_name: string;
    unit_name: string;
    address_raw: string;
    city: string;
    state: string;
    lat: number | null;
    lng: number | null;
}

interface EditUnitModalProps {
    isOpen: boolean;
    onClose: () => void;
    unit: Unit;
    onSuccess: () => void;
}

export default function EditUnitModal({ isOpen, onClose, unit, onSuccess }: EditUnitModalProps) {
    const [formData, setFormData] = useState({
        unit_name: unit.unit_name,
        address_raw: unit.address_raw,
        city: unit.city || '',
        state: unit.state || '',
        lat: unit.lat || '',
        lng: unit.lng || ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setError(null);

        try {
            const res = await fetch(`/api/units/${unit.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    unit_name: formData.unit_name,
                    address_raw: formData.address_raw,
                    city: formData.city,
                    state: formData.state,
                    lat: formData.lat !== '' ? parseFloat(formData.lat as string) : null,
                    lng: formData.lng !== '' ? parseFloat(formData.lng as string) : null
                })
            });

            if (!res.ok) throw new Error('Falha ao atualizar unidade');

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="premium-card w-full max-w-lg bg-white overflow-hidden shadow-2xl scale-in duration-300">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">Editar Unidade</h3>
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest text-left">{unit.brand_name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Unidade</label>
                            <input
                                type="text"
                                value={formData.unit_name}
                                onChange={(e) => setFormData({ ...formData, unit_name: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço Completo</label>
                            <textarea
                                value={formData.address_raw}
                                onChange={(e) => setFormData({ ...formData, address_raw: e.target.value })}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20 min-h-[100px]"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidade</label>
                                <input
                                    type="text"
                                    value={formData.city}
                                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado (UF)</label>
                                <input
                                    type="text"
                                    value={formData.state}
                                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20 uppercase"
                                    maxLength={2}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                                    <span>Latitude</span>
                                    <span className="text-slate-300">Opcional</span>
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.lat}
                                    onChange={(e) => setFormData({ ...formData, lat: e.target.value })}
                                    placeholder="Ex: -22.9068"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-300"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                                    <span>Longitude</span>
                                    <span className="text-slate-300">Opcional</span>
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={formData.lng}
                                    onChange={(e) => setFormData({ ...formData, lng: e.target.value })}
                                    placeholder="Ex: -43.1729"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20 placeholder:text-slate-300"
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl border border-red-100 text-xs font-bold">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-12 bg-white border-2 border-slate-200 text-slate-700 rounded-2xl font-black text-xs uppercase tracking-widest transition-all hover:border-slate-400"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-1 h-12 bg-slate-900 hover:bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isSaving ? <Loader2 size={20} className="animate-spin" /> : (
                                <>
                                    Salvar Alterações <Save size={16} />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
