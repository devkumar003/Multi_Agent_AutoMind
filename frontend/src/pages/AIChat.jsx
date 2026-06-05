import React, { useRef, useEffect } from 'react';
import useAgentStore from '../store/useAgentStore';
import useAuthStore from '../store/useAuthStore';
import InputPanel from '../components/InputPanel';
import AgentWorkflow from '../components/AgentWorkflow';
import OutputPanel from '../components/OutputPanel';
import ActivityLog from '../components/ActivityLog';
import axios from 'axios';
import { Brain, Zap, Trash2, ChevronDown, User, Sparkles, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';

const AIChat = () => {
  const {
    problem,
    setProblem,
    setOverallStatus,
    resetAgents,
    setFinalResult,
    addLog,
    overallStatus,
    chatMode,
    setChatMode,
    useMemory,
    setUseMemory,
    chatHistory,
    clearHistory,
    addHistory,
    messages,
    addMessage,
    updateLastAiMessage,
    finalResult
  } = useAgentStore();
  
  const { isAuthenticated, guestUsageCount, incrementGuestUsage } = useAuthStore();
  const [isModeOpen, setIsModeOpen] = React.useState(false);
  const [showLimitModal, setShowLimitModal] = React.useState(false);
  const feedEndRef = useRef(null);

  // Auto-scroll to bottom on new messages or status change
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, overallStatus, finalResult]);

  const handleSubmit = async (files = []) => {
    if (!problem.trim() && files.length === 0) return;

    if (!isAuthenticated) {
      if (guestUsageCount >= 5) {
        setShowLimitModal(true);
        return;
      }
      incrementGuestUsage();
    }

    const userPrompt = problem;
    const currentMode = chatMode;

    // 1) Push the user message into the feed
    addMessage({ role: 'user', content: userPrompt || "Uploaded files", mode: currentMode });

    // 2) Push a placeholder AI message (will be patched when response arrives)
    addMessage({ role: 'ai', content: null, mode: currentMode, result: null, status: 'thinking' });

    // 3) Reset agents & clear the input
    resetAgents();
    setProblem('');
    setOverallStatus('thinking');
    
    let fileContext = "";
    
    try {
      // Handle file uploads first if any
      if (files.length > 0) {
        addLog(`Uploading ${files.length} file(s) for context...`, 'text-[#00D9FF]');
        const formData = new FormData();
        files.forEach(f => formData.append('files', f));
        
        const uploadRes = await axios.post('http://127.0.0.1:8000/api/chat/upload', formData);
        if (uploadRes.data.status === 'ok') {
          fileContext = uploadRes.data.files.map(f => 
            `--- FILE: ${f.filename} ---\n${f.preview}\n--- END FILE ---`
          ).join('\n\n');
          addLog(`Context enriched with ${files.length} file(s).`, 'text-[#00FFA3]');
        }
      }

      addLog(`Connecting to backend swarm [Mode: ${currentMode}]...`, 'text-gray-400');
      const payload = { 
          problem: userPrompt, 
          mode: currentMode,
          history: useMemory ? chatHistory : [],
          file_context: fileContext
      };
      const res = await axios.post('http://127.0.0.1:8000/solve', payload);
      if (res.data.status === 'success') {
        const resultData = res.data.data;
        setFinalResult(resultData);
        setOverallStatus('completed');

        // Patch the placeholder AI message with the real result
        updateLastAiMessage({ result: resultData, status: 'completed' });

        if (useMemory) {
            addHistory({ user: userPrompt, ai: resultData.explanation || resultData.general_res || "Executed successfully." });
        }
      }
    } catch (error) {
      addLog('FATAL: Connection to backend swarm failed.', 'text-red-500');
      setOverallStatus('idle');
      updateLastAiMessage({ result: { explanation: "Failed to connect to the backend swarm. Please check if the server is running." }, status: 'error' });
    }
  };

  return (
    <div className="h-full flex flex-col w-full max-w-7xl mx-auto relative">
      
      {/* ── HEADER ── */}
      <header className="px-8 pt-8 pb-4 flex flex-col md:flex-row md:items-start justify-between gap-4 relative shrink-0 z-10">
        <div className="max-w-3xl">
          <div className="flex items-center gap-3 mb-2">
            <h2 className="text-3xl font-bold tracking-wide text-text-primary">AI Chat</h2>
            <span className="bg-accent-warning/20 text-accent-warning border border-accent-warning/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
              <Zap size={12} fill="currentColor" /> LOCAL AI
            </span>
            {chatMode === 'agent' && (
              <span className="bg-accent-primary/20 text-accent-primary border border-accent-primary/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
                <Brain size={12} /> AGENT MODE
              </span>
            )}
          </div>
          <p className="text-text-muted text-sm">
            {chatMode === 'smart' && "Smart routing: Chat queries \u2192 direct fast LLM \u00b7 Coding queries \u2192 full 5-agent pipeline."}
            {chatMode === 'agent' && "Agent mode: Research \u2192 Reasoning \u2192 Coding \u2192 Critic \u2192 Optimizer. Final answer only after all 5 agents complete."}
            {chatMode === 'fast' && "Fast mode: Direct LLM inference bypassing all multi-agent execution entirely."}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <button 
              onClick={() => setIsModeOpen(!isModeOpen)}
              className="flex items-center gap-2 text-sm bg-panel/60 backdrop-blur-xl hover:bg-panel px-4 py-2 rounded-xl border border-border-light text-text-secondary transition-colors shadow-sm"
            >
              <Zap size={14} className="text-accent-warning" /> Mode
              <span className="flex items-center gap-1 ml-1 font-medium">
                <div className={`w-2 h-2 rounded-full ${chatMode === 'fast' ? 'bg-accent-secondary' : chatMode === 'smart' ? 'bg-accent-primary' : 'bg-accent-success'}`} />
                {chatMode.charAt(0).toUpperCase() + chatMode.slice(1)}
              </span>
              <ChevronDown size={14} className="text-text-muted ml-1" />
            </button>
            
            {isModeOpen && (
              <div className="absolute top-full mt-2 right-0 w-32 bg-panel backdrop-blur-xl border border-border-light rounded-xl shadow-2xl overflow-hidden z-50">
                <button onClick={() => { setChatMode('fast'); setIsModeOpen(false); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-panel-hover transition-colors ${chatMode === 'fast' ? 'bg-panel-hover text-text-primary' : 'text-text-muted'}`}>
                  <div className="w-2 h-2 rounded-full bg-accent-secondary" /> Fast
                </button>
                <button onClick={() => { setChatMode('smart'); setIsModeOpen(false); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-panel-hover transition-colors ${chatMode === 'smart' ? 'bg-panel-hover text-text-primary' : 'text-text-muted'}`}>
                  <div className="w-2 h-2 rounded-full bg-accent-primary" /> Smart
                </button>
                <button onClick={() => { setChatMode('agent'); setIsModeOpen(false); }} className={`w-full flex items-center gap-2 px-4 py-2.5 text-sm hover:bg-panel-hover transition-colors ${chatMode === 'agent' ? 'bg-panel-hover text-text-primary' : 'text-text-muted'}`}>
                  <div className="w-2 h-2 rounded-full bg-accent-success" /> Agent
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 bg-panel/60 backdrop-blur-xl px-4 py-2 rounded-xl border border-border-light text-sm text-text-muted shadow-sm">
            <Brain size={14} className="text-accent-primary" /> Memory 
            <button 
                onClick={() => setUseMemory(!useMemory)}
                className={`w-8 h-4 rounded-full relative ml-1 transition-colors ${useMemory ? 'bg-accent-primary' : 'bg-border-medium'}`}
            >
              <div className={`absolute top-0.5 w-3 h-3 bg-text-primary rounded-full transition-all ${useMemory ? 'right-0.5' : 'left-0.5'}`} />
            </button>
            <span className="text-text-primary text-xs font-bold ml-1">{useMemory ? 'ON' : 'OFF'}</span>
          </div>
          
          <button 
            onClick={clearHistory}
            className="flex items-center gap-2 bg-panel/60 backdrop-blur-xl hover:bg-accent-danger/10 px-4 py-2 rounded-xl border border-border-light hover:border-accent-danger/30 text-sm text-text-muted hover:text-accent-danger transition-colors shadow-sm"
          >
            <Trash2 size={14} /> Clear
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex overflow-hidden relative">

        {/* ── LEFT: SCROLLABLE CHAT FEED ── */}
        <div className={`flex-1 overflow-y-auto px-8 pb-48 custom-scrollbar transition-all duration-500 ${chatMode !== 'fast' ? 'pr-4' : ''}`}>

          {/* Empty State */}
          {messages.length === 0 && overallStatus === 'idle' && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-6 opacity-60">
              <div className="w-16 h-16 rounded-full bg-panel border border-border-light flex items-center justify-center">
                <Sparkles size={28} className="text-accent-secondary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-text-primary mb-2">Start a Conversation</h3>
                <p className="text-text-muted text-sm max-w-md">Ask anything — solve a coding problem, write algorithms, analyze logic, or just chat. Your history will persist until you clear it.</p>
              </div>
            </div>
          )}

          {/* Message Feed */}
          {messages.map((msg) => (
            <div key={msg.id} className="mb-6">
              {msg.role === 'user' ? (
                /* ── USER BUBBLE ── */
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 justify-end"
                >
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2 mb-1.5 justify-end">
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">You</span>
                      <span className={`text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded
                        ${msg.mode === 'fast' ? 'bg-accent-secondary/10 text-accent-secondary' : msg.mode === 'smart' ? 'bg-accent-primary/10 text-accent-primary' : 'bg-accent-success/10 text-accent-success'}`}>
                        {msg.mode}
                      </span>
                    </div>
                    <div className="bg-panel/80 backdrop-blur-xl border border-border-light rounded-2xl rounded-tr-sm px-5 py-3 text-text-secondary text-sm shadow-lg">
                      {msg.content}
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-accent-primary/20 border border-accent-primary/30 flex items-center justify-center shrink-0 mt-5">
                    <User size={14} className="text-accent-primary" />
                  </div>
                </motion.div>
              ) : (
                /* ── AI BUBBLE ── */
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-accent-secondary/20 border border-accent-secondary/30 flex items-center justify-center shrink-0 mt-5">
                    <Sparkles size={14} className="text-accent-secondary" />
                  </div>
                  <div className="flex-1 max-w-4xl">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] text-text-muted uppercase tracking-widest font-bold">AutoMind AI</span>
                    </div>

                    {msg.status === 'thinking' && !msg.result ? (
                      /* ── THINKING STATE ── */
                      <div className="bg-panel/60 backdrop-blur-xl border border-border-light rounded-2xl rounded-tl-sm p-6 shadow-lg">
                        <div className="flex items-center gap-3 text-accent-secondary">
                          <div className="w-5 h-5 border-2 border-accent-secondary/30 border-t-accent-secondary rounded-full animate-spin" />
                          <span className="text-sm font-mono animate-pulse uppercase tracking-widest">
                            {msg.mode === 'fast' ? 'Generating...' : 'Agents processing → see pipeline →'}
                          </span>
                        </div>
                      </div>
                    ) : msg.result ? (
                      /* ── COMPLETED RESULT ── */
                      <OutputPanel result={msg.result} />
                    ) : msg.status === 'error' ? (
                      <div className="bg-accent-danger/10 border border-accent-danger/20 rounded-2xl rounded-tl-sm px-5 py-3 text-accent-danger text-sm">
                        Connection failed. Please check the backend.
                      </div>
                    ) : null}
                  </div>
                </motion.div>
              )}
            </div>
          ))}

          {/* Scroll Anchor */}
          <div ref={feedEndRef} />
        </div>

        {/* ── RIGHT: AGENT PIPELINE SIDEBAR ── */}
        {chatMode !== 'fast' && (
          <div className="w-72 shrink-0 border-l border-border-light overflow-y-auto custom-scrollbar bg-bg-base/40 backdrop-blur-xl flex flex-col">
            
            {/* Pipeline Header */}
            <div className="p-4 border-b border-border-light">
              <div className="flex items-center gap-2 mb-1">
                <Brain size={14} className="text-accent-primary" />
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted">Agent Pipeline</span>
              </div>
              <p className="text-[10px] text-text-secondary">Research → Reasoning → Coding → Critic → Optimizer</p>
            </div>

            {/* Vertical Agent Workflow */}
            <div className="flex-1 p-4">
              <AgentWorkflow vertical />
            </div>

            {/* Activity Log */}
            <div className="border-t border-border-light">
              <ActivityLog />
            </div>
          </div>
        )}

      </div>

      {/* ── FIXED BOTTOM INPUT ── */}
      <div className="absolute bottom-0 left-0 right-0 z-30" style={{ right: chatMode !== 'fast' ? '288px' : '0' }}>
        <div className="absolute inset-x-0 -top-20 h-20 bg-gradient-to-t from-bg-base to-transparent pointer-events-none" />
        <div className="px-8 pb-6 bg-bg-base/80 backdrop-blur-2xl">
          <InputPanel onSubmit={handleSubmit} />
        </div>
      </div>
      {/* Limit Reached Modal */}
      {showLimitModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-bg-base/60 backdrop-blur-sm px-4">
            <div className="glass-panel !rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.15)] relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent-danger to-orange-500"></div>
                
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-accent-danger/10 flex items-center justify-center text-accent-danger border border-accent-danger/20">
                        <AlertTriangle size={32} />
                    </div>
                    
                    <h2 className="text-2xl font-black text-text-primary tracking-wide uppercase">Compute Limit Reached</h2>
                    
                    <p className="text-text-secondary text-sm leading-relaxed">
                        Unregistered pilots are limited to 5 high-speed computational requests. To unlock unlimited processing power and save your chat history, please establish a neural link.
                    </p>

                    <div className="flex gap-3 w-full pt-4">
                        <button 
                            onClick={() => setShowLimitModal(false)}
                            className="flex-1 py-3 px-4 bg-panel hover:bg-panel-hover border border-border-light text-text-primary rounded-xl transition-colors text-sm font-bold uppercase tracking-wider"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => window.location.href = '/auth'}
                            className="flex-1 py-3 px-4 bg-gradient-to-r from-accent-danger to-orange-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] text-white border-none rounded-xl transition-all text-sm font-bold uppercase tracking-wider"
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

export default AIChat;
