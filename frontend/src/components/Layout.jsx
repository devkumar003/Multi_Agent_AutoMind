import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Database, MessageSquare, Code, Trophy, Clock, Settings as SettingsIcon, Bell, Sun, Moon, LogOut, Terminal, Activity, Zap, User, Users, Lock, AlertTriangle, Award, Swords, Shield } from 'lucide-react';
import useAgentStore from '../store/useAgentStore';
import useAuthStore from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const CommandPalette = ({ isOpen, onClose, setActivePage }) => {
    if (!isOpen) return null;
    
    const commands = [
        { name: 'Deploy Agent Swarm', icon: Zap, action: () => { setActivePage('chat'); onClose(); } },
        { name: 'Open Terminal', icon: Terminal, action: () => { setActivePage('code-lab'); onClose(); } },
        { name: 'System Settings', icon: SettingsIcon, action: () => { setActivePage('settings'); onClose(); } },
        { name: 'Activity Logs', icon: Activity, action: () => { setActivePage('history'); onClose(); } },
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-start justify-center pt-[15vh]">
            <div className="w-full max-w-2xl glass-panel overflow-hidden animate-in fade-in slide-in-from-top-8 duration-300">
                <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#0A0D1B]/50">
                    <Terminal size={18} className="text-[#A568FF]" />
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="Type a command or search..." 
                        className="w-full bg-transparent border-none text-white focus:outline-none placeholder-gray-500 text-lg"
                        onKeyDown={(e) => { if(e.key === 'Escape') onClose(); }}
                    />
                </div>
                <div className="p-2 bg-[#0F1223]/50">
                    <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Suggestions</div>
                    {commands.map((cmd, i) => (
                        <button key={i} onClick={cmd.action} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/10 rounded-xl transition-all text-left group">
                            <div className="bg-white/5 p-2 rounded-lg group-hover:bg-white/10 transition-colors">
                                <cmd.icon size={16} className="text-gray-400 group-hover:text-white transition-colors" />
                            </div>
                            <span className="text-gray-300 group-hover:text-white transition-colors font-medium">{cmd.name}</span>
                        </button>
                    ))}
                </div>
            </div>
            <div className="absolute inset-0 z-[-1]" onClick={onClose}></div>
        </div>
    );
};

