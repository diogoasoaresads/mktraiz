"use client";

import { useState, useEffect } from 'react';
import {
    Plus,
    Target,
    Calendar,
    DollarSign,
    ChevronRight,
    MoreVertical,
    Activity,
    Clock,
    CheckCircle2,
    Search,
    Edit2,
    Copy,
    Trash
} from 'lucide-react';
import Link from 'next/link';
import CreateCampaignModal from '@/components/CreateCampaignModal';
import { exportToExcel } from '@/lib/exportExcel';

interface Campaign {
    id: string;
    name: string;
    objective: string;
    start_date: string;
    end_date: string;
    budget: number;
    status: string;
}

export default function CampaignsPage() {
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const fetchCampaigns = async () => {
        try {
            const res = await fetch('/api/campaigns');
            const data = await res.json();
            setCampaigns(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Tem certeza que deseja apagar a campanha "${name}"? Todas as simulações e dados vinculados serão perdidos.`)) return;
        setIsActionLoading(true);
        try {
            const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' });
            if (res.ok) await fetchCampaigns();
        } catch (error) {
            console.error(error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDuplicate = async (id: string) => {
        setIsActionLoading(true);
        try {
            const res = await fetch(`/api/campaigns/${id}/duplicate`, { method: 'POST' });
            if (res.ok) await fetchCampaigns();
        } catch (error) {
            console.error(error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleEdit = async (id: string) => {
        setIsActionLoading(true);
        try {
            const res = await fetch(`/api/campaigns/${id}`);
            if (res.ok) {
                const data = await res.json();
                setEditingCampaign(data);
                setShowCreate(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsActionLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles: any = {
            draft: 'bg-slate-100 text-slate-600',
            planned: 'bg-primary-50 text-primary-600',
            approved: 'bg-emerald-50 text-emerald-600',
            running: 'bg-blue-500 text-white animate-pulse',
        };
        return (
            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${styles[status] || styles.draft}`}>
                {status}
            </span>
        );
    };

    return (
        <div className="p-10 max-w-7xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Campanhas <span className="text-primary-600">(Campaigns)</span></h1>
                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <Target size={16} />
                        <p>Planejamento e execução de mídia integrada</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => exportToExcel(
                            campaigns.map(c => ({
                                'Campanha': c.name,
                                'Objetivo': c.objective || '',
                                'Orçamento (R$)': c.budget || 0,
                                'Data Início': c.start_date ? c.start_date.split('T')[0] : '',
                                'Data Fim': c.end_date ? c.end_date.split('T')[0] : '',
                                'Status': c.status
                            })),
                            'campanhas'
                        )}
                        className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-600 px-5 py-3 rounded-2xl font-bold hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all shadow-sm"
                    >
                        ↓ Excel
                    </button>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-primary-600 text-white px-6 py-3 rounded-2xl font-bold transition-all duration-300 shadow-xl shadow-slate-900/10"
                    >
                        <Plus size={20} />
                        Nova Campanha
                    </button>
                </div>
            </header>

            <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left order-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Campanha</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Objetivo</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Período</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Budget</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="p-6"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-20 text-center text-slate-400">
                                        <p className="font-bold">Nenhuma campanha criada.</p>
                                        <p className="text-xs">Inicie um novo planejamento para visualizar aqui.</p>
                                    </td>
                                </tr>
                            ) : (
                                campaigns.map(c => (
                                    <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-colors group">
                                        <td className="p-6">
                                            <p className="font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{c.name}</p>
                                        </td>
                                        <td className="p-6">
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{c.objective}</span>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                                <Calendar size={14} />
                                                <span>{c.start_date || 'N/D'} - {c.end_date || 'N/D'}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-1 text-sm font-black text-slate-900">
                                                <DollarSign size={14} className="text-primary-600" />
                                                <span>{c.budget.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        </td>
                                        <td className="p-6">
                                            {getStatusBadge(c.status)}
                                        </td>
                                        <td className="p-6 text-right">
                                            <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity mr-4">
                                                <button
                                                    onClick={() => handleDuplicate(c.id)}
                                                    disabled={isActionLoading}
                                                    className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                                                    title="Duplicar"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleEdit(c.id)}
                                                    disabled={isActionLoading}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(c.id, c.name)}
                                                    disabled={isActionLoading}
                                                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                    title="Excluir"
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            </div>
                                            <Link
                                                href={`/planner?campaignId=${c.id}`}
                                                className="inline-flex items-center gap-1.5 text-primary-600 font-black text-[10px] uppercase tracking-widest hover:translate-x-1 transition-transform"
                                            >
                                                Planejar <ChevronRight size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreateCampaignModal
                isOpen={showCreate}
                onClose={() => {
                    setShowCreate(false);
                    setEditingCampaign(null);
                }}
                onSuccess={() => {
                    setShowCreate(false);
                    setEditingCampaign(null);
                    fetchCampaigns();
                }}
                editingCampaign={editingCampaign}
            />
        </div>
    );
}
