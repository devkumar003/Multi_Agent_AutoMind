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
                const res = await axios.get(`${import.meta.env.VITE_LOCAL_API_URL}/api/system/status`);
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
            const res = await axios.post(`${import.meta.env.VITE_LOCAL_API_URL}/api/settings/clear-cache`);
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
        <div className="h-full flex flex-col p-8 overflow-y-auto w-full max-w-4xl mx-auto z-10 text-text-primary">
            <header className="mb-8">
                <h2 className="text-4xl font-bold mb-3 tracking-wide text-text-primary">System Settings</h2>
                <p className="text-text-secondary text-lg">Configure your multi-agent LLM orchestration and application preferences.</p>
            </header>

            <div className="space-y-6">
                {/* Local Environment Status */}
                <div className="glass-panel !rounded-3xl p-6 border border-border-light">
                    <div className="flex items-center gap-3 mb-4">
                        <Server className="text-accent-primary" />
                        <h3 className="text-xl font-semibold">Local Environment Status</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-panel border border-border-light rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-text-secondary">Ollama Core Service</span>
                                {status ? (
                                    status.status === 'online' ? 
                                    <span className="flex items-center gap-1.5 text-accent-success font-medium text-sm"><CheckCircle size={16}/> Online</span> :
                                    <span className="flex items-center gap-1.5 text-accent-danger font-medium text-sm"><XCircle size={16}/> Offline</span>
                                ) : (
                                    <span className="flex items-center gap-1.5 text-text-muted font-medium text-sm"><Activity size={16} className="animate-pulse"/> Pinging...</span>
                                )}
                            </div>
                            
                            {status && status.status === 'online' && (
                                <div className="space-y-3 pt-3 border-t border-border-light">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-text-secondary">Llama3 (Reasoning)</span>
                                        <span className={status.has_llama3 ? "text-accent-success" : "text-accent-danger"}>{status.has_llama3 ? "Installed" : "Missing"}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-text-secondary">Mistral (Critic)</span>
                                        <span className={status.has_mistral ? "text-accent-success" : "text-accent-danger"}>{status.has_mistral ? "Installed" : "Missing"}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-text-secondary">Qwen2.5-Coder (Data Engine)</span>
                                        <span className={status.has_qwen ? "text-accent-success" : "text-accent-danger"}>{status.has_qwen ? "Installed" : "Missing"}</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center justify-between p-4 bg-panel rounded-xl border border-border-light">
                            <div>
                                <h4 className="font-medium text-text-primary">Simulation Mode</h4>
                                <p className="text-sm text-text-muted">Mock responses consistently for UI testing instead of running local LLM inference.</p>
                            </div>
                            <button
                                onClick={() => setUseSimulation(!useSimulation)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors border-none ${useSimulation ? 'bg-accent-primary' : 'bg-gray-600'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${useSimulation ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Local Storage */}
                <div className="glass-panel !rounded-3xl p-6 border border-border-light">
                    <div className="flex items-center gap-3 mb-4">
                        <HardDrive className="text-accent-secondary" />
                        <h3 className="text-xl font-semibold">Data Management</h3>
                    </div>
                    <p className="text-text-secondary text-sm mb-4">Clear uploaded CSV datasets and temporary generation files from your local hard drive.</p>
                    <button 
                        onClick={handleClearCache}
                        disabled={isClearing}
                        className="flex items-center gap-2 px-4 py-2 bg-accent-danger/10 hover:bg-accent-danger/20 text-accent-danger rounded-lg border border-accent-danger/20 transition disabled:opacity-50"
                    >
                        <RefreshCw size={16} className={isClearing ? "animate-spin" : ""} /> 
                        {isClearing ? "Clearing..." : "Clear Temporary Files"}
                    </button>
                </div>

            </div>

            <div className="mt-8 flex justify-end">
                <button onClick={handleSave} className="flex items-center gap-2 px-6 py-3 bg-accent-primary hover:brightness-110 text-white shadow-[0_0_15px_rgba(0,217,255,0.3)] rounded-xl font-medium transition border-none">
                    <Save size={18} /> Save Settings
                </button>
            </div>
        </div>
    );
};

export default Settings;