const Layout = ({ children }) => {
    const { activePage, setActivePage, logs } = useAgentStore();
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [showNotif, setShowNotif] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [aiStatus, setAiStatus] = useState({ status: 'connected', model: 'Qwen', latency: 12 });

    const handleLogout = () => {
        logout();
        navigate('/auth');
    };

    // Poll AI Status
    useEffect(() => {
        const fetchHealth = () => {
            fetch("http://127.0.0.1:8000/api/system/health")
                .then(res => res.json())
                .then(data => setAiStatus(data))
                .catch(() => setAiStatus({ status: 'disconnected', model: 'Offline', latency: 0 }));
        };
        fetchHealth();
        const interval = setInterval(fetchHealth, 10000);
        return () => clearInterval(interval);
    }, []);
    
    // Command Palette hotkey
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                setIsCommandPaletteOpen(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
    
    // Toggle dark mode
    useEffect(() => {
        if (!isDarkMode) {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
    }, [isDarkMode]);

    const notifRef = useRef(null);
    const profileRef = useRef(null);

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotif(false);
            if (profileRef.current && !profileRef.current.contains(event.target)) setShowProfile(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);
    const { isAuthenticated } = useAuthStore();

    const topNavMenu = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, locked: false },
        { id: 'data-lab', label: 'Data Lab', icon: Database, locked: !isAuthenticated },
        { id: 'chat', label: 'AI Chat', icon: MessageSquare, locked: false },
        { id: 'code-lab', label: 'Code Lab', icon: Code, locked: false },
        { id: 'daily-challenge', label: 'Daily Challenge', icon: Trophy, locked: !isAuthenticated },
        { id: 'contest-list', label: 'Global Contests', icon: Swords, locked: false },
        { id: 'leaderboard', label: 'Leaderboard', icon: Award, locked: false },
    ];

    const bottomNavMenu = [
        { id: 'history', label: 'History', icon: Clock, locked: !isAuthenticated },
        { id: 'settings', label: 'Settings', icon: SettingsIcon, locked: !isAuthenticated },
    ];

    const userInitials = user?.username ? user.username.substring(0, 2).toUpperCase() : 'AI';

    const handleNavClick = (item) => {
        if (item.locked) {
            setShowUpgradeModal(true);
        } else {
            setActivePage(item.id);
        }
    };

    return (
        <div className="flex h-screen bg-radial-fog text-white overflow-hidden relative font-['Inter']">
            <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} setActivePage={setActivePage} />
            {/* Phase 2: Atmospheric Animated Grid */}
            <div className="neural-grid-bg"></div>

            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-[#0a0a0f]/60 backdrop-blur-3xl border-r border-white/5 flex flex-col z-10 relative`}>
                <div className={`p-6 flex items-center ${isSidebarOpen ? 'gap-3' : 'justify-center'}`}>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-[#A568FF] bg-[#A568FF]/10 border border-[#A568FF]/20 p-2 rounded-xl hover:bg-[#A568FF]/20 transition-all shrink-0 hover:shadow-[0_0_15px_rgba(165,104,255,0.3)]">
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </button>
                    {isSidebarOpen && <h1 className="text-xl font-bold text-white tracking-wide whitespace-nowrap overflow-hidden text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">AutoMind AI</h1>}
                </div>

                <nav className="flex-1 mt-6 px-4 overflow-y-auto custom-scrollbar">
                    <ul className="space-y-1.5">
                        {topNavMenu.map((item) => (
                            <li key={item.id}>
                                <button
                                    onClick={() => handleNavClick(item)}
                                    className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                                        ${activePage === item.id 
                                            ? 'text-white bg-white/10 shadow-[0_0_15px_rgba(165,104,255,0.15)] border border-white/5' 
                                            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'}
                                        ${item.locked ? 'opacity-50 hover:opacity-100' : ''}`}
                                >
                                    {activePage === item.id && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[#A568FF] to-[#00D9FF] rounded-r-md animate-in fade-in zoom-in duration-300 shadow-[0_0_10px_#A568FF]"></div>
                                    )}
                                    <item.icon size={18} className={activePage === item.id ? "text-[#00D9FF]" : "group-hover:text-white transition-colors"} />
                                    {isSidebarOpen && (
                                        <>
                                            <span className="font-medium text-sm flex-1 text-left whitespace-nowrap overflow-hidden">{item.label}</span>
                                            {item.locked && <Lock size={14} className="text-gray-500 shrink-0 group-hover:text-white transition-colors" />}
                                        </>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>

                    {user?.is_admin >= 1 && (
                        <>
                            {isSidebarOpen ? (
                                <div className="mt-8 mb-4 px-4 text-[10px] font-black text-red-500 tracking-[0.2em] flex items-center gap-2 whitespace-nowrap overflow-hidden">
                                    <Shield size={12} className="shrink-0" /> ADMIN SYSTEM
                                </div>
                            ) : (
                                <div className="mt-8 mb-4 flex justify-center text-red-500">
                                    <Shield size={14} />
                                </div>
                            )}
                            <ul className="space-y-1.5">
                                {[
                                    { id: 'admin-dashboard', label: 'Admin Dashboard', icon: Shield, locked: false },
                                    { id: 'admin-users', label: 'Manage Users', icon: Users, locked: false },
                                    { id: 'admin-challenges', label: 'Manage Challenges', icon: Code, locked: false },
                                    { id: 'admin-contests', label: 'Manage Contests', icon: Swords, locked: false },
                                ].map((item) => (
                                    <li key={item.id}>
                                        <button
                                            onClick={() => handleNavClick(item)}
                                            className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                                                ${activePage === item.id 
                                                    ? 'text-white bg-red-500/10 shadow-[0_0_15px_rgba(239,68,68,0.15)] border border-red-500/20' 
                                                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'}
                                                ${item.locked ? 'opacity-50 hover:opacity-100' : ''}`}
                                        >
                                            {activePage === item.id && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-red-500 to-orange-500 rounded-r-md animate-in fade-in zoom-in duration-300 shadow-[0_0_10px_#ef4444]"></div>
                                            )}
                                            <item.icon size={18} className={activePage === item.id ? "text-red-500" : "group-hover:text-red-400 transition-colors"} />
                                            {isSidebarOpen && (
                                                <>
                                                    <span className="font-medium text-sm flex-1 text-left whitespace-nowrap overflow-hidden">{item.label}</span>
                                                    {item.locked && <Lock size={14} className="text-gray-500 shrink-0 group-hover:text-red-300 transition-colors" />}
                                                </>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {isSidebarOpen ? (
                        <div className="mt-8 mb-4 px-4 text-[10px] font-black text-gray-500 tracking-[0.2em] whitespace-nowrap overflow-hidden">CORE SYSTEM</div>
                    ) : (
                        <div className="mt-8 mb-4 flex justify-center text-gray-500">
                            <SettingsIcon size={14} />
                        </div>
                    )}
                    <ul className="space-y-1.5">
                        {bottomNavMenu.map((item) => (
                            <li key={item.id}>
                                <button
                                    onClick={() => handleNavClick(item)}
                                    className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                                        ${activePage === item.id 
                                            ? 'text-white bg-white/10 shadow-[0_0_15px_rgba(165,104,255,0.15)] border border-white/5' 
                                            : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/5'}
                                        ${item.locked ? 'opacity-50 hover:opacity-100' : ''}`}
                                >
                                    {activePage === item.id && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-[#A568FF] to-[#00D9FF] rounded-r-md animate-in fade-in zoom-in duration-300 shadow-[0_0_10px_#A568FF]"></div>
                                    )}
                                    <item.icon size={18} className={activePage === item.id ? "text-[#00D9FF]" : "group-hover:text-white transition-colors"} />
                                    {isSidebarOpen && (
                                        <>
                                            <span className="font-medium text-sm flex-1 text-left whitespace-nowrap overflow-hidden">{item.label}</span>
                                            {item.locked && <Lock size={14} className="text-gray-500 shrink-0 group-hover:text-white transition-colors" />}
                                        </>
                                    )}
                                </button>
                            </li>
                        ))}


                    </ul>
                </nav>

                <div className="p-4 border-t border-white/10">
                    <button className={`flex items-center w-full p-3 hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/5 ${isSidebarOpen ? 'gap-3' : 'justify-center'}`}>
                        <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-[#A568FF] to-[#00D9FF] flex items-center justify-center text-white text-sm font-bold shadow-[0_0_15px_rgba(165,104,255,0.4)] uppercase border border-white/20">
                            {userInitials}
                        </div>
                        {isSidebarOpen && (
                            <div className="flex flex-col text-left overflow-hidden">
                                <span className="text-sm font-bold text-white truncate max-w-[100px]">{user?.username || 'Pilot'}</span>
                                <span className="text-xs text-[#00D9FF] font-medium whitespace-nowrap">Standard Plan</span>
                            </div>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Workspace */}
            <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-transparent">
                {/* Topbar */}
                <header className="h-16 border-b border-white/5 bg-[#0A0D1B]/40 backdrop-blur-2xl flex items-center justify-between px-8 z-50 shrink-0 shadow-sm relative">
                    
                    {/* AI Status Panel (Replaces Search) */}
                    <div 
                        onClick={() => setIsCommandPaletteOpen(true)}
                        className="flex items-center gap-4 bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 px-4 py-2 rounded-xl cursor-pointer transition-all group shadow-inner"
                    >
                        <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                            <span className="relative flex h-2.5 w-2.5">
                                {aiStatus.status === 'connected' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00D9FF] opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${aiStatus.status === 'connected' ? 'bg-[#00D9FF] shadow-[0_0_8px_#00D9FF]' : 'bg-red-500 shadow-[0_0_8px_#ef4444]'}`}></span>
                            </span>
                            <span className="text-xs font-bold text-gray-300 tracking-wide group-hover:text-white transition-colors">
                                {aiStatus.status === 'connected' ? 'Ollama Connected' : 'Ollama Offline'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 border-r border-white/10 pr-4">
                            <span className="text-xs font-medium text-gray-400">Model:</span>
                            <span className={`text-xs font-bold ${aiStatus.status === 'connected' ? 'text-[#A568FF]' : 'text-gray-500'}`}>{aiStatus.model}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-gray-400">Latency:</span>
                            <span className={`text-xs font-bold ${aiStatus.status === 'connected' ? 'text-green-400' : 'text-red-400'}`}>{aiStatus.latency}ms</span>
                        </div>
                        <div className="ml-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white border border-white/10">Ctrl</span>
                            <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white border border-white/10">K</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-5 text-gray-400 relative">
                        {/* Theme Toggle */}
                        <button 
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="hover:text-white transition p-2 rounded-full hover:bg-white/10 border border-transparent hover:border-white/5"
                        >
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        
                        {/* Notifications */}
                        <div className="relative" ref={notifRef}>
                            <button 
                                onClick={() => {setShowNotif(!showNotif); setShowProfile(false);}}
                                className={`hover:text-white transition p-2 rounded-full border ${showNotif ? 'bg-white/10 text-white border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'border-transparent hover:bg-white/10 hover:border-white/5'}`}
                            >
                                <Bell size={18} />
                                {logs.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border border-[#0A0D1B]"></span>}
                            </button>
                            
                            {/* Notification Dropdown */}
                            {showNotif && (
                                <div className="absolute right-0 mt-3 w-80 glass-panel overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                                    <div className="px-4 py-3 border-b border-white/10 bg-black/20 flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-white">Notifications</h3>
                                        <span className="text-xs font-bold text-[#A568FF] bg-[#A568FF]/10 px-2 py-0.5 rounded-full">{logs.length} new</span>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                        {logs.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-gray-500">No new notifications</div>
                                        ) : (
                                            [...logs].reverse().slice(0, 10).map((log, i) => (
                                                <div key={i} className="p-3 hover:bg-white/10 rounded-xl transition-all cursor-pointer flex gap-3 border border-transparent hover:border-white/5 group">
                                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-[#00D9FF] shrink-0 group-hover:scale-125 transition-transform shadow-[0_0_8px_#00D9FF]"></div>
                                                    <div>
                                                        <p className="text-sm text-gray-200 group-hover:text-white transition-colors line-clamp-2">{log.message}</p>
                                                        <span className="text-xs text-gray-500 mt-1 block">{log.time}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile */}
                        <div className="relative" ref={profileRef}>
                            <div 
                                onClick={() => {setShowProfile(!showProfile); setShowNotif(false);}}
                                className={`w-9 h-9 rounded-full bg-gradient-to-tr from-[#A568FF] to-[#00D9FF] ml-2 shadow-[0_0_15px_rgba(165,104,255,0.3)] cursor-pointer flex items-center justify-center text-white text-sm font-bold border-2 transition-all uppercase hover:scale-105 ${showProfile ? 'border-white' : 'border-white/20'}`}
                            >
                                {userInitials}
                            </div>
                            
                            {/* Profile Dropdown */}
                            {showProfile && (
                                <div className="absolute right-0 mt-3 w-56 glass-panel overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                                    <div className="p-4 border-b border-white/10 bg-black/20">
                                        <p className="text-sm font-bold text-white truncate">{user?.username || 'Pilot'}</p>
                                        <p className="text-xs text-gray-400 mt-0.5 truncate">{user?.email || 'standard@protocol.ai'}</p>
                                        <div className="mt-2 inline-block px-2 py-1 bg-gradient-to-r from-[#A568FF]/20 to-[#00D9FF]/20 border border-white/10 rounded-md text-[10px] font-bold text-white uppercase tracking-widest shadow-inner">
                                            Active Identity
                                        </div>
                                    </div>
                                    <div className="p-2 space-y-1">
                                        <button onClick={() => {setActivePage('profile'); setShowProfile(false);}} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/5">
                                            <User size={16} className="text-[#A568FF]" /> Neural Profile
                                        </button>
                                        <button onClick={() => {setActivePage('settings'); setShowProfile(false);}} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/5">

                                            <SettingsIcon size={16} className="text-gray-400" /> Settings
                                        </button>
                                        <button onClick={() => {setActivePage('history'); setShowProfile(false);}} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded-xl transition-all border border-transparent hover:border-white/5">
                                            <Clock size={16} className="text-orange-400" /> Activity History
                                        </button>
                                        <div className="h-px bg-white/10 my-2"></div>
                                        <button 
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-xl transition-all border border-transparent hover:border-red-500/20"
                                        >
                                            <LogOut size={16} /> Sign Out
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto w-full relative custom-scrollbar">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none"></div>
                    <div className="relative z-10 h-full w-full">
                        {children}
                    </div>
                </div>
            </main>

            {/* Upgrade / Login Modal */}
            {showUpgradeModal && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-xl px-4 animate-in fade-in duration-200">
                    <div className="glass-panel p-8 max-w-md w-full relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#A568FF] to-[#00D9FF]"></div>
                        
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-yellow-500/10 flex items-center justify-center text-yellow-500 border border-yellow-500/20 shadow-[0_0_20px_rgba(234,179,8,0.2)]">
                                <AlertTriangle size={32} />
                            </div>
                            
                            <h2 className="text-2xl font-black text-white tracking-wide uppercase drop-shadow-md">Identity Required</h2>
                            
                            <p className="text-gray-300 text-sm leading-relaxed">
                                This sector is restricted. Establishing a neural link is required to unlock advanced analytics, daily challenges, and personalized telemetry.
                            </p>

                            <div className="flex gap-3 w-full pt-4">
                                <button 
                                    onClick={() => setShowUpgradeModal(false)}
                                    className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all text-sm font-bold uppercase tracking-wider border border-white/5 hover:border-white/10"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={() => window.location.href = '/auth'}
                                    className="flex-1 py-3 px-4 bg-gradient-to-r from-[#A568FF] to-[#00D9FF] hover:shadow-[0_0_20px_rgba(165,104,255,0.4)] hover:scale-105 text-white rounded-xl transition-all text-sm font-bold uppercase tracking-wider"
                                >
                                    Establish Link
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;
