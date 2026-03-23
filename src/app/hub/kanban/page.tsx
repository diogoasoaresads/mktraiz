"use client";

import { useState, useEffect } from 'react';
import { 
    DragDropContext, 
    Droppable, 
    Draggable,
    DropResult
} from '@hello-pangea/dnd';
import { 
    Kanban as KanbanIcon,
    Search,
    Plus,
    MoreHorizontal,
    Clock,
    ChevronRight,
    MessageSquare,
    Zap,
    Play,
    ChevronDown,
    X,
    ClipboardList,
    Layers,
    Paperclip,
    Send,
    Check
} from 'lucide-react';

export default function HubKanban() {
    const [requests, setRequests] = useState<any[]>([]);
    const [pipelines, setPipelines] = useState<any[]>([]);
    const [currentPipeline, setCurrentPipeline] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [showPipelineSelector, setShowPipelineSelector] = useState(false);
    const [isCreatingPipeline, setIsCreatingPipeline] = useState(false);
    const [newPipelineName, setNewPipelineName] = useState('');
    const [newPipelineDesc, setNewPipelineDesc] = useState('');

    const fetchData = async () => {
        try {
            const [reqRes, pipeRes] = await Promise.all([
                fetch('/api/hub/requests'),
                fetch('/api/hub/pipelines')
            ]);
            
            const reqData = await reqRes.json();
            const pipeData = await pipeRes.json();

            if (reqData.success) setRequests(reqData.requests || []);
            if (pipeData.success) {
                setPipelines(pipeData.pipelines || []);
                if (pipeData.pipelines.length > 0) {
                    const parsedPipe = {
                        ...pipeData.pipelines[0],
                        stages: JSON.parse(pipeData.pipelines[0].stages_json)
                    };
                    setCurrentPipeline(parsedPipe);
                }
            }
            setLoading(false);
        } catch (err) {
            console.error('Error fetching data:', err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedRequest) {
            // Fetch history
            fetch(`/api/hub/requests/${selectedRequest.id}/history`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) setHistory(data.history || []);
                });
            
            // Fetch comments
            fetch(`/api/hub/requests/${selectedRequest.id}/comments`)
                .then(res => res.json())
                .then(data => {
                    if (data.success) setComments(data.comments || []);
                });
        } else {
            setHistory([]);
            setComments([]);
        }
    }, [selectedRequest]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedRequest) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/hub/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            if (data.success) {
                // Add a comment automatically with the attachment
                await handleAddComment(`Anexou um arquivo: ${data.name}`, data.path, data.name);
            }
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAddComment = async (text?: string, attachmentUrl?: string, attachmentName?: string) => {
        const commentText = text || newComment;
        if (!commentText.trim() || !selectedRequest) return;

        try {
            const res = await fetch(`/api/hub/requests/${selectedRequest.id}/comments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: commentText,
                    userName: 'Usuário Raiz',
                    attachmentUrl,
                    attachmentName
                })
            });
            
            const data = await res.json();
            if (data.success) {
                setNewComment('');
                // Refresh comments and history
                const resCom = await fetch(`/api/hub/requests/${selectedRequest.id}/comments`);
                const dataCom = await resCom.json();
                if (dataCom.success) setComments(dataCom.comments);
                
                const resHis = await fetch(`/api/hub/requests/${selectedRequest.id}/history`);
                const dataHis = await resHis.json();
                if (dataHis.success) setHistory(dataHis.history);
            }
        } catch (error) {
            console.error('Comment error:', error);
        }
    };

    const onDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (destination.droppableId === source.droppableId && destination.index === source.index) return;

        // Update local state immediately for snappy feel
        const newStatus = destination.droppableId;
        setRequests(prev => prev.map(r => r.id === draggableId ? { ...r, status: newStatus } : r));

        // Sync with DB
        try {
            await fetch('/api/hub/pipelines', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ requestId: draggableId, newStatus })
            });
        } catch (err) {
            console.error('Sync error:', err);
            // Optionally rollback on error
        }
    };

    const updateStatus = async (requestId: string, newStatus: string) => {
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: newStatus } : r));
        setSelectedRequest((prev: any) => prev?.id === requestId ? { ...prev, status: newStatus } : prev);
        
        await fetch('/api/hub/pipelines', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ requestId, newStatus })
        });
    };

    const getRequestsByStage = (stageId: string) => {
        return requests.filter(r => r.status === stageId && 
            (r.brand_name?.toLowerCase().includes(search.toLowerCase()) || 
             r.requester_name?.toLowerCase().includes(search.toLowerCase()))
        );
    };

    const renderIALegends = (jsonStr: string) => {
        try {
            const legends = JSON.parse(jsonStr);
            return legends.map((l: any, i: number) => (
                <div key={i} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 space-y-2 group/legend">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-indigo-400">
                        <span>{l.title}</span>
                        <button className="opacity-0 group-hover/legend:opacity-100 text-slate-500 hover:text-white transition-all underline">Usar esta</button>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{l.text}</p>
                </div>
            ));
        } catch (e) {
            return <p className="text-slate-500 text-xs italic">Nenhuma opção gerada.</p>;
        }
    };

    const handleCreatePipeline = async () => {
        if (!newPipelineName) return;

        const defaultStages = [
            { id: 'recebida', label: 'Recebida' },
            { id: 'triagem', label: 'Triagem' },
            { id: 'ia', label: 'Automação IA' },
            { id: 'design', label: 'Design' },
            { id: 'aprovacao', label: 'Aprovação' },
            { id: 'finalizada', label: 'Finalizada' }
        ];

        try {
            const res = await fetch('/api/hub/pipelines', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newPipelineName,
                    description: newPipelineDesc,
                    stages: defaultStages
                })
            });
            const data = await res.json();
            if (data.success) {
                await fetchData();
                setIsCreatingPipeline(false);
                setNewPipelineName('');
                setNewPipelineDesc('');
            }
        } catch (err) {
            console.error('Error creating pipeline:', err);
        }
    };

    if (loading || !currentPipeline) {
        return (
            <div className="flex h-screen bg-[#0a0c10] items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col min-h-[calc(100vh-4rem)] bg-[#0a0c10]">
            
            {/* Header */}
            <header className="p-6 border-b border-slate-800/50 flex items-center justify-between bg-[#0a0c10]/80 backdrop-blur-xl sticky top-0 z-10 text-white">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-600/10 rounded-2xl flex items-center justify-center text-primary-500 border border-primary-600/20">
                            <KanbanIcon size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight">{currentPipeline.name}</h1>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{requests.length} demandas ativas</p>
                        </div>
                    </div>

                    <div className="h-8 w-[1px] bg-slate-800 mx-2"></div>

                    <div className="relative">
                        <button 
                            onClick={() => setShowPipelineSelector(!showPipelineSelector)}
                            className="flex items-center gap-3 px-4 py-2 bg-slate-900/50 rounded-xl border border-slate-800 hover:border-primary-500/50 transition-all group"
                        >
                            <Layers size={16} className="text-primary-500" />
                            <span className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors">Trocar Quadro</span>
                            <ChevronDown size={14} className={`text-slate-500 transition-transform ${showPipelineSelector ? 'rotate-180' : ''}`} />
                        </button>

                        {showPipelineSelector && (
                            <div className="absolute top-full left-0 mt-2 w-72 bg-[#0d1117] border border-slate-800 rounded-2xl shadow-2xl p-2 z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/50 mb-2">
                                    Seus Quadros de Equipe
                                </div>
                                <div className="space-y-1 max-h-60 overflow-y-auto custom-scrollbar">
                                    {pipelines.map(p => (
                                        <button 
                                            key={p.id}
                                            onClick={() => {
                                                setCurrentPipeline({ ...p, stages: JSON.parse(p.stages_json) });
                                                setShowPipelineSelector(false);
                                            }}
                                            className={`w-full text-left px-4 py-3 rounded-xl flex items-center justify-between group transition-all ${currentPipeline.id === p.id ? 'bg-primary-600/10 border border-primary-600/20' : 'hover:bg-slate-800/50'}`}
                                        >
                                            <div>
                                                <p className={`text-sm font-bold ${currentPipeline.id === p.id ? 'text-primary-400' : 'text-slate-300'}`}>{p.name}</p>
                                                <p className="text-[10px] text-slate-500 truncate max-w-[180px]">{p.description}</p>
                                            </div>
                                            {currentPipeline.id === p.id && <div className="w-1.5 h-1.5 bg-primary-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>}
                                        </button>
                                    ))}
                                </div>
                                <button 
                                    onClick={() => {
                                        setIsCreatingPipeline(true);
                                        setShowPipelineSelector(false);
                                    }}
                                    className="w-full mt-2 flex items-center justify-center gap-2 py-3 border border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-primary-500 hover:border-primary-500/50 hover:bg-primary-500/5 transition-all text-xs font-black uppercase tracking-widest"
                                >
                                    <Plus size={14} />
                                    Novo Quadro
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group text-white">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary-500 transition-colors" size={18} />
                        <input 
                            type="text"
                            placeholder="Buscar demanda..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="bg-slate-900/50 border border-slate-800/50 rounded-full pl-12 pr-6 py-2.5 text-sm font-medium text-white focus:ring-2 focus:ring-primary-500 transition-all w-64 outline-none"
                        />
                    </div>
                    <button className="bg-primary-600 hover:bg-primary-500 text-white px-6 py-2.5 rounded-full font-black text-sm uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-primary-600/20">
                        <Plus size={18} />
                        <span>Nova Solicitação</span>
                    </button>
                </div>
            </header>

            {/* Kanban Board with DND */}
            <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex-1 overflow-x-auto p-6">
                    <div className="flex gap-6 h-full min-w-max pb-4">
                        {currentPipeline.stages.map((stage: any) => (
                            <Droppable key={stage.id} droppableId={stage.id}>
                                {(provided, snapshot) => (
                                    <div 
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className={`w-80 flex flex-col rounded-3xl transition-colors ${snapshot.isDraggingOver ? 'bg-primary-500/5' : ''}`}
                                    >
                                        <div className="flex items-center justify-between mb-4 px-4 pt-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-slate-900 text-slate-400 border border-slate-800`}>
                                                    {stage.label}
                                                </div>
                                                <span className="text-slate-600 text-xs font-bold">{getRequestsByStage(stage.id).length}</span>
                                            </div>
                                            <button className="text-slate-700 hover:text-white transition-colors">
                                                <MoreHorizontal size={16} />
                                            </button>
                                        </div>

                                        <div className="flex-1 bg-slate-900/10 rounded-3xl p-4 space-y-4 overflow-y-auto min-h-[200px]">
                                            {getRequestsByStage(stage.id).map((request, index) => (
                                                <Draggable key={request.id} draggableId={request.id} index={index}>
                                                    {(provided, snapshot) => (
                                                        <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            {...provided.dragHandleProps}
                                                            onClick={() => setSelectedRequest(request)}
                                                            className={`bg-slate-900 border ${snapshot.isDragging ? 'border-primary-500 shadow-2xl scale-105 z-50' : 'border-slate-800'} p-5 rounded-2xl hover:border-slate-700 transition-all cursor-grab group shadow-lg`}
                                                        >
                                                            <div className="flex items-center justify-between mb-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                                <span>#{request.id.slice(-6)}</span>
                                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                                                                    <Clock size={10} />
                                                                    {new Date(request.created_at).toLocaleDateString()}
                                                                </div>
                                                            </div>

                                                            <h3 className="text-sm font-black text-white leading-tight mb-2 group-hover:text-primary-400 transition-colors uppercase tracking-tight">
                                                                {request.brand_name} - {request.demand_type}
                                                            </h3>
                                                            
                                                            <p className="text-xs text-slate-500 line-clamp-2 mb-4 font-medium leading-relaxed">
                                                                {request.briefing_raw}
                                                            </p>

                                                            <div className="flex items-center justify-between pt-4 border-t border-slate-800/50">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700 group-hover:border-primary-500 transition-colors text-slate-400 uppercase text-[10px] font-bold">
                                                                        {request.requester_name?.slice(0, 2)}
                                                                    </div>
                                                                    <span className="text-[11px] font-bold text-slate-400 truncate max-w-[100px]">{request.requester_name}</span>
                                                                </div>
                                                                
                                                                <div className="flex gap-1">
                                                                    {request.status === 'ia' && (
                                                                        <div className="w-6 h-6 bg-indigo-500/10 text-indigo-500 rounded-lg flex items-center justify-center animate-pulse border border-indigo-500/20">
                                                                            <Zap size={12} fill="currentColor" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </Draggable>
                                            ))}
                                            {provided.placeholder}
                                        </div>
                                    </div>
                                )}
                            </Droppable>
                        ))}
                    </div>
                </div>
            </DragDropContext>

            {/* Details Drawer (Manteve-se igual ao anterior) */}
            {selectedRequest && (
                <div className="fixed inset-0 z-[100] flex justify-end">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedRequest(null)}></div>
                    <div className="relative w-full max-w-2xl bg-[#0a0c10] border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden">
                        
                        <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/20">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-xl font-black">
                                    {selectedRequest.brand_name?.charAt(0)}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none mb-1">{selectedRequest.brand_name}</h2>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">ID: {selectedRequest.id}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedRequest(null)} className="p-2 text-slate-500 hover:text-white transition-colors">
                                <Plus className="rotate-45" size={32} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6 bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</p>
                                    <p className="text-sm font-bold text-white uppercase">{selectedRequest.demand_type}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Prioridade</p>
                                    <p className={`text-sm font-black uppercase ${selectedRequest.priority === 'alta' ? 'text-rose-500' : 'text-amber-500'}`}>
                                        {selectedRequest.priority}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-primary-500 font-black text-[10px] uppercase tracking-[0.2em]">
                                    <MessageSquare size={14} />
                                    Briefing Original
                                </div>
                                <div className="bg-slate-900/30 p-6 rounded-3xl border border-slate-800/50 text-slate-400 text-sm leading-relaxed font-medium">
                                    {selectedRequest.briefing_raw}
                                </div>
                            </div>

                            {selectedRequest.briefing_ai && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-2 text-indigo-500 font-black text-[10px] uppercase tracking-[0.2em]">
                                        <Zap size={14} className="fill-current" />
                                        Automação IA Raiz
                                    </div>
                                    <div className="bg-indigo-500/5 p-6 rounded-3xl border border-indigo-500/10 space-y-4">
                                        <h4 className="text-sm font-black text-indigo-300 uppercase tracking-tight">Briefing Estruturado</h4>
                                        <p className="text-sm text-indigo-100/70 leading-relaxed font-medium whitespace-pre-wrap">
                                            {selectedRequest.briefing_ai}
                                        </p>
                                    </div>
                                    <div className="space-y-4">
                                        {renderIALegends(selectedRequest.ia_legend_options)}
                                    </div>
                                </div>
                            )}

                            {/* Activity History Section */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">
                                    <Clock size={14} />
                                    Histórico de Atividade
                                </div>
                                
                                <div className="space-y-6 relative ml-3 border-l border-slate-800 pb-4">
                                    {history.length > 0 ? (
                                        history.map((log, i) => (
                                            <div key={log.id} className="relative pl-6">
                                                <div className="absolute left-[-5px] top-1.5 w-2 h-2 bg-slate-700 rounded-full border-2 border-[#0a0c10]"></div>
                                                <div className="flex flex-col gap-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">{log.action === 'criacao' ? '✨ Criado' : '🔄 Transição'}</span>
                                                        <span className="text-[9px] font-bold text-slate-600">{new Date(log.created_at).toLocaleString()}</span>
                                                    </div>
                                                    <p className="text-sm font-medium text-slate-300">{log.description}</p>
                                                    <div className="text-[10px] font-bold text-slate-500 italic">por {log.actor_name}</div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="pl-6 text-slate-600 text-xs italic">Nenhum evento registrado ainda.</div>
                                    )}
                                </div>
                            </div>

                            {/* Comments & Collaboration Section */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-between text-slate-500 font-black text-[10px] uppercase tracking-[0.2em]">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare size={14} />
                                        Colaboração & Arquivos
                                    </div>
                                    <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full">{comments.length}</span>
                                </div>

                                <div className="space-y-4">
                                    {/* Comments List */}
                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                        {comments.map((comment) => (
                                            <div key={comment.id} className="bg-slate-900/40 p-4 rounded-2xl border border-slate-800/50 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-black text-slate-400 uppercase tracking-tight">{comment.user_name}</span>
                                                    <span className="text-[9px] font-bold text-slate-600">{new Date(comment.created_at).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-slate-300 font-medium">{comment.text}</p>
                                                {comment.attachment_url && (
                                                    <a 
                                                        href={comment.attachment_url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-slate-700/50 text-indigo-400 text-[10px] font-bold hover:bg-slate-700 transition-colors w-fit"
                                                    >
                                                        <Paperclip size={12} />
                                                        {comment.attachment_name || 'Ver Anexo'}
                                                    </a>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* New Comment Input */}
                                    <div className="relative group">
                                        <textarea 
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            placeholder="Digite seu comentário ou ajuste..."
                                            className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 pr-24 text-sm font-medium text-slate-300 focus:ring-1 focus:ring-indigo-500 transition-all outline-none resize-none min-h-[100px]"
                                        />
                                        <div className="absolute bottom-3 right-3 flex items-center gap-2">
                                            <label className="p-2 text-slate-500 hover:text-indigo-400 cursor-pointer transition-colors relative">
                                                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
                                                <Paperclip size={18} className={isUploading ? 'animate-pulse text-indigo-500' : ''} />
                                            </label>
                                            <button 
                                                onClick={() => handleAddComment()}
                                                className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20"
                                            >
                                                <Send size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-800 bg-slate-900/40 flex flex-col gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={() => updateStatus(selectedRequest.id, 'triagem')}
                                    className="px-6 py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                                >
                                    Solicitar Ajustes
                                </button>
                                <button 
                                    onClick={() => updateStatus(selectedRequest.id, 'design')}
                                    className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-500 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                                >
                                    <Play size={14} className="fill-current" />
                                    Iniciar Produção
                                </button>
                            </div>
                            
                            <button 
                                onClick={() => {
                                    updateStatus(selectedRequest.id, 'finalizada');
                                }}
                                className="w-full px-6 py-4 bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600/30 transition-all flex items-center justify-center gap-2"
                            >
                                <Check size={16} />
                                Aprovar & Finalizar Demanda
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Create Pipeline Modal */}
            {isCreatingPipeline && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setIsCreatingPipeline(false)}></div>
                    <div className="relative w-full max-w-md bg-[#0d1117] border border-slate-800 rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="w-12 h-12 bg-primary-600/20 rounded-2xl flex items-center justify-center text-primary-500 border border-primary-600/30">
                                <ClipboardList size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tight">Novo Quadro</h3>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Defina o fluxo da sua equipe</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome da Equipe / Projeto</label>
                                <input 
                                    autoFocus
                                    type="text"
                                    placeholder="Ex: Social Media, UX Design..."
                                    value={newPipelineName}
                                    onChange={(e) => setNewPipelineName(e.target.value)}
                                    className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-primary-500 transition-all outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Descrição (Opcional)</label>
                                <textarea 
                                    rows={3}
                                    placeholder="Para que serve este quadro?"
                                    value={newPipelineDesc}
                                    onChange={(e) => setNewPipelineDesc(e.target.value)}
                                    className="w-full bg-slate-900 border-none rounded-2xl p-4 text-sm font-bold text-white focus:ring-2 focus:ring-primary-500 transition-all outline-none resize-none"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-10">
                            <button 
                                onClick={() => setIsCreatingPipeline(false)}
                                className="px-6 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700 transition-all hover:text-white"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={handleCreatePipeline}
                                disabled={!newPipelineName}
                                className="px-6 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary-500 transition-all shadow-lg shadow-primary-600/20 disabled:opacity-50"
                            >
                                Criar Quadro
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
