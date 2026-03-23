"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Database,
    BarChart3,
    ChevronRight,
    ChevronDown,
    Briefcase,
    Building2,
    Users,
    Map,
    Activity,
    Compass,
    Target,
    Settings,
    FileText,
    Layers,
    Shield,
    Calendar,
    MapPin,
    Sparkles,
    Library,
    MessageSquare,
    Kanban,
    Share2
} from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface NavItem {
    label: string;
    href?: string;
    icon: any;
    children?: { label: string; href: string; icon: any }[];
}

const navGroups: { group: string; items: NavItem[] }[] = [
    {
        group: 'Visão Geral',
        items: [
            { label: 'Dashboard', href: '/', icon: LayoutDashboard },
            { label: 'Relatórios Performance', href: '/reports', icon: BarChart3 },
        ]
    },
    {
        group: 'Inteligência de Rede',
        items: [
            { label: 'Mapa de Unidades', href: '/map', icon: Map },
            { label: 'Marcas & Escolas', href: '/brands', icon: Briefcase },
            { label: 'Unidades Raiz', href: '/units', icon: Building2 },
            { label: 'Concorrentes', href: '/competitors', icon: Shield },
        ]
    },
    {
        group: 'Mídia & Planejamento',
        items: [
            { label: 'Inventário OOH', href: '/inventory', icon: Database },
            { label: 'Fornecedores', href: '/vendors', icon: Users },
            {
                label: 'Campanhas',
                icon: Target,
                children: [
                    { label: 'Nova Campanha', href: '/campaigns/create', icon: Layers },
                    { label: 'Minhas Campanhas', href: '/campaigns', icon: FileText },
                    { label: 'Planejador Mapa', href: '/planner', icon: Map },
                ]
            },
        ]
    },
    {
        group: 'Hub de Produção',
        items: [
            { label: 'Portal de Solicitações', href: '/hub/portal', icon: MessageSquare },
            { label: 'Kanban de Produção', href: '/hub/kanban', icon: Kanban },
            { label: 'Calendário Editorial', href: '/hub/calendar', icon: Calendar },
            { label: 'Biblioteca de Marca', href: '/hub/library', icon: Library },
            { label: 'Performance Social', href: '/hub/performance', icon: Share2 },
            { label: 'Performance Eventos', href: '/hub/events', icon: Calendar },
        ]
    },
    {
        group: 'Ações de Campo',
        items: [
            {
                label: 'Eventos & Ativações',
                icon: Sparkles,
                children: [
                    { label: 'Calendário Inteligente', href: '/activations/calendar', icon: Calendar },
                    { label: 'Mapa de Ativação', href: '/activations/map', icon: MapPin },
                    { label: 'Execução & Check-in', href: '/execution', icon: Activity },
                ]
            },
        ]
    },
    {
        group: 'Sistema',
        items: [
            { label: 'Qualidade de Dados', href: '/geocoding', icon: Compass },
            { label: 'Configurações', href: '/settings', icon: Settings },
        ]
    }
];

