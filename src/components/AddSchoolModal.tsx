import { useState } from 'react';
import { X, Building2, Link2, Loader2, CheckCircle2 } from 'lucide-react';

interface AddSchoolModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddSchoolModal({ isOpen, onClose, onSuccess }: AddSchoolModalProps) {
    const [brandName, setBrandName] = useState('');
    const [website, setWebsite] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!brandName.trim()) {
            setError('O nome da marca é obrigatório.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/schools', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brand_name: brandName, website })
            });

            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setBrandName('');
                    setWebsite('');
                    onSuccess();
                    onClose();
                }, 1500);
            } else {
                setError(data.error || 'Erro ao criar a marca.');
            }
        } catch (err: any) {
            setError('Erro de conexão ao salvar.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl scale-in duration-300">
                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center">
                                <Building2 size={24} className="text-primary-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">Nova Marca</h2>
                                <p className="text-sm font-medium text-slate-500">Adicionar escola manualmente</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {success ? (
                        <div className="py-8 flex flex-col items-center justify-center gap-4 text-center">
                            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 size={32} className="text-emerald-600" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-900">Marca Criada!</h3>
                                <p className="text-slate-500 mt-1">A nova marca foi salva com sucesso no banco de dados.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Nome da Marca <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <Building2 size={18} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={brandName}
                                            onChange={(e) => setBrandName(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-medium text-slate-900"
                                            placeholder="Ex: QI Mogi das Cruzes"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Website</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <Link2 size={18} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="url"
                                            value={website}
                                            onChange={(e) => setWebsite(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all font-medium text-slate-900"
                                            placeholder="Ex: www.colegioqi.com.br"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !brandName.trim()}
                                className="w-full bg-slate-900 hover:bg-primary-600 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-900/10 hover:shadow-primary-600/20 disabled:opacity-50 disabled:hover:bg-slate-900"
                            >
                                {isSubmitting ? (
                                    <><Loader2 size={20} className="animate-spin" /> Salvando...</>
                                ) : (
                                    'Adicionar Marca'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
