"use client";

import { useState, useEffect } from 'react';
import { 
    Library, 
    Search, 
    BookOpen, 
    Volume2, 
    Users, 
    Star, 
    ChevronRight,
    Building2,
    Palette
} from 'lucide-react';

export default function HubLibrary() {
    const [libraryItems, setLibraryItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        const fetchLibrary = async () => {
            try {
                const res = await fetch('/api/hub/library');
                const data = await res.json();
                if (data.success) setLibraryItems(data.library || []);
                setLoading(false);
            } catch (err) {
                console.error('Error fetching library:', err);
                setLoading(false);
            }
        };
        fetchLibrary();
    }, []);

    const filteredItems = libraryItems.filter(item => 
        item.brand_name.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex h-screen bg-[#F8FAFC] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-7xl mx-auto">
                    
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-widest mb-4 border border-indigo-100">
                                <Library size={12} className="fill-current" />
                                Hub de Branding
                            </div>
                            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Biblioteca de Marca</h1>
                            <p className="text-slate-500 font-medium mt-2">Consulte as diretrizes e o DNA de cada marca do Grupo Raiz.</p>
                        </div>
                        
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-500 transition-colors" size={20} />
                            <input 
                                type="text"
                                placeholder="Procurar marca..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="bg-white border border-slate-200 rounded-full pl-12 pr-6 py-3.5 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all w-full md:w-80 shadow-sm"
                            />
                        </div>
                    </div>

                    {/* Grid of Brand Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {filteredItems.map(item => (
                            <div key={item.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/40 p-10 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-10 text-slate-50 opacity-10 pointer-events-none group-hover:opacity-100 transition-all duration-700 transform group-hover:-translate-y-2">
                                    <h2 className="text-8xl font-black italic">{item.brand_name.charAt(0)}</h2>
                                </div>

                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-10">
                                        <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-slate-900/10">
                                            {item.brand_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{item.brand_name}</h2>
                                            <div className="flex items-center gap-2 text-primary-600 bg-primary-50 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mt-1">
                                                <Star size={10} className="fill-current" />
                                                Visual Guidelines Active
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {/* ABC Guidelines */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                                <BookOpen size={14} className="text-primary-500" />
                                                ABC da Marca
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                                {item.abc_guidelines}
                                            </p>
                                        </div>

                                        {/* Tom de Voz */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                                <Volume2 size={14} className="text-amber-500" />
                                                Tom de Voz
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium italic">
                                                "{item.tone_of_voice}"
                                            </p>
                                        </div>

                                        {/* Persona */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                                <Users size={14} className="text-indigo-500" />
                                                Persona
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                                {item.personas}
                                            </p>
                                        </div>

                                        {/* Visual Guidelines */}
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                                <Palette size={14} className="text-rose-500" />
                                                Visual & Design
                                            </div>
                                            <p className="text-sm text-slate-600 leading-relaxed font-medium">
                                                {item.visual_guidelines}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-10 pt-8 border-t border-slate-50 flex items-center justify-between">
                                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            Última atualização: {new Date(item.updated_at).toLocaleDateString()}
                                        </div>
                                        <button className="flex items-center gap-2 text-primary-600 font-black text-[11px] uppercase tracking-widest hover:translate-x-1 transition-transform">
                                            Ver Guia Completo
                                            <ChevronRight size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {filteredItems.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-[2.5rem] border border-dashed border-slate-200 mt-12">
                            <Library size={48} className="mx-auto text-slate-200 mb-4" />
                            <h3 className="text-slate-400 font-black text-lg uppercase tracking-widest">Nenhuma marca encontrada</h3>
                        </div>
                    )}
                </div>
    );
}
