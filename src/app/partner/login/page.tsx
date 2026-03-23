"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function PartnerLoginPage() {
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/partner/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credentials)
            });

            if (res.ok) {
                router.push('/partner/inventory');
            } else {
                const data = await res.json();
                setError(data.error || 'Erro ao realizar login');
            }
        } catch (err) {
            setError('Erro de conexão com o servidor');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mb-4 border border-slate-800 shadow-xl overflow-hidden">
                        <img src="/logo.png?v=4" alt="Raiz Educação" className="w-16 h-16 object-contain" />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tight text-center uppercase">Portal Partner</h1>
                    <p className="text-slate-400 text-sm mt-2 text-center">Entre com suas credenciais para gerenciar seu inventário.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">E-mail</label>
                            <input
                                type="email"
                                value={credentials.email}
                                onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                                placeholder="seu@email.com"
                                className="w-full bg-slate-800/50 border border-slate-700 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Senha</label>
                            <input
                                type="password"
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                placeholder="••••••••"
                                className="w-full bg-slate-800/50 border border-slate-700 text-white px-5 py-4 rounded-2xl focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 outline-none transition-all"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-4 rounded-xl text-center uppercase tracking-widest">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary-600 hover:bg-primary-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-primary-600/20 flex items-center justify-center gap-2 disabled:opacity-50 uppercase tracking-widest text-xs"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : 'Acessar Portal'}
                    </button>
                </form>

                <div className="mt-8 pt-8 border-t border-slate-800 text-center">
                    <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">Hub 360 - Intelligence Mkt Raiz</p>
                </div>
            </div>
        </div>
    );
}
