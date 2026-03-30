"use client";

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, LogIn, Eye, EyeOff } from 'lucide-react';

function LoginContent() {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();
    const searchParams = useSearchParams();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();

            if (data.success) {
                const redirect = searchParams.get('redirect') || '/';
                router.replace(redirect);
            } else {
                setError(data.error || 'Senha incorreta.');
            }
        } catch {
            setError('Erro de conexão. Tente novamente.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background gradients */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary-600/5 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-10">
                    <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-slate-950 mb-6 border border-slate-800/10 overflow-hidden">
                        <img src="/logo.png?v=4" alt="Raiz Educação" className="w-20 h-20 object-contain" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
                        Off-<span className="text-primary-500">Raiz</span>
                    </h1>
                    <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-[0.3em]">Inteligência OOH</p>
                </div>

                {/* Card */}
                <div className="bg-slate-900/40 border border-slate-800/50 rounded-[2.5rem] p-10 shadow-3xl backdrop-blur-md">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-10 h-10 bg-primary-600/10 rounded-2xl flex items-center justify-center border border-primary-600/20">
                            <Lock className="text-primary-500" size={18} />
                        </div>
                        <div>
                            <h2 className="text-white font-black text-xl leading-none uppercase tracking-tight">Acesso</h2>
                            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Insira a senha mestra</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">
                                Senha de Acesso
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    autoFocus
                                    className="w-full bg-slate-950/50 border border-slate-800 rounded-2xl px-5 py-4 text-white placeholder-slate-700 focus:outline-none focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all pr-12 font-medium"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(v => !v)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-primary-500 transition-colors p-1"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3 text-red-500 text-[10px] font-black uppercase text-center tracking-widest">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || !password}
                            className="w-full flex items-center justify-center gap-3 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-black py-5 px-6 rounded-2xl transition-all shadow-xl shadow-primary-600/20 disabled:shadow-none uppercase tracking-[0.2em] text-xs"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <LogIn size={18} />
                                    <span>Entrar</span>
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <p className="text-center text-slate-700 text-[9px] font-bold uppercase tracking-[0.4em] mt-10">
                    Exclusivo · Sistema Raiz Educação
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#0a0c10] flex items-center justify-center p-4">
                <div className="w-8 h-8 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin" />
            </div>
        }>
            <LoginContent />
        </Suspense>
    );
}
