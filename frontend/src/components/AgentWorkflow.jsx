import React from 'react';
import { motion } from 'framer-motion';
import { Brain, Search, Code, CheckCircle, Zap } from 'lucide-react';
import useAgentStore from '../store/useAgentStore';

const SpinnerRing = ({ isThinking, isCompleted, colorClass }) => (
    <svg className="absolute inset-0 w-full h-full -rotate-90 scale-[1.15]" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="48" fill="none" stroke="var(--border-light)" strokeWidth="1" />
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
        'Research Agent': <Search size={24} className={isCompleted ? 'text-accent-secondary' : 'text-text-muted'} />,
        'Reasoning Agent': <Brain size={24} className={isCompleted ? 'text-accent-primary' : 'text-text-muted'} />,
        'Coding Agent': <Code size={24} className={isCompleted ? 'text-accent-success' : 'text-text-muted'} />,
        'Critic Agent': <CheckCircle size={24} className={isCompleted ? 'text-accent-danger' : 'text-text-muted'} />,
        'Optimizer Agent': <Zap size={24} className={isCompleted ? 'text-accent-warning' : 'text-text-muted'} />,
        'Smart Routing Agent': <Zap size={24} className={isCompleted ? 'text-accent-warning' : 'text-text-muted'} />,
    };

    const getColors = (id) => {
        if (id.includes('Research')) return { text: 'text-accent-secondary', border: 'border-accent-secondary', stroke: 'stroke-accent-secondary', bg: 'bg-accent-secondary', shadow: 'shadow-accent-secondary' };
        if (id.includes('Reasoning')) return { text: 'text-accent-primary', border: 'border-accent-primary', stroke: 'stroke-accent-primary', bg: 'bg-accent-primary', shadow: 'shadow-accent-primary' };
        if (id.includes('Coding')) return { text: 'text-accent-success', border: 'border-accent-success', stroke: 'stroke-accent-success', bg: 'bg-accent-success', shadow: 'shadow-accent-success' };
        if (id.includes('Critic')) return { text: 'text-accent-danger', border: 'border-accent-danger', stroke: 'stroke-accent-danger', bg: 'bg-accent-danger', shadow: 'shadow-accent-danger' };
        return { text: 'text-accent-warning', border: 'border-accent-warning', stroke: 'stroke-accent-warning', bg: 'bg-accent-warning', shadow: 'shadow-accent-warning' };
    };
    const c = getColors(agent.id);

    return (
        <div className="flex flex-col items-center gap-4 relative z-10 w-32">
            <div className="text-[10px] font-bold text-text-muted tracking-[0.2em] uppercase">Step 0{index + 1}</div>
            
            {/* Holographic Core */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-700
                    ${isThinking ? `shadow-lg bg-panel-hover` : 'bg-panel border border-border-light'}
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
                    {React.cloneElement(icons[agent.id], { className: isCompleted || isThinking ? c.text : 'text-text-muted' })}
                    
                    {isCompleted && (
                        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className={`absolute 0 right-0 ${c.bg} rounded-full p-0.5 shadow-[0_0_10px_rgba(0,0,0,0.8)]`}>
                            <CheckCircle size={10} className="text-[color:var(--bg-base)]" />
                        </motion.div>
                    )}
                </div>
            </motion.div>

            {/* Labels */}
            <div className="flex flex-col items-center text-center mt-2">
                <h3 className={`text-xs font-bold tracking-wider uppercase mb-1.5 ${isCompleted || isThinking ? 'text-text-primary drop-shadow-md' : 'text-text-muted'}`}>
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
                        <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 bg-panel border border-border-light text-text-muted rounded">Standby</span>
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
                                <div className="absolute inset-0 w-[1px] bg-border-light mx-auto overflow-hidden">
                                    {displayAgents[i].status === 'completed' && (
                                        <motion.div
                                            key={`vtrack-${i}`}
                                            initial={{ height: 0 }}
                                            animate={{ height: '100%' }}
                                            transition={{ duration: 0.6 }}
                                            className="w-full bg-accent-secondary shadow-lg"
                                        />
                                    )}
                                    {displayAgents[i].status === 'thinking' && (
                                        <>
                                            <div className="absolute inset-0 bg-border-light" />
                                            <motion.div
                                                className="absolute left-0 top-0 w-[1px] h-1/3 bg-gradient-to-b from-transparent via-accent-secondary to-transparent shadow-lg"
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
                                <div className="relative w-full h-[1px] bg-border-light overflow-hidden">
                                    {displayAgents[i].status === 'completed' && (
                                        <motion.div
                                            key={`tracker-${i}`}
                                            initial={{ width: 0 }}
                                            animate={{ width: '100%' }}
                                            transition={{ duration: 0.8 }}
                                            className="absolute inset-0 bg-accent-secondary shadow-lg"
                                        />
                                    )}
                                    {displayAgents[i].status === 'thinking' && (
                                        <>
                                            <div className="absolute inset-0 bg-border-light" />
                                            <motion.div
                                                className="absolute top-0 left-0 h-[1px] w-1/3 bg-gradient-to-r from-transparent via-accent-secondary to-transparent shadow-lg"
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
