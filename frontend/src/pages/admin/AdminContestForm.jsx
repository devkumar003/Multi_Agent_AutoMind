import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import useAgentStore from '../../store/useAgentStore';
import { Save, ArrowLeft, Plus, Trash2 } from 'lucide-react';

export default function AdminContestForm() {
    const { token } = useAuthStore();
    const { adminContext, setActivePage } = useAgentStore();
    const mode = adminContext?.mode || 'create';
    const initialData = adminContext?.contest || {};

    const formatToLocalHTML5 = (isoString) => {
        if (!isoString) return "";
        const d = new Date(isoString);
        d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
        return d.toISOString().slice(0, 16);
    };

    const [form, setForm] = useState({
        id: initialData.id || '',
        title: initialData.title || '',
        description: initialData.description || '',
        start_time: formatToLocalHTML5(initialData.start_time) || formatToLocalHTML5(new Date().toISOString()),
        end_time: formatToLocalHTML5(initialData.end_time) || formatToLocalHTML5(new Date(Date.now() + 86400000).toISOString()),
        is_published: initialData.is_published !== undefined ? initialData.is_published : 0
    });

    const [contestChallenges, setContestChallenges] = useState([]);
    const [allChallenges, setAllChallenges] = useState([]);
    const [selectedChallenge, setSelectedChallenge] = useState('');

    useEffect(() => {
        if (mode === 'edit' && form.id) {
            fetchContestChallenges();
        }
        fetchAllChallenges();
    }, [mode, form.id, token]);

    const fetchContestChallenges = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/contests/${form.id}/challenges`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setContestChallenges(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchAllChallenges = async () => {
        try {
            const res = await axios.get(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/challenges`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllChallenges(res.data);
        } catch (e) { console.error(e); }
    };

    const handleSave = async () => {
        try {
            const payload = {
                ...form,
                start_time: new Date(form.start_time).toISOString(),
                end_time: new Date(form.end_time).toISOString()
            };
            
            if (mode === 'create') {
                await axios.post(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/contests`, payload, { headers: { Authorization: `Bearer ${token}` }});
            } else {
                await axios.put(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/contests/${form.id}`, payload, { headers: { Authorization: `Bearer ${token}` }});
            }
            setActivePage('admin-contests');
        } catch (e) {
            alert("Error saving contest: " + (e.response?.data?.detail || e.message));
        }
    };

    const handleAddChallenge = async () => {
        if (!selectedChallenge) return;
        try {
            await axios.post(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/contests/${form.id}/challenges`, { challenge_id: selectedChallenge }, { headers: { Authorization: `Bearer ${token}` }});
            setSelectedChallenge('');
            fetchContestChallenges();
        } catch (e) { console.error(e); }
    };

    const handleRemoveChallenge = async (challengeId) => {
        try {
            await axios.delete(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/contests/${form.id}/challenges/${challengeId}`, { headers: { Authorization: `Bearer ${token}` }});
            fetchContestChallenges();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto h-full overflow-y-auto custom-scrollbar text-white pb-32">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <button onClick={() => setActivePage('admin-contests')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <h1 className="text-2xl font-bold">{mode === 'create' ? 'Create New Contest' : 'Edit Contest'}</h1>
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-purple-500 hover:bg-purple-600 rounded-xl font-bold transition-colors">
                    <Save className="w-4 h-4" /> Save
                </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4 col-span-2 md:col-span-1">
                    <div><label className="text-xs text-gray-400">Contest ID (URL-friendly)</label><input disabled={mode==='edit'} value={form.id} onChange={e => setForm({...form, id: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-purple-500" placeholder="e.g. weekly-contest-1" /></div>
                    <div><label className="text-xs text-gray-400">Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-purple-500" /></div>
                </div>
                
                <div className="space-y-4 col-span-2 md:col-span-1">
                    <div><label className="text-xs text-gray-400">Start Time (Local)</label><input type="datetime-local" value={form.start_time} onChange={e => setForm({...form, start_time: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-purple-500" /></div>
                    <div><label className="text-xs text-gray-400">End Time (Local)</label><input type="datetime-local" value={form.end_time} onChange={e => setForm({...form, end_time: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-purple-500" /></div>
                </div>
                
                <div className="space-y-4 col-span-2">
                    <div><label className="text-xs text-gray-400">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-purple-500" /></div>
                </div>

                <div className="space-y-4 col-span-2">
                    <div>
                        <label className="text-xs text-gray-400 flex items-center gap-2">
                            <input type="checkbox" checked={form.is_published === 1} onChange={e => setForm({...form, is_published: e.target.checked ? 1 : 0})} />
                            Publish this contest
                        </label>
                    </div>
                </div>
            </div>

            {mode === 'edit' && (
                <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Assigned Challenges</h2>
                        <div className="flex gap-3">
                            <select value={selectedChallenge} onChange={e => setSelectedChallenge(e.target.value)} className="bg-black/40 border border-white/10 rounded-xl p-2 text-sm outline-none focus:border-purple-500">
                                <option value="">-- Select a challenge --</option>
                                {allChallenges.filter(c => !contestChallenges.some(cc => cc.id === c.id)).map(c => (
                                    <option key={c.id} value={c.id}>{c.title}</option>
                                ))}
                            </select>
                            <button onClick={handleAddChallenge} disabled={!selectedChallenge} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm disabled:opacity-50">
                                <Plus className="w-4 h-4" /> Assign
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {contestChallenges.map((c) => (
                            <div key={c.id} className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                                <div>
                                    <h4 className="font-bold">{c.title}</h4>
                                    <p className="text-xs text-gray-400">ID: {c.id} | Difficulty: {c.difficulty} | XP: {c.xp_reward}</p>
                                </div>
                                <button onClick={() => handleRemoveChallenge(c.id)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        ))}
                        {contestChallenges.length === 0 && <p className="text-gray-500 text-center py-8">No challenges assigned yet.</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
