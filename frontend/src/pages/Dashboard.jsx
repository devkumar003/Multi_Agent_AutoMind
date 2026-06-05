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
        { id: 'data-lab', title: 'Upload Data', icon: UploadCloud, color: 'text-blue-400' },
        { id: 'chat', title: 'Start Chat', icon: MessageSquare, color: 'text-[#A568FF]' },
        { id: 'code-lab', title: 'Write Code', icon: Code, color: 'text-orange-400' },
        { id: 'daily-challenge', title: 'Solve Challenge', icon: Trophy, color: 'text-green-400' },
    ];

    const getIcon = (type) => {
        if(type === 'data') return <Database size={16} className="text-blue-400" />
        if(type === 'chat') return <MessageSquare size={16} className="text-[#A568FF]" />
        if(type === 'challenge') return <Trophy size={16} className="text-green-400" />
        return <Code size={16} className="text-orange-400" />
    }

    return (
        <div className="h-full w-full p-8 md:p-12 overflow-y-auto bg-radial-fog scroll-smooth">
            {/* HERO SECTION */}
            <div className="w-full rounded-[2.5rem] bg-gradient-to-r from-[#0F1223] to-[#0A0D1B] border border-[#1C1F33] p-12 mb-8 shadow-2xl relative overflow-hidden flex items-center justify-between">
                <div className="absolute top-1/2 right-32 -translate-y-1/2 hidden lg:block">
                    <div className="relative flex items-center justify-center">
                        <div className="neural-orb"></div>
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                            <Brain size={48} className="text-[#A568FF] opacity-80" />
                        </div>
                    </div>
                </div>

                <div className="relative z-10">
                    <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">Your AI Swarm is <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#A568FF] to-indigo-400 animate-pulse">Ready</span></h1>
                    <p className="text-gray-400 text-lg max-w-2xl leading-relaxed mb-8">
                        Deploy autonomous agents to write code, analyze data, and solve complex algorithms. The neural cluster is online and standing by.
                    </p>
                    <button onClick={() => setActivePage('chat')} className="bg-white text-black font-bold px-8 py-3.5 rounded-xl hover:bg-gray-200 transition-colors flex items-center gap-2">
                        <Zap size={18} fill="currentColor" /> Deploy Agents
                    </button>
                </div>
            </div>

            {/* MIDDLE ROW: Live Terminal & Quick Actions */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
                {/* Live Agent Feed */}
                <div className="xl:col-span-2 bg-[#0A0D1B] border border-[#1C1F33] rounded-3xl p-6 flex flex-col h-[400px] shadow-2xl relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4 border-b border-[#1C1F33] pb-4">
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Terminal size={18} className="text-[#A568FF]" /> Live Agent Feed
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs text-gray-500 font-bold tracking-widest uppercase">Streaming</span>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto font-mono text-sm space-y-2 p-2 relative z-10">
                        {logs.length === 0 ? (
                            <div className="text-gray-600 italic">System idling. Waiting for tasks...</div>
                        ) : (
                            logs.map((log, i) => (
                                <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <span className="text-gray-500 shrink-0">[{log.time}]</span>
                                    <span className={`${log.color || 'text-gray-300'}`}>{log.message}</span>
                                </div>
                            ))
                        )}
                        <div ref={terminalEndRef} />
                    </div>

                    {/* SVG Multi-Agent Visualization Overlay */}
                    <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none w-64 h-64">
                        <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_60s_linear_infinite]">
                            <circle cx="50" cy="50" r="40" stroke="#A568FF" strokeWidth="0.5" fill="none" strokeDasharray="2 4" />
                            <circle cx="50" cy="20" r="4" fill="#A568FF" className="animate-pulse" />
                            <circle cx="20" cy="70" r="4" fill="#4F93FF" className="animate-pulse" style={{animationDelay: '1s'}} />
                            <circle cx="80" cy="70" r="4" fill="#EBB556" className="animate-pulse" style={{animationDelay: '2s'}} />
                            <line x1="50" y1="20" x2="20" y2="70" stroke="#fff" strokeWidth="0.5" opacity="0.5" />
                            <line x1="20" y1="70" x2="80" y2="70" stroke="#fff" strokeWidth="0.5" opacity="0.5" />
                            <line x1="80" y1="70" x2="50" y2="20" stroke="#fff" strokeWidth="0.5" opacity="0.5" />
                        </svg>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-lg font-bold text-white mb-2">Quick Commands</h2>
                    {quickActions.map((action) => (
                        <button 
                            key={action.id}
                            onClick={() => setActivePage(action.id)}
                            className="quick-action-card bg-[#0F1223] rounded-2xl p-5 flex items-center justify-between group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="bg-[#131627] p-3 rounded-xl group-hover:bg-[#1A1E36] transition-colors border border-[#1C1F33]">
                                    <action.icon size={20} className={action.color} />
                                </div>
                                <span className="font-bold text-gray-300 group-hover:text-white transition-colors">{action.title}</span>
                            </div>
                            <span className="text-gray-600 group-hover:text-white transition-colors">→</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* BOTTOM ROW: Analytics & Models */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Model Control Center */}
                <div className="bg-[#0F1223] border border-[#1C1F33] rounded-3xl p-6 shadow-xl">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Cpu size={18} className="text-blue-400" /> Model Control Center
                    </h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-[#131627] rounded-xl border border-[#1C1F33]">
                            <div>
                                <h4 className="text-sm font-bold text-white">Qwen2.5-Coder</h4>
                                <span className="text-xs text-gray-500">7B Params</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] bg-green-500/10 text-green-400 px-2 py-0.5 rounded font-bold uppercase tracking-wide border border-green-500/20">Active</span>
                                <div className="text-xs text-gray-400 mt-1">4.2GB VRAM</div>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-transparent">
                            <div>
                                <h4 className="text-sm font-bold text-gray-400">Mistral</h4>
                                <span className="text-xs text-gray-600">7B Params</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] bg-gray-500/10 text-gray-500 px-2 py-0.5 rounded font-bold uppercase tracking-wide">Idle</span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-transparent">
                            <div>
                                <h4 className="text-sm font-bold text-gray-400">Llama3</h4>
                                <span className="text-xs text-gray-600">8B Params</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded font-bold uppercase tracking-wide border border-yellow-500/20">Loaded</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Dashboard Widgets */}
                <div className="bg-[#0F1223] border border-[#1C1F33] rounded-3xl p-6 shadow-xl flex flex-col justify-between">
                    <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Activity size={18} className="text-green-400" /> Agent Performance
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-[#131627] p-4 rounded-xl border border-[#1C1F33]">
                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Success Rate</div>
                            <div className="text-2xl font-black text-white">98.4%</div>
                        </div>
                        <div className="bg-[#131627] p-4 rounded-xl border border-[#1C1F33]">
                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Avg Exec Time</div>
                            <div className="text-2xl font-black text-white">2.4s</div>
                        </div>
                        <div className="bg-[#131627] p-4 rounded-xl border border-[#1C1F33]">
                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Tokens / Sec</div>
                            <div className="text-2xl font-black text-white">64.2</div>
                        </div>
                        <div className="bg-[#131627] p-4 rounded-xl border border-[#1C1F33]">
                            <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest mb-1">Tasks Done</div>
                            <div className="text-2xl font-black text-[#A568FF]">{stats.streak_days * 14 + 102}</div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Mini */}
                <div className="bg-[#0F1223] border border-[#1C1F33] rounded-3xl p-6 shadow-xl">
                    <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <Clock size={18} className="text-orange-400" /> Recent Operations
                    </h2>
                    <div className="space-y-3">
                        {activity.length === 0 ? (
                            <div className="text-sm text-gray-500 p-4 text-center">No recent operations.</div>
                        ) : (
                            activity.slice(0, 4).map((act, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-colors cursor-pointer group">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-[#131627] p-2 rounded-lg border border-[#1C1F33] group-hover:scale-110 transition-transform">
                                            {getIcon(act.activity_type)}
                                        </div>
                                        <div>
                                            <h4 className="text-gray-300 font-bold text-sm truncate w-32">{act.title}</h4>
                                        </div>
                                    </div>
                                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{act.time_ago}</span>
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
