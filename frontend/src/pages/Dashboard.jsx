import React, { useEffect, useState, useRef } from 'react';
import { UploadCloud, MessageSquare, Code, Trophy, Database, Clock, Terminal, Activity, Zap, Cpu, Brain } from 'lucide-react';
import useAgentStore from '../store/useAgentStore';
import useAuthStore from '../store/useAuthStore';
import axios from 'axios';

const Dashboard = () => {
    const { setActivePage, logs } = useAgentStore();
    const { token } = useAuthStore();
    const [stats, setStats] = useState({ streak_days: 0, xp_points: 0 });
    const [activity, setActivity] = useState([]);
    const terminalEndRef = useRef(null);

    useEffect(() => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        axios.get("http://127.0.0.1:8000/api/user/stats", { headers }).then(res => setStats(res.data)).catch(console.error);
        axios.get("http://127.0.0.1:8000/api/user/activity", { headers }).then(res => setActivity(res.data)).catch(console.error);
    }, [token]);

    useEffect(() => {
        terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const quickActions = [
        { id: 'data-lab', title: 'Upload Data', icon: UploadCloud, color: 'text-accent-primary' },
        { id: 'chat', title: 'Start Chat', icon: MessageSquare, color: 'text-accent-secondary' },
        { id: 'code-lab', title: 'Write Code', icon: Code, color: 'text-accent-warning' },
        { id: 'daily-challenge', title: 'Solve Challenge', icon: Trophy, color: 'text-accent-success' },
    ];

    const getIcon = (type) => {
        if(type === 'data') return <Database size={16} className="text-accent-primary" />
        if(type === 'chat') return <MessageSquare size={16} className="text-accent-secondary" />
        if(type === 'challenge') return <Trophy size={16} className="text-accent-success" />
        return <Code size={16} className="text-accent-warning" />
    }

    return (
        <div className="h-full w-full p-8 md:p-12 overflow-y-auto bg-radial-fog scroll-smooth">
            {/* HERO SECTION */}
            <div className="w-full rounded-[2.5rem] bg-panel backdrop-blur-2xl border border-border-light p-12 mb-8 shadow-[0_0_50px_rgba(165,104,255,0.15)] relative overflow-hidden flex items-center justify-between group">
                <div className="absolute inset-0 bg-gradient-to-r from-accent-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                
                <div className="absolute top-1/2 right-32 -translate-y-1/2 hidden lg:block">
                    <div className="relative flex items-center justify-center">
                        <div className="neural-orb group-hover:scale-110 transition-transform duration-700"></div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <Brain size={48} className="text-accent-secondary opacity-80 animate-pulse" />
                        </div>
                    </div>
                </div>

                <div className="relative z-10">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-text-primary mb-4 tracking-tight">Your AI Swarm is <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-secondary to-accent-primary drop-shadow-[0_0_10px_rgba(165,104,255,0.5)] animate-pulse">Ready</span></h1>
                    <p className="text-text-secondary text-lg max-w-2xl leading-relaxed mb-8">
                        Deploy autonomous agents to write code, analyze data, and solve complex algorithms. The neural cluster is online and standing by.
                    </p>
                    <button onClick={() => setActivePage('chat')} className="bg-gradient-to-r from-accent-secondary to-accent-primary text-white font-bold px-8 py-3.5 rounded-xl hover:shadow-[0_0_20px_rgba(165,104,255,0.4)] hover:scale-105 transition-all flex items-center gap-2 uppercase tracking-widest text-sm shadow-lg border-none">
                        <Zap size={18} fill="currentColor" /> Deploy Agents
                    </button>
                </div>
            </div>

            {/* MIDDLE ROW: Live Terminal & Quick Actions */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                {/* Live Agent Feed */}
                <div className="xl:col-span-2 glass-panel p-6 flex flex-col h-[400px] relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    
                    <div className="flex items-center justify-between mb-4 border-b border-border-light pb-4 relative z-10">
                        <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                            <Terminal size={18} className="text-accent-secondary" /> Live Agent Feed
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-success opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-success shadow-[0_0_8px_var(--accent-success)]"></span>
                            </span>
                            <span className="text-xs text-accent-success font-bold tracking-widest uppercase">Streaming</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto font-mono text-sm space-y-2 p-2 relative z-10 custom-scrollbar">
                        {logs.length === 0 ? (
                            <div className="text-text-muted italic flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-text-muted animate-pulse"></div> System idling. Waiting for tasks...
                            </div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 hover:bg-panel-hover p-1 rounded transition-colors">
                                    <span className="text-text-muted shrink-0">[{log.time}]</span>
                                    <span className={`${log.color || 'text-text-secondary'}`}>{log.message}</span>
                                </div>
                            ))
                        )}
                        <div ref={terminalEndRef} />
                    </div>

                    {/* SVG Multi-Agent Visualization Overlay */}
                    <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none w-64 h-64 mix-blend-screen">
                        <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_60s_linear_infinite]">
                            <circle cx="50" cy="50" r="40" stroke="var(--accent-secondary)" strokeWidth="0.5" fill="none" strokeDasharray="2 4" />
                            <circle cx="50" cy="20" r="4" fill="var(--accent-secondary)" className="animate-pulse" />
                            <circle cx="20" cy="70" r="4" fill="var(--accent-primary)" className="animate-pulse" style={{animationDelay: '1s'}} />
                            <circle cx="80" cy="70" r="4" fill="var(--accent-warning)" className="animate-pulse" style={{animationDelay: '2s'}} />
                            <line x1="50" y1="20" x2="20" y2="70" stroke="var(--border-medium)" strokeWidth="0.5" opacity="0.5" />
                            <line x1="20" y1="70" x2="80" y2="70" stroke="var(--border-medium)" strokeWidth="0.5" opacity="0.5" />
                            <line x1="80" y1="70" x2="50" y2="20" stroke="var(--border-medium)" strokeWidth="0.5" opacity="0.5" />
                        </svg>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-lg font-bold text-text-primary mb-2 pl-2 border-l-2 border-accent-secondary">Quick Commands</h2>
                    {quickActions.map((action) => (
                        <button 
                            key={action.id}
                            onClick={() => setActivePage(action.id)}
                            className="quick-action-card rounded-2xl p-5 flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-panel p-3 rounded-xl group-hover:bg-panel-hover transition-all border border-border-light shadow-inner">
                                    <action.icon size={20} className={action.color} />
                                </div>
                                <span className="font-bold text-text-secondary group-hover:text-text-primary transition-colors">{action.title}</span>
                            </div>
                            <span className="text-text-muted group-hover:text-text-primary group-hover:translate-x-1 transition-all">→</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* BOTTOM ROW: Analytics & Models */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Model Control Center */}
                <div className="glass-panel p-6">
                    <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2">
                        <Cpu size={18} className="text-accent-primary" /> Model Control Center
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-accent-primary/10 rounded-xl border border-accent-primary/30 shadow-[0_0_15px_rgba(0,217,255,0.1)]">
                            <div>
                                <h4 className="text-sm font-bold text-text-primary">Qwen2.5-Coder</h4>
                                <span className="text-xs text-text-muted">7B Params</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] bg-accent-success/20 text-accent-success px-2 py-0.5 rounded font-bold uppercase tracking-wide border border-accent-success/30">Active</span>
                                <div className="text-xs text-text-muted mt-1 flex items-center justify-end gap-1"><div className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse"></div> 4.2GB VRAM</div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-panel rounded-xl border border-border-light hover:border-border-medium transition-colors">
                            <div>
                                <h4 className="text-sm font-bold text-text-secondary">Mistral</h4>
                                <span className="text-xs text-text-muted">7B Params</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] bg-panel-hover text-text-muted px-2 py-0.5 rounded font-bold uppercase tracking-wide">Idle</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-panel rounded-xl border border-border-light hover:border-border-medium transition-colors">
                            <div>
                                <h4 className="text-sm font-bold text-text-secondary">Llama3</h4>
                                <span className="text-xs text-text-muted">8B Params</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] bg-accent-warning/10 text-accent-warning px-2 py-0.5 rounded font-bold uppercase tracking-wide border border-accent-warning/20">Loaded</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Widgets */}
                <div className="glass-panel p-6 flex flex-col justify-between relative overflow-hidden group">
                    <div className="absolute -right-10 -top-10 w-32 h-32 bg-accent-success/10 rounded-full blur-2xl group-hover:bg-accent-success/20 transition-colors duration-500"></div>
                    <h2 className="text-lg font-bold text-text-primary mb-6 flex items-center gap-2 relative z-10">
                        <Activity size={18} className="text-accent-success" /> Agent Performance
                    </h2>
                    <div className="grid grid-cols-2 gap-4 relative z-10">
                        <div className="bg-panel p-4 rounded-xl border border-border-light hover:bg-panel-hover transition-colors">
                            <div className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Success Rate</div>
                            <div className="text-2xl font-black text-text-primary">98.4<span className="text-sm text-text-muted font-bold">%</span></div>
                        </div>
                        <div className="bg-panel p-4 rounded-xl border border-border-light hover:bg-panel-hover transition-colors">
                            <div className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Avg Exec Time</div>
                            <div className="text-2xl font-black text-text-primary">2.4<span className="text-sm text-text-muted font-bold">s</span></div>
                        </div>
                        <div className="bg-panel p-4 rounded-xl border border-border-light hover:bg-panel-hover transition-colors">
                            <div className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Tokens / Sec</div>
                            <div className="text-2xl font-black text-accent-primary">64.2</div>
                        </div>
                        <div className="bg-panel p-4 rounded-xl border border-border-light hover:bg-panel-hover transition-colors">
                            <div className="text-text-muted text-[10px] font-bold uppercase tracking-widest mb-1">Tasks Done</div>
                            <div className="text-2xl font-black text-accent-secondary">{stats.streak_days * 14 + 102}</div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Mini */}
                <div className="glass-panel p-6">
                    <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-accent-warning" /> Recent Operations
                    </h2>
                    <div className="space-y-3">
                        {activity.length === 0 ? (
                            <div className="text-sm text-text-muted p-4 text-center bg-panel rounded-xl border border-border-light">No recent operations.</div>
                        ) : (
                            activity.slice(0, 4).map((act, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 hover:bg-panel-hover bg-panel rounded-xl border border-border-light transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-bg-base/50 p-2 rounded-lg border border-border-light group-hover:scale-110 transition-transform shadow-inner">
                                            {getIcon(act.activity_type)}
                                        </div>
                                        <div>
                                            <h4 className="text-text-secondary font-bold text-sm truncate w-32 group-hover:text-text-primary transition-colors">{act.title}</h4>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{act.time_ago}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
            
            <div className="h-10" />
        </div>
    );
};

export default Dashboard;
