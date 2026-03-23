"use client";

import { useState, useEffect } from 'react';
import { X, Target, Folder, CheckCircle } from 'lucide-react';

interface AddToPlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    selectedAssets: string[];
}

export default function AddToPlanModal({ isOpen, onClose, onSuccess, selectedAssets }: AddToPlanModalProps) {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [scenarios, setScenarios] = useState<any[]>([]);
    const [selectedCampaign, setSelectedCampaign] = useState('');
    const [selectedScenario, setSelectedScenario] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isOpen) return;
        fetch('/api/campaigns')
            .then(res => res.json())
            .then(data => setCampaigns(data))
            .catch(err => console.error(err));
    }, [isOpen]);

    useEffect(() => {
        if (!selectedCampaign) {
            setScenarios([]);
            setSelectedScenario('');
            return;
        }

        fetch(`/api/scenarios?campaignId=${selectedCampaign}`)
            .then(res => res.json())
            .then(data => setScenarios(data))
            .catch(err => console.error(err));
    }, [selectedCampaign]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/planner/bulk-add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scenarioId: selectedScenario,
                    assetIds: selectedAssets
                })
            });

            const data = await res.json();
            if (data.success) {
                alert(`Mídia adicionada ao plano com sucesso!`);
                onSuccess();
            } else {
                setError(data.error || 'Erro ao adicionar ao plano.');
            }
        } catch (err: any) {
            setError(err.message || 'Erro ao adicionar ao plano.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden scale-in duration-300 relative">
                <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 tracking-tight">Adicionar ao Plano</h3>
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">
                            {selectedAssets.length} ativos selecionados
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <Target size={12} /> Selecione a Campanha
                            </label>
                            <select
                                required
                                value={selectedCampaign}
                                onChange={(e) => setSelectedCampaign(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                                <option value="">Escolher Campanha...</option>
                                {campaigns.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>

                        {selectedCampaign && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                    <Folder size={12} /> Cenário (Plano de Mídia)
                                </label>
                                <select
                                    required
                                    value={selectedScenario}
                                    onChange={(e) => setSelectedScenario(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20"
                                >
                                    <option value="">Escolher Cenário...</option>
                                    {scenarios.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.assumptions?.monthly_budget ? `R$ ${s.assumptions.monthly_budget}` : 'S/ Orçamento'})</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center border border-red-100">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !selectedCampaign || !selectedScenario}
                        className="w-full py-4 bg-slate-900 hover:bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? 'Processando...' : <><CheckCircle size={16} /> Confirmar Adição</>}
                    </button>
                </form>
            </div>
        </div>
    );
}
