import { create } from 'zustand';

let msgCounter = 0;

const useAgentStore = create((set) => ({
    activePage: 'dashboard',
    setActivePage: (page) => set({ activePage: page }),

    problem: '',
    setProblem: (problem) => set({ problem }),
    
    chatMode: 'fast',
    setChatMode: (mode) => set({ chatMode: mode }),
    
    useMemory: true,
    setUseMemory: (useMemory) => set({ useMemory }),
    
    // Legacy context array sent to the backend for memory
    chatHistory: [],
    clearHistory: () => set({ chatHistory: [], messages: [] }),
    addHistory: (entry) => set((state) => ({ chatHistory: [...state.chatHistory, entry] })),
    
    // ── NEW: Persistent Chat Feed ──
    messages: [],
    addMessage: (msg) => set((state) => ({
        messages: [...state.messages, { ...msg, id: ++msgCounter, timestamp: Date.now() }]
    })),
    updateLastAiMessage: (patch) => set((state) => {
        const msgs = [...state.messages];
        for (let i = msgs.length - 1; i >= 0; i--) {
            if (msgs[i].role === 'ai') {
                msgs[i] = { ...msgs[i], ...patch };
                break;
            }
        }
        return { messages: msgs };
    }),

    codeContext: '',
    setCodeContext: (codeContext) => set({ codeContext }),
    codeLanguage: 'python',
    setCodeLanguage: (codeLanguage) => set({ codeLanguage }),
    challengeId: null,
    setChallengeId: (challengeId) => set({ challengeId }),
    activeChallenge: null,
    setActiveChallenge: (activeChallenge) => set({ activeChallenge }),
    
    adminContext: null,
    setAdminContext: (adminContext) => set({ adminContext }),
    
    agents: [
        { id: 'Research Agent', status: 'idle', action: '' },
        { id: 'Reasoning Agent', status: 'idle', action: '' },
        { id: 'Coding Agent', status: 'idle', action: '' },
        { id: 'Critic Agent', status: 'idle', action: '' },
        { id: 'Optimizer Agent', status: 'idle', action: '' }
    ],
    overallStatus: 'idle', // idle, thinking, completed
    finalResult: null,
    logs: [],

    addLog: (message, color = 'text-gray-300') => set((state) => {
        const time = new Date().toLocaleTimeString('en-US', { hour12: false });
        return { logs: [...state.logs, { time, message, color }] };
    }),

    updateAgentStatus: (agentId, status, action = '') => set((state) => ({
        agents: state.agents.map((agent) =>
            agent.id === agentId ? { ...agent, status, action } : agent
        )
    })),

    resetAgents: () => set((state) => ({
        agents: state.agents.map((agent) => ({ ...agent, status: 'idle', action: '' })),
        overallStatus: 'thinking',
        finalResult: null,
        logs: []
    })),

    setOverallStatus: (status) => set({ overallStatus: status }),
    setFinalResult: (result) => set({ finalResult: result }),
}));

export default useAgentStore;