export default function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
    const pathname = usePathname();
    const [openGroups, setOpenGroups] = useState<string[]>(['Geointeligência', 'Campanhas']);

    const toggleGroup = (label: string) => {
        if (collapsed) {
            onToggle();
            setOpenGroups([label]);
            return;
        }
        setOpenGroups(prev =>
            prev.includes(label)
                ? prev.filter(g => g !== label)
                : [...prev, label]
        );
    };

    // Auto-open group if item or child is active
    useEffect(() => {
        if (collapsed) return;
        navGroups.forEach(group => {
            const hasActiveItem = group.items.some(item => {
                if (item.href === pathname) return true;
                if (item.children) {
                    return item.children.some(child => child.href === pathname);
                }
                return false;
            });

            if (hasActiveItem && !openGroups.includes(group.group)) {
                setOpenGroups(prev => [...prev, group.group]);
            }
        });
    }, [pathname, collapsed]);

    return (
        <aside
            className={twMerge(
                "bg-[#0a0c10] text-slate-300 h-screen fixed left-0 top-0 flex flex-col border-r border-slate-800/50 z-50 transition-all duration-300 ease-in-out",
                collapsed ? "w-20" : "w-72"
            )}
        >
            <div className={twMerge("p-6 flex items-center justify-between", collapsed ? "flex-col gap-4" : "p-8")}>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm shrink-0 overflow-hidden border border-slate-800/10">
                        <img src="/logo.png?v=4" alt="Raiz Educação" className="w-10 h-10 object-contain" />
                    </div>
                    {!collapsed && (
                        <div className="animate-in fade-in duration-500">
                            <h1 className="text-xl font-black text-white tracking-tight leading-none uppercase">Hub <span className="text-secondary-500">360</span></h1>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Intelligence Mkt Raiz</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={onToggle}
                    className={twMerge(
                        "p-2 rounded-lg bg-slate-800/50 text-slate-400 hover:text-white transition-colors",
                        collapsed ? "" : "ml-2"
                    )}
                >
                    {collapsed ? <ChevronRight size={16} /> : <ChevronRight size={16} className="rotate-180" />}
                </button>
            </div>

            <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
                {navGroups.map((group) => {
                    const isGroupOpen = !collapsed && openGroups.includes(group.group);
                    
                    return (
                        <div key={group.group} className="space-y-1">
                            {!collapsed && (
                                <button
                                    onClick={() => toggleGroup(group.group)}
                                    className={twMerge(
                                        "w-full flex items-center justify-between px-4 py-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 rounded-lg group",
                                        isGroupOpen ? "text-primary-500 bg-primary-500/5 mb-1" : "text-slate-600 hover:text-slate-400"
                                    )}
                                >
                                    <span>{group.group}</span>
                                    {isGroupOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} className="opacity-50" />}
                                </button>
                            )}
                            
                            {(collapsed || isGroupOpen) && (
                                <div className={twMerge(
                                    "space-y-1",
                                    !collapsed && "animate-in slide-in-from-top-2 duration-300"
                                )}>
                                    {group.items.map((item) => {
                                        const Icon = item.icon;
                                        const isItemOpen = !collapsed && openGroups.includes(item.label);
                                        const hasChildren = !!item.children;
                                        const isActive = item.href === pathname;

                                        if (hasChildren) {
                                            return (
                                                <div key={item.label} className="space-y-1">
                                                    <button
                                                        onClick={() => toggleGroup(item.label)}
                                                        title={collapsed ? item.label : undefined}
                                                        className={twMerge(
                                                            "w-full group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                                                            isItemOpen ? "text-white" : "text-slate-400 hover:bg-slate-800/30 hover:text-white",
                                                            collapsed && "justify-center px-0"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Icon size={18} className={isItemOpen ? "text-primary-500" : "text-slate-600 group-hover:text-primary-400"} />
                                                            {!collapsed && <span className="animate-in fade-in duration-300">{item.label}</span>}
                                                        </div>
                                                        {!collapsed && (
                                                            isItemOpen ? <ChevronDown size={14} className="text-slate-600" /> : <ChevronRight size={14} className="text-slate-700" />
                                                        )}
                                                    </button>

                                                    {isItemOpen && !collapsed && (
                                                        <div className="space-y-1 ml-4 pl-4 border-l border-slate-800/50 animate-in slide-in-from-top-1 duration-200">
                                                            {item.children?.map((child) => {
                                                                const ChildIcon = child.icon;
                                                                const isChildActive = pathname === child.href;
                                                                return (
                                                                    <Link
                                                                        key={child.href}
                                                                        href={child.href}
                                                                        className={twMerge(
                                                                            "group flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium rounded-lg transition-all",
                                                                            isChildActive
                                                                                ? "bg-primary-600/10 text-white"
                                                                                : "text-slate-500 hover:text-white"
                                                                        )}
                                                                    >
                                                                        <ChildIcon size={16} className={isChildActive ? "text-primary-500" : "text-slate-600 group-hover:text-primary-400"} />
                                                                        {child.label}
                                                                    </Link>
                                                                );
                                                            })}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        }

                                        return (
                                            <Link
                                                key={item.href}
                                                href={item.href!}
                                                title={collapsed ? item.label : undefined}
                                                className={twMerge(
                                                    "group flex items-center justify-between px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200",
                                                    isActive
                                                        ? "bg-primary-600/10 text-white shadow-sm"
                                                        : "hover:bg-slate-800/50 hover:text-white",
                                                    collapsed && "justify-center px-0"
                                                )}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Icon size={18} className={isActive ? "text-primary-500" : "text-slate-500 group-hover:text-primary-400 transition-colors"} />
                                                    {!collapsed && <span className="animate-in fade-in duration-300">{item.label}</span>}
                                                </div>
                                                {isActive && !collapsed && <div className="w-1.5 h-1.5 rounded-full bg-primary-500 shadow-glow" />}
                                            </Link>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </nav>

            <div className={twMerge("mt-auto transition-all", collapsed ? "p-2" : "p-6")}>
                <div className={twMerge("rounded-2xl bg-slate-900/50 border border-slate-800/50", collapsed ? "p-2" : "p-4")}>
                    <div className={twMerge("flex items-center gap-3", collapsed ? "justify-center" : "mb-3")}>
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)] shrink-0"></div>
                        {!collapsed && <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter animate-in fade-in duration-300">Status Local</span>}
                    </div>
                    {!collapsed && (
                        <p className="text-[11px] text-slate-500 leading-relaxed animate-in fade-in duration-300">
                            Conectado ao banco SQLite local em modo persistente.
                        </p>
                    )}
                </div>
            </div>
        </aside>
    );
}
