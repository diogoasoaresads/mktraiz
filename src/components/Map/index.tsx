"use client";

import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('./MapView'), {
    ssr: false,
    loading: () => (
        <div className="w-full h-full rounded-2xl bg-slate-50 flex flex-col items-center justify-center space-y-4 border border-slate-200 border-dashed">
            <div className="w-8 h-8 border-4 border-primary-600/20 border-t-primary-600 rounded-full animate-spin" />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">Carregando Mapa...</p>
        </div>
    )
});

export default MapView;
