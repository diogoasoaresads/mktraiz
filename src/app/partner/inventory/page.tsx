"use client";

import { useState, useEffect } from 'react';
import { 
    Plus, 
    Database, 
    LogOut, 
    Upload, 
    Package, 
    MapPin, 
    DollarSign, 
    Loader2, 
    CheckCircle2, 
    Clock,
    AlertCircle,
    Edit3,
    Trash2,
    Map as MapIcon,
    List as ListIcon
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import ImportPartnerInventoryModal from '@/components/ImportPartnerInventoryModal';
import dynamic from 'next/dynamic';

// Carregar MapView dinamicamente para evitar problemas com SSR/Leaflet
const MapView = dynamic(() => import('@/components/Map/MapView'), { 
    ssr: false,
    loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando Mapa...</div>
});

interface Asset {
    id: string;
    type: string;
    address_raw: string;
    city: string;
    state: string;
    base_price: number;
    geocode_status: string;
    lat?: number;
    lng?: number;
}

export default function PartnerInventoryPage() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [showImport, setShowImport] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const [formData, setFormData] = useState({
        type: 'Outdoor',
        address_raw: '',
        city: '',
        state: '',
        base_price: '',
        lat: '',
        lng: ''
    });

    const fetchAssets = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/partner/inventory', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setAssets(data);
            } else if (res.status === 401) {
                router.push('/partner/login');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const handleLogout = async () => {
        await fetch('/api/partner/auth', { method: 'DELETE' });
        router.push('/partner/login');
    };

    const handleEdit = (asset: Asset) => {
        setEditingAsset(asset);
        setFormData({
            type: asset.type,
            address_raw: asset.address_raw,
            city: asset.city,
            state: asset.state,
            base_price: asset.base_price.toString(),
            lat: asset.lat?.toString() || '',
            lng: asset.lng?.toString() || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este ativo?')) return;
        
        try {
            const res = await fetch(`/api/partner/inventory/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchAssets();
            } else {
                alert('Erro ao excluir ativo');
            }
        } catch (err) {
            alert('Erro de conexão');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');

        try {
            const isEditing = !!editingAsset;
            const url = '/api/partner/inventory';
            const method = isEditing ? 'PUT' : 'POST';
            
            const payload = isEditing 
                ? { ...formData, id: editingAsset.id }
                : formData;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsModalOpen(false);
                setEditingAsset(null);
                setFormData({ type: 'Outdoor', address_raw: '', city: '', state: '', base_price: '', lat: '', lng: '' });
                fetchAssets();
            } else {
                const data = await res.json();
                setError(data.error || 'Erro ao salvar ativo');
            }
        } catch (err) {
            setError('Erro de conexão');
        } finally {
            setSubmitting(false);
        }
    };

    const mapPoints = assets
        .filter(a => a.lat && a.lng)
        .map(a => ({
            id: a.id,
            lat: a.lat!,
            lng: a.lng!,
            name: a.type,
            kind: 'asset' as const,
            address: a.address_raw,
            meta: {
                type: a.type,
                base_price: a.base_price,
                status: a.geocode_status
            }
        }));

    if (loading) {
        return (
            <div className="h-screen bg-slate-50 flex items-center justify-center">
                <Loader2 className="animate-spin text-primary-600" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex items-center justify-center w-12 h-12 overflow-hidden">
                        <img src="/logo.png?v=4" alt="Raiz" className="w-10 h-10 object-contain" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black text-slate-900 tracking-tight leading-none uppercase">Portal Partner</h1>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Gestão de Ativos</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 mr-4">
                        <button 
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Ver Lista"
                        >
                            <ListIcon size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('map')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'map' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Ver Mapa"
                        >
                            <MapIcon size={18} />
                        </button>
                    </div>

                    <button 
                        onClick={() => setShowImport(true)}
                        className="p-2.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                        title="Importar Planilha"
                    >
                        <Upload size={20} />
                    </button>
                    <button 
                        onClick={() => {
                            setEditingAsset(null);
                            setFormData({ type: 'Outdoor', address_raw: '', city: '', state: '', base_price: '', lat: '', lng: '' });
                            setIsModalOpen(true);
                        }}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-primary-600/20 flex items-center gap-2"
                    >
                        <Plus size={18} /> Novo Ativo
                    </button>
                    <button 
                        onClick={handleLogout}
                        className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        title="Sair"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </header>

            <main className="flex-1 p-8 max-w-7xl mx-auto w-full">
                {/* Stats Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                            <Database size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Total Ativos</p>
                            <h3 className="text-2xl font-black text-slate-900">{assets.length}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-secondary-50 text-secondary-600 rounded-2xl flex items-center justify-center">
                            <CheckCircle2 size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Geocodificados</p>
                            <h3 className="text-2xl font-black text-slate-900">{assets.filter(a => a.geocode_status === 'success').length}</h3>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
                            <Clock size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Em Processamento</p>
                            <h3 className="text-2xl font-black text-slate-900">{assets.filter(a => a.geocode_status === 'pending').length}</h3>
                        </div>
                    </div>
                </div>

                {viewMode === 'list' ? (
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="px-8 py-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Meus Ativos em Campo</h2>
                            <span className="bg-primary-50 text-primary-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-primary-100">Atualizado agora</span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo & ID</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Geocodificação</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Preço Base</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {assets.map(asset => (
                                        <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:shadow-sm transition-all">
                                                        <Package size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="text-xs font-black text-slate-900">{asset.type}</div>
                                                        <div className="text-[10px] font-medium text-slate-400 mt-1 uppercase truncate max-w-[120px]">{asset.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <MapPin size={14} className="text-slate-400 shrink-0" />
                                                    <div className="text-xs font-bold text-slate-700 leading-tight">
                                                        {asset.address_raw}
                                                        <div className="text-[10px] font-medium text-slate-400 uppercase mt-1">{asset.city} - {asset.state}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex justify-center">
                                                    {asset.geocode_status === 'success' ? (
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-600 rounded-full border border-green-100">
                                                            <CheckCircle2 size={12} />
                                                            <span className="text-[10px] font-black uppercase">Pronto</span>
                                                        </div>
                                                    ) : asset.geocode_status === 'failed' ? (
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 text-red-600 rounded-full border border-red-100">
                                                            <AlertCircle size={12} />
                                                            <span className="text-[10px] font-black uppercase">Erro</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                                                            <Loader2 size={12} className="animate-spin" />
                                                            <span className="text-[10px] font-black uppercase">Fila</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="text-xs font-black text-slate-900">R$ {asset.base_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                                                <div className="text-[10px] font-medium text-slate-400 mt-0.5 uppercase tracking-tighter">mensal / tabela</div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button 
                                                        onClick={() => handleEdit(asset)}
                                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                                                        title="Editar"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(asset.id)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        title="Excluir"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {assets.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                                                        <Database size={32} />
                                                    </div>
                                                    <h3 className="text-sm font-black text-slate-900 uppercase">Nenhum ativo encontrado</h3>
                                                    <p className="text-xs text-slate-500 mt-1">Comece adicionando seu primeiro ponto de mídia.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="h-[600px] w-full bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-500">
                        <MapView points={mapPoints} zoom={12} />
                    </div>
                )}
            </main>

            {/* Modal de Cadastro/Edição */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                    <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200">
                        <div className="bg-slate-50/50 px-10 py-8 border-b border-slate-100 flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                                    {editingAsset ? 'Editar Ativo' : 'Cadastrar Novo Ativo'}
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Preencha os dados do ponto de mídia
                                </p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-900 hover:shadow-sm transition-all">
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Tipo</label>
                                    <select 
                                        value={formData.type}
                                        onChange={e => setFormData({...formData, type: e.target.value})}
                                        className="w-full bg-slate-50 border-none px-4 py-3 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-600/20"
                                    >
                                        <option>Outdoor</option>
                                        <option>Mobiliario Urbano</option>
                                        <option>Painel Digital</option>
                                        <option>Empena</option>
                                        <option>Top Sight</option>
                                    </select>
                                </div>
                                <div className="col-span-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Preço Tabela (R$)</label>
                                    <div className="relative">
                                        <DollarSign size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="number"
                                            value={formData.base_price}
                                            onChange={e => setFormData({...formData, base_price: e.target.value})}
                                            className="w-full bg-slate-50 border-none pl-10 pr-4 py-3 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-600/20"
                                            placeholder="00.00"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Endereço Completo</label>
                                <div className="relative">
                                    <MapPin size={12} className="absolute left-4 top-4 text-slate-400" />
                                    <textarea 
                                        value={formData.address_raw}
                                        onChange={e => setFormData({...formData, address_raw: e.target.value})}
                                        className="w-full bg-slate-50 border-none pl-10 pr-4 py-4 rounded-3xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-600/20 min-h-[100px] resize-none"
                                        placeholder="Ex: Av. das Américas, 500 - Barra da Tijuca"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Cidade</label>
                                    <input 
                                        type="text"
                                        value={formData.city}
                                        onChange={e => setFormData({...formData, city: e.target.value})}
                                        className="w-full bg-slate-50 border-none px-4 py-3 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-600/20"
                                        placeholder="Cidade"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">UF</label>
                                    <input 
                                        type="text"
                                        value={formData.state}
                                        onChange={e => setFormData({...formData, state: e.target.value})}
                                        className="w-full bg-slate-50 border-none px-4 py-3 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-600/20"
                                        placeholder="UF"
                                        maxLength={2}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Latitude</label>
                                    <input 
                                        type="text"
                                        value={formData.lat}
                                        onChange={e => setFormData({...formData, lat: e.target.value})}
                                        className="w-full bg-slate-50 border-none px-4 py-3 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-600/20"
                                        placeholder="Ex: -22.9068"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Longitude</label>
                                    <input 
                                        type="text"
                                        value={formData.lng}
                                        onChange={e => setFormData({...formData, lng: e.target.value})}
                                        className="w-full bg-slate-50 border-none px-4 py-3 rounded-2xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-primary-600/20"
                                        placeholder="Ex: -43.1729"
                                    />
                                </div>
                            </div>

                            {error && <div className="text-red-500 text-[10px] font-black uppercase text-center">{error}</div>}

                            <button 
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-primary-600 hover:bg-primary-700 text-white font-black py-5 rounded-3xl transition-all shadow-xl shadow-primary-600/30 uppercase tracking-widest text-xs flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : (
                                    <>
                                        <CheckCircle2 size={20} /> {editingAsset ? 'Atualizar Dados' : 'Finalizar Cadastro'}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <ImportPartnerInventoryModal 
                isOpen={showImport} 
                onClose={() => setShowImport(false)} 
                onSuccess={() => {
                    setShowImport(false);
                    fetchAssets();
                }}
            />
        </div>
    );
}
