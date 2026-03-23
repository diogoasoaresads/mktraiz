"use client";

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
    Map as MapIcon,
    Table as TableIcon,
    Settings2,
    Sparkles,
    Save,
    Download,
    ChevronLeft,
    CheckCircle2,
    XCircle,
    Info,
    Filter,
    ArrowLeft,
    AlertCircle,
    BarChart3,
    ChevronRight,
    ArrowUpDown,
    ArrowUp,
    Zap,
    Database
} from 'lucide-react';
import MapView from '@/components/Map';
import Link from 'next/link';
import { calculateDistance } from '@/lib/geo';
import ImportMediaModal from '@/components/ImportMediaModal';

interface PlanLine {
    id: string;
    unit_id: string;
    unit_name: string;
    asset_id: string;
    type: string;
    address_raw: string;
    lat: number;
    lng: number;
    vendor_name: string;
    distance_km: number;
    score_final: number;
    status: string;
    base_price: number;
    unit_price: number;
    negotiated_price: number | null;
    total_price: number;
    start_date: string;
    end_date: string;
    overlap_mode?: 'avoid' | 'allow' | 'dominance';
    cluster_id?: string | null;
}

export default function PlannerPageWrapper() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-screen text-slate-400 font-bold">Carregando Planejador...</div>}>
            <PlannerContent />
        </Suspense>
    );
}

function PlannerContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const campaignId = searchParams.get('campaignId');

    const [scenarios, setScenarios] = useState<any[]>([]);
    const [selectedScenarioId, setSelectedScenarioId] = useState<string | null>(null);
    const [lines, setLines] = useState<PlanLine[]>([]);

    // New States for full map context
    const [campaign, setCampaign] = useState<any>(null);
    const [units, setUnits] = useState<any[]>([]);
    const [inventory, setInventory] = useState<any[]>([]);
    const [vendors, setVendors] = useState<any[]>([]);

    // Filters
    const [filterVendor, setFilterVendor] = useState<string>('');
    const [filterType, setFilterType] = useState<string>('');

    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAddingAsset, setIsAddingAsset] = useState(false);
    const [editingLineId, setEditingLineId] = useState<string | null>(null);
    const [showImportMedia, setShowImportMedia] = useState(false);

    // Bulk selection
    const [selectedLinesForBulk, setSelectedLinesForBulk] = useState<Set<string>>(new Set());

    // Recommendation Settings
    const [recRadius, setRecRadius] = useState<number>(5);
    const [recMinIncome, setRecMinIncome] = useState<number>(0);
    const [weightDistance, setWeightDistance] = useState<number>(50);
    const [weightPrice, setWeightPrice] = useState<number>(30);
    const [budgetMode, setBudgetMode] = useState<'total' | 'equal_per_unit'>('total');
    const [recOverlapMode, setRecOverlapMode] = useState<'avoid' | 'allow' | 'dominance'>('avoid');

    const [showBudgetCurve, setShowBudgetCurve] = useState(false);
    const [budgetCurve, setBudgetCurve] = useState<any>(null);
    const [isSavingCurve, setIsSavingCurve] = useState(false);
    const [curveSavedFeedback, setCurveSavedFeedback] = useState(false);

    // Rejection Modal
    const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean, lineId: string | null }>({ isOpen: false, lineId: null });
    // Impact Metrics (Reach, Frequency, GRPs)
    const [impactMetrics, setImpactMetrics] = useState<{
        totalGrossImpressions: number;
        estimatedReach: number;
        frequency: number;
        grps: number;
    } | null>(null);

    const isCurveValid = useMemo(() => {
        if (!budgetCurve || !budgetCurve.monthly || budgetCurve.monthly.length === 0) return false;
        const sum = budgetCurve.monthly.reduce((a: any, b: any) => a + (b.target_pct || 0), 0);
        return Math.abs(sum - 100) < 0.1;
    }, [budgetCurve]);

    const updateLine = async (lineId: string, data: { unit_price?: number; negotiated_price?: number | null; start_date?: string; end_date?: string; overlapMode?: string; clusterId?: string | null }) => {
        try {
            const line = lines.find(l => l.id === lineId);
            if (!line) return;

            const res = await fetch('/api/planner/lines/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    lineId,
                    unitPrice: data.unit_price ?? line.unit_price,
                    negotiatedPrice: data.negotiated_price !== undefined ? data.negotiated_price : line.negotiated_price,
                    startDate: data.start_date ?? line.start_date,
                    endDate: data.end_date ?? line.end_date,
                    overlapMode: data.overlapMode ?? line.overlap_mode,
                    clusterId: data.clusterId !== undefined ? data.clusterId : line.cluster_id
                })
            });

            if (res.ok) {
                const { total_price } = await res.json();
                setLines(prev => prev.map(l => l.id === lineId ? {
                    ...l,
                    unit_price: data.unit_price ?? l.unit_price,
                    negotiated_price: data.negotiated_price !== undefined ? data.negotiated_price : l.negotiated_price,
                    start_date: data.start_date ?? l.start_date,
                    end_date: data.end_date ?? l.end_date,
                    overlap_mode: (data.overlapMode as any) ?? l.overlap_mode,
                    cluster_id: data.clusterId !== undefined ? data.clusterId : l.cluster_id,
                    total_price
                } : l));
            }
        } catch (error) {
            console.error('Erro ao atualizar linha:', error);
        }
    };

    const [viewMode, setViewMode] = useState<'split' | 'map' | 'table' | 'monthly'>('split');

    const [mapFocus, setMapFocus] = useState<{ center: [number, number], zoom: number }>({
        center: [-22.9068, -43.1729],
        zoom: 13
    });

    const [ibgeData, setIbgeData] = useState<any[]>([]);
    const [competitorData, setCompetitorData] = useState<any[]>([]);
    const [showIbge, setShowIbge] = useState(false);

    const stats = useMemo(() => {
        const total = lines.reduce((acc, l) => acc + (l.total_price || 0), 0);
        const totalSave = lines.reduce((acc, l) => {
            const months = l.unit_price > 0 ? (l.total_price / l.unit_price) : 0;
            // Use negotiated_price if available, otherwise use unit_price for estimate
            const effectivePrice = (l.negotiated_price !== null && l.negotiated_price !== undefined) ? l.negotiated_price : l.unit_price;
            const savingsPerMonth = Math.max(0, (l.base_price || 0) - effectivePrice);
            return acc + (savingsPerMonth * months);
        }, 0);
        return { total, totalSave };
    }, [lines]);

    useEffect(() => {
        if (!campaignId) return;

        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [sRes, cRes, uRes, iRes, vRes] = await Promise.all([
                    fetch(`/api/campaigns/scenarios?campaignId=${campaignId}`),
                    fetch(`/api/campaigns/${campaignId}`),
                    fetch('/api/units'),
                    fetch('/api/inventory/map'),
                    fetch('/api/vendors')
                ]);

                const sData = await sRes.json();
                const cData = await cRes.json();
                const uData = await uRes.json();
                const iData = await iRes.json();
                const vData = await vRes.json();

                setScenarios(sData);
                setCampaign(cData);
                setUnits(uData);
                setInventory(iData);
                setVendors(vData);
                if (cData.budget_mode) {
                    setBudgetMode(cData.budget_mode);
                }

                if (sData.length > 0) {
                    setSelectedScenarioId(sData[0].id);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, [campaignId]);

    const fetchLines = async (sid: string) => {
        try {
            const res = await fetch(`/api/planner/lines?scenarioId=${sid}`);
            const data = await res.json();
            setLines(data.lines || []);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        if (selectedScenarioId) {
            fetchLines(selectedScenarioId);
            fetchBudgetCurve(selectedScenarioId);
        }
    }, [selectedScenarioId]);

    const fetchBudgetCurve = async (sid: string) => {
        try {
            const res = await fetch(`/api/planner/budget/curve?scenarioId=${sid}`);
            const data = await res.json();
            setBudgetCurve(data);
        } catch (err) {
            console.error('Erro ao buscar curva orçamentária:', err);
        }
    };

    const updateCurvePct = (index: number, val: number) => {
        if (!budgetCurve) return;
        const newMonthly = [...budgetCurve.monthly];
        newMonthly[index] = {
            ...newMonthly[index],
            target_pct: val,
            target_val: (budgetCurve.total_budget * val) / 100,
            balance: ((budgetCurve.total_budget * val) / 100) - newMonthly[index].used_val
        };
        setBudgetCurve({ ...budgetCurve, monthly: newMonthly });
    };

    const saveBudgetCurve = async () => {
        if (!selectedScenarioId || !budgetCurve) return;
        setIsSavingCurve(true);
        try {
            const curveMap = budgetCurve.monthly.reduce((acc: any, m: any) => {
                acc[m.month] = m.target_pct;
                return acc;
            }, {});

            await fetch('/api/planner/budget/curve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ scenarioId: selectedScenarioId, curve: curveMap })
            });
            await fetchBudgetCurve(selectedScenarioId);
            setCurveSavedFeedback(true);
            setTimeout(() => setCurveSavedFeedback(false), 3000);
        } catch (err) {
            console.error('Erro ao salvar curva:', err);
        } finally {
            setIsSavingCurve(false);
        }
    };

    const toggleSelection = async (lineId: string, currentStatus: string) => {
        const isSelected = currentStatus === 'selected';
        try {
            await fetch('/api/planner/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineId, selected: !isSelected })
            });
            setLines(prev => prev.map(l => l.id === lineId ? { ...l, status: !isSelected ? 'selected' : 'suggested' } : l));
        } catch (err) {
            console.error(err);
        }
    };

    const handleBulkSelect = (lineId: string, checked: boolean) => {
        const newSet = new Set(selectedLinesForBulk);
        if (checked) newSet.add(lineId);
        else newSet.delete(lineId);
        setSelectedLinesForBulk(newSet);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedLinesForBulk(new Set(lines.map(l => l.id)));
        } else {
            setSelectedLinesForBulk(new Set());
        }
    };

    const handleBulkApprove = async () => {
        if (selectedLinesForBulk.size === 0) return;
        try {
            await fetch('/api/planner/select/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineIds: Array.from(selectedLinesForBulk), status: 'selected' })
            });
            setLines(prev => prev.map(l => selectedLinesForBulk.has(l.id) ? { ...l, status: 'selected' } : l));
            setSelectedLinesForBulk(new Set());
        } catch (err) {
            console.error(err);
        }
    };

    const handleBulkCluster = async () => {
        if (selectedLinesForBulk.size === 0) return;
        
        // Obter campaignId de uma das linhas selecionadas
        const firstLineId = Array.from(selectedLinesForBulk)[0];
        const firstLine = lines.find(l => l.id === firstLineId);
        const cid = campaignId || (firstLine as any)?.campaign_id;

        try {
            const res = await fetch('/api/planner/clusters/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    lineIds: Array.from(selectedLinesForBulk),
                    scenarioId: selectedScenarioId,
                    campaignId: cid
                })
            });
            if (res.ok) {
                const { clusterId } = await res.json();
                setLines(prev => prev.map(l => selectedLinesForBulk.has(l.id) ? { 
                    ...l, 
                    cluster_id: clusterId,
                    overlap_mode: 'dominance',
                    status: 'selected'
                } : l));
                setSelectedLinesForBulk(new Set());
            } else {
                const errorData = await res.json();
                console.error('Erro ao agrupar:', errorData.error);
            }
        } catch (err) {
            console.error('Erro na requisição de agrupamento:', err);
        }
    };

    const handleBulkReject = async () => {
        if (selectedLinesForBulk.size === 0) return;
        try {
            await fetch('/api/planner/select/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineIds: Array.from(selectedLinesForBulk), status: 'rejected' })
            });
            setLines(prev => prev.filter(l => !selectedLinesForBulk.has(l.id)));
            setSelectedLinesForBulk(new Set());
        } catch (err) {
            console.error(err);
        }
    };

    const handleRejectLine = async (type: 'new' | 'extend') => {
        if (!rejectionModal.lineId) return;
        const lineId = rejectionModal.lineId;

        try {
            await fetch('/api/planner/reject', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lineId, type })
            });

            // If it's "new", we typically want to refresh to see new suggestions
            // If it's "extend", maybe we just update status
            await fetchLines(selectedScenarioId!);
            setRejectionModal({ isOpen: false, lineId: null });
        } catch (err) {
            console.error(err);
        }
    };

    const handlePointClick = async (point: any) => {
        if (point.kind !== 'asset') return;
        if (!campaignId || !selectedScenarioId) return;

        if (!confirm(`Deseja adicionar o ativo "${point.name}" ao seu cenário de planejamento?`)) return;

        setIsAddingAsset(true);
        try {
            const res = await fetch('/api/planner/add-asset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId,
                    scenarioId: selectedScenarioId,
                    assetId: point.id
                })
            });

            if (res.ok) {
                await fetchLines(selectedScenarioId);
                alert('Ativo adicionado com sucesso!');
            } else {
                const err = await res.json();
                alert('Erro: ' + err.error);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsAddingAsset(false);
        }
    };

    const toggleIBGE = async () => {
        const nextState = !showIbge;
        setShowIbge(nextState);

        if (nextState && ibgeData.length === 0 && targetUnits.length > 0) {
            try {
                const center = targetUnits[0];
                const res = await fetch(`/api/ibge?lat=${center.lat}&lng=${center.lng}`);
                const data = await res.json();
                setIbgeData(data.points || []);
                setCompetitorData(data.competitors || []);
            } catch (err) {
                console.error('Erro ao buscar dados IBGE:', err);
            }
        }
    };

    const runRecommendations = async () => {
        if (!campaignId || !selectedScenarioId) return;
        if (!isCurveValid) {
            alert("A Curva Orçamentária não atinge os 100% ou não foi salva. Ajuste e salve a curva antes de gerar recomendações.");
            setShowBudgetCurve(true);
            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch('/api/planner/recommend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campaignId,
                    scenarioId: selectedScenarioId,
                    radiusKm: recRadius,
                    minIncome: recMinIncome,
                    budgetMode: budgetMode,
                    overlapMode: recOverlapMode,
                    customWeights: {
                        w_distance: weightDistance / 100,
                        w_city: 0.1,
                        w_price: weightPrice / 100
                    }
                })
            });
            const data = await res.json();
            if (data.metrics) {
                setImpactMetrics(data.metrics);
            }
            await fetchLines(selectedScenarioId);
            await fetchBudgetCurve(selectedScenarioId);
            if (showIbge) await toggleIBGE();
        } catch (err) {
            console.error('Error in runRecommendations:', err);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleExportCSV = () => {
        if (lines.length === 0) return;

        const headers = ["ID", "Tipo", "Fornecedor", "Endereco", "Inicio", "Fim", "Preco Tabela", "Preco Negociado", "Total", "Status"];
        const csvContent = [
            headers.join(";"),
            ...lines.map(l => [
                l.id,
                l.type,
                l.vendor_name,
                `"${l.address_raw.replace(/"/g, '""')}"`,
                l.start_date?.split('T')[0] || '',
                l.end_date?.split('T')[0] || '',
                (l.base_price || 0).toFixed(2),
                (l.negotiated_price || 0).toFixed(2),
                (l.total_price || 0).toFixed(2),
                l.status
            ].join(";"))
        ].join("\n");

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `plano_midia_${campaign?.name || 'export'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleApproveScenario = async () => {
        if (!selectedScenarioId) return;
        try {
            // Logic to mark scenario as final if needed, or just save current state
            alert("Cenário salvo e pronto para execução!");
        } catch (err) {
            console.error(err);
        }
    };

    // Extraction of unique types from inventory for filter dropdown
    const availableTypes = useMemo(() => {
        return Array.from(new Set(inventory.map(i => i.type))).sort();
    }, [inventory]);

    const activeAssets = useMemo(() => {
        const lineAssetIds = new Set(lines.map(l => l.asset_id));

        return inventory.filter(asset => {
            // Se já está nas linhas (sugerido/selecionado), tira dessa lista "bruta"
            if (lineAssetIds.has(asset.id)) return false;

            // Filtro por Fornecedor
            if (filterVendor && asset.vendor_id !== filterVendor) return false;

            // Filtro por Tipo
            if (filterType && asset.type !== filterType) return false;

            return true;
        });
    }, [inventory, lines, filterVendor, filterType]);

    // Detecção de Overlap e Ganho de Dominância
    const overlapAnalysis = useMemo(() => {
        const overlapSet = new Set<string>();
        const clusterSet = new Set<string>();
        
        for (let i = 0; i < lines.length; i++) {
            for (let j = i + 1; j < lines.length; j++) {
                const l1 = lines[i];
                const l2 = lines[j];
                
                if (l1.lat && l1.lng && l2.lat && l2.lng) {
                    const dist = calculateDistance(l1.lat, l1.lng, l2.lat, l2.lng);
                    
                    if (dist < 0.005) { // 5 metros - Mesmo Endereço / Dominância
                        clusterSet.add(l1.id);
                        clusterSet.add(l2.id);
                    } else if (dist < 0.1) { // 100 metros - Sobreposição normal
                        overlapSet.add(l1.id);
                        overlapSet.add(l2.id);
                    }
                }
            }
        }
        return { overlapSet, clusterSet };
    }, [lines]);

    const targetUnits = useMemo(() => {
        if (!campaign || units.length === 0) return [];
        const allowedSchoolIds = campaign.target_school_ids || [];
        const allowedUnitIds = campaign.target_unit_ids || [];

        if (allowedUnitIds.length > 0) {
            return units.filter(u => allowedUnitIds.includes(u.id));
        } else if (allowedSchoolIds.length > 0) {
            return units.filter(u => allowedSchoolIds.includes(u.school_id));
        }
        return [];
    }, [campaign, units]);

    const mapPoints = useMemo(() => {
        const points: any[] = [];

        // 1. Escolas (Unidades-Alvo)
        targetUnits.forEach(u => {
            if (u.lat && u.lng) {
                points.push({
                    id: u.id,
                    lat: u.lat,
                    lng: u.lng,
                    name: `${u.brand_name} - ${u.unit_name}`,
                    kind: 'unit',
                    address: u.address_raw,
                    meta: u
                });
            }
        });

        // 2. Inventário Bruto Local (Filtrado)
        activeAssets.forEach(a => {
            if (a.lat && a.lng) {
                points.push({
                    id: a.id,
                    lat: a.lat,
                    lng: a.lng,
                    name: `${a.type} - ${a.vendor_name}`,
                    kind: 'asset',
                    address: a.address_raw,
                    meta: a
                });
            }
        });

        // 3. Linhas Planejadas (Sugeridas/Selecionadas pela IA)
        lines.forEach(l => {
            if (l.lat && l.lng) {
                // Apply same UI filters if they are set (optional, maybe user wants to see selected ignoring filters?)
                // Let's allow filters to also hide recommendations if they don't match, unless it's strictly necessary.
                // Actually, often it's better to always show lines, but let's filter them too so the map doesn't get cluttered.
                if (filterVendor && filterVendor !== l.vendor_name) return; // Note we don't have vendor_id in line directly, maybe use name or skip filtering lines
                if (filterType && filterType !== l.type) return;

                points.push({
                    id: l.id,
                    lat: l.lat,
                    lng: l.lng,
                    name: `${l.type} - ${l.vendor_name}`,
                    kind: l.overlap_mode === 'dominance' ? 'dominance' : (l.status === 'selected' ? 'selected' : 'suggested'),
                    address: l.address_raw,
                    meta: l
                });
            }
        });

        // 4. Dados IBGE (Calor)
        if (showIbge) {
            ibgeData.forEach((d, idx) => {
                points.push({
                    id: `ibge-${idx}`,
                    lat: d.lat,
                    lng: d.lng,
                    name: `IBGE: Renda R$ ${d.avg_income}`,
                    kind: 'ibge',
                    address: `População estimada: ${d.population} hab`,
                    intensity: d.intensity
                });
            });
        }

        return points;
    }, [lines, targetUnits, activeAssets, filterVendor, filterType, showIbge, ibgeData]);

    if (!campaignId) {
        return (
            <div className="p-20 text-center space-y-4">
                <AlertCircle size={48} className="mx-auto text-slate-300" />
                <h1 className="text-xl font-bold">Campanha não selecionada</h1>
                <Link href="/campaigns" className="text-primary-600 font-bold hover:underline inline-flex items-center gap-2">
                    <ArrowLeft size={16} /> Voltar para Campanhas
                </Link>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <header className="px-8 py-4 border-b border-slate-100 bg-white flex justify-between items-center shrink-0 shadow-sm z-10">
                <div className="flex items-center gap-6">
                    <Link href="/campaigns" className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
                        <ChevronLeft size={24} className="text-slate-400" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">Planejador de Mídia</h1>
                            <div className="px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-black text-slate-400 uppercase tracking-widest">Draft</div>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                            <select
                                value={selectedScenarioId || ''}
                                onChange={(e) => setSelectedScenarioId(e.target.value)}
                                className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-1 rounded-lg border-none focus:ring-0 cursor-pointer"
                            >
                                {scenarios.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-slate-50 p-1 rounded-xl flex mr-4">
                        <button
                            onClick={toggleIBGE}
                            className={`p-2 rounded-lg flex items-center gap-2 transition-all ${showIbge ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-white hover:text-primary-600'}`}
                            title="Camada IBGE"
                        >
                            <Info size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">IBGE</span>
                        </button>
                    </div>

                    <div className="bg-slate-50 p-1 rounded-xl flex mr-4">
                        <button
                            onClick={() => setShowBudgetCurve(!showBudgetCurve)}
                            className={`p-2 rounded-lg flex items-center gap-2 transition-all ${showBudgetCurve ? 'bg-primary-600 text-white' : 'text-slate-400 hover:bg-white hover:text-primary-600'}`}
                            title="Curva Orçamentária"
                        >
                            <BarChart3 size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Curva</span>
                            {!isCurveValid && <AlertCircle size={12} className="text-amber-500 absolute -top-1 -right-1" />}
                        </button>
                    </div>

                    <div className="bg-slate-50 p-1 rounded-xl flex mr-4">
                        <button onClick={() => setViewMode('split')} className={`p-2 rounded-lg ${viewMode === 'split' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400'}`} title="Split View">
                            <Settings2 size={18} />
                        </button>
                        <button onClick={() => setViewMode('table')} className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400'}`} title="Tabela">
                            <TableIcon size={18} />
                        </button>
                        <button onClick={() => setViewMode('monthly')} className={`p-2 rounded-lg ${viewMode === 'monthly' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400'}`} title="Visão Mensal">
                            <BarChart3 size={18} />
                        </button>
                        <button onClick={() => setViewMode('map')} className={`p-2 rounded-lg ${viewMode === 'map' ? 'bg-white shadow-sm text-primary-600' : 'text-slate-400'}`} title="Mapa">
                            <MapIcon size={18} />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 mr-2 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <div className="flex flex-col">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Raio (km)</label>
                            <input
                                type="number"
                                value={recRadius}
                                onChange={(e) => setRecRadius(parseFloat(e.target.value) || 0)}
                                className="w-10 bg-transparent border-none text-xs font-black text-slate-900 focus:ring-0 p-1"
                            />
                        </div>
                        <div className="w-px h-8 bg-slate-200 mx-1" />
                        <div className="flex flex-col max-w-[80px]">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">PESO DIST. ({weightDistance}%)</label>
                            <input
                                type="range" min="0" max="100"
                                value={weightDistance}
                                onChange={(e) => setWeightDistance(parseInt(e.target.value))}
                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer mt-2"
                            />
                        </div>
                        <div className="w-px h-8 bg-slate-200 mx-1" />
                        <div className="flex flex-col">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Modo Budget</label>
                            <select
                                value={budgetMode}
                                onChange={(e) => setBudgetMode(e.target.value as any)}
                                className="bg-transparent border-none text-[10px] font-black text-slate-900 focus:ring-0 p-1 cursor-pointer"
                            >
                                <option value="total">Total Campanha</option>
                                <option value="equal_per_unit">Igual por Unidade</option>
                            </select>
                        </div>
                        <div className="w-px h-8 bg-slate-200 mx-1" />
                        <div className="flex flex-col">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Sobreposição</label>
                            <select
                                value={recOverlapMode}
                                onChange={(e) => setRecOverlapMode(e.target.value as any)}
                                className="bg-transparent border-none text-[10px] font-black text-slate-900 focus:ring-0 p-1 cursor-pointer"
                            >
                                <option value="avoid">Evitar (Alcance)</option>
                                <option value="allow">Permitir (Frequência)</option>
                                <option value="dominance">Dominância (Mesmo Ponto)</option>
                            </select>
                        </div>
                    </div>

                    <div className="bg-slate-50 p-1 rounded-xl flex mr-2">
                        <button
                            onClick={toggleIBGE}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${showIbge ? 'bg-primary-600 text-white shadow-md' : 'text-slate-400 hover:bg-white hover:text-primary-600'}`}
                            title="Ativar Geointeligência (Heatmap e Concorrentes)"
                        >
                            <Zap size={16} fill={showIbge ? "currentColor" : "none"} />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none">Geointeligência</span>
                        </button>
                    </div>

                    <div className="bg-slate-50 p-1 rounded-xl flex mr-4">
                        <button
                            onClick={handleExportCSV}
                            className="p-2 rounded-lg text-slate-400 hover:bg-white hover:text-primary-600 transition-all"
                            title="Baixar Plano (CSV)"
                        >
                            <Download size={18} />
                            <span className="text-[10px] font-black uppercase tracking-widest leading-none ml-2">Baixar</span>
                        </button>
                    </div>

                    <button
                        onClick={() => setShowImportMedia(true)}
                        className="flex items-center gap-2 bg-white border-2 border-slate-100 text-slate-600 hover:border-primary-400 hover:text-primary-600 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm mr-2"
                    >
                        <Database size={18} />
                        Importar Mídia
                    </button>
                    <button
                        onClick={runRecommendations}
                        disabled={isGenerating || !isCurveValid}
                        title={!isCurveValid ? 'Você precisa definir e salvar uma Curva Orçamentária de 100% primeiro.' : 'Gerar Recomendações'}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${isCurveValid ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-600/20' : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                    >
                        <Sparkles size={18} className={isGenerating ? "animate-spin" : ""} />
                        {isGenerating ? "Gerando..." : "Gerar Recomendações"}
                    </button>
                    <button
                        onClick={handleApproveScenario}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                    >
                        <Save size={18} />
                        Aprovar Cenário
                    </button>
                </div>
            </header>

            <main className="flex-1 min-h-0 flex bg-slate-50">
                {(viewMode === 'split' || viewMode === 'table') && (
                    <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} flex flex-col bg-white border-r border-slate-100 overflow-hidden shadow-2xl z-[1]`}>
                        <div className="p-4 border-b border-slate-50 flex justify-between items-center shrink-0">
                            <div className="flex flex-col gap-3 w-full">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Filter size={14} />
                                        <span className="text-[10px] font-black uppercase tracking-widest">Filtros Ativos:</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Investimento Total</span>
                                            <span className="text-sm font-black text-slate-900">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.total)}
                                            </span>
                                        </div>
                                        <div className="flex flex-col border-l border-slate-100 pl-4">
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Economia (SAVE)</span>
                                            <span className="text-sm font-black text-emerald-600">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalSave)}
                                            </span>
                                        </div>

                                        {impactMetrics && (
                                            <>
                                                <div className="flex flex-col border-l border-slate-100 pl-4">
                                                    <span className="text-[10px] font-black text-primary-500 uppercase tracking-widest">Reach (Pessoas)</span>
                                                    <span className="text-sm font-black text-primary-600">
                                                        {new Intl.NumberFormat('pt-BR').format(Math.round(impactMetrics.estimatedReach))}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col border-l border-slate-100 pl-4">
                                                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Frequência</span>
                                                    <span className="text-sm font-black text-indigo-600">
                                                        {impactMetrics.frequency.toFixed(1)}x
                                                    </span>
                                                </div>
                                                <div className="flex flex-col border-l border-slate-100 pl-4">
                                                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Impactos Brutos</span>
                                                    <span className="text-sm font-black text-amber-600">
                                                        {new Intl.NumberFormat('pt-BR').format(Math.round(impactMetrics.totalGrossImpressions))}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        Mostrando {lines.length} itens sugeridos
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <select
                                        value={filterVendor}
                                        onChange={(e) => setFilterVendor(e.target.value)}
                                        className="w-1/2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                                    >
                                        <option value="">Todos os Fornecedores</option>
                                        {vendors.map(v => (
                                            <option key={v.id} value={v.id}>{v.name}</option>
                                        ))}
                                    </select>
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        className="w-1/2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none"
                                    >
                                        <option value="">Todos os Tipos</option>
                                        {availableTypes.map(t => (
                                            <option key={t as string} value={t as string}>{t as string}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto custom-scrollbar pb-24">
                            <table className="w-full text-left order-collapse border-spacing-0">
                                <thead className="sticky top-0 bg-white/95 backdrop-blur-md z-10">
                                    <tr className="border-b border-slate-50">
                                        <th className="p-4 w-10">
                                            <input
                                                type="checkbox"
                                                checked={lines.length > 0 && selectedLinesForBulk.size === lines.length}
                                                onChange={(e) => handleSelectAll(e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                            />
                                        </th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Score</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ativo / Fornecedor</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Início / Fim</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Preço Base</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Negociado / Save</th>
                                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lines.map((line) => (
                                        <tr key={line.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-all group ${selectedLinesForBulk.has(line.id) ? 'bg-primary-50/20' : ''}`}>
                                            <td className="p-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedLinesForBulk.has(line.id)}
                                                    onChange={(e) => handleBulkSelect(line.id, e.target.checked)}
                                                    className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                                                />
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className={`text-sm font-black ${line.score_final > 0.7 ? 'text-emerald-500' : 'text-slate-900'}`}>
                                                        {(line.score_final * 100).toFixed(0)}%
                                                    </span>
                                                    <div className="w-12 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                                                        <div className="h-full bg-emerald-500" style={{ width: `${line.score_final * 100}%` }} />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm leading-tight">
                                                    {line.type}
                                                    {overlapAnalysis.clusterSet.has(line.id) && line.overlap_mode !== 'dominance' && (
                                                        <div title="Oportunidade de Dominância: Ativo no mesmo endereço. Deseja agrupar como bloco de impacto?" className="text-amber-500 cursor-help animate-pulse">
                                                            <Sparkles size={14} />
                                                        </div>
                                                    )}
                                                    {overlapAnalysis.overlapSet.has(line.id) && line.overlap_mode === 'avoid' && (
                                                        <div title="Alerta de Superposição: Outro ativo muito próximo (<100m)." className="text-red-500 cursor-help">
                                                            <AlertCircle size={14} />
                                                        </div>
                                                    )}
                                                    {line.overlap_mode === 'dominance' && (
                                                        <div title="Cluster de Dominância: Ativos agrupados para impacto visual massivo." className="text-primary-500">
                                                            <CheckCircle2 size={12} />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{line.vendor_name}</p>
                                                    <select 
                                                        value={line.overlap_mode || 'avoid'}
                                                        onChange={(e) => {
                                                            const mode = e.target.value as any;
                                                            // updateLine local state first
                                                            setLines(prev => prev.map(l => l.id === line.id ? { ...l, overlap_mode: mode } : l));
                                                            // backend call
                                                            updateLine(line.id, { overlapMode: mode } as any);
                                                        }}
                                                        className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border-none focus:ring-0 cursor-pointer ${
                                                            line.overlap_mode === 'dominance' ? 'bg-primary-100 text-primary-700' : 
                                                            line.overlap_mode === 'allow' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                                                        }`}
                                                    >
                                                        <option value="avoid">Evitar Overlap</option>
                                                        <option value="allow">Permitir Overlap</option>
                                                        <option value="dominance">Dominância</option>
                                                    </select>
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 group/addr">
                                                    <p className="text-xs text-slate-500 font-medium truncate max-w-[200px]">{line.address_raw}</p>
                                                    <button 
                                                        onClick={() => {
                                                            setMapFocus({ center: [line.lat, line.lng], zoom: 18 });
                                                            if (viewMode === 'table') setViewMode('split');
                                                        }}
                                                        className="p-1 text-slate-300 hover:text-primary-500 hover:bg-primary-50 rounded-md transition-all opacity-0 group-hover/addr:opacity-100"
                                                        title="Centralizar no Mapa"
                                                    >
                                                        <MapIcon size={12} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    <input
                                                        type="date"
                                                        value={line.start_date?.split('T')[0] || ''}
                                                        onChange={(e) => updateLine(line.id, { start_date: e.target.value })}
                                                        className="text-[10px] font-bold text-slate-700 bg-slate-50 border-none rounded p-1 outline-none w-28"
                                                    />
                                                    <input
                                                        type="date"
                                                        value={line.end_date?.split('T')[0] || ''}
                                                        onChange={(e) => updateLine(line.id, { end_date: e.target.value })}
                                                        className="text-[10px] font-bold text-slate-700 bg-slate-50 border-none rounded p-1 outline-none w-28"
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-400 line-through decoration-slate-300">
                                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(line.base_price || 0)}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Tabela</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[10px] text-slate-400">Unit:</span>
                                                        <input
                                                            type="number"
                                                            defaultValue={line.unit_price}
                                                            onBlur={(e) => updateLine(line.id, { unit_price: parseFloat(e.target.value) })}
                                                            className="text-xs font-black text-slate-900 bg-transparent border-b border-dashed border-slate-200 focus:border-primary-500 outline-none w-16"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <span className="text-[10px] text-slate-400">Negotiated:</span>
                                                        <input
                                                            type="number"
                                                            value={line.negotiated_price || ''}
                                                            placeholder="0,00"
                                                            onChange={(e) => {
                                                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                setLines(prev => prev.map(l => l.id === line.id ? { ...l, negotiated_price: val } : l));
                                                            }}
                                                            onBlur={(e) => {
                                                                const val = e.target.value === '' ? null : parseFloat(e.target.value);
                                                                updateLine(line.id, { negotiated_price: val as any });
                                                            }}
                                                            className="text-xs font-black text-emerald-600 bg-emerald-50/50 border-b border-dashed border-emerald-200 focus:border-emerald-500 outline-none w-16 px-1 rounded"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <span className="text-[10px] text-slate-400">Total:</span>
                                                        <span className="text-xs font-black text-primary-600">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(line.total_price || 0)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <span className="text-[10px] text-emerald-500 font-black uppercase">SAVE:</span>
                                                        <span className="text-[10px] font-black text-emerald-600">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                                                Math.max(0, (line.base_price - (line.negotiated_price ?? line.unit_price)) * (line.unit_price > 0 ? line.total_price / line.unit_price : 0))
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => toggleSelection(line.id, line.status)}
                                                        className={`p-2 rounded-lg transition-all ${line.status === 'selected' ? 'bg-emerald-50 text-emerald-500 shadow-inner' : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50'}`}
                                                        title={line.status === 'selected' ? "Desmarcar" : "Aprovar Ativo"}
                                                    >
                                                        <CheckCircle2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => setRejectionModal({ isOpen: true, lineId: line.id })}
                                                        className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all"
                                                        title="Recusar Ativo"
                                                    >
                                                        <XCircle size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Bulk Actions Sticky Bottom Bar */}
                        {selectedLinesForBulk.size > 0 && (
                            <div className="absolute bottom-6 left-1/4 -translate-x-1/2 md:translate-x-0 md:left-auto md:right-8 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-8 z-50 min-w-[320px] animate-in slide-in-from-bottom-5">
                                <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase text-slate-400">{selectedLinesForBulk.size} itens selecionados</span>
                                    <span className="text-sm font-bold text-white">Ação em Lote</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleBulkCluster}
                                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                                    >
                                        <Sparkles size={16} />
                                        Agrupar
                                    </button>
                                    <button
                                        onClick={handleBulkReject}
                                        className="px-4 py-2 bg-slate-800 hover:bg-red-500/20 hover:text-red-400 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                                    >
                                        Eliminar
                                    </button>
                                    <button
                                        onClick={handleBulkApprove}
                                        className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-xl text-xs font-black uppercase tracking-widest transition-colors flex items-center gap-2"
                                    >
                                        <CheckCircle2 size={16} />
                                        Aprovar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {(viewMode === 'split' || viewMode === 'map') && (
                    <div className={`${viewMode === 'split' ? 'w-1/2' : 'w-full'} h-full relative`}>
                        <MapView
                            points={[...mapPoints, ...competitorData]}
                            radiusKm={5}
                            onPointClick={handlePointClick}
                            center={mapFocus.center}
                            zoom={mapFocus.zoom}
                        />

                    </div>
                )}

                {viewMode === 'monthly' && (
                    <div className="flex-1 flex flex-col bg-white overflow-hidden shadow-2xl z-[1]">
                        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Visão Mensal de Investimento</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Distribuição por período e unidade</p>
                            </div>
                            <div className="flex items-center gap-6">
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Total Geral</span>
                                    <span className="text-lg font-black text-slate-900 mt-1">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.total)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                            <MonthlyTable lines={lines} campaign={campaign} budgetCurve={budgetCurve} />
                        </div>
                    </div>
                )}

                {/* Budget Curve Panel */}
                {showBudgetCurve && (
                    <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl z-[2000] border-l border-slate-100 flex flex-col animate-in slide-in-from-right duration-300">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm">Curva de Investimento</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Defina a régua mensal</p>
                            </div>
                            <button onClick={() => setShowBudgetCurve(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                                <XCircle size={18} className="text-slate-400" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-6 custom-scrollbar">
                            <div className="space-y-6">
                                {budgetCurve?.monthly.map((m: any, idx: number) => (
                                    <div key={idx} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm hover:shadow-md transition-all space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês {idx + 1}</span>
                                            <div className="flex items-center gap-2 bg-slate-900 text-white px-3 py-1 rounded-lg">
                                                <input
                                                    type="number"
                                                    value={m.target_pct}
                                                    onChange={(e) => updateCurvePct(idx, parseFloat(e.target.value))}
                                                    className="w-8 bg-transparent text-center font-black text-xs focus:outline-none"
                                                />
                                                <span className="text-[10px] font-black text-slate-400">%</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-slate-400">Target</span>
                                                <span className="text-slate-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.target_val)}</span>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                                <span className="text-slate-400">Planejado</span>
                                                <span className={m.used_val > m.target_val ? 'text-red-500' : 'text-emerald-500'}>
                                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.used_val)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${m.used_val > m.target_val ? 'bg-red-500' : 'bg-emerald-500'}`}
                                                style={{ width: `${Math.min((m.used_val / (m.target_val || 1)) * 100, 100)}%` }}
                                            />
                                        </div>

                                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest bg-slate-50 p-2 rounded-lg">
                                            <span className="text-slate-400">Saldo</span>
                                            <span className={m.balance < 0 ? 'text-red-600' : 'text-slate-600'}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.balance)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 bg-slate-50/50">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Distribuído</span>
                                <span className={`text-xs font-black ${Math.abs((budgetCurve?.monthly.reduce((a: any, b: any) => a + b.target_pct, 0) || 0) - 100) < 0.1 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                    {budgetCurve?.monthly.reduce((a: any, b: any) => a + b.target_pct, 0).toFixed(1)}% / 100%
                                </span>
                            </div>
                            <button
                                onClick={saveBudgetCurve}
                                disabled={isSavingCurve}
                                className={`w-full py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 text-white ${curveSavedFeedback ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-900 hover:bg-slate-800'}`}
                            >
                                {isSavingCurve ? 'Salvando...' : curveSavedFeedback ? (
                                    <>
                                        <CheckCircle2 size={16} />
                                        Salvo com Sucesso!
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        Salvar Planejamento
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                )}
            </main>

            {/* Rejection Modal */}
            {rejectionModal.isOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[3000] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 text-center space-y-6">
                            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto">
                                <XCircle size={32} />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-black text-slate-900 tracking-tight">Recusar este ativo?</h3>
                                <p className="text-sm text-slate-500 font-medium">Escolha como deseja prosseguir com este espaço no seu planejamento:</p>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => handleRejectLine('new')}
                                    className="p-4 border-2 border-slate-100 rounded-2xl hover:border-primary-500 hover:bg-primary-50 transition-all text-left flex items-center gap-4 group"
                                >
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-white text-slate-400 group-hover:text-primary-600">
                                        <Sparkles size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-black text-slate-900 uppercase tracking-widest">Novo Lugar</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Sugerir uma nova mídia próxima</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => handleRejectLine('extend')}
                                    className="p-4 border-2 border-slate-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left flex items-center gap-4 group"
                                >
                                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-white text-slate-400 group-hover:text-emerald-600">
                                        <ChevronRight size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-xs font-black text-slate-900 uppercase tracking-widest">Estender Existente</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Usar outro ativo já aprovado por mais tempo</div>
                                    </div>
                                </button>
                            </div>

                            <button
                                onClick={() => setRejectionModal({ isOpen: false, lineId: null })}
                                className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors"
                            >
                                Cancelar operação
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Import Media Modal */}
            <ImportMediaModal
                isOpen={showImportMedia}
                onClose={() => setShowImportMedia(false)}
                onSuccess={() => {
                    if (selectedScenarioId) fetchLines(selectedScenarioId);
                }}
                scenarioId={selectedScenarioId || ''}
                campaignId={campaignId || ''}
            />
        </div>
    );
}


function MonthlyTable({ lines, campaign, budgetCurve }: { lines: PlanLine[], campaign: any, budgetCurve: any }) {
    const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
    const [sortConfig, setSortConfig] = useState<{ key: 'name' | 'value', direction: 'asc' | 'desc' }>({
        key: 'name',
        direction: 'asc'
    });

    const toggleUnit = (unitId: string) => {
        setExpandedUnits(prev => ({ ...prev, [unitId]: !prev[unitId] }));
    };

    const toggleSort = (key: 'name' | 'value') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const months = useMemo(() => {
        if (!campaign || !campaign.start_date || !campaign.end_date) return [];
        const start = new Date(campaign.start_date);
        const end = new Date(campaign.end_date);
        const list = [];
        let curr = new Date(start.getFullYear(), start.getMonth(), 1);
        while (curr <= end) {
            list.push(`${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, '0')}`);
            curr.setMonth(curr.getMonth() + 1);
        }
        return list;
    }, [campaign]);

    const hierarchicalData = useMemo(() => {
        const unitGroups: Record<string, {
            unitId: string,
            unitName: string,
            unitMonthlyTotals: Record<string, number>,
            unitGrandTotal: number,
            assets: Record<string, {
                assetId: string,
                type: string,
                vendor: string,
                address: string,
                monthly: Record<string, number>,
                total: number
            }>
        }> = {};

        lines.forEach(line => {
            if (!unitGroups[line.unit_id]) {
                unitGroups[line.unit_id] = {
                    unitId: line.unit_id,
                    unitName: line.unit_name,
                    unitMonthlyTotals: {},
                    unitGrandTotal: 0,
                    assets: {}
                };
            }

            const unitGroup = unitGroups[line.unit_id];
            const assetKey = line.asset_id;

            if (!unitGroup.assets[assetKey]) {
                unitGroup.assets[assetKey] = {
                    assetId: line.asset_id,
                    type: line.type,
                    vendor: line.vendor_name,
                    address: line.address_raw,
                    monthly: {},
                    total: 0
                };
            }

            const asset = unitGroup.assets[assetKey];
            const lStart = new Date(line.start_date);
            const lEnd = new Date(line.end_date);

            months.forEach(m => {
                const [year, month] = m.split('-').map(Number);
                const mStart = new Date(year, month - 1, 1);
                const mEnd = new Date(year, month, 0);

                if (lStart <= mEnd && lEnd >= mStart) {
                    const value = line.unit_price || 0;
                    asset.monthly[m] = (asset.monthly[m] || 0) + value;
                    asset.total += value;
                    unitGroup.unitMonthlyTotals[m] = (unitGroup.unitMonthlyTotals[m] || 0) + value;
                    unitGroup.unitGrandTotal += value;
                }
            });
        });

        const result = Object.values(unitGroups);

        return result.sort((a, b) => {
            if (sortConfig.key === 'name') {
                return sortConfig.direction === 'asc'
                    ? a.unitName.localeCompare(b.unitName)
                    : b.unitName.localeCompare(a.unitName);
            } else {
                return sortConfig.direction === 'asc'
                    ? a.unitGrandTotal - b.unitGrandTotal
                    : b.unitGrandTotal - a.unitGrandTotal;
            }
        });
    }, [lines, months, sortConfig]);

    const monthTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        months.forEach(m => {
            totals[m] = hierarchicalData.reduce((acc, unit) => acc + (unit.unitMonthlyTotals[m] || 0), 0);
        });
        return totals;
    }, [hierarchicalData, months]);

    if (!campaign) return null;

    return (
        <div className="overflow-x-auto border border-slate-100 rounded-3xl shadow-sm bg-slate-50/20">
            <table className="w-full text-left order-collapse border-separate border-spacing-0">
                <thead className="sticky top-0 z-20">
                    <tr className="bg-slate-900">
                        <th
                            onClick={() => toggleSort('name')}
                            className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-r border-slate-800 sticky left-0 bg-slate-900 z-30 min-w-[200px] cursor-pointer hover:text-white transition-colors group"
                        >
                            <div className="flex items-center gap-2">
                                Unidade / Ativo
                                {sortConfig.key === 'name' ? (
                                    <ArrowUp size={12} className={`transition-transform duration-300 ${sortConfig.direction === 'desc' ? 'rotate-180 text-primary-400' : 'text-primary-400'}`} />
                                ) : (
                                    <ArrowUpDown size={12} className="text-slate-600 group-hover:text-slate-400" />
                                )}
                            </div>
                        </th>
                        <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-r border-slate-800 min-w-[200px]">Detalhes</th>
                        {months.map(m => (
                            <th key={m} className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-r border-slate-800 text-center min-w-[110px]">
                                {new Date(parseInt(m.split('-')[0]), parseInt(m.split('-')[1]) - 1).toLocaleString('pt-BR', { month: 'short', year: '2-digit' })}
                            </th>
                        ))}
                        <th
                            onClick={() => toggleSort('value')}
                            className="p-4 text-[10px] font-black text-primary-400 uppercase tracking-widest border-b border-slate-800 text-right min-w-[130px] cursor-pointer hover:text-primary-300 transition-colors group"
                        >
                            <div className="flex items-center justify-end gap-2">
                                {sortConfig.key === 'value' ? (
                                    <ArrowUp size={12} className={`transition-transform duration-300 ${sortConfig.direction === 'desc' ? 'rotate-180 text-primary-300' : 'text-primary-300'}`} />
                                ) : (
                                    <ArrowUpDown size={12} className="text-primary-900 group-hover:text-primary-700" />
                                )}
                                Total
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {hierarchicalData.map((unit) => (
                        <React.Fragment key={unit.unitId}>
                            {/* Unit Summary Row (Accordion Header) */}
                            <tr
                                onClick={() => toggleUnit(unit.unitId)}
                                className="bg-slate-50/80 hover:bg-slate-100 transition-all cursor-pointer group"
                            >
                                <td className="p-4 border-b border-r border-slate-200 sticky left-0 bg-slate-50 group-hover:bg-slate-100 z-10">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1 rounded-md transition-transform ${expandedUnits[unit.unitId] ? 'rotate-90' : ''}`}>
                                            <ChevronRight size={16} className="text-slate-400" />
                                        </div>
                                        <span className="text-xs font-black text-slate-900">{unit.unitName}</span>
                                    </div>
                                </td>
                                <td className="p-4 border-b border-r border-slate-200">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {Object.keys(unit.assets).length} Ativos registrados
                                    </span>
                                </td>
                                {months.map(m => (
                                    <td key={m} className="p-4 border-b border-r border-slate-200 text-center">
                                        {unit.unitMonthlyTotals[m] ? (
                                            <span className="text-xs font-black text-slate-900">
                                                {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0 }).format(unit.unitMonthlyTotals[m])}
                                            </span>
                                        ) : (
                                            <span className="text-slate-200">0</span>
                                        )}
                                    </td>
                                ))}
                                <td className="p-4 border-b border-slate-200 text-right bg-primary-100/30">
                                    <span className="text-xs font-black text-primary-700">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(unit.unitGrandTotal)}
                                    </span>
                                </td>
                            </tr>

                            {/* Asset Detail Rows (Accordion Content) */}
                            {expandedUnits[unit.unitId] && Object.values(unit.assets).map((asset) => (
                                <tr key={asset.assetId} className="border-b border-slate-50 hover:bg-white transition-all group animate-in slide-in-from-top-2 duration-200">
                                    <td className="p-4 pl-12 border-r border-slate-100 sticky left-0 bg-white group-hover:bg-slate-50 z-10">
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-800">{asset.type}</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tight mt-0.5">{asset.vendor}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 border-r border-slate-100">
                                        <span className="text-[9px] text-slate-400 truncate max-w-[200px] block">
                                            {asset.address}
                                        </span>
                                    </td>
                                    {months.map(m => (
                                        <td key={m} className="p-4 border-r border-slate-50 text-center bg-white/50">
                                            {asset.monthly[m] ? (
                                                <span className="text-xs font-medium text-slate-600">
                                                    {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0 }).format(asset.monthly[m])}
                                                </span>
                                            ) : (
                                                <span className="text-slate-100 text-[10px]">0</span>
                                            )}
                                        </td>
                                    ))}
                                    <td className="p-4 text-right bg-slate-50/50">
                                        <span className="text-xs font-bold text-slate-500">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asset.total)}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </React.Fragment>
                    ))}
                </tbody>
                <tfoot className="sticky bottom-0 z-20 font-black uppercase text-[10px] tracking-widest border-t-2 border-slate-900 bg-white shadow-[0_-4px_10px_rgba(0,0,0,0.1)]">
                    <tr className="bg-slate-900 text-white">
                        <td colSpan={2} className="p-4 text-right border-r border-slate-800">INVESTIMENTO PLANEJADO (OOH)</td>
                        {months.map(m => (
                            <td key={m} className="p-4 text-center border-r border-slate-800 bg-slate-800/50">
                                {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0 }).format(monthTotals[m])}
                            </td>
                        ))}
                        <td className="p-4 text-right bg-primary-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Object.values(monthTotals).reduce((a, b) => a + b, 0))}
                        </td>
                    </tr>
                    <tr className="bg-slate-50 text-slate-500 border-b border-slate-100">
                        <td colSpan={2} className="p-3 text-right border-r border-slate-200">ORÇAMENTO RESERVADO (RÉGUA)</td>
                        {months.map((m, idx) => (
                            <td key={m} className="p-3 text-center border-r border-slate-200">
                                {budgetCurve?.monthly[idx] ? (
                                    <span>{new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0 }).format(budgetCurve.monthly[idx].target_val)}</span>
                                ) : '-'}
                            </td>
                        ))}
                        <td className="p-3 text-right">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(budgetCurve?.monthly.reduce((a: any, b: any) => a + b.target_val, 0) || 0)}
                        </td>
                    </tr>
                    <tr className="bg-white text-slate-900">
                        <td colSpan={2} className="p-3 text-right border-r border-slate-200">SALDO DISPONÍVEL</td>
                        {months.map((m, idx) => {
                            const diff = (budgetCurve?.monthly[idx]?.target_val || 0) - (monthTotals[m] || 0);
                            return (
                                <td key={m} className={`p-3 text-center border-r border-slate-200 font-bold ${diff < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 0 }).format(diff)}
                                </td>
                            );
                        })}
                        <td className="p-3 text-right font-black border-l border-slate-200">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                (budgetCurve?.monthly.reduce((a: any, b: any) => a + b.target_val, 0) || 0) -
                                Object.values(monthTotals).reduce((a, b) => a + b, 0)
                            )}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
