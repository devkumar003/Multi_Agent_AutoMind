import React, { useState, useEffect, useRef } from 'react';
import { LayoutDashboard, Database, MessageSquare, Code, Trophy, Clock, Settings as SettingsIcon, Bell, Sun, Moon, LogOut, Terminal, Activity, Zap, User, Users, Lock, AlertTriangle, Award, Swords, Shield } from 'lucide-react';
import useAgentStore from '../store/useAgentStore';
import { useNavigate } from 'react-router-dom';
import { useAuth, useUser, UserButton, SignInButton } from '@clerk/clerk-react';

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
                <div className="p-4 border-b border-border-light flex items-center gap-3 bg-panel">
                    <Terminal size={18} className="text-accent-secondary" />
                    <input 
                        autoFocus
                        type="text" 
                        placeholder="Type a command or search..." 
                        className="w-full bg-transparent border-none text-text-primary focus:outline-none placeholder-text-muted text-lg"
                        onKeyDown={(e) => { if(e.key === 'Escape') onClose(); }}
                    />
                </div>
                <div className="p-2 bg-panel">
                    <div className="px-3 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest">Suggestions</div>
                    {commands.map((cmd, i) => (
                        <button key={i} onClick={cmd.action} className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/10 rounded-xl transition-all text-left group">
                            <div className="bg-panel p-2 rounded-lg group-hover:bg-panel-hover transition-colors">
                                <cmd.icon size={16} className="text-text-muted group-hover:text-text-primary transition-colors" />
                            </div>
                            <span className="text-text-secondary group-hover:text-text-primary transition-colors font-medium">{cmd.name}</span>
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
    const navigate = useNavigate();
    const { isSignedIn } = useAuth();
    const { user } = useUser();
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [showNotif, setShowNotif] = useState(false);
    const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [aiStatus, setAiStatus] = useState({ status: 'connected', model: 'Qwen', latency: 12 });
    const [localStatus, setLocalStatus] = useState('checking');
    const [cloudStatus, setCloudStatus] = useState('checking');
    const [isAdmin, setIsAdmin] = useState(false);
    const { getToken } = useAuth();

    // Fetch user profile to check admin status
    useEffect(() => {
        if (isSignedIn && user) {
            getToken().then(token => {
                fetch(`${import.meta.env.VITE_CLOUD_API_URL}/api/user/profile`, {
                    headers: { 
                        'Authorization': `Bearer ${token}`,
                        'X-User-Email': user.primaryEmailAddress?.emailAddress || '',
                        'X-User-Name': user.username || user.firstName || 'User'
                    }
                })
                .then(res => res.json())
                .then(data => {
                    if (data.user && data.user.is_admin > 0) {
                        setIsAdmin(true);
                    }
                })
                .catch(console.error);
            });
        } else {
            setIsAdmin(false);
        }
    }, [isSignedIn, getToken, user]);

    // Poll AI Status & Backend Health
    useEffect(() => {
        const fetchHealth = () => {
            fetch(`${import.meta.env.VITE_LOCAL_API_URL}/api/system/health`)
                .then(res => res.json())
                .then(data => setAiStatus(data))
                .catch(() => setAiStatus({ status: 'disconnected', model: 'Offline', latency: 0 }));

            fetch(`${import.meta.env.VITE_LOCAL_API_URL}/health`)
                .then(res => res.json())
                .then(() => setLocalStatus('online'))
                .catch(() => setLocalStatus('offline'));

            fetch(`${import.meta.env.VITE_CLOUD_API_URL}/health`)
                .then(res => res.json())
                .then(() => setCloudStatus('online'))
                .catch(() => setCloudStatus('offline'));
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

    // Close dropdowns on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (notifRef.current && !notifRef.current.contains(event.target)) setShowNotif(false);
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const topNavMenu = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, locked: false },
        { id: 'data-lab', label: 'Data Lab', icon: Database, locked: false },
        { id: 'chat', label: 'AI Chat', icon: MessageSquare, locked: false },
        { id: 'code-lab', label: 'Code Lab', icon: Code, locked: false },
        { id: 'daily-challenge', label: 'Daily Challenge', icon: Trophy, locked: !isSignedIn },
        { id: 'contest-list', label: 'Global Contests', icon: Swords, locked: !isSignedIn },
        { id: 'leaderboard', label: 'Leaderboard', icon: Award, locked: !isSignedIn },
    ];

    const bottomNavMenu = [
        { id: 'history', label: 'History', icon: Clock, locked: false },
        { id: 'settings', label: 'Settings', icon: SettingsIcon, locked: false },
    ];

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
            <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 glass-panel !rounded-none !border-y-0 !border-l-0 flex flex-col z-10 relative shrink-0`}>
                <div className={`p-6 flex items-center ${isSidebarOpen ? 'gap-3' : 'justify-center'}`}>
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-accent-secondary bg-panel border border-border-light p-2 rounded-xl hover:bg-panel-hover transition-all shrink-0 hover:border-accent-secondary">
                       <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                    </button>
                    {isSidebarOpen && <h1 className="text-xl font-bold text-text-primary tracking-wide whitespace-nowrap overflow-hidden">AutoMind AI</h1>}
                </div>

                <nav className="flex-1 mt-6 px-4 overflow-y-auto custom-scrollbar">
                    <ul className="space-y-1.5">
                        {topNavMenu.map((item) => (
                            <li key={item.id}>
                                <button
                                    onClick={() => handleNavClick(item)}
                                    className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                                        ${activePage === item.id 
                                            ? 'text-text-primary bg-panel-hover border border-border-medium shadow-[0_0_15px_rgba(0,217,255,0.15)]' 
                                            : 'text-text-secondary hover:text-text-primary hover:bg-panel border border-transparent hover:border-border-light'}
                                        ${item.locked ? 'opacity-50 hover:opacity-100' : ''}`}
                                >
                                    {activePage === item.id && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-accent-secondary to-accent-primary rounded-r-md animate-in fade-in zoom-in duration-300"></div>
                                    )}
                                    <item.icon size={18} className={activePage === item.id ? "text-accent-primary" : "group-hover:text-text-primary transition-colors"} />
                                    {isSidebarOpen && (
                                        <>
                                            <span className="font-medium text-sm flex-1 text-left whitespace-nowrap overflow-hidden">{item.label}</span>
                                            {item.locked && <Lock size={14} className="text-text-muted shrink-0 group-hover:text-text-primary transition-colors" />}
                                        </>
                                    )}
                                </button>
                            </li>
                        ))}
                    </ul>

                    {isSignedIn && isAdmin && (
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
                                    { id: 'admin-dashboard', label: 'Admin Dashboard', icon: Shield, locked: !isSignedIn },
                                    { id: 'admin-users', label: 'Manage Users', icon: Users, locked: !isSignedIn },
                                    { id: 'admin-challenges', label: 'Manage Challenges', icon: Code, locked: !isSignedIn },
                                    { id: 'admin-contests', label: 'Manage Contests', icon: Swords, locked: !isSignedIn },
                                ].map((item) => (
                                    <li key={item.id}>
                                        <button
                                            onClick={() => handleNavClick(item)}
                                            className={`relative w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group
                                                ${activePage === item.id 
                                                    ? 'text-text-primary bg-accent-danger/10 shadow-[0_0_15px_rgba(239,68,68,0.15)] border border-accent-danger/20' 
                                                    : 'text-text-secondary hover:text-text-primary hover:bg-panel border border-transparent hover:border-border-light'}
                                                ${item.locked ? 'opacity-50 hover:opacity-100' : ''}`}
                                        >
                                            {activePage === item.id && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-accent-danger to-orange-500 rounded-r-md animate-in fade-in zoom-in duration-300 shadow-[0_0_10px_#ef4444]"></div>
                                            )}
                                            <item.icon size={18} className={activePage === item.id ? "text-accent-danger" : "group-hover:text-red-400 transition-colors"} />
                                            {isSidebarOpen && (
                                                <>
                                                    <span className="font-medium text-sm flex-1 text-left whitespace-nowrap overflow-hidden">{item.label}</span>
                                                    {item.locked && <Lock size={14} className="text-text-muted shrink-0 group-hover:text-red-300 transition-colors" />}
                                                </>
                                            )}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {isSidebarOpen ? (
                        <div className="mt-8 mb-4 px-4 text-[10px] font-black text-text-muted tracking-[0.2em] whitespace-nowrap overflow-hidden">CORE SYSTEM</div>
                    ) : (
                        <div className="mt-8 mb-4 flex justify-center text-text-muted">
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
                                            ? 'text-text-primary bg-panel-hover shadow-[0_0_15px_rgba(0,217,255,0.15)] border border-border-medium' 
                                            : 'text-text-secondary hover:text-text-primary hover:bg-panel border border-transparent hover:border-border-light'}
                                        ${item.locked ? 'opacity-50 hover:opacity-100' : ''}`}
                                >
                                    {activePage === item.id && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-accent-secondary to-accent-primary rounded-r-md animate-in fade-in zoom-in duration-300 shadow-[0_0_10px_#A568FF]"></div>
                                    )}
                                    <item.icon size={18} className={activePage === item.id ? "text-accent-primary" : "group-hover:text-text-primary transition-colors"} />
                                    {isSidebarOpen && (
                                        <>
                                            <span className="font-medium text-sm flex-1 text-left whitespace-nowrap overflow-hidden">{item.label}</span>
                                            {item.locked && <Lock size={14} className="text-text-muted shrink-0 group-hover:text-text-primary transition-colors" />}
                                        </>
                                    )}
                                </button>
                            </li>
                        ))}


                    </ul>
                </nav>

                <div className="p-4 border-t border-border-light">
                    <button className={`flex items-center w-full p-3 hover:bg-panel rounded-xl transition-all border border-transparent hover:border-border-medium ${isSidebarOpen ? 'gap-3' : 'justify-center'}`}>
                        {isSignedIn ? (
                            <div className="w-9 h-9 shrink-0 flex items-center justify-center">
                                <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "w-9 h-9" } }} />
                            </div>
                        ) : (
                            <div className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-accent-secondary to-accent-primary flex items-center justify-center text-text-primary text-sm font-bold shadow-[0_0_15px_rgba(165,104,255,0.4)] uppercase border border-border-medium">
                                AI
                            </div>
                        )}
                        {isSidebarOpen && (
                            <div className="flex flex-col text-left overflow-hidden w-full">
                                {isSignedIn ? (
                                    <>
                                        <span className="text-sm font-bold text-text-primary truncate max-w-[100px]">{user?.firstName || user?.username || 'Pilot'}</span>
                                        <span className="text-xs text-accent-primary font-medium whitespace-nowrap">Standard Plan</span>
                                    </>
                                ) : (
                                    <SignInButton mode="modal">
                                        <span className="text-sm font-bold text-text-primary truncate cursor-pointer hover:underline">Sign In</span>
                                    </SignInButton>
                                )}
                            </div>
                        )}
                    </button>
                </div>
            </aside>

            {/* Main Workspace */}
            <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-transparent">
                {/* Topbar */}
                <header className="h-16 border-b border-border-light bg-panel backdrop-blur-2xl flex items-center justify-between px-8 z-50 shrink-0 shadow-sm relative">
                    
                    {/* AI Status Panel (Replaces Search) */}
                    <div 
                        onClick={() => setIsCommandPaletteOpen(true)}
                        className="flex items-center gap-4 bg-panel border border-border-light hover:bg-panel-hover hover:border-border-medium px-4 py-2 rounded-xl cursor-pointer transition-all group shadow-inner"
                    >
                        <div className="flex items-center gap-2 border-r border-border-medium pr-4">
                            <span className="relative flex h-2.5 w-2.5">
                                {aiStatus.status === 'connected' && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-primary opacity-75"></span>}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${aiStatus.status === 'connected' ? 'bg-accent-primary shadow-[0_0_8px_var(--accent-primary)]' : 'bg-accent-danger shadow-[0_0_8px_var(--accent-danger)]'}`}></span>
                            </span>
                            <span className="text-xs font-bold text-text-secondary tracking-wide group-hover:text-text-primary transition-colors">
                                {aiStatus.status === 'connected' ? 'Ollama Connected' : 'Ollama Offline'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 border-r border-border-medium pr-4">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm border ${localStatus === 'online' ? 'bg-accent-success/10 text-accent-success border-accent-success/30' : 'bg-accent-danger/10 text-accent-danger border-accent-danger/30'}`}>
                                {localStatus === 'online' ? '🟢 Offline AI Available' : '🔴 Offline AI Offline'}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-sm border ${cloudStatus === 'online' ? 'bg-accent-success/10 text-accent-success border-accent-success/30' : 'bg-accent-danger/10 text-accent-danger border-accent-danger/30'}`}>
                                {cloudStatus === 'online' ? '🟢 Cloud Service Active' : '🔴 Cloud Service Offline'}
                            </span>
                        </div>
                        <div className="ml-4 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] bg-panel-hover px-1.5 py-0.5 rounded text-text-primary border border-border-medium">Ctrl</span>
                            <span className="text-[10px] bg-panel-hover px-1.5 py-0.5 rounded text-text-primary border border-border-medium">K</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-5 text-text-secondary relative">
                        {/* Theme Toggle */}
                        <button 
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="hover:text-text-primary transition p-2 rounded-full hover:bg-panel border border-transparent hover:border-border-light"
                        >
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </button>
                        
                        {/* Notifications */}
                        <div className="relative" ref={notifRef}>
                            <button 
                                onClick={() => {setShowNotif(!showNotif);}}
                                className={`hover:text-text-primary transition p-2 rounded-full border ${showNotif ? 'bg-panel-hover text-text-primary border-border-medium shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'border-transparent hover:bg-panel hover:border-border-light'}`}
                            >
                                <Bell size={18} />
                                {logs.length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-accent-danger rounded-full animate-pulse border border-bg-base"></span>}
                            </button>
                            
                            {/* Notification Dropdown */}
                            {showNotif && (
                                <div className="absolute right-0 mt-3 w-80 glass-panel overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
                                    <div className="px-4 py-3 border-b border-border-light bg-panel flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-text-primary">Notifications</h3>
                                        <span className="text-xs font-bold text-accent-secondary bg-accent-secondary/10 px-2 py-0.5 rounded-full">{logs.length} new</span>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                                        {logs.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-text-muted">No new notifications</div>
                                        ) : (
                                            [...logs].reverse().slice(0, 10).map((log, i) => (
                                                <div key={i} className="p-3 hover:bg-panel-hover rounded-xl transition-all cursor-pointer flex gap-3 border border-transparent hover:border-border-medium group">
                                                    <div className="w-2 h-2 mt-1.5 rounded-full bg-accent-primary shrink-0 group-hover:scale-125 transition-transform shadow-[0_0_8px_var(--accent-primary)]"></div>
                                                    <div>
                                                        <p className="text-sm text-text-secondary group-hover:text-text-primary transition-colors line-clamp-2">{log.message}</p>
                                                        <span className="text-xs text-text-muted mt-1 block">{log.time}</span>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Profile - UserButton */}
                        <div className="relative ml-2 flex items-center justify-center">
                            {isSignedIn ? (
                                <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "w-9 h-9" } }} />
                            ) : (
                                <SignInButton mode="modal">
                                    <button className="w-9 h-9 rounded-full bg-gradient-to-tr from-accent-secondary to-accent-primary shadow-[0_0_15px_rgba(165,104,255,0.3)] flex items-center justify-center text-text-primary text-sm font-bold border-2 transition-all uppercase hover:scale-105 border-border-light">
                                        AI
                                    </button>
                                </SignInButton>
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
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-bg-base/60 backdrop-blur-xl px-4 animate-in fade-in duration-200">
                    <div className="glass-panel p-8 max-w-md w-full relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-secondary to-accent-primary"></div>
                        
                        <div className="flex flex-col items-center text-center space-y-4">
                            <div className="w-16 h-16 rounded-2xl bg-accent-warning/10 flex items-center justify-center text-accent-warning border border-accent-warning/20 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
                                <AlertTriangle size={32} />
                            </div>
                            
                            <h2 className="text-2xl font-black text-text-primary tracking-wide uppercase drop-shadow-md">Identity Required</h2>
                            
                            <p className="text-text-secondary text-sm leading-relaxed">
                                This sector is restricted. Establishing a neural link is required to unlock advanced analytics, daily challenges, and personalized telemetry.
                            </p>

                            <div className="flex gap-3 w-full pt-4">
                                <button 
                                    onClick={() => setShowUpgradeModal(false)}
                                    className="flex-1 py-3 px-4 bg-panel hover:bg-panel-hover text-text-primary rounded-xl transition-all text-sm font-bold uppercase tracking-wider border border-border-light hover:border-border-medium"
                                >
                                    Cancel
                                </button>
                                <SignInButton mode="modal">
                                    <button 
                                        onClick={() => setShowUpgradeModal(false)}
                                        className="flex-1 py-3 px-4 bg-gradient-to-r from-accent-secondary to-accent-primary hover:shadow-[0_0_20px_rgba(165,104,255,0.4)] hover:scale-105 text-white rounded-xl transition-all text-sm font-bold uppercase tracking-wider"
                                    >
                                        Establish Link
                                    </button>
                                </SignInButton>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Layout;
