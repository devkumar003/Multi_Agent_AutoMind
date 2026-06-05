import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Search, Code, CheckCircle, Zap } from 'lucide-react';
import useAgentStore from '../store/useAgentStore';

const SpinnerRing = ({ isThinking, isCompleted, colorClass }) => (
    <svg className="absolute inset-0 w-full h-full -rotate-90 scale-[1.15]" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
        {isThinking && (
            <motion.circle
                cx="50" cy="50" r="48" fill="none" className={colorClass} strokeWidth="2" strokeLinecap="round" strokeDasharray="100 200"
                animate={{ strokeDasharray: ["0 300", "150 150", "300 0"], rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
        )}
        {isCompleted && (
            <motion.circle
                cx="50" cy="50" r="48" fill="none" className={colorClass} strokeWidth="1.5" strokeLinecap="round"
                initial={{ strokeDasharray: "0 300" }}
                animate={{ strokeDasharray: "300 0" }}
                transition={{ duration: 0.8 }}
            />
        )}
    </svg>
);

const AgentCard = ({ agent, index }) => {
    const isThinking = agent.status === 'thinking';
    const isCompleted = agent.status === 'completed';

    const icons = {
        'Research Agent': <Search size={24} className={isCompleted ? 'text-primary' : 'text-gray-400'} />,
        'Reasoning Agent': <Brain size={24} className={isCompleted ? 'text-secondary' : 'text-gray-400'} />,
        'Coding Agent': <Code size={24} className={isCompleted ? 'text-accent' : 'text-gray-400'} />,
        'Critic Agent': <CheckCircle size={24} className={isCompleted ? 'text-green-400' : 'text-gray-400'} />,
        'Optimizer Agent': <Zap size={24} className={isCompleted ? 'text-yellow-400' : 'text-gray-400'} />,
        'Smart Routing Agent': <Zap size={24} className={isCompleted ? 'text-yellow-400' : 'text-gray-400'} />,
    };

    const getColors = (id) => {
        if (id.includes('Research')) return { text: 'text-[#00D9FF]', border: 'border-[#00D9FF]', stroke: 'stroke-[#00D9FF]', bg: 'bg-[#00D9FF]', shadow: 'shadow-[#00D9FF]' };
        if (id.includes('Reasoning')) return { text: 'text-[#8B5CF6]', border: 'border-[#8B5CF6]', stroke: 'stroke-[#8B5CF6]', bg: 'bg-[#8B5CF6]', shadow: 'shadow-[#8B5CF6]' };
        if (id.includes('Coding')) return { text: 'text-[#00FFA3]', border: 'border-[#00FFA3]', stroke: 'stroke-[#00FFA3]', bg: 'bg-[#00FFA3]', shadow: 'shadow-[#00FFA3]' };
        if (id.includes('Critic')) return { text: 'text-[#FF3366]', border: 'border-[#FF3366]', stroke: 'stroke-[#FF3366]', bg: 'bg-[#FF3366]', shadow: 'shadow-[#FF3366]' };
        return { text: 'text-[#F59E0B]', border: 'border-[#F59E0B]', stroke: 'stroke-[#F59E0B]', bg: 'bg-[#F59E0B]', shadow: 'shadow-[#F59E0B]' };
    };
    const c = getColors(agent.id);

    return (
        <div className="flex flex-col items-center gap-4 relative z-10 w-32">
            <div className="text-[10px] font-bold text-gray-500 tracking-[0.2em] uppercase">Step 0{index + 1}</div>
            
            {/* Holographic Core */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-700
                    ${isThinking ? `shadow-[0_0_40px_rgba(0,0,0,0.5)] bg-[#0B1020]` : 'bg-[#060816] border border-white/5'}
                `}
            >
                <SpinnerRing isThinking={isThinking} isCompleted={isCompleted} colorClass={c.stroke} />

                {isThinking && (
                    <div className={`absolute inset-0 ${c.bg} opacity-10 rounded-full animate-ping`} />
                )}

                <div className={`z-10 p-4 rounded-full relative transition-colors duration-500 
                    ${isThinking ? `${c.bg}/20 shadow-[inset_0_0_15px_rgba(255,255,255,0.1)]` : 'bg-transparent'}
                    ${isCompleted ? `${c.bg}/10` : ''}
                `}>
                    {React.cloneElement(icons[agent.id], { className: isCompleted || isThinking ? c.text : 'text-gray-500' })}
                    
                    {isCompleted && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`absolute 0 right-0 ${c.bg} rounded-full p-0.5 shadow-[0_0_10px_rgba(0,0,0,0.8)]`}>
                            <CheckCircle size={10} className="text-[#060816]" />
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Labels */}
            <div className="flex flex-col items-center text-center mt-2">
                <h3 className={`text-xs font-bold tracking-wider uppercase mb-1.5 ${isCompleted || isThinking ? 'text-white drop-shadow-md' : 'text-gray-500'}`}>
                    {agent.id}
                </h3>
                <div className="h-8 flex items-center justify-center">
                    {isThinking ? (
                        <p className={`text-[10px] ${c.text} font-mono uppercase tracking-widest whitespace-nowrap animate-pulse`}>
                            {agent.action || 'Initializing...'}
                        </p>
                    ) : isCompleted ? (
                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 ${c.bg}/10 ${c.text} rounded border ${c.border}/20`}>Verified</span>
                    ) : (
                        <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 bg-white/5 text-gray-600 rounded">Standby</span>
                    )}
                </div>
            </div>
        </div>
    );
};

