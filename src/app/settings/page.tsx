"use client";

import { useState, useEffect } from 'react';
import { Settings, Trash2, AlertTriangle, RefreshCw, CheckCircle2, UserPlus, Users, Mail, Shield, UserX } from 'lucide-react';

export default function SettingsPage() {
    const [loading, setLoading] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [isCreatingUser, setIsCreatingUser] = useState(false);
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'user' });

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/settings/users');
            const data = await res.json();
            if (data.success) setUsers(data.users);
        } catch (err) {
            console.error('Error fetching users:', err);
        }
    };

    // Fetch users on mount
    useEffect(() => {
        fetchUsers();
    }, []);

    const handleReset = async (action: string, label: string) => {
        const confirmed = window.confirm(`CUIDADO: Você tem certeza que deseja ${label.toLowerCase()}?\nESTA AÇÃO É IRREVERSÍVEL.`);
        if (!confirmed) return;

        setLoading(action);
        setMessage(null);

        try {
            const res = await fetch('/api/admin/db-reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });

            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: data.message });
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Erro ao processar solicitação.' });
        } finally {
            setLoading(null);
        }
    };

    const handleCreateUser = async () => {
        if (!newUser.name || !newUser.email) return;

        setLoading('create_user');
        try {
            const res = await fetch('/api/settings/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Usuário criado com sucesso!' });
                setIsCreatingUser(false);
                setNewUser({ name: '', email: '', role: 'user' });
                fetchUsers();
            } else {
                throw new Error(data.error);
            }
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Erro ao criar usuário.' });
        } finally {
            setLoading(null);
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Deseja realmente remover este usuário?')) return;

        try {
            const res = await fetch(`/api/settings/users/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: 'Usuário removido.' });
                fetchUsers();
            }
        } catch (err) {
            console.error('Error deleting user:', err);
        }
    };

    const sections = [
        {
            title: 'Gerenciamento de Unidades',
            description: 'Limpe a base de unidades para realizar uma nova importação global ou por marca.',
            action: 'reset_units',
            label: 'Apagar Todas as Unidades',
            icon: Trash2,
            color: 'amber'
        },
        {
            title: 'Inventário e Fornecedores',
            description: 'Remova todos os ativos de mídia e os fornecedores cadastrados.',
            action: 'reset_inventory',
            label: 'Apagar Todo o Inventário',
            icon: Trash2,
            color: 'amber'
        },
        {
            title: 'Campanhas e Planos',
            description: 'Zere o histórico de campanhas, cenários e planejamentos realizados.',
            action: 'reset_campaigns',
            label: 'Apagar Todas as Campanhas',
            icon: Trash2,
            color: 'amber'
        },
        {
            title: 'Ações Críticas',
            description: 'Reinicie o sistema completamente. Todos os dados inseridos serão perdidos.',
            action: 'reset_all',
            label: 'RESET TOTAL DO SISTEMA',
            icon: AlertTriangle,
            color: 'red'
        }
    ];

    return (
        <div className="p-10 max-w-4xl mx-auto space-y-10">
            <header className="space-y-1">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                        <Settings size={24} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configurações</h1>
                        <p className="text-slate-500 font-medium">Painel Administrativo e Manutenção do Sistema</p>
                    </div>
                </div>
            </header>

            {message && (
                <div className={`p-6 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 size={24} /> : <AlertTriangle size={24} />}
                    <p className="font-bold">{message.text}</p>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {/* User Management Section */}
                <div className="premium-card p-8 space-y-8">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Gestão de Equipe</h3>
                            <p className="text-sm text-slate-500 font-medium">Controle quem tem acesso ao Hub e outras áreas do sistema.</p>
                        </div>
                        <button 
                            onClick={() => setIsCreatingUser(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary-500 transition-all shadow-lg shadow-primary-600/20"
                        >
                            <UserPlus size={16} />
                            Novo Usuário
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {users.map((u) => (
                            <div key={u.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm">
                                        <Users size={18} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-slate-900">{u.name}</p>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                            <span>{u.email}</span>
                                            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                            <span className="text-primary-600">{u.role}</span>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDeleteUser(u.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                >
                                    <UserX size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Reset Sections */}
                {sections.map((sec, i) => (
                    <div key={i} className="premium-card p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1 max-w-xl">
                            <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{sec.title}</h3>
                            <p className="text-sm text-slate-500 font-medium leading-relaxed">{sec.description}</p>
                        </div>

                        <button
                            onClick={() => handleReset(sec.action, sec.label)}
                            disabled={!!loading}
                            className={`flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg whitespace-nowrap min-w-[240px] ${sec.color === 'red'
                                    ? 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20'
                                    : 'bg-white border-2 border-slate-200 text-slate-600 hover:border-amber-500 hover:text-amber-600 hover:bg-amber-50'
                                }`}
                        >
                            {loading === sec.action ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <sec.icon size={18} />
                            )}
                            {sec.label}
                        </button>
                    </div>
                ))}
            </div>

            {/* Create User Modal */}
            {isCreatingUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCreatingUser(false)}></div>
                    <div className="relative w-full max-w-md bg-white rounded-[2rem] p-8 shadow-2xl animate-in zoom-in duration-300">
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-6">Cadastrar Usuário</h3>
                        
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                <div className="relative">
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="text"
                                        placeholder="Ex: João Silva"
                                        value={newUser.name}
                                        onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                                        className="w-full bg-slate-50 border-none rounded-xl p-4 pl-12 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input 
                                        type="email"
                                        placeholder="joao@raiz.edu.br"
                                        value={newUser.email}
                                        onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                                        className="w-full bg-slate-50 border-none rounded-xl p-4 pl-12 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nível de Acesso</label>
                                <div className="relative">
                                    <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <select 
                                        value={newUser.role}
                                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                                        className="w-full bg-slate-50 border-none rounded-xl p-4 pl-12 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-primary-500 transition-all outline-none appearance-none"
                                    >
                                        <option value="user">Usuário Padrão</option>
                                        <option value="admin">Administrador</option>
                                        <option value="requester">Solicitante</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-8">
                            <button 
                                onClick={() => setIsCreatingUser(false)}
                                className="px-6 py-4 bg-slate-100 text-slate-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleCreateUser}
                                disabled={loading === 'create_user' || !newUser.name || !newUser.email}
                                className="px-6 py-4 bg-primary-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary-500 transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50"
                            >
                                {loading === 'create_user' ? <RefreshCw size={18} className="animate-spin mx-auto" /> : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <footer className="pt-10 border-t border-slate-100 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">OOH Planner v0.1.0 • Grupo Raiz Educação</p>
            </footer>
        </div>
    );
}
