"use client";

import { Zap, Share2, Copy, Check, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import HubRequestForm from '@/components/hub/HubRequestForm';

export default function HubPortal() {
    const [showShare, setShowShare] = useState(false);
    const [copied, setCopied] = useState(false);

    const embedUrl = typeof window !== 'undefined' ? `${window.location.origin}/hub/portal/embed` : '';
    const iframeCode = `<iframe src="${embedUrl}" width="100%" height="800px" frameborder="0"></iframe>`;

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-8 max-w-5xl mx-auto relative">
            {/* Share Button */}
            <div className="absolute top-8 right-8">
                <button 
                    onClick={() => setShowShare(!showShare)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-primary-600 hover:border-primary-200 transition-all shadow-sm font-bold text-xs uppercase tracking-widest"
                >
                    <Share2 size={14} />
                    Compartilhar
                </button>

                {showShare && (
                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                        <h4 className="text-slate-900 font-black text-sm uppercase mb-4">Acesso Externo</h4>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Link Direto</label>
                                <div className="flex gap-2">
                                    <input 
                                        readOnly 
                                        value={embedUrl}
                                        className="flex-1 bg-slate-50 border-none rounded-lg p-2 text-[10px] font-medium text-slate-600 overflow-hidden text-ellipsis"
                                    />
                                    <button 
                                        onClick={() => copyToClipboard(embedUrl)}
                                        className="p-2 bg-slate-900 text-white rounded-lg hover:bg-primary-600 transition-colors"
                                    >
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Código Iframe (Embed)</label>
                                <div className="flex gap-2">
                                    <textarea 
                                        readOnly 
                                        value={iframeCode}
                                        rows={2}
                                        className="flex-1 bg-slate-50 border-none rounded-lg p-2 text-[10px] font-medium text-slate-600 resize-none leading-normal"
                                    />
                                    <button 
                                        onClick={() => copyToClipboard(iframeCode)}
                                        className="p-2 bg-slate-900 text-white rounded-lg hover:bg-primary-600 transition-colors h-fit"
                                    >
                                        {copied ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>

                            <a 
                                href="/hub/portal/embed" 
                                target="_blank"
                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary-50 text-primary-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-100 transition-colors"
                            >
                                <ExternalLink size={14} />
                                Visualizar Versão Limpa
                            </a>
                        </div>
                    </div>
                )}
            </div>

            {/* Header Section */}
            <div className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 text-primary-700 text-xs font-bold uppercase tracking-widest mb-4 shadow-sm">
                    <Zap size={14} className="fill-current" />
                    Hub de Conteúdo Raiz
                </div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-3">O que vamos criar hoje?</h1>
                <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed">
                    Abra sua demanda de comunicação e deixe a nossa inteligência acelerar a produção do seu conteúdo.
                </p>
            </div>

            <HubRequestForm />
        </div>
    );
}