const AgentWorkflow = ({ vertical = false }) => {
    const { agents, chatMode } = useAgentStore();
    
    const displayAgents = chatMode === 'smart' 
        ? [{ 
            id: 'Smart Routing Agent', 
            status: agents.some(a => a.status === 'thinking') ? 'thinking' : (agents.some(a => a.status === 'completed') ? 'completed' : 'idle'), 
            action: agents.find(a => a.status === 'thinking')?.action || '' 
          }] 
        : agents;

    if (vertical) {
        return (
            <div className="flex flex-col items-center gap-0 w-full py-2">
                {displayAgents.map((agent, i) => (
                    <React.Fragment key={agent.id}>
                        <AgentCard agent={agent} index={i} />
                        {i < displayAgents.length - 1 && (
                            <div className="flex flex-col items-center h-10 w-[1px] relative">
                                <div className="absolute inset-0 w-[1px] bg-white/5 mx-auto overflow-hidden">
                                    {displayAgents[i].status === 'completed' && (
                                        <motion.div
                                            key={`vtrack-${i}`}
                                            initial={{ height: 0 }}
                                            animate={{ height: '100%' }}
                                            transition={{ duration: 0.6 }}
                                            className="w-full bg-[#00D9FF] shadow-[0_0_10px_#00D9FF]"
                                        />
                                    )}
                                    {displayAgents[i].status === 'thinking' && (
                                        <>
                                            <div className="absolute inset-0 bg-white/10" />
                                            <motion.div
                                                className="absolute left-0 top-0 w-[1px] h-1/3 bg-gradient-to-b from-transparent via-[#00D9FF] to-transparent shadow-[0_0_8px_#00D9FF]"
                                                initial={{ y: '-100%' }}
                                                animate={{ y: '300%' }}
                                                transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    return (
        <div className={`w-full pb-8 pt-4 overflow-x-auto no-scrollbar ${chatMode === 'smart' ? 'flex justify-center' : ''}`}>
            <div className="flex items-center justify-between min-w-max px-4">
                {displayAgents.map((agent, i) => (
                    <React.Fragment key={agent.id}>
                        <AgentCard agent={agent} index={i} />
                        {i < displayAgents.length - 1 && (
                            <div className="flex-1 min-w-[80px] max-w-[120px] flex items-center justify-center -mt-10 px-2">
                                <div className="relative w-full h-[1px] bg-white/5 overflow-hidden">
                                    {displayAgents[i].status === 'completed' && (
                                        <motion.div
                                            key={`tracker-${i}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 0.8 }}
                                            className="absolute inset-0 bg-[#00D9FF] shadow-[0_0_10px_#00D9FF]"
                                        />
                                    )}
                                    {displayAgents[i].status === 'thinking' && (
                                        <>
                                            <div className="absolute inset-0 bg-white/10" />
                                            <motion.div
                                                className="absolute top-0 left-0 h-[1px] w-1/3 bg-gradient-to-r from-transparent via-[#00D9FF] to-transparent shadow-[0_0_8px_#00D9FF]"
                                                initial={{ x: '-100%' }}
                                                animate={{ x: '300%' }}
                                                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                                            />
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </React.Fragment>
                ))}
            </div>
        </div>
    );
};

export default AgentWorkflow;

