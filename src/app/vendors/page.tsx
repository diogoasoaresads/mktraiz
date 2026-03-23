"use client";

import { useState, useEffect } from 'react';
import {
    Users,
    Plus,
    Mail,
    Phone,
    MapPin,
    Calendar,
    Search,
    ChevronRight,
    Building2,
    Database,
    MoreVertical,
    FileText,
    CheckCircle2,
    X,
    Upload,
    Pencil,
    Trash2,
    Loader2,
    ShieldCheck
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import ImportVendorsModal from '@/components/ImportVendorsModal';
import VendorUsersModal from '@/components/VendorUsersModal';
import { exportToExcel } from '@/lib/exportExcel';

interface Vendor {
    id: string;
    name: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    cities_covered: string;
    assetsCount: number;
}

export default function VendorsPage() {
    const router = useRouter();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showUsersModal, setShowUsersModal] = useState(false);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [newVendor, setNewVendor] = useState({
        id: '',
        name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        cities_covered: '',
        lead_time_days: 7,
        payment_terms: '30 dias'
    });

    const fetchVendors = async () => {
        try {
            const res = await fetch('/api/vendors');
            const data = await res.json();
            setVendors(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const handleSaveVendor = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const url = isEditing ? `/api/vendors/${newVendor.id}` : '/api/vendors';
            const method = isEditing ? 'PATCH' : 'POST';

            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newVendor)
            });
            setShowAddModal(false);
            setIsEditing(false);
            fetchVendors();
            setNewVendor({
                id: '',
                name: '',
                contact_name: '',
                contact_email: '',
                contact_phone: '',
                cities_covered: '',
                lead_time_days: 7,
                payment_terms: '30 dias'
            });
        } catch (err) {
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteVendor = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja excluir o fornecedor "${name}"?`)) return;

        try {
            const res = await fetch(`/api/vendors/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                fetchVendors();
            } else {
                alert(data.error || 'Erro ao excluir fornecedor');
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir fornecedor');
        } finally {
            setOpenDropdownId(null);
        }
    };

    const handleDeleteInventory = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja apagar TODO o inventário do fornecedor "${name}"? Esta ação não pode ser desfeita.`)) return;

        try {
            const res = await fetch(`/api/vendors/${id}/inventory`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                alert(`Inventário limpo com sucesso! ${data.deleted} ativos removidos.`);
                fetchVendors();
            } else {
                alert(data.error || 'Erro ao limpar inventário');
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao limpar inventário');
        } finally {
            setOpenDropdownId(null);
        }
    };

    const handleEditClick = (vendor: Vendor) => {
        setNewVendor({
            id: vendor.id,
            name: vendor.name,
            contact_name: vendor.contact_name || '',
            contact_email: vendor.contact_email || '',
            contact_phone: vendor.contact_phone || '',
            cities_covered: vendor.cities_covered || '',
            lead_time_days: 7,
            payment_terms: '30 dias'
        });
        setIsEditing(true);
        setShowAddModal(true);
        setOpenDropdownId(null);
    };

    return (
        <div className="p-10 max-w-7xl mx-auto space-y-10 focus:outline-none">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Fornecedores <span className="text-primary-600">(Vendors)</span></h1>
                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <Users size={16} />
                        <p>Gestão de parceiros e cobertura regional</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => exportToExcel(
                            vendors.map(v => ({
                                'Fornecedor': v.name,
                                'Contato': v.contact_name || '',
                                'Email': v.contact_email || '',
                                'Telefone': v.contact_phone || '',
                                'Cidades': v.cities_covered || '',
                                'Ativos': v.assetsCount || 0
                            })),
                            'fornecedores'
                        )}
                        className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-600 px-5 py-3 rounded-2xl font-bold hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all shadow-sm"
                    >
                        ↓ Excel
                    </button>
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setNewVendor({
                                id: '',
                                name: '',
                                contact_name: '',
                                contact_email: '',
                                contact_phone: '',
                                cities_covered: '',
                                lead_time_days: 7,
                                payment_terms: '30 dias'
                            });
                            setShowAddModal(true);
                        }}
                        className="flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Plus size={20} />
                        Novo Fornecedor
                    </button>

                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-primary-600 text-white px-6 py-3 rounded-2xl font-bold transition-all duration-300 shadow-xl shadow-slate-900/10"
                    >
                        <Upload size={20} />
                        Importar Planilha
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-12 h-12 border-4 border-primary-600/20 border-t-primary-600 rounded-full animate-spin" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {vendors.map((vendor) => (
                        <div key={vendor.id} className="premium-card group overflow-hidden flex flex-col relative">
                            <div className="p-8 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-primary-600 group-hover:bg-primary-50 transition-all duration-300">
                                        <Building2 size={28} />
                                    </div>

                                    <div className="relative">
                                        <button
                                            onClick={() => setOpenDropdownId(openDropdownId === vendor.id ? null : vendor.id)}
                                            className={`p-2 rounded-xl transition-all ${openDropdownId === vendor.id ? 'bg-slate-100 text-slate-900' : 'text-slate-300 hover:text-slate-600'}`}
                                        >
                                            <MoreVertical size={20} />
                                        </button>

                                        {openDropdownId === vendor.id && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => setOpenDropdownId(null)}
                                                />
                                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-50 py-2 z-20 animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <button
                                                        onClick={() => handleEditClick(vendor)}
                                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-primary-600 flex items-center gap-3 transition-colors"
                                                    >
                                                        <Pencil size={16} /> Editar Dados
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteInventory(vendor.id, vendor.name)}
                                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-amber-500 hover:bg-amber-50 flex items-center gap-3 transition-colors border-t border-slate-50"
                                                    >
                                                        <Trash2 size={16} /> Limpar Inventário
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setSelectedVendor(vendor);
                                                            setShowUsersModal(true);
                                                            setOpenDropdownId(null);
                                                        }}
                                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-600 hover:bg-slate-50 hover:text-primary-600 flex items-center gap-3 transition-colors border-t border-slate-50"
                                                    >
                                                        <ShieldCheck size={16} /> Usuários Portal
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteVendor(vendor.id, vendor.name)}
                                                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors"
                                                    >
                                                        <Trash2 size={16} /> Excluir Fornecedor
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <h3 className="text-xl font-bold text-slate-900">{vendor.name}</h3>
                                    <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                                        <MapPin size={14} />
                                        <span>{vendor.cities_covered || 'Cobertura não definida'}</span>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                            <Users size={16} />
                                        </div>
                                        <span className="font-semibold">{vendor.contact_name || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-slate-500 text-sm">
                                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                                            <Mail size={16} />
                                        </div>
                                        <span className="font-medium">{vendor.contact_email || 'N/A'}</span>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-50 flex items-center justify-between mt-auto">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Inventário</p>
                                        <div className="flex items-center gap-1.5">
                                            <Database size={14} className="text-primary-600" />
                                            <p className="text-2xl font-black text-slate-900">{vendor.assetsCount}</p>
                                        </div>
                                    </div>
                                    <Link
                                        href={`/inventory?vendorId=${vendor.id}`}
                                        className="flex items-center gap-1 text-primary-600 font-bold text-xs uppercase tracking-widest hover:translate-x-1 transition-transform"
                                    >
                                        Detalhes <ChevronRight size={14} />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">{isEditing ? 'Editar Fornecedor' : 'Novo Fornecedor'}</h2>
                                <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">{isEditing ? 'Atualize os dados cadastrais' : 'Cadastro de parceiro comercial'}</p>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white rounded-xl text-slate-400 transition-colors"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSaveVendor} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome da Empresa</label>
                                    <input
                                        required
                                        type="text"
                                        value={newVendor.name}
                                        onChange={e => setNewVendor({ ...newVendor, name: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20"
                                        placeholder="Ex: JCDecaux, Eletromidia..."
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato Comercial</label>
                                        <input
                                            type="text"
                                            value={newVendor.contact_name}
                                            onChange={e => setNewVendor({ ...newVendor, contact_name: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20"
                                            placeholder="Nome do contato"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefone</label>
                                        <input
                                            type="text"
                                            value={newVendor.contact_phone}
                                            onChange={e => setNewVendor({ ...newVendor, contact_phone: e.target.value })}
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20"
                                            placeholder="(21) 99999-9999"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</label>
                                    <input
                                        type="email"
                                        value={newVendor.contact_email}
                                        onChange={e => setNewVendor({ ...newVendor, contact_email: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20"
                                        placeholder="comercial@fornecedor.com.br"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidades Atendidas</label>
                                    <input
                                        type="text"
                                        value={newVendor.cities_covered}
                                        onChange={e => setNewVendor({ ...newVendor, cities_covered: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20"
                                        placeholder="Ex: Rio de Janeiro, Niterói..."
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-primary-600 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 size={18} className="animate-spin" /> : isEditing ? <CheckCircle2 size={18} /> : <Plus size={18} />}
                                {isEditing ? 'Atualizar Fornecedor' : 'Salvar Fornecedor'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showImportModal && (
                <ImportVendorsModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onSuccess={fetchVendors}
                />
            )}

            {showUsersModal && selectedVendor && (
                <VendorUsersModal
                    isOpen={showUsersModal}
                    onClose={() => setShowUsersModal(false)}
                    vendor={selectedVendor}
                />
            )}
        </div>
    );
}
