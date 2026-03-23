"use client";

import { useState, useEffect } from 'react';
import {
    Search,
    ExternalLink,
    RefreshCw,
    Upload,
    MoreVertical,
    AlertCircle,
    CheckCircle2,
    Clock,
    School,
    Building2,
    ChevronRight,
    ArrowRight,
    Download,
    Pencil,
    Trash2
} from 'lucide-react';
import ImportUnitsModal from '@/components/ImportUnitsModal';
import EditSchoolModal from '@/components/EditSchoolModal';
import AddSchoolModal from '@/components/AddSchoolModal';
import Link from 'next/link';
import { exportToExcel } from '@/lib/exportExcel';

interface School {
    id: string;
    brand_name: string;
    website: string;
    units_status: 'seeded_ok' | 'units_missing' | 'seed_error';
    unitsCount: number;
}

export default function BrandsPage() {
    const [schools, setSchools] = useState<School[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSeeding, setIsSeeding] = useState(false);

    // Modal State
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState<School | null>(null);

    async function fetchSchools() {
        try {
            const res = await fetch('/api/schools');
            const data = await res.json();
            setSchools(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSchools();
    }, []);

    async function runSeed() {
        setIsSeeding(true);
        try {
            await fetch('/api/seed', { method: 'POST' });
            await fetchSchools();
        } catch (err) {
            console.error(err);
        } finally {
            setIsSeeding(false);
        }
    }

    const openImportModal = (school: School | { id: string, brand_name: string }) => {
        setSelectedSchool(school as School);
        setIsImportModalOpen(true);
    };

    const openEditModal = (school: School) => {
        setSelectedSchool(school);
        setIsEditModalOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'seeded_ok':
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 text-green-600 text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 size={12} /> Sincronizado
                    </div>
                );
            case 'units_missing':
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 text-[10px] font-bold uppercase tracking-wider">
                        <AlertCircle size={12} /> Sem Unidades
                    </div>
                );
            case 'seed_error':
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-red-500/10 text-red-600 text-[10px] font-bold uppercase tracking-wider">
                        <AlertCircle size={12} /> Erro
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-500/10 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                        <Clock size={12} /> Pendente
                    </div>
                );
        }
    };

    return (
        <div className="p-10 max-w-7xl mx-auto space-y-10">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Marcas <span className="text-primary-600">(Schools)</span></h1>
                    <div className="flex items-center gap-2 text-slate-500 font-medium">
                        <Building2 size={16} />
                        <p>Gerenciamento estratégico das unidades do Grupo Raiz</p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => exportToExcel(
                            schools.map(s => ({
                                'Marca': s.brand_name,
                                'Website': s.website || '',
                                'Unidades': s.unitsCount,
                                'Status': s.units_status
                            })),
                            'marcas_raiz'
                        )}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 text-slate-600 px-5 py-3 rounded-2xl font-bold transition-all duration-300 shadow-sm"
                    >
                        ↓ Excel
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-5 py-3 rounded-2xl font-bold transition-all duration-300 shadow-sm"
                    >
                        <Building2 size={18} />
                        Nova Marca
                    </button>
                    <button
                        onClick={() => openImportModal({ id: 'global', brand_name: 'Todas as Marcas' })}
                        className="flex items-center gap-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 px-5 py-3 rounded-2xl font-bold transition-all duration-300 shadow-sm"
                    >
                        <Download size={18} />
                        Planilha
                    </button>
                    <button
                        onClick={runSeed}
                        disabled={isSeeding}
                        className="group relative flex items-center gap-2 bg-slate-900 hover:bg-primary-600 text-white px-6 py-3 rounded-2xl font-bold transition-all duration-300 shadow-xl shadow-slate-900/10 hover:shadow-primary-600/20 disabled:opacity-50"
                    >
                        <RefreshCw size={18} className={isSeeding ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
                        {isSeeding ? "Processando..." : "Sincronizar"}
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-12 h-12 border-4 border-primary-600/20 border-t-primary-600 rounded-full animate-spin" />
                    <p className="text-slate-500 font-bold animate-pulse uppercase tracking-widest text-xs">Carregando Marcas...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {schools.map((school) => (
                        <div key={school.id} className="premium-card group overflow-hidden flex flex-col">
                            <div className="p-8 space-y-6 flex-1">
                                <div className="flex justify-between items-start">
                                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center group-hover:bg-primary-50 transition-colors duration-300">
                                        <School className="text-slate-400 group-hover:text-primary-600 transition-colors" size={28} />
                                    </div>
                                    {getStatusBadge(school.units_status)}
                                </div>

                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary-600 transition-colors">{school.brand_name}</h3>
                                    <a
                                        href={`https://${school.website}`}
                                        target="_blank"
                                        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-primary-500 transition-colors"
                                    >
                                        {school.website} <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </a>
                                </div>

                                <div className="pt-6 border-t border-slate-50 flex items-end justify-between">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Unidades</p>
                                        <p className="text-3xl font-black text-slate-900">{school.unitsCount}</p>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEditModal(school)}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                                            title="Editar Marca"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                        <button
                                            onClick={() => openImportModal(school)}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                            title="Importar CSV"
                                        >
                                            <Upload size={18} />
                                        </button>
                                        <Link
                                            href={`/units?schoolId=${school.id}`}
                                            className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:text-primary-600 hover:bg-primary-50 transition-all"
                                            title="Ver Unidades"
                                        >
                                            <ChevronRight size={20} />
                                        </Link>
                                    </div>
                                </div>
                            </div>

                            <div className="h-1 w-0 group-hover:w-full bg-primary-500 transition-all duration-500" />
                        </div>
                    ))}
                </div>
            )}

            {selectedSchool && (
                <>
                    <ImportUnitsModal
                        isOpen={isImportModalOpen}
                        onClose={() => setIsImportModalOpen(false)}
                        brandName={selectedSchool.brand_name}
                        schoolId={selectedSchool.id}
                        onSuccess={fetchSchools}
                    />
                    <EditSchoolModal
                        isOpen={isEditModalOpen}
                        onClose={() => setIsEditModalOpen(false)}
                        school={selectedSchool}
                        onSuccess={fetchSchools}
                    />
                </>
            )}
            {/* Add School Modal */}
            <AddSchoolModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchSchools}
            />
        </div>
    );
}
