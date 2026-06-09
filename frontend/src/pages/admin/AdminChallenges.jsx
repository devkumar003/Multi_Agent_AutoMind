import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import useAgentStore from '../../store/useAgentStore';
import { Plus, Edit, Trash2, Code2 } from 'lucide-react';

export default function AdminChallenges() {
    const { token } = useAuthStore();
    const { setActivePage, setAdminContext } = useAgentStore();
    const [challenges, setChallenges] = useState([]);

    const fetchChallenges = () => {
        axios.get(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/challenges`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => setChallenges(res.data)).catch(console.error);
    };

    useEffect(() => {
        if (token) fetchChallenges();
    }, [token]);

    const handleCreate = () => {
        setAdminContext({ mode: 'create', challenge: null });
        setActivePage('admin-challenge-form');
    };

    const handleEdit = (c) => {
        setAdminContext({ mode: 'edit', challenge: c });
        setActivePage('admin-challenge-form');
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this challenge?")) return;
        try {
            await axios.delete(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/challenges/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchChallenges();
        } catch(e) { console.error(e); }
    };

    return (
        <div className="p-8 space-y-8 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar text-white">
            <div className="flex justify-between items-center border-b border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
                        Challenge Management
                    </h1>
                    <p className="text-gray-400 mt-2">Create and edit algorithmic problems.</p>
                </div>
                <button onClick={handleCreate} className="flex items-center gap-2 px-6 py-3 bg-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/30 border border-blue-500/30 transition-all font-bold">
                    <Plus className="w-5 h-5" /> Create Challenge
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {challenges.map(c => (
                    <div key={c.id} className="bg-black/40 border border-white/10 rounded-2xl p-6 backdrop-blur-md flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400 border border-cyan-500/20">
                                <Code2 className="w-6 h-6" />
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleEdit(c)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"><Edit className="w-4 h-4" /></button>
                                <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                        <h3 className="text-xl font-bold mb-2">{c.title}</h3>
                        <div className="flex gap-2 mb-4 text-xs font-semibold">
                            <span className={`px-2 py-1 rounded border ${c.difficulty === 'Easy' ? 'bg-green-500/10 border-green-500/20 text-green-400' : c.difficulty === 'Medium' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                {c.difficulty}
                            </span>
                            <span className="px-2 py-1 rounded bg-purple-500/10 border border-purple-500/20 text-purple-400">
                                {c.xp_reward} XP
                            </span>
                        </div>
                        <div className="mt-auto pt-4 border-t border-white/10 text-xs text-gray-500">
                            ID: {c.id}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
