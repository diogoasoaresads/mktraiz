"use client";

import { useState, useEffect } from 'react';
import { X, Plus, Mail, User, ShieldCheck, Loader2, Trash2, Key } from 'lucide-react';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
}

interface Vendor {
    id: string;
    name: string;
}

interface VendorUsersModalProps {
    isOpen: boolean;
    onClose: () => void;
    vendor: Vendor;
}

export default function VendorUsersModal({ isOpen, onClose, vendor }: VendorUsersModalProps) {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', password: '', name: '' });
    const [error, setError] = useState('');

    const fetchUsers = async () => {
        try {
            const res = await fetch(`/api/vendors/${vendor.id}/users`);
            const data = await res.json();
            setUsers(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchUsers();
    }, [isOpen]);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setError('');
        try {
            const res = await fetch(`/api/vendors/${vendor.id}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            const data = await res.json();
            if (res.ok) {
                setShowAddForm(false);
                setNewUser({ email: '', password: '', name: '' });
                fetchUsers();
            } else {
                setError(data.error || 'Erro ao criar usuário');
            }
        } catch (err) {
            setError('Erro de conexão');
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900">Usuários: {vendor.name}</h2>
                        <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest">Gestão de acesso ao Portal do Parceiro</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400"><X size={24} /></button>
                </div>

                <div className="p-8 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary-600" /></div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Usuários Cadastrados</h3>
                                <button 
                                    onClick={() => setShowAddForm(!showAddForm)}
                                    className="px-4 py-2 bg-primary-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary-700 transition-all shadow-lg shadow-primary-600/20"
                                >
                                    {showAddForm ? 'Cancelar' : <><Plus size={14} /> Novo Usuário</>}
                                </button>
                            </div>

                            {showAddForm && (
                                <form onSubmit={handleAddUser} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4 animate-in slide-in-from-top-4 duration-300">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                            <input 
                                                required
                                                type="text" 
                                                value={newUser.name}
                                                onChange={e => setNewUser({...newUser, name: e.target.value})}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary-600/20"
                                                placeholder="Nome do usuário"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                                            <input 
                                                required
                                                type="email" 
                                                value={newUser.email}
                                                onChange={e => setNewUser({...newUser, email: e.target.value})}
                                                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary-600/20"
                                                placeholder="email@fornecedor.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Inicial</label>
                                        <input 
                                            required
                                            type="password" 
                                            value={newUser.password}
                                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-primary-600/20"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    {error && <p className="text-red-500 text-[10px] font-black uppercase text-center">{error}</p>}
                                    <button 
                                        type="submit" 
                                        disabled={submitting}
                                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2"
                                    >
                                        {submitting ? <Loader2 className="animate-spin" size={14} /> : 'Salvar Usuário'}
                                    </button>
                                </form>
                            )}

                            <div className="space-y-3">
                                {users.map(user => (
                                    <div key={user.id} className="p-4 bg-white border border-slate-50 flex items-center justify-between rounded-2xl shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-primary-600 group-hover:bg-primary-50">
                                                <User size={20} />
                                            </div>
                                            <div>
                                                <div className="text-xs font-black text-slate-900">{user.name}</div>
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{user.email}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[9px] font-black rounded-md uppercase tracking-tight border border-emerald-100">Ativo</span>
                                        </div>
                                    </div>
                                ))}
                                {users.length === 0 && !loading && (
                                    <div className="text-center py-20 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                                        <ShieldCheck className="mx-auto text-slate-300 mb-4" size={40} />
                                        <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Nenhum usuário cadastrado</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
