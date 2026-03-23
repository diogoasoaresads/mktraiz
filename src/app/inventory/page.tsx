"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Database,
    Upload,
    Search,
    Filter,
    Map as MapIcon,
    Table as TableIcon,
    AlertCircle,
    CheckCircle2,
    Clock,
    ChevronDown,
    MoreHorizontal,
    Plus,
    X,
    Loader2,
    Check,
    RefreshCcw,
    ShieldAlert,
    ScanSearch,
    Pencil
} from 'lucide-react';
import MapView from '@/components/Map';
import ImportInventoryModal from '@/components/ImportInventoryModal';
import AddToPlanModal from '@/components/AddToPlanModal';
import { exportToExcel } from '@/lib/exportExcel';

interface Asset {
    id: string;
    vendor_id: string;
    vendor_name?: string;
    type: string;
    address_raw: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
    geocode_status: string;
    geocode_suspect?: number;
    base_price: number;
}

interface Vendor {
    id: string;
    name: string;
}

export default function InventoryPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <InventoryContent />
        </Suspense>
    );
}

function InventoryContent() {
    const searchParams = useSearchParams();
    const vendorIdFromQuery = searchParams.get('vendorId');

    const [assets, setAssets] = useState<Asset[]>([]);
    const [mapAssets, setMapAssets] = useState<any[]>([]);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMap, setLoadingMap] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Bulk Actions state
    const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const [showAddToPlanModal, setShowAddToPlanModal] = useState(false);

    // Geocoding State
    const [isGeocoding, setIsGeocoding] = useState(false);
    const [geocodeRemaining, setGeocodeRemaining] = useState<number | null>(null);
    const [geocodeTotal, setGeocodeTotal] = useState<number>(0);

    // Validation State
    const [isValidating, setIsValidating] = useState(false);
    const [isRegeocodingSuspects, setIsRegeocodingSuspects] = useState(false);
    const [suspectStats, setSuspectStats] = useState<{ total: number; suspects: number; suspect_percentage: number } | null>(null);
    const [validateMessage, setValidateMessage] = useState<string | null>(null);

    // Filters state
    const [searchTerm, setSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [filterVendor, setFilterVendor] = useState(vendorIdFromQuery || '');
    const [filterType, setFilterType] = useState('');
    const [filterSuspect, setFilterSuspect] = useState(false);
    const [totalCount, setTotalCount] = useState(0);

    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [editFormData, setEditFormData] = useState({ lat: '', lng: '' });
    const [isEditSubmitting, setIsEditSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        vendor_id: '',
        type: 'Outdoor',
        address_raw: '',
        city: '',
        state: '',
        base_price: ''
    });

    // Use a debounced search term to avoid rapid re-fetching
    const fetchAssets = async (vendor = filterVendor, type = filterType, search = searchTerm, suspect = filterSuspect) => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (vendor) params.set('vendor_id', vendor);
            if (type) params.set('type', type);
            if (search) params.set('search', search);
            if (suspect) params.set('suspects_only', 'true');
            params.set('limit', '500');

            const res = await fetch(`/api/inventory?${params.toString()}`);
            if (res.ok) {
                const data = await res.json();
                // Handle both paginated {data:[]} and legacy [] response
                if (Array.isArray(data)) {
                    setAssets(data);
                    setTotalCount(data.length);
                } else {
                    setAssets(data.data || []);
                    setTotalCount(data.total || 0);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchMapAssets = async () => {
        try {
            setLoadingMap(true);
            const res = await fetch('/api/inventory/map');
            if (res.ok) {
                const data = await res.json();
                setMapAssets(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingMap(false);
        }
    };

    // Initial load on mount (no debounce)
    useEffect(() => {
        fetchAssets('', '', '', false);
        fetchMapAssets();
        fetchSuspectStats();
    }, []);

    // Debounce filter/search changes only
    useEffect(() => {
        const timer = setTimeout(() => fetchAssets(filterVendor, filterType, searchTerm, filterSuspect), 350);
        return () => clearTimeout(timer);
    }, [filterVendor, filterType, searchTerm, filterSuspect]);

    // Load vendors list once (static data, changes rarely)
    useEffect(() => {
        fetch('/api/vendors')
            .then(res => res.json())
            .then(data => setVendors(data))
            .catch(err => console.error(err));
    }, []);

    useEffect(() => {
        if (vendorIdFromQuery) {
            setFilterVendor(vendorIdFromQuery);
            setShowFilters(true);
        }
    }, [vendorIdFromQuery]);

    const openEditModal = (asset: Asset) => {
        setEditingAsset(asset);
        setEditFormData({
            lat: asset.lat ? asset.lat.toString() : '',
            lng: asset.lng ? asset.lng.toString() : ''
        });
        setFormError(null);
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAsset) return;
        setIsEditSubmitting(true);
        setFormError(null);

        try {
            const res = await fetch(`/api/inventory/${editingAsset.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lat: parseFloat(editFormData.lat),
                    lng: parseFloat(editFormData.lng)
                })
            });

            const data = await res.json();
            if (data.success) {
                setEditingAsset(null);
                fetchAssets(filterVendor, filterType, searchTerm, filterSuspect);
                fetchMapAssets();
                fetchSuspectStats();
            } else {
                throw new Error(data.error || 'Erro ao atualizar ativo');
            }
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setIsEditSubmitting(false);
        }
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setFormError(null);

        try {
            const res = await fetch('/api/inventory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    base_price: parseFloat(formData.base_price) || 0
                })
            });

            const data = await res.json();
            if (data.success) {
                setIsModalOpen(false);
                setFormData({ vendor_id: '', type: 'Outdoor', address_raw: '', city: '', state: '', base_price: '' });
                fetchAssets();
            } else {
                throw new Error(data.error || 'Erro ao salvar ativo');
            }
        } catch (err: any) {
            setFormError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const availableTypes = Array.from(new Set(assets.map(a => a.type))).sort();

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedAssets(filteredAssets.map(a => a.id));
        } else {
            setSelectedAssets([]);
        }
    };

    const handleSelectToggle = (id: string) => {
        setSelectedAssets(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Tem certeza que deseja excluir ${selectedAssets.length} ativos? Esta ação não pode ser desfeita.`)) return;

        setIsBulkDeleting(true);
        try {
            const res = await fetch('/api/inventory/bulk', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ assetIds: selectedAssets })
            });
            const data = await res.json();
            if (data.success) {
                alert(`Sucesso! ${data.deleted} ativos removidos.`);
                setSelectedAssets([]);
                fetchAssets();
            } else {
                alert(data.error || 'Erro ao excluir ativos');
            }
        } catch (err) {
            console.error(err);
            alert('Erro ao excluir ativos');
        } finally {
            setIsBulkDeleting(false);
        }
    };

    const handleForceGeocode = async (type: 'all' | 'errors') => {
        if (!confirm(`Deseja forçar a busca de coordenadas para ${type === 'all' ? 'TODOS os ativos' : 'ativos pendentes/com erro'}? Isso pode demorar alguns minutos dependendo da quantidade.`)) return;

        setIsGeocoding(true);
        setGeocodeRemaining(null);
        setGeocodeTotal(0);
        try {
            const resetRes = await fetch('/api/inventory/geocode/force', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: type === 'all' ? 'reset_all' : 'reset_errors' })
            });
            const resetData = await resetRes.json();

            if (resetData.success) {
                // Capture total before starting loop
                const totalPending = resetData.count || 0;
                setGeocodeTotal(totalPending);
                setGeocodeRemaining(totalPending);
                let remaining = totalPending || 1;
                while (remaining > 0) {
                    const processRes = await fetch('/api/inventory/geocode/force', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'process_batch' })
                    });
                    const processData = await processRes.json();

                    if (processData.success) {
                        remaining = processData.remaining;
                        setGeocodeRemaining(remaining);
                    } else {
                        console.error('Batch error:', processData.error);
                        break; // fail safe
                    }
                }
                alert('Geocodificação concluída!');
                fetchAssets();
            } else {
                alert(resetData.error || 'Erro ao preparar geocodificação.');
            }
        } catch (error) {
            console.error(error);
            alert('Erro geral durante geocodificação.');
        } finally {
            setIsGeocoding(false);
            setGeocodeRemaining(null);
        }
    };

    const fetchSuspectStats = async () => {
        try {
            const res = await fetch(`/api/inventory/validate?t=${Date.now()}`);
            if (res.ok) setSuspectStats(await res.json());
        } catch { /* silent */ }
    };

    const runValidation = async () => {
        if (!confirm('Isso vai analisar todos os ativos geocodificados e marcar os que estiverem fora da cidade registrada. Continuar?')) return;
        setIsValidating(true);
        setValidateMessage(null);
        try {
            const res = await fetch('/api/inventory/validate', { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setValidateMessage(data.message);
                await fetchSuspectStats();
                await fetchMapAssets();
                await fetchAssets(filterVendor, filterType, searchTerm, filterSuspect);
            } else {
                setValidateMessage('Erro ao validar coordenadas.');
            }
        } catch (err) {
            setValidateMessage('Erro ao validar coordenadas.');
        } finally {
            setIsValidating(false);
            setTimeout(() => setValidateMessage(null), 8000);
        }
    };

    const regeocodeAllSuspects = async () => {
        if (!confirm(`Re-geocodificar ${suspectStats?.suspects || 0} ativos suspeitos? Isso pode demorar alguns minutos.`)) return;
        setIsRegeocodingSuspects(true);
        try {
            // Reset only suspect assets to pending
            const res = await fetch('/api/inventory/geocode/force', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'reset_suspects' })
            });
            const resetData = await res.json();
            if (!resetData.success) {
                // Fallback: use reset_errors if reset_suspects not supported
                await fetch('/api/inventory/geocode/force', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'reset_errors' })
                });
            }
            // Process geocoding batches
            let remaining = resetData.count || 1;
            while (remaining > 0) {
                const batchRes = await fetch('/api/inventory/geocode/force', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'process_batch' })
                });
                const batchData = await batchRes.json();
                remaining = batchData.remaining ?? 0;
                if (!batchData.success) break;
            }
            setValidateMessage('Re-geocodificação concluída! Execute a validação novamente para ver os resultados.');
            await fetchMapAssets();
            await fetchAssets(filterVendor, filterType, searchTerm, filterSuspect);
            await fetchSuspectStats();
        } catch (err) {
            console.error(err);
        } finally {
            setIsRegeocodingSuspects(false);
            setTimeout(() => setValidateMessage(null), 8000);
        }
    };

    // Since filters are applied server-side, assets array is already filtered from the API
    // We just use assets directly as filteredAssets for rendering
    const filteredAssets = assets;

    const activeAssets = mapAssets.filter((a: any) => {
        if (filterVendor && a.vendor_id !== filterVendor) return false;
        if (filterType && a.type !== filterType) return false;
        if (filterSuspect && a.geocode_suspect !== 1) return false;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            const matches = 
                (a.address_raw || '').toLowerCase().includes(term) ||
                (a.city || '').toLowerCase().includes(term) ||
                (a.vendor_name || '').toLowerCase().includes(term);
            if (!matches) return false;
        }
        return true;
    });

    const mapPoints = activeAssets.map((a: any) => ({
        id: a.id,
        lat: a.lat,
        lng: a.lng,
        name: a.type + ' - ' + a.vendor_name,
        // Use 'suggested' kind (amber/yellow) for suspect assets to distinguish them
        kind: a.geocode_suspect ? 'suggested' as const : 'asset' as const,
        address: a.address_raw,
        meta: {
            vendor_name: a.vendor_name,
            type: a.type,
            base_price: a.base_price,
            geocode_suspect: a.geocode_suspect
        }
    }));

    return (
        <div className="h-[calc(100vh-40px)] flex flex-col">
            <header className="p-8 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Inventário <span className="text-primary-600">(Assets)</span></h1>
                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <Database size={16} />
                        <p>Base unificada de mídia OOH disponível</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-1 rounded-xl flex">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <TableIcon size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('map')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'map' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <MapIcon size={20} />
                        </button>
                    </div>

                    <button
                        onClick={() => exportToExcel(
                            filteredAssets.map(a => ({
                                'Tipo': a.type,
                                'Endereço': a.address_raw,
                                'Cidade': a.city || '',
                                'Estado': a.state || '',
                                'Fornecedor': a.vendor_name || '',
                                'Preço Base (R$)': a.base_price || 0,
                                'Lat': a.lat || '',
                                'Lng': a.lng || '',
                                'Status Geo': a.geocode_status
                            })),
                            'inventario_ooh'
                        )}
                        className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all shadow-sm"
                        title="Exportar para Excel"
                    >
                        ↓ Excel
                    </button>

                    <div className="relative group/geo">
                        <button
                            className="bg-white border-2 border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                            disabled={isGeocoding}
                        >
                            {isGeocoding ? (
                                <RefreshCcw size={18} className="animate-spin text-primary-600" />
                            ) : (
                                <RefreshCcw size={18} />
                            )}
                            {isGeocoding ? (geocodeRemaining !== null ? `Restam ${geocodeRemaining}` : 'Iniciando...') : 'Atualizar Mapa'}
                        </button>

                        {!isGeocoding && (
                            <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-100 shadow-2xl rounded-2xl p-2 z-50 opacity-0 invisible group-hover/geo:opacity-100 group-hover/geo:visible transition-all duration-200 translate-y-2 group-hover/geo:translate-y-0">
                                <button
                                    onClick={() => handleForceGeocode('errors')}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 rounded-xl text-sm font-bold text-slate-700 transition-colors"
                                >
                                    Processar Pendentes/Erros
                                </button>
                                <button
                                    onClick={() => handleForceGeocode('all')}
                                    className="w-full text-left px-4 py-3 hover:bg-red-50 text-red-600 rounded-xl text-sm font-bold transition-colors"
                                >
                                    Forçar Tudo (Zerar Lats/Lngs)
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-white border-2 border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Plus size={18} />
                        Inserir Manual
                    </button>


                    <button
                        onClick={() => setShowImportModal(true)}
                        className="bg-slate-900 hover:bg-primary-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-slate-900/10"
                    >
                        <Upload size={18} />
                        Importar Planilha
                    </button>
                </div>
            </header>

            <div className="px-8 mb-6 flex flex-col gap-4">
                <div className="flex gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por endereço, fornecedor ou cidade..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-3 border rounded-2xl flex items-center gap-2 font-bold text-sm transition-colors ${showFilters ? 'bg-primary-50 border-primary-200 text-primary-600' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Filter size={18} />
                        Filtros
                        <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                </div>

                {showFilters && (
                    <div className="p-4 bg-white border border-slate-200 rounded-2xl flex gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</label>
                            <select
                                value={filterVendor}
                                onChange={(e) => setFilterVendor(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                                <option value="">Todos os Fornecedores</option>
                                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Mídia</label>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-500/20"
                            >
                                <option value="">Todos os Tipos</option>
                                {availableTypes.map(t => <option key={t as string} value={t as string}>{t as string}</option>)}
                            </select>
                        </div>
                        <div className="flex items-end flex-col justify-end pb-1 px-2">
                            <label className="flex items-center gap-2 cursor-pointer group mb-1">
                                <input
                                    type="checkbox"
                                    checked={filterSuspect}
                                    onChange={(e) => setFilterSuspect(e.target.checked)}
                                    className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
                                />
                                <span className="text-xs font-bold text-slate-600 group-hover:text-amber-600 transition-colors">Apenas Suspeitos</span>
                            </label>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={() => { setFilterVendor(''); setFilterType(''); setSearchTerm(''); setFilterSuspect(false); }}
                                className="p-2 mb-1 text-xs font-bold text-slate-400 hover:text-red-500 transition-colors bg-slate-50 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 px-4"
                            >
                                Limpar
                            </button>
                        </div>
                    </div>
                )}

                {/* Geocoding Error Advice */}
                {assets.some(a => a.geocode_status === 'error') && (
                    <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-red-500 shadow-sm">
                                <AlertCircle size={20} />
                            </div>
                            <div>
                                <p className="text-xs font-black text-red-700 uppercase tracking-widest">Atenção: Alguns endereços não foram localizados</p>
                                <p className="text-[10px] text-red-600 font-medium">Isso ocorre quando o endereço na planilha é muito complexo. <b>Dica:</b> Re-importe a planilha mapeando as colunas de Latitude e Longitude para garantir 100% de precisão.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Suspect Coordinates Banner */}
                {suspectStats && suspectStats.suspects > 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-300 gap-4">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                                <ShieldAlert size={20} />
                            </div>
                            <div className="flex-1">
                                <p className="text-xs font-black text-amber-800 uppercase tracking-widest">
                                    {suspectStats.suspects} ativo(s) com coordenadas suspeitas ({suspectStats.suspect_percentage}%)
                                </p>
                                <p className="text-[10px] text-amber-700 font-medium">
                                    Esses ativos estão fora da cidade cadastrada no banco. No mapa aparecem em <b>amarelo</b>.
                                    Execute a validação para identificar ou re-geocodifique para corrigir.
                                </p>
                                {validateMessage && (
                                    <p className="text-[10px] text-emerald-700 font-bold mt-1">{validateMessage}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={() => setFilterSuspect(!filterSuspect)}
                                className={`px-3 py-2 border-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${filterSuspect ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-inner' : 'bg-white border-amber-200 text-amber-700 hover:bg-amber-100 shadow-sm'}`}
                            >
                                <Filter size={14} />
                                {filterSuspect ? 'Remover Filtro' : 'Filtrar Suspeitos'}
                            </button>
                            <button
                                onClick={runValidation}
                                disabled={isValidating}
                                className="px-3 py-2 bg-white border-2 border-amber-200 text-amber-700 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-amber-100 transition-all disabled:opacity-50"
                            >
                                {isValidating ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />}
                                {isValidating ? 'Validando...' : 'Validar Novamente'}
                            </button>
                            <button
                                onClick={regeocodeAllSuspects}
                                disabled={isRegeocodingSuspects}
                                className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm"
                            >
                                {isRegeocodingSuspects ? <Loader2 size={14} className="animate-spin" /> : <RefreshCcw size={14} />}
                                {isRegeocodingSuspects ? 'Re-geocodificando...' : 'Re-geocodificar Suspeitos'}
                            </button>
                        </div>
                    </div>
                )}

                {/* No suspect stats yet - show validate button */}
                {!suspectStats && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <ScanSearch size={16} className="text-slate-400" />
                            <p className="text-xs text-slate-500 font-medium">Valide as coordenadas para detectar ativos fora da cidade cadastrada.</p>
                        </div>
                        <button
                            onClick={runValidation}
                            disabled={isValidating}
                            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-slate-700 transition-all disabled:opacity-50"
                        >
                            {isValidating ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />}
                            {isValidating ? 'Analisando...' : 'Validar Coordenadas'}
                        </button>
                    </div>
                )}

                {/* All clear message */}
                {suspectStats && suspectStats.suspects === 0 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3">
                        <CheckCircle2 size={16} className="text-emerald-500" />
                        <p className="text-xs text-emerald-700 font-bold">Todas as coordenadas validadas! Nenhum ativo suspeito encontrado.</p>
                        <button onClick={runValidation} disabled={isValidating} className="ml-auto px-3 py-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-1">
                            <RefreshCcw size={12} /> Re-validar
                        </button>
                    </div>
                )}
            </div>

            <main className="flex-1 px-8 pb-8 min-h-0">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Loader2 className="animate-spin text-primary-600" size={40} />
                    </div>
                ) : viewMode === 'table' ? (
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col h-full shadow-sm">
                        <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-white z-10 shadow-sm">
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="p-5 w-10">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                checked={filteredAssets.length > 0 && selectedAssets.length === filteredAssets.length}
                                                onChange={handleSelectAll}
                                            />
                                        </th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidade/UF</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lat/Lng</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Geo</th>
                                        <th className="p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Preço Base</th>
                                        <th className="p-5"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAssets.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-20 text-center">
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <Database size={40} className="mb-2 opacity-20" />
                                                    <p className="font-bold">Nenhum ativo encontrado</p>
                                                    <p className="text-xs">Tente ajustar seus filtros para encontrar resultados.</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAssets.map(asset => (
                                            <tr key={asset.id} className={`border-b border-slate-50 transition-colors group ${asset.geocode_suspect ? 'bg-amber-50/60 hover:bg-amber-50' : 'hover:bg-slate-50/50'}`}>
                                                <td className="p-5 w-10">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                        checked={selectedAssets.includes(asset.id)}
                                                        onChange={() => handleSelectToggle(asset.id)}
                                                    />
                                                </td>
                                                <td className="p-5 font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{asset.type}</td>
                                                <td className="p-5 text-sm text-slate-600 font-medium max-w-[300px] truncate">{asset.address_raw}</td>
                                                <td className="p-5 text-sm text-slate-500 font-semibold">{asset.city} - {asset.state}</td>
                                                <td className="p-5">
                                                    <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-bold text-slate-600">{asset.vendor_name}</span>
                                                </td>
                                                <td className="p-5">
                                                    {asset.lat !== null && asset.lat !== undefined && asset.lng !== null && asset.lng !== undefined ? (
                                                        <div className="space-y-0.5">
                                                            <div className="text-[10px] font-mono text-slate-400 leading-tight">
                                                                <div>{asset.lat.toFixed(6)}</div>
                                                                <div>{asset.lng.toFixed(6)}</div>
                                                            </div>
                                                            {asset.geocode_suspect === 1 && (
                                                                <div className="flex items-center gap-1 text-amber-600" title="Coordenada suspeita: ativo pode estar fora da cidade cadastrada">
                                                                    <ShieldAlert size={10} />
                                                                    <span className="text-[9px] font-bold uppercase">Suspeita</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-slate-300 italic">Automático</span>
                                                    )}
                                                </td>
                                                <td className="p-5">
                                                    {asset.geocode_suspect === 1 ? (
                                                        <div className="flex items-center gap-1.5 text-amber-500 text-[10px] font-bold uppercase tracking-wider" title="Coordenadas fora da cidade cadastrada">
                                                            <ShieldAlert size={12} /> Suspeito
                                                        </div>
                                                    ) : asset.geocode_status === 'success' || asset.geocode_status === 'ok' ? (
                                                        <div className="flex items-center gap-1.5 text-green-600 text-[10px] font-bold uppercase tracking-wider">
                                                            <CheckCircle2 size={12} /> Localizado
                                                        </div>
                                                    ) : asset.geocode_status === 'error' ? (
                                                        <div className="flex items-center gap-1.5 text-red-500 text-[10px] font-bold uppercase tracking-wider" title="Endereço não encontrado ou inválido">
                                                            <AlertCircle size={12} /> Falha
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                                                            <Clock size={12} /> Pendente
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-5 text-right font-black text-slate-900">
                                                    {asset.base_price ? `R$ ${asset.base_price.toLocaleString()}` : '-'}
                                                </td>
                                                <td className="p-5 text-right">
                                                    <button 
                                                        onClick={() => openEditModal(asset)}
                                                        className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all flex items-center justify-center w-full"
                                                        title="Editar Coordenadas"
                                                    >
                                                        <Pencil size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 w-full min-h-[500px] h-full relative z-0">
                        <MapView points={mapPoints} />
                    </div>
                )}
            </main>

            {/* Floating Action Bar for Bulk Selection */}
            {selectedAssets.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-in slide-in-from-bottom-5 z-50">
                    <span className="text-sm font-bold bg-white/10 px-3 py-1 rounded-lg">
                        {selectedAssets.length} ativo{selectedAssets.length > 1 ? 's' : ''} selecionado{selectedAssets.length > 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowAddToPlanModal(true)}
                            className="bg-primary-600 hover:bg-primary-500 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                        >
                            <Plus size={16} /> Adicionar ao Plano
                        </button>
                        <button
                            onClick={handleBulkDelete}
                            disabled={isBulkDeleting}
                            className="bg-white/10 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-colors disabled:opacity-50"
                        >
                            {isBulkDeleting ? 'Excluindo...' : 'Excluir Selecionados'}
                        </button>
                    </div>
                </div>
            )}

            {/* Modal de Inserção Manual */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="premium-card w-full max-w-xl bg-white overflow-hidden shadow-2xl scale-in duration-300">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 tracking-tight">Inserir Novo Ativo</h3>
                                <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Cadastro Manual de Inventário</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleManualSubmit} className="p-8 space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</label>
                                    <select
                                        required
                                        value={formData.vendor_id}
                                        onChange={e => setFormData({ ...formData, vendor_id: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm"
                                    >
                                        <option value="">Selecionar...</option>
                                        {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Mídia</label>
                                    <select
                                        required
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm"
                                    >
                                        {['Outdoor', 'Busdoor', 'Backbus', 'Painel LED', 'Relógio', 'Indoor', 'Outros'].map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endereço Completo</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="Ex: Av. Atlântica, 1000 - Copacabana"
                                    value={formData.address_raw}
                                    onChange={e => setFormData({ ...formData, address_raw: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-1 space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cidade</label>
                                    <input
                                        type="text"
                                        placeholder="Cidade"
                                        value={formData.city}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm"
                                    />
                                </div>
                                <div className="col-span-1 space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">UF</label>
                                    <input
                                        type="text"
                                        placeholder="UF"
                                        maxLength={2}
                                        value={formData.state}
                                        onChange={e => setFormData({ ...formData, state: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm"
                                    />
                                </div>
                                <div className="col-span-1 space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Base</label>
                                    <input
                                        type="number"
                                        placeholder="0,00"
                                        value={formData.base_price}
                                        onChange={e => setFormData({ ...formData, base_price: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm"
                                    />
                                </div>
                            </div>

                            {formError && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-red-100 flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full py-4 bg-slate-900 hover:bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                {submitting ? 'Salvando...' : 'Salvar no Inventário'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {showImportModal && (
                <ImportInventoryModal
                    isOpen={showImportModal}
                    onClose={() => setShowImportModal(false)}
                    onSuccess={fetchAssets}
                />
            )}
            {showAddToPlanModal && (
                <AddToPlanModal
                    isOpen={showAddToPlanModal}
                    onClose={() => setShowAddToPlanModal(false)}
                    onSuccess={() => {
                        setShowAddToPlanModal(false);
                        setSelectedAssets([]);
                    }}
                    selectedAssets={selectedAssets}
                />
            )}

            {/* Modal de Edição de Coordenadas */}
            {editingAsset && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="premium-card w-full max-w-sm bg-white overflow-hidden shadow-2xl scale-in duration-300">
                        <div className="p-5 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-base font-black text-slate-900 tracking-tight">Editar Coordenadas</h3>
                                <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest truncate max-w-[200px]">{editingAsset.address_raw}</p>
                            </div>
                            <button onClick={() => setEditingAsset(null)} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
                            <div className="space-y-4">
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Latitude</label>
                                    <input
                                        required
                                        type="number"
                                        step="any"
                                        placeholder="Ex: -22.9068"
                                        value={editFormData.lat}
                                        onChange={e => setEditFormData({ ...editFormData, lat: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm font-mono"
                                    />
                                </div>
                                <div className="space-y-2 text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Longitude</label>
                                    <input
                                        required
                                        type="number"
                                        step="any"
                                        placeholder="Ex: -43.1729"
                                        value={editFormData.lng}
                                        onChange={e => setEditFormData({ ...editFormData, lng: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500/20 shadow-sm font-mono"
                                    />
                                </div>
                            </div>

                            {formError && (
                                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-red-100 flex items-center gap-2">
                                    <AlertCircle size={14} />
                                    <span>{formError}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isEditSubmitting}
                                className="w-full py-4 mt-2 bg-slate-900 hover:bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isEditSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
                                {isEditSubmitting ? 'Salvando...' : 'Atualizar Coordenadas'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Geocoding Progress Bar */}
            {isGeocoding && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
                    <div className="bg-slate-900 text-white rounded-2xl shadow-2xl shadow-slate-900/40 overflow-hidden">
                        <div className="p-4 flex items-center gap-4">
                            {/* Spin icon */}
                            <div className="w-9 h-9 flex-shrink-0 bg-primary-600/20 rounded-xl flex items-center justify-center">
                                <RefreshCcw size={18} className="animate-spin text-primary-400" />
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                                        Geocodificando coordenadas...
                                    </span>
                                    <span className="text-sm font-black text-white tabular-nums ml-2">
                                        {geocodeTotal > 0
                                            ? `${Math.max(0, geocodeTotal - (geocodeRemaining ?? geocodeTotal))} / ${geocodeTotal}`
                                            : 'Iniciando...'}
                                    </span>
                                </div>

                                {/* Progress bar track */}
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                                        style={{
                                            width: geocodeTotal > 0
                                                ? `${Math.round(((geocodeTotal - (geocodeRemaining ?? geocodeTotal)) / geocodeTotal) * 100)}%`
                                                : '5%'
                                        }}
                                    />
                                </div>

                                <div className="flex justify-between items-center mt-1.5">
                                    <span className="text-[10px] text-slate-500 font-medium">
                                        ~1 ponto por segundo (OpenStreetMap)
                                    </span>
                                    <span className="text-[10px] font-black text-primary-400">
                                        {geocodeTotal > 0
                                            ? `${Math.round(((geocodeTotal - (geocodeRemaining ?? geocodeTotal)) / geocodeTotal) * 100)}%`
                                            : '—'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
