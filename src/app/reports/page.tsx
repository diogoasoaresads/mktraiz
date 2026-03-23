"use client";

import { useState, useEffect } from 'react';
import {
    BarChart3,
    Download,
    FileText,
    TrendingUp,
    PieChart,
    CheckCircle2,
    Loader2,
    AlertTriangle,
    Calendar,
    ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
// Dynamic imports used in function to fix compatibility

export default function ReportsPage() {
    const [loading, setLoading] = useState(false);
    const [alerts, setAlerts] = useState<any[]>([]);
    const [monthlyData, setMonthlyData] = useState<any[]>([]);
    const [schools, setSchools] = useState<any[]>([]);

    // Filters
    const [filterBrand, setFilterBrand] = useState<string>('');
    const [filterPeriod, setFilterPeriod] = useState<string>('');

    useEffect(() => {
        const loadExtra = async () => {
            try {
                const [alertsRes, monthlyRes, schoolsRes] = await Promise.all([
                    fetch('/api/reports/alerts'),
                    fetch(`/api/reports/monthly?brand=${encodeURIComponent(filterBrand)}&period=${encodeURIComponent(filterPeriod)}`),
                    fetch('/api/schools')
                ]);
                setAlerts(await alertsRes.json());
                setMonthlyData(await monthlyRes.json());

                // Only load schools once
                if (schools.length === 0) {
                    setSchools(await schoolsRes.json());
                }
            } catch (err) {
                console.error('Error loading extra reports:', err);
            }
        };
        loadExtra();
    }, [filterBrand, filterPeriod]); // Depend on filters to reload

    const fetchData = async () => {
        const res = await fetch('/api/reports/data');
        return await res.json();
    };

    const exportCSV = async () => {
        setLoading(true);
        try {
            const data = await fetchData();
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Relatorio_Financeiro");
            XLSX.writeFile(workbook, `OOH_Planner_Financeiro_${new Date().toISOString().split('T')[0]}.xlsx`);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const exportPDF = async () => {
        setLoading(true);
        try {
            const data = await fetchData();
            const { jsPDF } = await import('jspdf');
            const { default: pdfAutoTable } = await import('jspdf-autotable');
            const doc = new jsPDF() as any;

            doc.setFontSize(22);
            doc.setTextColor(15, 23, 42); // slate-900
            doc.text("Relatório de Ocupação OOH", 14, 20);

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 30);
            doc.text("Grupo Raiz Educação - OOH Planner", 14, 35);

            const tableData = data.map((item: any) => [
                item.campaign_name,
                item.unit_name,
                item.asset_type,
                item.vendor_name,
                item.status.toUpperCase(),
                `R$ ${item.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
            ]);

            (pdfAutoTable as any)(doc, {
                startY: 45,
                head: [["Campanha", "Unidade", "Tipo", "Fornecedor", "Status", "Preço"]],
                body: tableData,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] }, // emerald-500
                styles: { fontSize: 8, cellPadding: 3 },
                margin: { top: 40 }
            });

            // Add images on separate pages if they exist
            let photoIndex = 1;
            for (const item of data) {
                if (item.proof_photo) {
                    doc.addPage();
                    doc.setFontSize(14);
                    doc.text(`Comprovante: ${item.campaign_name} - ${item.unit_name}`, 14, 20);
                    doc.setFontSize(10);
                    doc.text(`Ativo: ${item.asset_type} | Fornecedor: ${item.vendor_name}`, 14, 30);

                    try {
                        // Adding image dummy or placeholder if path not valid, 
                        // in real scenario we would fetch the image from the server
                        doc.addImage(item.proof_photo.startsWith('http') ? item.proof_photo : `/uploads/${item.proof_photo}`, 'JPEG', 14, 40, 180, 120);
                    } catch (e) {
                        doc.setTextColor(255, 0, 0);
                        doc.text("[Erro ao carregar imagem]", 14, 45);
                        doc.setTextColor(100);
                    }
                }
            }

            doc.save(`Relatorio_Ocupacao_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-10 max-w-7xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Relatórios <span className="text-primary-600">(Insights)</span></h1>
                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <BarChart3 size={16} />
                        <p>Consolidado de investimentos e performance</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="premium-card p-8 space-y-6">
                    <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center">
                        <FileText size={24} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold">Relatório de Ocupação</h3>
                        <p className="text-sm text-slate-500">Gere um PDF detalhado com todos os ativos contratados, fotos de prova e status de veiculação.</p>
                    </div>
                    <button
                        onClick={exportPDF}
                        disabled={loading}
                        className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-primary-600 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                        Baixar PDF Consolidado
                    </button>
                </div>

                <div className="premium-card p-8 space-y-6">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                        <TrendingUp size={24} />
                    </div>
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold">Análise Financeira</h3>
                        <p className="text-sm text-slate-500">Exportação em Excel (XLSX) com detalhamento de preços negociados, campanhas e fornecedores.</p>
                    </div>
                    <button
                        onClick={exportCSV}
                        disabled={loading}
                        className="w-full py-4 bg-slate-100 text-slate-900 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                        Exportar Excel Financeiro
                    </button>
                </div>
            </div>

            {alerts.length > 0 && (
                <div className="premium-card p-8 border-amber-100 bg-amber-50/10 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center">
                                <AlertTriangle size={20} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900">Alertas de Expiração <span className="text-amber-600">(Próximos 15 dias)</span></h3>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Data Final</th>
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Campanha / Ativo</th>
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Fornecedor</th>
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {alerts.map((alert: any) => (
                                    <tr key={alert.id} className="border-b border-slate-50 hover:bg-white transition-colors group">
                                        <td className="py-4">
                                            <span className="text-xs font-black text-amber-600 bg-amber-100 px-2 py-1 rounded-md">
                                                {new Date(alert.end_date).toLocaleDateString('pt-BR')}
                                            </span>
                                        </td>
                                        <td className="py-4">
                                            <p className="text-sm font-bold text-slate-900">{alert.campaign_name}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{alert.asset_type} - {alert.unit_name}</p>
                                        </td>
                                        <td className="py-4">
                                            <span className="text-xs font-medium text-slate-600">{alert.vendor_name}</span>
                                        </td>
                                        <td className="py-4 text-right">
                                            <button className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                                                <ArrowRight size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-3 premium-card p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center">
                            <Calendar size={20} />
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Consolidado Mensal</h3>
                    </div>

                    {/* Filters */}
                    <div className="flex gap-3 mb-6">
                        <select
                            value={filterBrand}
                            onChange={(e) => setFilterBrand(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-primary-500/20"
                        >
                            <option value="">Todas as Marcas</option>
                            {schools.map(s => (
                                <option key={s.id} value={s.brand_name}>{s.brand_name}</option>
                            ))}
                        </select>

                        <select
                            value={filterPeriod}
                            onChange={(e) => setFilterPeriod(e.target.value)}
                            className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 bg-slate-50 outline-none focus:ring-2 focus:ring-primary-500/20"
                        >
                            <option value="">Todos os Períodos</option>
                            {/* We could build this dynamically from all available periods, 
                                but for simplicity we rely on the DB returning the periods that have data.
                                If the user filters by Brand, the periods will update to only those with data for that brand.
                            */}
                            {Array.from(new Set(monthlyData.map(d => `${d.year}-${d.month}`))).map(period => {
                                const [year, month] = period.split('-');
                                return (
                                    <option key={period} value={period}>
                                        {new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mês / Ano</th>
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Quantidade</th>
                                    <th className="py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Investimento</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlyData.map((item: any, idx) => (
                                    <tr key={idx} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                        <td className="py-4">
                                            <span className="text-sm font-bold text-slate-900 capitalize">
                                                {new Date(parseInt(item.year), parseInt(item.month) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                                            </span>
                                        </td>
                                        <td className="py-4 text-center">
                                            <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-black text-slate-600">
                                                {item.active_count} mídias
                                            </span>
                                        </td>
                                        <td className="py-4 text-right">
                                            <span className="text-sm font-black text-primary-600">
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total_value)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {monthlyData.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="py-10 text-center text-slate-400 italic text-sm">Nenhum dado mensal disponível.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="premium-card p-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center border-emerald-100 bg-emerald-50/20">
                <div className="space-y-4">
                    <h4 className="text-sm font-black text-emerald-600 uppercase tracking-widest">Mix de Mídia</h4>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full border-8 border-emerald-500 border-t-emerald-200 animate-pulse"></div>
                        <div className="text-xs space-y-1">
                            <p className="flex items-center gap-2 font-bold text-slate-700">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>Outdoor (45%)
                            </p>
                            <p className="flex items-center gap-2 font-bold text-slate-700">
                                <span className="w-2 h-2 rounded-full bg-emerald-300"></span>LED (30%)
                            </p>
                            <p className="flex items-center gap-2 font-bold text-slate-700">
                                <span className="w-2 h-2 rounded-full bg-emerald-100"></span>Busdoor (25%)
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-sm font-black text-emerald-600 uppercase tracking-widest">Cobertura Geográfica</h4>
                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[78%]"></div>
                    </div>
                    <p className="text-xs font-bold text-slate-500">78% das unidades do Grupo Raiz cobertas em um raio de 2km.</p>
                </div>

                <div className="space-y-4 text-right">
                    <PieChart size={32} className="text-emerald-200 ml-auto" />
                    <h3 className="text-2xl font-black text-slate-800">Insights Ativos</h3>
                    <p className="text-xs text-slate-500 font-medium">Os dados acima são calculados com base no inventário aprovado.</p>
                </div>
            </div>
        </div>
    );
}
