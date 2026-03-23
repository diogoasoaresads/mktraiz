"use client";

import HubRequestForm from '@/components/hub/HubRequestForm';

export default function HubPortalEmbed() {
    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-4xl mx-auto">
                {/* Simplified Header for Embed */}
                <div className="mb-8 flex items-center justify-between border-b border-slate-200 pb-6">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Solicitação de Conteúdo</h1>
                        <p className="text-slate-500 text-sm">Preencha os dados abaixo para abrir sua demanda.</p>
                    </div>
                    <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden">
                        <img src="/logo.png?v=4" alt="Raiz Educação" className="w-10 h-10 object-contain" />
                    </div>
                </div>

                <HubRequestForm />
                
                {/* Footer for Embed */}
                <div className="mt-12 pt-6 border-t border-slate-200 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        Hub 360 • Intelligence Mkt Raiz
                    </p>
                </div>
            </div>
        </div>
    );
}
