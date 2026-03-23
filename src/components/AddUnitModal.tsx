import { useState, useEffect } from 'react';
import { X, MapPin, Loader2, CheckCircle2, Navigation, Map } from 'lucide-react';

interface School {
    id: string;
    brand_name: string;
}

interface AddUnitModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddUnitModal({ isOpen, onClose, onSuccess }: AddUnitModalProps) {
    const [schools, setSchools] = useState<School[]>([]);
    const [schoolId, setSchoolId] = useState('');
    const [name, setName] = useState('');
    const [addressRaw, setAddressRaw] = useState('');
    const [city, setCity] = useState('');
    const [stateProp, setStateProp] = useState('');
    const [code, setCode] = useState('');
    const [lat, setLat] = useState('');
    const [lng, setLng] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetch('/api/schools')
                .then(res => res.json())
                .then(data => {
                    setSchools(data);
                    if (data.length > 0) setSchoolId(data[0].id);
                })
                .catch(err => console.error('Error fetching schools', err));
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!schoolId || !name.trim() || !addressRaw.trim()) {
            setError('Escola, Nome e Endereço referencial são obrigatórios.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/units', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    school_id: schoolId,
                    name,
                    address_raw: addressRaw,
                    city,
                    state: stateProp,
                    code,
                    status: 'active',
                    lat: lat ? parseFloat(lat) : null,
                    lng: lng ? parseFloat(lng) : null
                })
            });

            const data = await res.json();
            if (data.success) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    setName('');
                    setAddressRaw('');
                    setCity('');
                    setStateProp('');
                    setCode('');
                    setLat('');
                    setLng('');
                    onSuccess();
                    onClose();
                }, 1500);
            } else {
                setError(data.error || 'Erro ao criar a unidade.');
            }
        } catch (err: any) {
            setError('Erro de conexão ao salvar.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl scale-in duration-300 my-auto">
                <div className="p-6 md:p-8 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-primary-50 rounded-2xl flex items-center justify-center">
                                <MapPin size={24} className="text-primary-600" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">Nova Unidade</h2>
                                <p className="text-sm font-medium text-slate-500">Adicionar nova unidade ao mapa</p>
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
                                <h3 className="text-xl font-bold text-slate-900">Unidade Criada!</h3>
                                <p className="text-slate-500 mt-1">A unidade foi salva e entrará na fila de geocodificação.</p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-100">
                                    {error}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Marca Pertencente <span className="text-red-500">*</span></label>
                                    <select
                                        value={schoolId}
                                        onChange={(e) => setSchoolId(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-primary-500 outline-none transition-all font-medium text-slate-900"
                                        required
                                    >
                                        <option value="" disabled>Selecione uma marca...</option>
                                        {schools.map(s => (
                                            <option key={s.id} value={s.id}>{s.brand_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-sm font-bold text-slate-700">Nome da Unidade <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-primary-500 outline-none transition-all font-medium text-slate-900"
                                            placeholder="Ex: Polo Tijuca"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-sm font-bold text-slate-700">Cód. Interno</label>
                                        <input
                                            type="text"
                                            value={code}
                                            onChange={(e) => setCode(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-primary-500 outline-none transition-all font-medium text-slate-900"
                                            placeholder="Ex: UN-001"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-sm font-bold text-slate-700">Endereço de Busca (CEP, Rua, Número) <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                            <Navigation size={18} className="text-slate-400" />
                                        </div>
                                        <input
                                            type="text"
                                            value={addressRaw}
                                            onChange={(e) => setAddressRaw(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-primary-500 outline-none transition-all font-medium text-slate-900"
                                            placeholder="Ex: Rua São Francisco Xavier, 524"
                                            required
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1 pl-1">Esse campo será usado para achar a lat/lng automaticamente.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-sm font-bold text-slate-700">Cidade</label>
                                        <input
                                            type="text"
                                            value={city}
                                            onChange={(e) => setCity(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-primary-500 outline-none transition-all font-medium text-slate-900"
                                            placeholder="Ex: Rio de Janeiro"
                                        />
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-sm font-bold text-slate-700">Estado (UF)</label>
                                        <input
                                            type="text"
                                            value={stateProp}
                                            onChange={(e) => setStateProp(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-primary-500 outline-none transition-all font-medium text-slate-900"
                                            placeholder="Ex: RJ"
                                            maxLength={2}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <Map size={14} /> Latitude
                                        </label>
                                        <input
                                            type="text"
                                            value={lat}
                                            onChange={(e) => setLat(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-primary-500 outline-none transition-all font-bold text-xs text-slate-900 placeholder:text-slate-300"
                                            placeholder="-23.XXXXXX"
                                        />
                                    </div>
                                    <div className="space-y-1.5 flex-1">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                            <Map size={14} /> Longitude
                                        </label>
                                        <input
                                            type="text"
                                            value={lng}
                                            onChange={(e) => setLng(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-slate-50 border-2 border-slate-100 rounded-xl focus:bg-white focus:border-primary-500 outline-none transition-all font-bold text-xs text-slate-900 placeholder:text-slate-300"
                                            placeholder="-43.XXXXXX"
                                        />
                                    </div>
                                    <p className="col-span-2 text-[10px] text-primary-500/70 font-medium">Preencha apenas se quiser ignorar a busca automática por endereço.</p>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSubmitting || !name.trim() || !addressRaw.trim() || !schoolId}
                                className="w-full bg-slate-900 hover:bg-primary-600 text-white px-6 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-slate-900/10 hover:shadow-primary-600/20 disabled:opacity-50 disabled:hover:bg-slate-900 mt-4"
                            >
                                {isSubmitting ? (
                                    <><Loader2 size={20} className="animate-spin" /> Salvando e roteando...</>
                                ) : (
                                    'Salvar Unidade Escolar'
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
