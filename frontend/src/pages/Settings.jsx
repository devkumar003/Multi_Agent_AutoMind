import React, { useState, useEffect } from 'react';
import { Save, Server, HardDrive, RefreshCw, Activity, CheckCircle, XCircle } from 'lucide-react';
import axios from 'axios';

const Settings = () => {
    const [useSimulation, setUseSimulation] = useState(
        localStorage.getItem('autothink_simulation') === 'true'
    );
    const [status, setStatus] = useState(null);
    const [isClearing, setIsClearing] = useState(false);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const res = await axios.get("http://127.0.0.1:8000/api/system/status");
                setStatus(res.data);
            } catch (err) {
                setStatus({ status: 'offline', message: 'Backend unreachable.' });
            }
        };
        fetchStatus();
    }, []);

    const handleSave = () => {
        localStorage.setItem('autothink_simulation', useSimulation);
        alert("Settings saved successfully.");
    };

    const handleClearCache = async () => {
        if (!window.confirm("Are you sure you want to clear all uploaded CSVs and temporary data?")) return;
        setIsClearing(true);
        try {
            const res = await axios.post("http://127.0.0.1:8000/api/settings/clear-cache");
            if (res.data.success) {
                alert(`Successfully deleted ${res.data.files_deleted} temporary files.`);
            }
        } catch (err) {
            alert("Failed to clear cache.");
        } finally {
            setIsClearing(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto w-full max-w-4xl mx-auto z-10 text-white">
            <header className="mb-8">
                <h2 className="text-4xl font-bold mb-3 tracking-wide">System Settings</h2>
                <p className="text-gray-400 text-lg">Configure your multi-agent LLM orchestration and application preferences.</p>
            </header>

            <div className="space-y-6">
                {/* Local Environment Status */}
                <div className="glass-panel p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Server className="text-primary" />
                        <h3 className="text-xl font-semibold">Local Environment Status</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-black/40 border border-white/10 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-gray-400">Ollama Core Service</span>
                                {status ? (
                                    status.status === 'online' ? 
                                    <span className="flex items-center gap-1.5 text-emerald-400 font-medium text-sm"><CheckCircle size={16}/> Online</span> :
                                    <span className="flex items-center gap-1.5 text-red-400 font-medium text-sm"><XCircle size={16}/> Offline</span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-gray-500 font-medium text-sm"><Activity size={16} className="animate-pulse"/> Pinging...</span>
                                )}
                            </div>
                            
                            {status && status.status === 'online' && (
                                <div className="space-y-3 pt-3 border-t border-white/10">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Llama3 (Reasoning)</span>
                                        <span className={status.has_llama3 ? "text-emerald-500" : "text-red-500"}>{status.has_llama3 ? "Installed" : "Missing"}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Mistral (Critic)</span>
                                        <span className={status.has_mistral ? "text-emerald-500" : "text-red-500"}>{status.has_mistral ? "Installed" : "Missing"}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-gray-500">Qwen2.5-Coder (Data Engine)</span>
                                        <span className={status.has_qwen ? "text-emerald-500" : "text-red-500"}>{status.has_qwen ? "Installed" : "Missing"}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                            <div>
                                <h4 className="font-medium text-white">Simulation Mode</h4>
                                <p className="text-sm text-gray-400">Mock responses consistently for UI testing instead of running local LLM inference.</p>
                            </div>
                            <button
                                onClick={() => setUseSimulation(!useSimulation)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${useSimulation ? 'bg-primary' : 'bg-gray-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useSimulation ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Local Storage */}
                <div className="glass-panel p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <HardDrive className="text-accent" />
                        <h3 className="text-xl font-semibold">Data Management</h3>
                    </div>
                    <p className="text-gray-400 text-sm mb-4">Clear uploaded CSV datasets and temporary generation files from your local hard drive.</p>
                    <button 
                        onClick={handleClearCache}
                        disabled={isClearing}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isClearing ? "animate-spin" : ""} /> 
                        {isClearing ? "Clearing..." : "Clear Temporary Files"}
                    </button>
                </div>

            </div>

            <div className="mt-8 flex justify-end">
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] rounded-xl font-medium transition">
                    <Save size={18} /> Save Settings
                </button>
            </div>
        </div>
    );
};

export default Settings;
