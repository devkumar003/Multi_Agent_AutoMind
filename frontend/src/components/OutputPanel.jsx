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
            className="w-full overflow-hidden flex flex-col bg-panel/60 backdrop-blur-xl border border-border-light rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
        >
            {/* Tabs Menu */}
            <div className="flex bg-panel border-b border-border-light p-2 gap-2">
                <button
                    onClick={() => setActiveTab('explanation')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition border-none ${activeTab === 'explanation' ? 'bg-border-light text-text-primary' : 'bg-transparent text-text-muted hover:text-text-primary hover:bg-panel-hover'}`}
                >
                    <FileText size={16} /> Explanation
                </button>
                <button
                    onClick={() => setActiveTab('code')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition border-none ${activeTab === 'code' ? 'bg-accent-secondary/20 text-accent-secondary' : 'bg-transparent text-text-muted hover:text-text-primary hover:bg-panel-hover'}`}
                >
                    <Code size={16} /> Solution Code
                </button>
                <button
                    onClick={() => setActiveTab('optimization')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition border-none ${activeTab === 'optimization' ? 'bg-accent-primary/20 text-accent-primary' : 'bg-transparent text-text-muted hover:text-text-primary hover:bg-panel-hover'}`}
                >
                    <Zap size={16} /> Optimization
                </button>

                <div className="flex-1" />

                <button onClick={handleCopy} className="p-2 text-text-muted hover:text-text-primary transition rounded-lg hover:bg-panel-hover border-none bg-transparent" title="Copy text">
                    {copied ? <Check size={18} className="text-accent-success" /> : <Copy size={18} />}
                </button>
                {activeTab === 'code' && (
                    <button onClick={handleDownload} className="p-2 text-text-muted hover:text-text-primary transition rounded-lg hover:bg-panel-hover border-none bg-transparent" title="Download Code">
                        <Download size={18} />
                    </button>
                )}
            </div>

            {/* Content Area */}
            <div className="p-6 bg-bg-base min-h-[180px]">
                {activeTab === 'explanation' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-text-primary space-y-4">
                        <p className="leading-relaxed font-sans whitespace-pre-wrap">{result.explanation || result.general_res || "No explanation available."}</p>
                    </motion.div>
                )}

                {activeTab === 'code' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
                        <pre className="text-sm font-mono text-text-primary overflow-x-auto p-4 bg-panel rounded-xl border border-border-light h-full">
                            <code className="text-accent-secondary">{result.code || "No code generated."}</code>
                        </pre>
                    </motion.div>
                )}

                {activeTab === 'optimization' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-text-primary leading-relaxed font-sans">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-accent-warning/20 rounded-xl text-accent-warning ring-1 ring-accent-warning/50">
                                <Zap size={24} />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg text-accent-warning">Performance Tuned</h3>
                                <p className="text-sm text-text-secondary">Post-generation heuristics applied</p>
                            </div>
                        </div>
                        <div className="p-4 bg-panel rounded-xl border border-border-light border-l-4 border-l-accent-warning whitespace-pre-wrap">
                            {result.optimization || "No optimizations applied."}
                        </div>
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
};

export default OutputPanel;
