import React, { useEffect, useState } from 'react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';
import useAgentStore from '../../store/useAgentStore';
import { ArrowLeft, Play, LayoutList, Trophy } from 'lucide-react';
import Editor from "@monaco-editor/react";

export default function ContestArena() {
    const { token } = useAuthStore();
    const { adminContext, setActivePage } = useAgentStore();
    const contest = adminContext?.activeContest;
    
    const [challenges, setChallenges] = useState([]);
    const [activeChallenge, setActiveChallenge] = useState(null);
    const [code, setCode] = useState("");
    const [leaderboard, setLeaderboard] = useState([]);
    
    const [isRunning, setIsRunning] = useState(false);
    const [output, setOutput] = useState("");
    const [score, setScore] = useState(0);

    useEffect(() => {
        if (!contest || !token) return;
        
        axios.get(`http://127.0.0.1:8000/api/contests/${contest.id}`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            setChallenges(res.data.challenges);
            if (res.data.challenges.length > 0) {
                setActiveChallenge(res.data.challenges[0]);
                setCode(res.data.challenges[0].template_code);
            }
        }).catch(console.error);
        
        fetchLeaderboard();
        
        // Polling leaderboard
        const interval = setInterval(fetchLeaderboard, 10000);
        return () => clearInterval(interval);
    }, [contest, token]);
    
    const fetchLeaderboard = () => {
        if (!contest) return;
        axios.get(`http://127.0.0.1:8000/api/contests/${contest.id}/leaderboard`, {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => setLeaderboard(res.data)).catch(console.error);
    }

    const handleSubmit = async () => {
        if (!activeChallenge) return;
        setIsRunning(true);
        setOutput("Executing secure sandbox environment...\nRunning test cases...\n");
        try {
            const res = await axios.post("http://127.0.0.1:8000/api/challenge/submit", {
                challenge_id: activeChallenge.id,
                code: code,
                contest_id: contest.id
            }, { headers: { Authorization: `Bearer ${token}` }});
            
            if (res.data.error) {
                setOutput(`SECURITY VALIDATION FAILED:\n${res.data.error}`);
            } else {
                setOutput(res.data.output);
                setScore(res.data.score);
                fetchLeaderboard();
            }
        } catch(e) {
            setOutput("Execution failed: " + e.message);
        } finally {
            setIsRunning(false);
        }
    };

    if (!contest) return <div className="p-8 text-white"><button onClick={()=>setActivePage('contest-list')}>Back</button><p>No contest selected.</p></div>;

    return (
        <div className="flex flex-col h-full bg-[#050505] text-white">
            <header className="flex items-center justify-between p-4 bg-[#0a0a0f] border-b border-white/5 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => setActivePage('contest-list')} className="p-2 hover:bg-white/10 rounded-lg transition-colors"><ArrowLeft className="w-5 h-5"/></button>
                    <h1 className="font-bold text-lg text-pink-400 uppercase tracking-widest">{contest.title}</h1>
                </div>
                <div className="flex gap-4 items-center">
                    <span className="text-sm font-mono text-gray-400 bg-white/5 px-3 py-1 rounded-full border border-white/10">Ends: {new Date(contest.end_time).toLocaleTimeString()}</span>
                </div>
            </header>

            <div className="flex-1 overflow-hidden flex">
                {/* Left Panel: Problems & Leaderboard */}
                <div className="w-1/3 border-r border-white/5 flex flex-col bg-[#0a0a0f]/50">
                    <div className="p-4 border-b border-white/5">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><LayoutList className="w-4 h-4"/> Challenges</h2>
                        <div className="space-y-2">
                            {challenges.map((c, i) => (
                                <button key={c.id} onClick={() => { setActiveChallenge(c); setCode(c.template_code); setOutput(""); }} className={`w-full text-left p-3 rounded-xl border transition-all text-sm ${activeChallenge?.id === c.id ? 'bg-pink-500/10 border-pink-500/30 text-pink-400' : 'bg-black/40 border-white/5 hover:border-white/20 text-gray-300'}`}>
                                    {i+1}. {c.title}
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Trophy className="w-4 h-4 text-yellow-500"/> Live Leaderboard</h2>
                        <div className="space-y-2">
                            {leaderboard.map(p => (
                                <div key={p.rank} className="flex justify-between items-center p-3 rounded-xl bg-black/40 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <span className={`font-black text-sm ${p.rank === 1 ? 'text-yellow-400' : p.rank === 2 ? 'text-gray-300' : p.rank === 3 ? 'text-orange-400' : 'text-gray-500'}`}>#{p.rank}</span>
                                        <span className="font-bold text-sm text-gray-200">{p.username}</span>
                                    </div>
                                    <span className="text-pink-400 font-mono text-sm">{p.score} pts</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Middle Panel: Editor */}
                <div className="w-1/3 border-r border-white/5 flex flex-col bg-[#050505]">
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            language="python"
                            value={code}
                            onChange={(val) => setCode(val)}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                padding: { top: 20 },
                                scrollBeyondLastLine: false,
                            }}
                        />
                    </div>
                    <div className="p-4 border-t border-white/5 bg-[#0a0a0f] flex justify-between items-center">
                        <span className="text-xs text-gray-500">Python 3.10 Runtime</span>
                        <button onClick={handleSubmit} disabled={isRunning} className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-pink-500 to-orange-500 rounded-xl text-white font-bold hover:shadow-[0_0_15px_rgba(236,72,153,0.4)] transition-all disabled:opacity-50">
                            <Play className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} /> {isRunning ? 'EXECUTING...' : 'SUBMIT SOLUTION'}
                        </button>
                    </div>
                </div>

                {/* Right Panel: Output & Description */}
                <div className="w-1/3 flex flex-col bg-[#0a0a0f]/50">
                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar border-b border-white/5">
                        <h2 className="text-xl font-bold mb-4">{activeChallenge?.title}</h2>
                        <div className="prose prose-invert prose-sm max-w-none text-gray-400">
                            {activeChallenge?.description || "No description provided."}
                        </div>
                        
                        {activeChallenge?.input_format && (
                            <div className="mt-6">
                                <h3 className="text-sm font-bold text-white mb-2 uppercase tracking-widest">Input Format</h3>
                                <div className="bg-black/50 p-3 rounded-lg border border-white/5 text-sm font-mono text-gray-300 whitespace-pre-wrap">{activeChallenge.input_format}</div>
                            </div>
                        )}
                        
                        {activeChallenge?.structured_test_cases?.length > 0 && (
                            <div className="mt-8">
                                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Public Test Cases</h3>
                                <div className="space-y-4">
                                    {activeChallenge.structured_test_cases.map((tc, idx) => (
                                        <div key={idx} className="bg-[#050505] p-4 rounded-xl border border-white/5 shadow-inner">
                                            <div className="text-xs text-pink-500 font-bold mb-3 uppercase tracking-widest flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div> Test Case {idx + 1}
                                            </div>
                                            <div className="grid grid-cols-1 gap-3">
                                                <div>
                                                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Input</span>
                                                    <div className="font-mono text-[13px] text-gray-300 mt-1 bg-white/5 px-3 py-2 rounded-lg border border-white/5 whitespace-pre-wrap">{tc.input_data}</div>
                                                </div>
                                                <div>
                                                    <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Expected Output</span>
                                                    <div className="font-mono text-[13px] text-[#00D9FF] mt-1 bg-white/5 px-3 py-2 rounded-lg border border-white/5 whitespace-pre-wrap">{tc.expected_output}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {activeChallenge?.legacy_test_cases && (!activeChallenge.structured_test_cases || activeChallenge.structured_test_cases.length === 0) && (
                            <div className="mt-8">
                                <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest">Legacy Test Cases</h3>
                                <div className="bg-[#050505] p-4 rounded-xl border border-white/5 font-mono text-sm text-gray-300 whitespace-pre-wrap shadow-inner">
                                    {activeChallenge.legacy_test_cases}
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div className="h-64 flex flex-col bg-black">
                        <div className="px-4 py-2 border-b border-white/5 bg-[#0a0a0f]">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Execution Output</span>
                        </div>
                        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar font-mono text-sm text-gray-300 whitespace-pre-wrap">
                            {output || "Awaiting execution..."}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
