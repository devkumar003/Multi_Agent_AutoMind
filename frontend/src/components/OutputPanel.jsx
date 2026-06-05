import React, { useState } from 'react';
import { Code, FileText, Zap, Copy, Download, Check } from 'lucide-react';
import { motion } from 'framer-motion';

const OutputPanel = ({ result }) => {
    const [activeTab, setActiveTab] = useState('explanation');
    const [copied, setCopied] = useState(false);

    if (!result) return null;

    const handleCopy = () => {
        let contentToCopy = '';
        if (activeTab === 'explanation') contentToCopy = result.explanation;
        if (activeTab === 'code') contentToCopy = result.code;
        if (activeTab === 'optimization') contentToCopy = result.optimization;

        navigator.clipboard.writeText(contentToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([result.code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'solution.py';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full overflow-hidden flex flex-col bg-[#0B1020]/60 backdrop-blur-xl border border-white/5 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        >
            {/* Tabs Menu */}
            <div className="flex bg-black/40 border-b border-white/5 p-2 gap-2">
                <button
                    onClick={() => setActiveTab('explanation')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'explanation' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                >
                    <FileText size={16} /> Explanation
                </button>
                <button
                    onClick={() => setActiveTab('code')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'code' ? 'bg-[#00D9FF]/20 text-[#00D9FF]' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                >
                    <Code size={16} /> Solution Code
                </button>
                <button
                    onClick={() => setActiveTab('optimization')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'optimization' ? 'bg-[#8B5CF6]/20 text-[#8B5CF6]' : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'}`}
                >
                    <Zap size={16} /> Optimization
                </button>

                <div className="flex-1" />

                <button onClick={handleCopy} className="p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-white/10" title="Copy text">
                    {copied ? <Check size={18} className="text-[#00FFA3]" /> : <Copy size={18} />}
                </button>
                {activeTab === 'code' && (
                    <button onClick={handleDownload} className="p-2 text-gray-400 hover:text-white transition rounded-lg hover:bg-white/10" title="Download Code">
                        <Download size={18} />
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="p-6 bg-black/20 min-h-[180px]">
                {activeTab === 'explanation' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-200 space-y-4">
                        <p className="leading-relaxed font-sans whitespace-pre-wrap">{result.explanation || result.general_res || "No explanation available."}</p>
                    </motion.div>
                )}

                {activeTab === 'code' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                        <pre className="text-sm font-mono text-gray-200 overflow-x-auto p-4 bg-black/60 rounded-xl border border-white/5 h-full">
                            <code className="text-[#00D9FF]">{result.code || "No code generated."}</code>
                        </pre>
                    </motion.div>
                )}

                {activeTab === 'optimization' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-gray-200 leading-relaxed font-sans">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-[#F59E0B]/20 rounded-xl text-[#F59E0B] ring-1 ring-[#F59E0B]/50">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-[#F59E0B]">Performance Tuned</h3>
                                <p className="text-sm text-gray-400">Post-generation heuristics applied</p>
                            </div>
                        </div>
                        <div className="p-4 bg-white/5 rounded-xl border border-white/10 border-l-4 border-l-[#F59E0B] whitespace-pre-wrap">
                            {result.optimization || "No optimizations applied."}
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default OutputPanel;
