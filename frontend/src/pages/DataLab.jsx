import React, { useState } from 'react';
import { UploadCloud, Wand2, Download, Zap, Plus, Settings2, Sparkles, PieChart as PieChartIcon } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import axios from 'axios';
import useAuthStore from '../store/useAuthStore';

const renderMarkdown = (text) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        return (
            <div key={idx} className="mb-1 leading-relaxed">
                {parts.map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                        return <strong key={i} className="font-bold text-accent-secondary">{part.slice(2, -2)}</strong>;
                    }
                    return <span key={i}>{part}</span>;
                })}
            </div>
        );
    });
};

const DataLab = () => {
    const { token } = useAuthStore();
    const [columns, setColumns] = useState([]);
    const [data, setData] = useState([]);
    const [integrity, setIntegrity] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCleaning, setIsCleaning] = useState(false);
    const [fileId, setFileId] = useState(null);
    const [query, setQuery] = useState('');
    const [isQuerying, setIsQuerying] = useState(false);
    const [queryResult, setQueryResult] = useState(null);
    const [cleanSummary, setCleanSummary] = useState(null);
    const [isVisualizing, setIsVisualizing] = useState(false);
    const [charts, setCharts] = useState([]);
    
    // Phase 2: OS AI Overhaul State
    const [activeTab, setActiveTab] = useState('preview'); // preview, insights, sql, visual, logs
    const [streamText, setStreamText] = useState('');
    const [agentLogs, setAgentLogs] = useState([]);
    const [confidence, setConfidence] = useState(null);
    const [processingTime, setProcessingTime] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // AI Streaming Simulation Helper
    const simulateStreaming = (messages, onComplete) => {
        let i = 0;
        setStreamText('');
        const interval = setInterval(() => {
            if (i < messages.length) {
                setStreamText(messages[i]);
                i++;
            } else {
                clearInterval(interval);
                onComplete();
            }
        }, 800);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);

        try {
            const headers = token ? { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" } : {};
            const res = await axios.post(`${import.meta.env.VITE_LOCAL_API_URL}/api/data/upload`, formData, { headers });
            if(res.data.error) {
                alert(res.data.error);
            } else {
                setFileId(res.data.file_id);
                setColumns(res.data.columns);
                setData(res.data.data);
                setIntegrity(res.data.integrity);
            }
        } catch(err) {
            alert("Error uploading dataset. Please verify you are logged in.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleCleanData = async () => {
        if (!fileId) {
            alert("Please upload a CSV file first to clean it.");
            return;
        }
        setIsCleaning(true);
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.post(`${import.meta.env.VITE_LOCAL_API_URL}/api/data/clean`, { file_id: fileId }, { headers });
            if(res.data.error) {
                alert(res.data.error);
            } else {
                setColumns(res.data.columns);
                setData(res.data.data);
                setIntegrity(res.data.integrity);
                if (res.data.summary) {
                    setCleanSummary(res.data.summary);
                }
            }
        } catch(err) {
            alert("Error connecting to backend for cleaning.");
        } finally {
            setIsCleaning(false);
        }
    };

    const handleExportCSV = () => {
        if (!fileId) {
            alert("Please upload a CSV file first.");
            return;
        }
        window.open(`${import.meta.env.VITE_LOCAL_API_URL}/api/data/export/${fileId}`, '_blank');
    };

    const handleVisualize = async (queryText = query) => {
        if (!fileId) return;
        setIsVisualizing(true);
        setCharts([]);
        setQueryResult(null);
        try {
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            const res = await axios.post(`${import.meta.env.VITE_LOCAL_API_URL}/api/data/visualize`, { file_id: fileId, query: queryText }, { headers });
            if (res.data.error) {
                setQueryResult(`Backend Error: ${res.data.error}`);
            } else {
                setCharts(res.data.charts || []);
            }
        } catch (err) {
            setQueryResult("Failed to connect to backend for visualization.");
        } finally {
            setIsVisualizing(false);
        }
    };

    const renderCharts = () => {
        if (!charts || charts.length === 0) return null;
        
        return (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {charts.map((chart, idx) => {
                    const spec = chart.spec;
                    const cData = chart.data;
                    const type = spec.chart_type?.toLowerCase() || 'bar';
                    
                    return (
                        <div key={idx} className="p-6 bg-panel border border-border-light rounded-xl h-[450px] flex flex-col shadow-lg transition-all hover:border-accent-secondary/50">
                            <h3 className="text-center text-text-primary font-bold tracking-wide text-lg">{spec.title}</h3>
                            {spec.insight && (
                                <p className="text-center text-xs text-text-muted mt-2 mb-6 italic px-4 leading-relaxed">"{spec.insight}"</p>
                            )}
                            <div className="flex-1 min-h-0 relative">
                                <ResponsiveContainer width="100%" height="100%">
                                    {(() => {
                                        if (type === 'bar') return (
                                            <BarChart data={cData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-medium)" />
                                                <XAxis dataKey={spec.x} stroke="var(--text-muted)" tick={{fontSize: 11}} />
                                                <YAxis stroke="var(--text-muted)" tick={{fontSize: 11}} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0a0a0f', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '8px' }} itemStyle={{ color: '#ffffff' }} />
                                                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                                                <Bar dataKey={spec.y} fill="var(--accent-secondary)" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        );
                                        if (type === 'line') return (
                                            <LineChart data={cData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-medium)" />
                                                <XAxis dataKey={spec.x} stroke="var(--text-muted)" tick={{fontSize: 11}} />
                                                <YAxis stroke="var(--text-muted)" tick={{fontSize: 11}} />
                                                <Tooltip contentStyle={{ backgroundColor: '#0a0a0f', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '8px' }} itemStyle={{ color: '#ffffff' }} />
                                                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }} />
                                                <Line type="monotone" dataKey={spec.y} stroke="var(--accent-primary)" strokeWidth={3} dot={{ fill: 'var(--accent-primary)', r: 3 }} activeDot={{ r: 5 }} />
                                            </LineChart>
                                        );
                                        if (type === 'pie') return (
                                            <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                                <Tooltip contentStyle={{ backgroundColor: '#0a0a0f', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '8px' }} itemStyle={{ color: '#ffffff' }} />
                                                <Pie data={cData} dataKey={spec.y} nameKey={spec.x} cx="50%" cy="50%" outerRadius={110} fill="var(--accent-success)" label={{fontSize: 11, fill: 'var(--text-muted)'}} />
                                            </PieChart>
                                        );
                                        if (type === 'scatter') return (
                                            <ScatterChart margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-medium)" />
                                                <XAxis dataKey={spec.x} type="category" name={spec.x} stroke="var(--text-muted)" tick={{fontSize: 11}} />
                                                <YAxis dataKey={spec.y} type="number" name={spec.y} stroke="var(--text-muted)" tick={{fontSize: 11}} />
                                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#0a0a0f', borderColor: 'rgba(255,255,255,0.1)', color: '#ffffff', borderRadius: '8px' }} itemStyle={{ color: '#ffffff' }} />
                                                <Scatter name={spec.title} data={cData} fill="var(--accent-warning)" />
                                            </ScatterChart>
                                        );
                                        return <div className="text-text-muted h-full flex items-center justify-center">Unsupported chart type</div>;
                                    })()}
                                </ResponsiveContainer>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="h-full w-full p-8 overflow-y-auto bg-bg-base">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <div className="text-accent-primary">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary leading-tight">Data Lab</h1>
                        <p className="text-text-secondary text-sm">Interact, clean, and strictly query your datasets directly in the browser.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                    <label className="whitespace-nowrap bg-panel border border-border-light hover:border-accent-secondary/50 text-text-primary font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-sm shadow-sm cursor-pointer">
                        <UploadCloud size={16}/> {isUploading ? 'Uploading...' : 'Upload CSV/Excel'}
                        <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <button onClick={handleCleanData} className="whitespace-nowrap bg-gradient-to-r from-accent-secondary to-accent-primary text-white font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all hover:scale-105 shadow-lg border-none text-sm">
                        <Wand2 size={16}/> {isCleaning ? 'Cleaning...' : 'Clean Data'}
                    </button>
                    <button onClick={() => { setActiveTab('insights'); handleVisualize(""); }} disabled={!fileId || isVisualizing} className={`whitespace-nowrap font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all text-sm shadow-sm border-none ${!fileId ? 'bg-panel border border-border-light text-text-muted' : 'bg-gradient-to-r from-accent-success to-emerald-600 text-white shadow-emerald-500/20 neon-pulse'}`}>
                        <Sparkles size={16}/> {isVisualizing ? 'Generating Insights...' : 'Auto-Insights'}
                    </button>
                    <button onClick={handleExportCSV} className="whitespace-nowrap bg-panel border border-border-light hover:border-border-medium text-text-primary font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 transition-colors text-sm shadow-sm">
                        <Download size={16}/> Export CSV
                    </button>
                </div>
            </div>
            
            {/* Top Dataset Stats Bar */}
            {integrity && (
                <div className="flex flex-wrap items-center gap-4 mb-8">
                    <div className="bg-panel border border-border-light px-4 py-2 rounded-xl flex items-center gap-3 shadow-inner">
                        <span className="text-xs text-text-muted uppercase tracking-widest font-bold">Rows</span>
                        <span className="text-sm text-text-primary font-mono">{integrity.total_rows.toLocaleString()}</span>
                    </div>
                    <div className="bg-panel border border-border-light px-4 py-2 rounded-xl flex items-center gap-3 shadow-inner">
                        <span className="text-xs text-text-muted uppercase tracking-widest font-bold">Columns</span>
                        <span className="text-sm text-text-primary font-mono">{integrity.total_cols}</span>
                    </div>
                    <div className="bg-panel border border-border-light px-4 py-2 rounded-xl flex items-center gap-3 shadow-inner">
                        <span className="text-xs text-text-muted uppercase tracking-widest font-bold">Memory</span>
                        <span className="text-sm text-accent-primary font-mono">{(integrity.total_rows * integrity.total_cols * 8 / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <div className="bg-panel border border-border-light px-4 py-2 rounded-xl flex items-center gap-3 shadow-inner">
                        <span className="text-xs text-text-muted uppercase tracking-widest font-bold">Missing</span>
                        <span className={`text-sm font-mono ${integrity.null_entropy > 0 ? 'text-accent-danger' : 'text-accent-success'}`}>{integrity.null_entropy}%</span>
                    </div>
                </div>
            )}

            <div className="glass-panel !rounded-[2rem] p-5 mb-8 shadow-xl">
                <div className="flex items-center gap-2 text-accent-secondary font-bold text-sm mb-3 px-2 tracking-wide uppercase">
                    <Sparkles size={16} /> Query Data via Qwen2.5-Coder
                </div>
                <div className="relative">
                    <input 
                        type="text" 
                        disabled={!fileId || isQuerying || isVisualizing}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && query.trim() && fileId) {
                                setIsQuerying(true);
                                setCharts([]);
                                setQueryResult(null);
                                setConfidence(null);
                                setProcessingTime(null);
                                
                                const startT = Date.now();
                                
                                setAgentLogs(prev => [...prev, `[Query Router] Routing command: "${query}"`]);
                                
                                simulateStreaming([
                                    "Analyzing dataset relationships...",
                                    "Generating embeddings...",
                                    "Writing optimized Pandas code...",
                                    "Executing safely..."
                                ], async () => {
                                    try {
                                        const headers = token ? { Authorization: `Bearer ${token}` } : {};
                                        const res = await axios.post(`${import.meta.env.VITE_LOCAL_API_URL}/api/data/query`, { file_id: fileId, query: query }, { headers });
                                        const endT = Date.now();
                                        setProcessingTime(((endT - startT) / 1000).toFixed(1));
                                        setConfidence((Math.random() * (99 - 92) + 92).toFixed(1)); // Mock confidence
                                        
                                        if (res.data.error) {
                                            setQueryResult({ output: `Backend Error: ${res.data.error}` });
                                            setAgentLogs(prev => [...prev, `[Execution Agent] Failed: ${res.data.error}`]);
                                        } else {
                                            setQueryResult(res.data);
                                            setAgentLogs(prev => [...prev, `[Execution Agent] Successfully evaluated Pandas code.`]);
                                        }
                                    } catch (err) {
                                        setQueryResult({ output: "Failed to connect to backend for query." });
                                        setAgentLogs(prev => [...prev, `[Network Agent] Connection refused.`]);
                                    } finally {
                                        setIsQuerying(false);
                                        setActiveTab('sql'); // Jump to output
                                    }
                                });
                            }
                        }}
                        placeholder={fileId ? "Ask Qwen2.5 to analyze your data (e.g. 'average salary', 'salary by month'...)" : "Upload a CSV/Excel file first to unlock Qwen2.5 data querying..."} 
                        className={`w-full bg-[#0a0a0f] focus:bg-[#12121a] border border-white/10 rounded-xl py-4 pl-5 pr-32 text-sm text-white placeholder-gray-500 transition-colors shadow-inner focus:outline-none focus:border-accent-secondary ${!fileId ? 'opacity-50 cursor-not-allowed' : ''}`} 
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {isQuerying || isVisualizing ? (
                            <div className="text-accent-secondary text-xs font-bold uppercase tracking-widest streaming-text">
                                {streamText || "Initializing..."}
                            </div>
                        ) : (
                            <button
                                onClick={() => handleVisualize(query)}
                                disabled={!fileId || !query.trim()}
                                className={`p-2 rounded-lg transition-colors border-none ${!fileId || !query.trim() ? 'text-text-muted cursor-not-allowed' : 'bg-accent-secondary/20 hover:bg-accent-secondary/40 text-accent-secondary neon-pulse'}`}
                                title="Visualize Specific Query"
                            >
                                <PieChartIcon size={18} />
                            </button>
                        )}
                    </div>
                </div>
                
                {/* Command Chips */}
                {fileId && !isQuerying && (
                    <div className="flex items-center gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
                        <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold mr-2">Quick Commands:</span>
                        {['/clean nulls', '/chart revenue', '/find anomalies', '/generate summary'].map(cmd => (
                            <button 
                                key={cmd}
                                onClick={() => setQuery(cmd)}
                                className="text-xs bg-bg-base hover:bg-accent-secondary/20 text-text-secondary hover:text-accent-secondary border border-border-light hover:border-accent-secondary/50 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                            >
                                {cmd}
                            </button>
                        ))}
                    </div>
                )}
                
                {/* Simulated AI Stats Header */}
                {(queryResult || charts.length > 0) && !isQuerying && (
                    <div className="flex items-center gap-4 mt-6 border-b border-border-light pb-2 mb-4">
                        <div className="flex items-center gap-2 text-xs text-accent-success font-mono bg-accent-success/10 px-2 py-1 rounded">
                            <span>Confidence: {confidence}%</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-accent-primary font-mono bg-accent-primary/10 px-2 py-1 rounded">
                            <span>Generated in {processingTime}s</span>
                        </div>
                    </div>
                )}
                
                {/* Render Charts (if any) */}
                {renderCharts()}
            </div>

            {cleanSummary && (
                <div className="glass-panel !rounded-[2rem] p-5 mb-8 shadow-xl">
                    <div className="flex items-center gap-2 text-accent-secondary font-bold text-sm mb-3 px-2 tracking-wide uppercase">
                        <Wand2 size={16} /> Data Cleaning Audit Log
                    </div>
                    <div className="p-4 bg-bg-base border border-border-light rounded-xl font-mono text-sm text-accent-success">
                        {renderMarkdown(cleanSummary)}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 min-h-[600px]">
                {/* Left Side: Workspace Dataset */}
                <div className="xl:col-span-3 glass-panel !rounded-3xl flex flex-col shadow-xl overflow-hidden relative">
                    <div className="flex flex-wrap items-center justify-between p-5 border-b border-border-light bg-panel">
                        <div className="flex items-center gap-6">
                            <span className="text-text-primary font-bold tracking-wide">Active Dataset Workspace</span>
                            
                            {fileId && (
                                <div className="flex items-center gap-4 border-l border-border-light pl-6">
                                    <button onClick={() => setActiveTab('preview')} className={`text-sm font-medium transition-colors border-none bg-transparent ${activeTab === 'preview' ? 'text-accent-secondary border-b-2 border-accent-secondary pb-1' : 'text-text-muted hover:text-text-primary'}`}>Data Preview</button>
                                    <button onClick={() => setActiveTab('insights')} className={`text-sm font-medium transition-colors border-none bg-transparent ${activeTab === 'insights' ? 'text-accent-secondary border-b-2 border-accent-secondary pb-1' : 'text-text-muted hover:text-text-primary'}`}>AI Insights</button>
                                    <button onClick={() => setActiveTab('sql')} className={`text-sm font-medium transition-colors border-none bg-transparent ${activeTab === 'sql' ? 'text-accent-secondary border-b-2 border-accent-secondary pb-1' : 'text-text-muted hover:text-text-primary'}`}>SQL Output</button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-bg-base relative custom-scrollbar">
                        {!fileId ? (
                            <div 
                                className={`h-full w-full flex flex-col items-center justify-center p-10 ${isDragging ? 'dropzone-glow border-accent-secondary' : 'border-2 border-dashed border-border-light'}`}
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setIsDragging(false);
                                    if(e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                        handleFileUpload({ target: { files: e.dataTransfer.files }});
                                    }
                                }}
                            >
                                <UploadCloud size={48} className={`mb-4 ${isDragging ? 'text-accent-secondary animate-bounce' : 'text-text-muted'}`} />
                                <h3 className="text-xl font-bold text-text-primary mb-2">Drop your CSV/Excel dataset here</h3>
                                <p className="text-sm text-text-secondary mb-8 max-w-md text-center">To instantly unlock AI-powered insights, anomaly detection, and natural language SQL querying.</p>
                                
                                <div className="grid grid-cols-2 gap-4 w-full max-w-md">
                                    <div className="bg-panel border border-border-light p-4 rounded-xl text-center shadow-sm opacity-60">
                                        <Sparkles size={16} className="text-accent-secondary mx-auto mb-2" />
                                        <span className="text-xs font-medium text-text-secondary">"Analyze sales trends"</span>
                                    </div>
                                    <div className="bg-panel border border-border-light p-4 rounded-xl text-center shadow-sm opacity-60">
                                        <Zap size={16} className="text-accent-warning mx-auto mb-2" />
                                        <span className="text-xs font-medium text-text-secondary">"Find missing values"</span>
                                    </div>
                                </div>
                                
                                <label className="mt-8 bg-accent-secondary hover:brightness-110 text-white font-medium px-6 py-3 rounded-xl cursor-pointer transition-all hover:-translate-y-1 shadow-lg shadow-purple-500/20">
                                    Browse Files
                                    <input type="file" accept=".csv, .xlsx, .xls" className="hidden" onChange={handleFileUpload} />
                                </label>
                            </div>
                        ) : activeTab === 'preview' ? (
                            <table className="w-full text-sm text-left whitespace-nowrap">
                                <thead className="text-[11px] text-text-muted uppercase bg-panel border-b border-border-light sticky top-0 z-10 tracking-widest font-bold">
                                    <tr>
                                        <th className="px-6 py-4">#</th>
                                        {columns.map(col => <th key={col} className="px-6 py-4 truncate max-w-[150px]">{col}</th>)}
                                    </tr>
                                </thead>
                                <tbody className="font-mono text-[13px]">
                                    {data.map((row, i) => (
                                        <tr key={i} className="border-b border-border-light hover:bg-panel-hover transition-colors">
                                            <td className="px-6 py-3.5 text-text-muted select-none">{i+1}</td>
                                            {columns.map(col => (
                                                <td key={col} className="px-6 py-3.5 text-text-secondary truncate max-w-[200px]">{String(row[col])}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : activeTab === 'insights' ? (
                            <div className="h-full flex flex-col items-center justify-center p-8 relative overflow-hidden">
                                <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
                                    <svg width="400" height="400" viewBox="0 0 400 400">
                                        <defs>
                                            <radialGradient id="nodeGlow" cx="50%" cy="50%" r="50%">
                                                <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity="1" />
                                                <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0" />
                                            </radialGradient>
                                        </defs>
                                        <g stroke="var(--accent-secondary)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5">
                                            <line x1="200" y1="200" x2="100" y2="100" className="animate-pulse" />
                                            <line x1="200" y1="200" x2="300" y2="100" className="animate-pulse" style={{animationDelay: '0.2s'}} />
                                            <line x1="200" y1="200" x2="100" y2="300" className="animate-pulse" style={{animationDelay: '0.4s'}} />
                                            <line x1="200" y1="200" x2="300" y2="300" className="animate-pulse" style={{animationDelay: '0.6s'}} />
                                            <line x1="100" y1="100" x2="300" y2="100" className="animate-pulse" style={{animationDelay: '0.8s'}} />
                                            <line x1="100" y1="300" x2="300" y2="300" className="animate-pulse" style={{animationDelay: '1s'}} />
                                        </g>
                                        <circle cx="200" cy="200" r="40" fill="url(#nodeGlow)" />
                                        <circle cx="200" cy="200" r="10" fill="#fff" />
                                        
                                        <circle cx="100" cy="100" r="20" fill="url(#nodeGlow)" />
                                        <circle cx="100" cy="100" r="5" fill="#fff" />
                                        
                                        <circle cx="300" cy="100" r="20" fill="url(#nodeGlow)" />
                                        <circle cx="300" cy="100" r="5" fill="#fff" />
                                        
                                        <circle cx="100" cy="300" r="20" fill="url(#nodeGlow)" />
                                        <circle cx="100" cy="300" r="5" fill="#fff" />
                                        
                                        <circle cx="300" cy="300" r="20" fill="url(#nodeGlow)" />
                                        <circle cx="300" cy="300" r="5" fill="#fff" />
                                    </svg>
                                </div>
                                <div className="z-10 text-center max-w-lg">
                                    <h3 className="text-2xl font-bold text-text-primary mb-4">Neural Data Graph</h3>
                                    <p className="text-text-secondary mb-6 leading-relaxed">Our autonomous agents are mapping your dataset correlations in real-time. Use the <span className="text-accent-secondary font-bold">Auto-Insights</span> button above to generate predictive models and visualizations.</p>
                                </div>
                            </div>
                        ) : activeTab === 'sql' && queryResult ? (
                            <div className="p-8">
                                <h3 className="text-lg font-bold text-text-primary mb-4">Latest Execution Output</h3>
                                {queryResult.output && (
                                    <pre className="text-sm font-mono text-text-secondary whitespace-pre-wrap bg-panel p-6 rounded-xl border border-border-light">{queryResult.output}</pre>
                                )}
                                {queryResult.image_base64 && (
                                    <div className="mt-6 border border-border-light rounded-xl overflow-hidden shadow-lg inline-block">
                                        <img src={`data:image/png;base64,${queryResult.image_base64}`} alt="Generated Plot" className="max-w-full h-auto bg-white" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-text-muted">
                                No output available. Run a query first.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Sidebar: Integrity & Agents */}
                <div className="xl:col-span-1 space-y-6">
                    {/* Grid Integrity */}
                    <div className="glass-panel !rounded-3xl p-6 shadow-xl flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-accent-primary/5 blur-[50px] rounded-full pointer-events-none"></div>
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <h3 className="text-lg font-bold text-text-primary tracking-wide">Grid Integrity</h3>
                            <Settings2 size={16} className="text-text-muted" />
                        </div>

                        {integrity ? (
                            <div className="relative z-10">
                                <div className="space-y-3 mb-6">
                                    <div className="flex items-center justify-between bg-bg-base border border-border-light p-3 rounded-xl">
                                        <span className="text-xs text-text-muted font-medium">Rows</span>
                                        <span className="text-sm text-text-primary font-bold font-mono">{integrity.total_rows}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-bg-base border border-border-light p-3 rounded-xl">
                                        <span className="text-xs text-text-muted font-medium">Columns</span>
                                        <span className="text-sm text-text-primary font-bold font-mono">{integrity.total_cols}</span>
                                    </div>
                                    <div className="flex items-center justify-between bg-accent-success/10 border border-accent-success/20 p-3 rounded-xl">
                                        <span className="text-xs text-accent-success font-medium">Integrity Score</span>
                                        <span className="text-sm text-accent-success font-bold font-mono">{100 - integrity.null_entropy}%</span>
                                    </div>
                                </div>
                                
                                <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">AI Suggestions</h4>
                                <div className="space-y-2">
                                    <button onClick={handleCleanData} className="w-full text-left text-xs bg-bg-base hover:bg-accent-primary/10 border border-border-light hover:border-accent-primary/30 text-text-secondary hover:text-accent-primary p-3 rounded-xl transition-colors">
                                        • Remove duplicate rows
                                    </button>
                                    <button onClick={handleCleanData} className="w-full text-left text-xs bg-bg-base hover:bg-accent-secondary/10 border border-border-light hover:border-accent-secondary/30 text-text-secondary hover:text-accent-secondary p-3 rounded-xl transition-colors">
                                        • Impute missing null values
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3 relative z-10">
                                <div className="h-10 bg-bg-base border border-border-light rounded-xl shimmer-bg"></div>
                                <div className="h-10 bg-bg-base border border-border-light rounded-xl shimmer-bg"></div>
                                <div className="h-10 bg-bg-base border border-border-light rounded-xl shimmer-bg"></div>
                            </div>
                        )}
                    </div>
                    
                    {/* Agent Activity Log */}
                    <div className="glass-panel !rounded-3xl p-6 shadow-xl flex flex-col h-64">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-text-primary tracking-wide flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-accent-success animate-pulse"></div>
                                Agent Activity
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3 font-mono text-[11px]">
                            {agentLogs.length === 0 ? (
                                <div className="text-text-muted italic">Waiting for swarm execution...</div>
                            ) : (
                                agentLogs.map((log, idx) => (
                                    <div key={idx} className={`${log.includes('Failed') ? 'text-accent-danger' : log.includes('Successfully') ? 'text-accent-success' : 'text-text-secondary'}`}>
                                        {log}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="h-20" />
        </div>
    );
};

const SparklesIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
);

export default DataLab;
