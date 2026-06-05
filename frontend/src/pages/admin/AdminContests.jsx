import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import useAgentStore from '../../store/useAgentStore';
import { Plus, Swords, Calendar, Edit, Trash2 } from 'lucide-react';

export default function AdminContests() {
    const { token } = useAuthStore();
    const { setActivePage, setAdminContext } = useAgentStore();
    const [contests, setContests] = useState([]);

    const fetchContests = () => {
        axios.get("http://127.0.0.1:8000/api/admin/contests", {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => setContests(res.data)).catch(console.error);
    };

    useEffect(() => {
        if (token) fetchContests();
    }, [token]);

    const handleCreate = () => {
        setAdminContext({ mode: 'create', contest: null });
        setActivePage('admin-contest-form');
    };

    const handleEdit = (c) => {
        setAdminContext({ mode: 'edit', contest: c });
        setActivePage('admin-contest-form');
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this contest?")) return;
        try {
            await axios.delete(`http://127.0.0.1:8000/api/admin/contests/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchContests();
        } catch(e) { console.error(e); }
    };

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar text-white">
            <div className="flex justify-between items-center border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                        Contest Management
                    </h1>
                    <p className="text-gray-400 mt-2">Schedule and publish global coding arenas.</p>
                </div>
                <button onClick={handleCreate} className="flex items-center gap-2 px-6 py-3 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 border border-purple-500/30 transition-all font-bold">
                    <Plus className="w-5 h-5" /> Create Contest
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {contests.map(c => (
                    <div key={c.id} onClick={() => handleEdit(c)} className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col hover:border-purple-500/50 transition-colors cursor-pointer">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-pink-500/10 rounded-xl text-pink-400 border border-pink-500/20">
                                <Swords className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.is_published ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    {c.is_published ? 'LIVE' : 'DRAFT'}
                                </span>
                                <div className="flex gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleEdit(c); }} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><Edit className="w-4 h-4" /></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold mb-2">{c.title}</h3>
                        <div className="space-y-2 mt-4 text-sm text-gray-400">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-purple-400" /> Starts: {new Date(c.start_time).toLocaleString()}
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-pink-400" /> Ends: {new Date(c.end_time).toLocaleString()}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
