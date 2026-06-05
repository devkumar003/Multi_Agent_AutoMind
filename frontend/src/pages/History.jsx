import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Clock, Activity, MessageSquare, Database, Trash2, Code2, Settings, ArrowRightCircle } from 'lucide-react';
import useAgentStore from '../store/useAgentStore';
import useAuthStore from '../store/useAuthStore';

const History = () => {
    const { setActivePage, setCodeContext, setCodeLanguage } = useAgentStore();
    const { token } = useAuthStore();
    const [history, setHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchHistory = async () => {
        setIsLoading(true);
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.get("http://127.0.0.1:8000/api/history", { headers });
            setHistory(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, [token]);

    const handleClearHistory = async () => {
        if (!window.confirm("Are you sure you want to delete all activity history?")) return;
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.delete("http://127.0.0.1:8000/api/history", { headers });
            setHistory([]);
        } catch (err) {
            alert("Failed to clear history.");
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'data': return <Database size={18} className="text-emerald-400" />;
            case 'chat': return <MessageSquare size={18} className="text-blue-400" />;
            case 'challenge': return <Code2 size={18} className="text-amber-400" />;
            case 'settings': return <Settings size={18} className="text-gray-400" />;
            default: return <Activity size={18} className="text-primary" />;
        }
    };

    const handleRestoreState = (item) => {
        if (!item.payload) return;
        try {
            const payload = JSON.parse(item.payload);
            if (item.activity_type === 'code') {
                if (payload.language) setCodeLanguage(payload.language);
                if (payload.code) setCodeContext(payload.code);
                setActivePage('code-lab');
            }
        } catch (err) {
            console.error("Failed to restore state", err);
        }
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto w-full max-w-4xl mx-auto z-10 text-white">
            <header className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-4xl font-bold mb-3 tracking-wide">Activity History</h2>
                    <p className="text-gray-400 text-lg">A chronological timeline of your platform interactions.</p>
                </div>
                <button 
                    onClick={handleClearHistory}
                    disabled={history.length === 0}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${history.length === 0 ? 'bg-transparent border-gray-700 text-gray-600 cursor-not-allowed' : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'}`}
                >
                    <Trash2 size={16} /> Clear Logs
                </button>
            </header>

            {isLoading ? (
                <div className="flex justify-center items-center py-20 text-gray-500">
                    <Clock className="animate-spin mr-2" /> Loading timeline...
                </div>
            ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-white/5 rounded-2xl border border-white/5">
                    <Activity size={48} className="mb-4 opacity-20" />
                    <p className="text-lg">No activity history found.</p>
                </div>
            ) : (
                <div className="relative border-l border-[#1C1F33] ml-4 md:ml-0 space-y-8 pb-10">
                    {history.map((item, idx) => (
                        <div key={idx} className="relative pl-8 md:pl-0">
                            {/* Timeline node */}
                            <div className="absolute left-[-16px] md:left-[-17px] top-1 h-8 w-8 rounded-full bg-[#0A0D1B] border border-[#1C1F33] flex items-center justify-center z-10 shadow-lg">
                                {getIcon(item.activity_type)}
                            </div>
                            
                            {/* Content Card */}
                            <div className="md:ml-8 glass-panel p-5 hover:border-primary/30 transition-colors group flex justify-between items-center">
                                <div className="flex-1">
                                    <div className="flex flex-col md:flex-row md:items-center mb-2 gap-2">
                                        <h3 className="text-lg font-bold text-gray-200 group-hover:text-white transition-colors">{item.title}</h3>
                                        <div className="flex items-center gap-1.5 text-xs font-mono text-gray-500 bg-black/40 px-2 py-1 rounded-md md:ml-auto">
                                            <Clock size={12} />
                                            {new Date(item.timestamp).toLocaleString()}
                                        </div>
                                    </div>
                                    <p className="text-gray-400 text-sm">{item.subtitle}</p>
                                </div>
                                {item.payload && (
                                    <button 
                                        onClick={() => handleRestoreState(item)}
                                        className="ml-4 p-2 text-primary hover:text-white bg-primary/10 hover:bg-primary border border-primary/20 hover:border-primary rounded-xl transition shadow-sm opacity-0 group-hover:opacity-100 flex items-center gap-2 text-sm font-medium"
                                        title="Restore this state"
                                    >
                                        Restore <ArrowRightCircle size={16} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default History;
