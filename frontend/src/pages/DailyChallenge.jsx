import React, { useEffect, useState } from 'react';
import { Flame, Star, CheckCircle, Clock, Sparkles, RotateCcw } from 'lucide-react';
import axios from 'axios';
import useAgentStore from '../store/useAgentStore';
import useAuthStore from '../store/useAuthStore';

const DailyChallenge = () => {
    const { setCodeContext, setChallengeId, setActivePage, setActiveChallenge } = useAgentStore();
    const { token } = useAuthStore();
    
    const [stats, setStats] = useState({ streak: 0, xp: 0 });
    const [challenges, setChallenges] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

    const fetchChallenges = () => {
        const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
        axios.get(`${import.meta.env.VITE_CLOUD_API_URL}/api/challenges`, config).then(res => setChallenges(res.data)).catch(console.error);
    };

    useEffect(() => {
        if (!token) return;
        const config = { headers: { Authorization: `Bearer ${token}` } };
        axios.get(`${import.meta.env.VITE_CLOUD_API_URL}/api/user/profile`, config).then(res => setStats(res.data.stats)).catch(console.error);
        fetchChallenges();
    }, [token]);

    const handleGenerateChallenge = async () => {
        setIsGenerating(true);
        try {
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            await axios.post(`${import.meta.env.VITE_CLOUD_API_URL}/api/challenges/generate`, {}, config);
            fetchChallenges();
        } catch (error) {
            console.error("Failed to generate AI challenge", error);
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSolve = (challenge) => {
        setChallengeId(challenge.id);
        setActiveChallenge(challenge);
        setCodeContext(challenge.template_code);
        setActivePage('code-lab');
    };

    return (
        <div className="h-full w-full p-8 overflow-y-auto">
            {/* Header Widgets */}
            <div className="w-full glass-panel !rounded-[2rem] p-10 mb-12 shadow-xl flex flex-col md:flex-row items-center justify-between relative overflow-hidden">
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-[80px] -translate-y-1/2 pointer-events-none"></div>
                
                <div className="relative z-10 text-center md:text-left mb-6 md:mb-0">
                    <h1 className="text-4xl font-black text-text-primary mb-3 tracking-tight">Daily Challenges</h1>
                    <p className="text-text-secondary text-lg">Keep your mind sharp with algorithmic challenges.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
                    <div className="bg-panel border border-border-light px-8 py-4 rounded-2xl flex items-center gap-5 shadow-lg relative overflow-hidden group hover:border-orange-500/30 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="p-2.5 bg-orange-500/10 rounded-xl rounded-full border border-orange-500/20">
                            <Flame className="text-orange-500" size={26} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] text-text-muted font-bold uppercase tracking-[0.2em] mb-0.5">Streak</span>
                            <span className="text-text-primary font-extrabold text-2xl tracking-wide">{stats.streak || 0} Days</span>
                        </div>
                    </div>
                    
                    <div className="bg-panel border border-border-light px-8 py-4 rounded-2xl flex items-center gap-5 shadow-[0_0_30px_rgba(234,179,8,0.05)] relative overflow-hidden group hover:border-accent-warning/30 transition-colors">
                        <div className="absolute inset-0 bg-gradient-to-r from-accent-warning/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="p-2.5 bg-accent-warning/10 rounded-xl rounded-full border border-accent-warning/20">
                            <Star className="text-accent-warning" size={26} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[11px] text-text-muted font-bold uppercase tracking-[0.2em] mb-0.5">XP POINTS</span>
                            <span className="text-text-primary font-extrabold text-2xl tracking-wide">{stats.xp || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Problem Set */}
            <div className="max-w-[1400px]">
                <div className="flex justify-between items-center mb-8">
                    <h2 className="text-2xl font-bold text-text-primary flex items-center gap-3 tracking-wide">
                        Live Problem Set
                    </h2>
                    <button 
                        onClick={handleGenerateChallenge} 
                        disabled={isGenerating}
                        className="bg-gradient-to-tr from-accent-secondary to-accent-primary hover:brightness-110 border-none text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)] disabled:opacity-50"
                    >
                        {isGenerating ? <RotateCcw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                        {isGenerating ? "Inventing Algorithm..." : "Generate AI Challenge ✨"}
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {challenges.map(c => (
                        <div key={c.id} className={`glass-panel !rounded-[2rem] p-8 flex flex-col justify-between min-h-[320px] transition-all group ${c.status === 'completed' ? 'border-accent-success/30 opacity-80' : 'hover:-translate-y-1.5 shadow-xl'}`}>
                            {c.status === 'completed' && (
                                <div className="absolute top-6 right-6 bg-accent-success/10 p-2 rounded-full border border-accent-success/20 shadow-[0_0_15px_rgba(34,197,94,0.2)]">
                                    <CheckCircle size={22} className="text-accent-success" />
                                </div>
                            )}
                            <div className={c.status === 'completed' ? 'opacity-60' : ''}>
                                <div className="flex justify-between items-center mb-6">
                                    <span className={`${c.difficulty==='Easy'?'bg-accent-success/10 border-accent-success/20 text-accent-success':c.difficulty==='Medium'?'bg-orange-500/10 border-orange-500/20 text-orange-500':'bg-accent-danger/10 border-accent-danger/20 text-accent-danger'} border text-xs font-bold px-3 py-1.5 rounded-lg tracking-wide uppercase`}>{c.difficulty}</span>
                                    <span className="text-text-muted text-sm font-medium flex items-center gap-1.5"><Clock size={14}/> {c.time_estimate_mins} mins</span>
                                </div>
                                <h3 className={`text-2xl font-bold ${c.status === 'completed' ? 'text-text-muted line-through decoration-text-muted decoration-2' : 'text-text-primary'} mb-5 leading-tight`}>{c.title}</h3>
                                <div className="flex flex-wrap gap-2.5 mb-8">
                                    {c.tags.map(t => (
                                        <span key={t} className="text-xs font-mono bg-bg-base border border-border-light text-text-muted px-2.5 py-1.5 rounded-lg">{t}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-between mt-auto">
                                <span className={`${c.status === 'completed' ? 'text-text-muted' : 'text-accent-primary'} font-black text-lg tracking-wide`}>+{c.xp_reward} XP</span>
                                
                                {c.status === 'completed' ? (
                                     <span className="text-accent-success bg-accent-success/10 px-4 py-2 rounded-xl font-bold tracking-wide border border-accent-success/20">Completed</span>
                                ) : (
                                    <button onClick={() => handleSolve(c)} className="bg-text-primary text-[color:var(--bg-base)] font-bold px-6 py-2.5 border-none rounded-xl transition-colors shadow-md hover:bg-text-secondary">Solve <span className="ml-1">→</span></button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            <div className="h-24" />
        </div>
    );
};

export default DailyChallenge;
