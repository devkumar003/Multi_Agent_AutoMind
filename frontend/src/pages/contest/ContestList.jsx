import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import useAgentStore from '../../store/useAgentStore';
import { Trophy, Clock, Users, ArrowRight } from 'lucide-react';

export default function ContestList() {
    const { token, user } = useAuthStore();
    const { setActivePage, setAdminContext } = useAgentStore();
    const [contests, setContests] = useState([]);

    useEffect(() => {
        if (token) {
            axios.get("http://127.0.0.1:8000/api/contests", {
                headers: { Authorization: `Bearer ${token}` }
            }).then(res => setContests(res.data)).catch(console.error);
        }
    }, [token]);

    const handleEnter = (c, isUpcoming) => {
        if (isUpcoming && (!user || user.is_admin < 1)) {
            alert("This contest has not started yet.");
            return;
        }
        setAdminContext({ activeContest: c });
        setActivePage('contest-arena');
    };

    return (
        <div className="p-8 space-y-8 max-w-6xl mx-auto h-full overflow-y-auto custom-scrollbar text-white">
            <div className="text-center space-y-4 py-12">
                <div className="inline-block p-4 rounded-3xl bg-pink-500/10 text-pink-500 border border-pink-500/20 mb-4 animate-bounce">
                    <Trophy className="w-12 h-12" />
                </div>
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-orange-400 uppercase tracking-widest">
                    Global Arenas
                </h1>
                <p className="text-gray-400 max-w-2xl mx-auto text-lg">Compete against the world's best neural operatives in real-time algorithm battles.</p>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {contests.map(c => {
                    const isActive = new Date() >= new Date(c.start_time) && new Date() <= new Date(c.end_time);
                    const isUpcoming = new Date() < new Date(c.start_time);
                    const isPast = new Date() > new Date(c.end_time);
                    
                    return (
                        <div key={c.id} className={`bg-[#0a0a0f]/80 backdrop-blur-xl border ${isActive ? 'border-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.15)]' : 'border-white/10'} rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 transition-all hover:bg-black/60`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-4 mb-3">
                                    <h2 className="text-2xl font-bold">{c.title}</h2>
                                    {isActive ? (
                                        <span className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 text-xs font-bold rounded-full animate-pulse flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div> LIVE NOW</span>
                                    ) : isUpcoming ? (
                                        <span className="px-3 py-1 bg-gray-500/20 border border-gray-500/30 text-gray-400 text-xs font-bold rounded-full">UPCOMING</span>
                                    ) : (
                                        <span className="px-3 py-1 bg-gray-500/20 border border-gray-500/30 text-gray-400 text-xs font-bold rounded-full">ENDED</span>
                                    )}
                                </div>
                                <p className="text-gray-400">{c.description}</p>
                                
                                <div className="flex gap-6 mt-6">
                                    <div className="flex items-center gap-2 text-sm text-gray-300 bg-white/5 px-4 py-2 rounded-xl">
                                        <Clock className="w-4 h-4 text-pink-400" /> 
                                        {isUpcoming ? `Starts: ${new Date(c.start_time).toLocaleString()}` : isPast ? `Ended: ${new Date(c.end_time).toLocaleString()}` : `Ends: ${new Date(c.end_time).toLocaleString()}`}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-300 bg-white/5 px-4 py-2 rounded-xl">
                                        <Users className="w-4 h-4 text-blue-400" /> Public
                                    </div>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => handleEnter(c, isUpcoming)} 
                                disabled={isUpcoming && (!user || user.is_admin < 1)}
                                className={`px-8 py-4 rounded-xl font-black uppercase tracking-widest flex items-center gap-3 transition-all 
                                    ${isActive ? 'bg-gradient-to-r from-pink-500 to-orange-500 hover:shadow-[0_0_25px_rgba(236,72,153,0.5)] text-white' : 
                                    (isUpcoming && (!user || user.is_admin < 1)) ? 'bg-white/5 text-gray-600 cursor-not-allowed' : 
                                    'bg-white/10 text-gray-400 hover:bg-white/20'}`}
                            >
                                {isActive ? 'Enter Arena' : 
                                 isUpcoming ? ((user && user.is_admin >= 1) ? 'Enter (Admin)' : 'Starts Soon') : 
                                 'View Details'} <ArrowRight className="w-5 h-5" />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
