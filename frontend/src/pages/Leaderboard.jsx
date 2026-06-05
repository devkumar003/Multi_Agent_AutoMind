import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trophy, Medal, Award, Flame, Star, Zap, Info } from 'lucide-react';

const Leaderboard = () => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await axios.get("http://127.0.0.1:8000/api/leaderboard");
                setLeaderboard(res.data.leaderboard);
            } catch (err) {
                setError("Failed to load leaderboard. Server might be offline.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    const getRankIcon = (rank) => {
        if (rank === 1) return <Trophy className="text-accent-warning drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]" size={24} />;
        if (rank === 2) return <Medal className="text-gray-300 drop-shadow-[0_0_8px_rgba(209,213,219,0.8)]" size={24} />;
        if (rank === 3) return <Award className="text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.8)]" size={24} />;
        return <span className="font-bold text-text-muted w-6 text-center">{rank}</span>;
    };

    const getRowStyle = (rank) => {
        if (rank === 1) return "bg-gradient-to-r from-accent-warning/20 to-transparent border-l-4 border-accent-warning";
        if (rank === 2) return "bg-gradient-to-r from-gray-400/20 to-transparent border-l-4 border-gray-300";
        if (rank === 3) return "bg-gradient-to-r from-amber-600/20 to-transparent border-l-4 border-amber-600";
        return "bg-panel hover:bg-panel-hover border border-border-light";
    };

    return (
        <div className="h-full flex flex-col p-8 overflow-y-auto w-full max-w-5xl mx-auto z-10 text-text-primary">
            <header className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gradient-to-tr from-accent-warning to-amber-500 rounded-xl shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                        <Trophy size={28} className="text-white" />
                    </div>
                    <h2 className="text-4xl font-bold tracking-wide">Global Leaderboard</h2>
                    <button onClick={() => setIsModalOpen(true)} className="ml-4 p-2 bg-panel hover:bg-panel-hover border border-border-light rounded-full transition-colors text-text-muted hover:text-accent-secondary" title="Ranking System Info">
                        <Info size={20} />
                    </button>
                </div>
                <p className="text-text-muted text-lg ml-14">Compete against other neural operatives. Complete challenges to earn XP and rank up.</p>
            </header>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Zap className="animate-bounce text-accent-secondary" size={32} />
                    <p className="text-text-muted animate-pulse">Syncing neural ranks...</p>
                </div>
            ) : error ? (
                <div className="glass-panel p-8 text-center border-accent-danger/20 bg-accent-danger/5 text-accent-danger">
                    {error}
                </div>
            ) : (
                <div className="space-y-3 pb-20">
                    <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-bold text-text-muted uppercase tracking-widest border-b border-border-light mb-2">
                        <div className="col-span-1 text-center">Rank</div>
                        <div className="col-span-5">Operative</div>
                        <div className="col-span-3 text-center">Rank Title</div>
                        <div className="col-span-2 text-right">XP Points</div>
                        <div className="col-span-1 text-right">Streak</div>
                    </div>

                    {leaderboard.map((user) => (
                        <div key={user.username} className={`grid grid-cols-12 gap-4 items-center px-6 py-4 rounded-xl transition-all glass-panel ${getRowStyle(user.rank)}`}>
                            <div className="col-span-1 flex justify-center items-center">
                                {getRankIcon(user.rank)}
                            </div>
                            
                            <div className="col-span-5 flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg ${user.rank === 1 ? 'bg-accent-warning text-black' : user.rank === 2 ? 'bg-gray-300 text-black' : user.rank === 3 ? 'bg-amber-600 text-white' : 'bg-gradient-to-br from-accent-secondary to-indigo-600 text-white'}`}>
                                    {user.username.substring(0, 2).toUpperCase()}
                                </div>
                                <span className={`font-bold text-lg ${user.rank <= 3 ? 'text-text-primary' : 'text-text-secondary'}`}>
                                    {user.username}
                                </span>
                            </div>

                            <div className="col-span-3 text-center flex justify-center">
                                <span className="px-3 py-1 bg-bg-base border border-border-light rounded-lg text-xs font-bold text-accent-primary tracking-wide">
                                    {user.title}
                                </span>
                            </div>

                            <div className="col-span-2 text-right font-mono flex items-center justify-end gap-2">
                                <Star size={14} className="text-accent-secondary" />
                                <span className="text-xl font-bold text-text-primary">{user.xp.toLocaleString()}</span>
                            </div>

                            <div className="col-span-1 text-right flex items-center justify-end gap-1">
                                <Flame size={16} className={user.streak > 0 ? "text-orange-500" : "text-text-muted"} />
                                <span className={user.streak > 0 ? "text-orange-400 font-bold" : "text-text-muted"}>{user.streak}</span>
                            </div>
                        </div>
                    ))}

                    {leaderboard.length === 0 && (
                        <div className="text-center py-12 text-text-muted">
                            No operatives found in the system yet. Be the first to earn XP!
                        </div>
                    )}
                </div>
            )}

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-base/60 backdrop-blur-sm px-4">
                    <div className="bg-panel border border-border-light rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden glass-panel animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-text-primary flex items-center gap-2">
                                <Award className="text-accent-secondary" size={24} /> Ranking System
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-text-muted hover:text-text-primary transition text-xl leading-none border-none bg-transparent">✕</button>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-bg-base border border-border-light rounded-xl">
                                <div>
                                    <h4 className="font-bold text-text-primary text-lg">Novice Hacker</h4>
                                    <p className="text-xs text-text-muted">Just getting started</p>
                                </div>
                                <span className="font-mono text-accent-secondary font-bold">0 - 499 XP</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-bg-base border border-border-light rounded-xl">
                                <div>
                                    <h4 className="font-bold text-accent-primary text-lg">Quantum Operative</h4>
                                    <p className="text-xs text-text-muted">Established agents</p>
                                </div>
                                <span className="font-mono text-accent-secondary font-bold">500 - 1999 XP</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-bg-base border border-border-light rounded-xl">
                                <div>
                                    <h4 className="font-bold text-accent-success text-lg">Neural Elite</h4>
                                    <p className="text-xs text-text-muted">High performance</p>
                                </div>
                                <span className="font-mono text-accent-secondary font-bold">2000 - 4999 XP</span>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-accent-secondary/20 to-indigo-500/20 border border-accent-secondary/50 rounded-xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-secondary/20 blur-3xl -z-10"></div>
                                <div>
                                    <h4 className="font-black text-transparent bg-clip-text bg-gradient-to-r from-accent-secondary to-accent-primary text-lg tracking-wide uppercase">AI Overlord</h4>
                                    <p className="text-xs text-text-muted">Maximum authority</p>
                                </div>
                                <span className="font-mono text-text-primary font-bold">5000+ XP</span>
                            </div>
                        </div>
                        
                        <button onClick={() => setIsModalOpen(false)} className="w-full mt-8 py-3 bg-panel hover:bg-panel-hover text-text-primary rounded-xl transition-colors font-bold uppercase tracking-wider text-sm border border-border-light">
                            Understood
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Leaderboard;
