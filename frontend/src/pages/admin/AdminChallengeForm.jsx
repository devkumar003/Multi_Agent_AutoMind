import React, { useState, useEffect } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import useAgentStore from '../../store/useAgentStore';
import { Save, ArrowLeft, BrainCircuit, Trash2, Plus, Eye, EyeOff } from 'lucide-react';

export default function AdminChallengeForm() {
    const { token } = useAuthStore();
    const { adminContext, setActivePage } = useAgentStore();
    const mode = adminContext?.mode || 'create';
    const initialData = adminContext?.challenge || {};

    const [form, setForm] = useState({
        id: initialData.id || '',
        title: initialData.title || '',
        description: initialData.description || '',
        constraints: initialData.constraints || '',
        input_format: initialData.input_format || '',
        output_format: initialData.output_format || '',
        difficulty: initialData.difficulty || 'Easy',
        time_estimate_mins: initialData.time_estimate_mins || 30,
        memory_limit_mb: initialData.memory_limit_mb || 256,
        tags: initialData.tags || '',
        xp_reward: initialData.xp_reward || 100,
        template_code: initialData.template_code || 'def solution():\n    pass',
        is_published: initialData.is_published !== undefined ? initialData.is_published : 1
    });

    const [testCases, setTestCases] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (mode === 'edit' && form.id) {
            axios.get(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/challenges/${form.id}/testcases`, {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => setTestCases(res.data)).catch(console.error);
        }
    }, [mode, form.id, token]);

    const handleSave = async () => {
        try {
            if (mode === 'create') {
                await axios.post(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/challenges`, form, { headers: { Authorization: `Bearer ${token}` }});
            } else {
                await axios.put(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/challenges/${form.id}`, form, { headers: { Authorization: `Bearer ${token}` }});
            }
            setActivePage('admin-challenges');
        } catch (e) {
            alert("Error saving challenge: " + e.response?.data?.detail || e.message);
        }
    };

    const handleGenerateAI = async () => {
        if (mode === 'create') {
            alert("Please save the challenge first before generating test cases.");
            return;
        }
        setIsGenerating(true);
        try {
            const res = await axios.post(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/challenges/${form.id}/testcases/generate`, {}, { headers: { Authorization: `Bearer ${token}` }});
            if (res.data.success) {
                // Bulk add generated test cases
                for (const tc of res.data.preview_cases) {
                    await axios.post(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/challenges/${form.id}/testcases`, tc, { headers: { Authorization: `Bearer ${token}` }});
                }
                // Refresh test cases
                const refresh = await axios.get(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/challenges/${form.id}/testcases`, { headers: { Authorization: `Bearer ${token}` }});
                setTestCases(refresh.data);
            }
        } catch (e) {
            alert("AI Generation failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleAddManualTC = async () => {
        const input_data = prompt("Enter input data:");
        if (!input_data) return;
        const expected_output = prompt("Enter expected output:");
        if (!expected_output) return;
        
        await axios.post(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/challenges/${form.id}/testcases`, {
            input_data, expected_output, is_hidden: 0, weight: 10
        }, { headers: { Authorization: `Bearer ${token}` }});
        
        const refresh = await axios.get(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/challenges/${form.id}/testcases`, { headers: { Authorization: `Bearer ${token}` }});
        setTestCases(refresh.data);
    };

    const handleDeleteTC = async (tcId) => {
        await axios.delete(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/testcases/${tcId}`, { headers: { Authorization: `Bearer ${token}` }});
        setTestCases(testCases.filter(t => t.id !== tcId));
    };

    return (
        <div className="p-8 space-y-8 max-w-5xl mx-auto h-full overflow-y-auto custom-scrollbar text-white pb-32">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <button onClick={() => setActivePage('admin-challenges')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" /> Back
                </button>
                <h1 className="text-2xl font-bold">{mode === 'create' ? 'Create New Challenge' : 'Edit Challenge'}</h1>
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl font-bold transition-colors">
                    <Save className="w-4 h-4" /> Save
                </button>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4 col-span-2 md:col-span-1">
                    <div><label className="text-xs text-gray-400">Challenge ID</label><input disabled={mode==='edit'} value={form.id} onChange={e => setForm({...form, id: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500" placeholder="e.g. valid-anagram" /></div>
                    <div><label className="text-xs text-gray-400">Title</label><input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500" /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs text-gray-400">Difficulty</label><select value={form.difficulty} onChange={e => setForm({...form, difficulty: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500"><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
                        <div><label className="text-xs text-gray-400">XP Reward</label><input type="number" value={form.xp_reward} onChange={e => setForm({...form, xp_reward: parseInt(e.target.value)})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500" /></div>
                    </div>
                </div>
                
                <div className="space-y-4 col-span-2 md:col-span-1">
                    <div><label className="text-xs text-gray-400">Description</label><textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500" /></div>
                    <div><label className="text-xs text-gray-400">Tags (comma separated)</label><input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 outline-none focus:border-blue-500" /></div>
                </div>

                <div className="space-y-4 col-span-2">
                    <label className="text-xs text-gray-400">Template Code</label>
                    <textarea value={form.template_code} onChange={e => setForm({...form, template_code: e.target.value})} className="w-full h-48 bg-[#0a0a0f] border border-white/10 rounded-xl p-4 font-mono text-sm text-blue-400 outline-none focus:border-blue-500" />
                </div>
            </div>

            {mode === 'edit' && (
                <div className="mt-12 pt-8 border-t border-white/10">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Test Cases</h2>
                        <div className="flex gap-3">
                            <button onClick={handleAddManualTC} className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm">
                                <Plus className="w-4 h-4" /> Add Manual
                            </button>
                            <button onClick={handleGenerateAI} disabled={isGenerating} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-xl font-bold hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all text-sm disabled:opacity-50">
                                <BrainCircuit className={`w-4 h-4 ${isGenerating ? 'animate-pulse' : ''}`} /> {isGenerating ? 'Generating...' : 'Generate AI Edge Cases'}
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {testCases.map((tc, i) => (
                            <div key={tc.id} className="bg-black/40 border border-white/10 rounded-xl p-4 flex items-start gap-4">
                                <div className="flex-1 grid grid-cols-2 gap-4">
                                    <div><p className="text-xs text-gray-500 mb-1">Input</p><pre className="bg-black p-2 rounded text-xs text-gray-300 font-mono overflow-x-auto">{tc.input_data}</pre></div>
                                    <div><p className="text-xs text-gray-500 mb-1">Expected Output</p><pre className="bg-black p-2 rounded text-xs text-green-400 font-mono overflow-x-auto">{tc.expected_output}</pre></div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {tc.is_hidden === 1 ? <span className="flex items-center gap-1 text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded"><EyeOff className="w-3 h-3"/> Hidden</span> : <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded"><Eye className="w-3 h-3"/> Public</span>}
                                    <button onClick={() => handleDeleteTC(tc.id)} className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                        {testCases.length === 0 && <p className="text-gray-500 text-center py-8">No test cases found. Generate some with AI!</p>}
                    </div>
                </div>
            )}
        </div>
    );
}
