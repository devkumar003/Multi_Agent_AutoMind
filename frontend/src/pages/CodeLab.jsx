import React, { useState, useEffect } from 'react';
import { Play, RotateCcw, TerminalSquare, CheckCircle, Wand2, AlertTriangle, ArrowLeft, Lightbulb, Activity, FileText } from 'lucide-react';
import axios from 'axios';
import Editor from '@monaco-editor/react';
import useAgentStore from '../store/useAgentStore';
import useAuthStore from '../store/useAuthStore';

const CodeLab = () => {
    const { codeContext, setCodeContext, challengeId, setChallengeId, activeChallenge, setActiveChallenge, codeLanguage, setCodeLanguage, setActivePage } = useAgentStore();
    const { isAuthenticated, guestUsageCount, incrementGuestUsage, token } = useAuthStore();
    
    const [code, setCode] = useState(codeContext || "def hello_world():\n    print('Hello AutoThink AI!')\n\nhello_world()");
    const [output, setOutput] = useState("");
    const [isRunning, setIsRunning] = useState(false);
    const [isFixing, setIsFixing] = useState(false);
    const [submitStatus, setSubmitStatus] = useState(null);
    const [language, setLanguage] = useState(codeLanguage || "python");
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [activeTab, setActiveTab] = useState('description');
    const [bottomTab, setBottomTab] = useState('testcase');
    const [selectedCase, setSelectedCase] = useState(0);

    const templates = {
        python: "def hello_world():\n    print('Hello AutoThink AI!')\n\nhello_world()",
        javascript: "function helloWorld() {\n    console.log('Hello AutoThink AI!');\n}\n\nhelloWorld();",
        c: "#include <stdio.h>\n\nint main() {\n    printf(\"Hello AutoThink AI!\\n\");\n    return 0;\n}",
        cpp: "#include <iostream>\n\nint main() {\n    std::cout << \"Hello AutoThink AI!\" << std::endl;\n    return 0;\n}"
    };

    const handleLanguageChange = (e) => {
        const newLang = e.target.value;
        setLanguage(newLang);
        setCodeLanguage(newLang);
        if (code === templates[language] || code.trim() === "") {
            setCode(templates[newLang]);
        }
    };

    useEffect(() => {
        if (codeContext) setCode(codeContext);
        if (challengeId) {
            setLanguage('python');
            setCodeLanguage('python');
        } else if (codeLanguage && codeLanguage !== language) {
            setLanguage(codeLanguage);
        }
    }, [codeContext, codeLanguage, challengeId]);

    const handleRun = async () => {
        if (!isAuthenticated) {
            if (guestUsageCount >= 5) {
                setShowLimitModal(true);
                return;
            }
            incrementGuestUsage();
        }

        setIsRunning(true);
        setBottomTab('console');
        setOutput("Executing via AutoThink Core Backend...");
        setSubmitStatus(null);
        try {
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            if (challengeId) {
                const res = await axios.post("http://127.0.0.1:8000/api/challenge/submit", {
                    challenge_id: activeChallenge.id,
                    code: code
                }, { headers: { Authorization: `Bearer ${token}` }});
                
                if (res.data.error) {
                    setOutput(`SECURITY VALIDATION FAILED:\n${res.data.error}`);
                } else {
                    setOutput(res.data.output);
                }
                setSubmitStatus(res.data.passed ? 'success' : 'failed');
            } else {
                const res = await axios.post("http://127.0.0.1:8000/api/code/run", { code: code, language: language }, config);
                setOutput(res.data.output || "Process finished gracefully with code " + res.data.exit_code);
                setSubmitStatus(res.data.exit_code !== 0 ? 'failed' : 'success');
            }
        } catch (error) {
            setOutput("Execution Error: Cannot reach backend server.");
        } finally {
            setIsRunning(false);
        }
    };

    const handleFixError = async () => {
        setIsFixing(true);
        setOutput("AI Agent is analyzing the stack trace and writing a fix...");
        try {
            const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
            const res = await axios.post("http://127.0.0.1:8000/api/code/fix", {
                code: code,
                error_output: output,
                language: language
            }, config);
            setCode(res.data.fixed_code);
            setOutput("Code automatically fixed by AI! Ready to run.");
            setSubmitStatus(null);
        } catch(err) {
            setOutput("Failed to reach AI for fixing.");
        } finally {
            setIsFixing(false);
        }
    };

    const handleClear = () => {
        if (challengeId) {
            setCode(activeChallenge?.template_code || "");
        } else {
            setCode(templates[language]);
        }
        setOutput("");
        setSubmitStatus(null);
    };

    const handleBack = () => {
        setChallengeId(null);
        setActiveChallenge(null);
        setActivePage('daily-challenge');
    };

    if (challengeId && activeChallenge) {
        return (
            <div className="h-full w-full flex flex-col lg:flex-row gap-4 p-4 overflow-hidden bg-bg-base">
                {/* LEFT PANE: Problem Space */}
                <div className="w-full lg:w-[45%] flex flex-col glass-panel !rounded-3xl overflow-hidden relative">
                    <div className="flex items-center gap-6 border-b border-border-light px-6 py-4 bg-panel">
                        <button onClick={handleBack} className="text-text-muted hover:text-text-primary transition-colors mr-2"><ArrowLeft size={20} /></button>
                        <button onClick={() => setActiveTab('description')} className={`${activeTab === 'description' ? 'text-accent-primary border-b-2 border-accent-primary' : 'text-text-secondary hover:text-text-primary'} font-bold pb-1 flex items-center gap-2 transition-colors`}><FileText size={16}/> Description</button>
                        <button onClick={() => setActiveTab('editorial')} className={`${activeTab === 'editorial' ? 'text-accent-primary border-b-2 border-accent-primary' : 'text-text-secondary hover:text-text-primary'} font-bold pb-1 flex items-center gap-2 transition-colors`}><Lightbulb size={16}/> Editorial</button>
                        <button onClick={() => setActiveTab('submissions')} className={`${activeTab === 'submissions' ? 'text-accent-primary border-b-2 border-accent-primary' : 'text-text-secondary hover:text-text-primary'} font-bold pb-1 flex items-center gap-2 transition-colors`}><Activity size={16}/> Submissions</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                        {activeTab === 'description' && (
                            <>
                                <h1 className="text-3xl font-black text-text-primary mb-4 tracking-tight">{activeChallenge.title}</h1>
                                <div className="flex items-center gap-3 mb-8">
                                    <span className={`bg-${activeChallenge.difficulty==='Easy'?'green':activeChallenge.difficulty==='Medium'?'orange':'red'}-500/10 border border-${activeChallenge.difficulty==='Easy'?'green':activeChallenge.difficulty==='Medium'?'orange':'red'}-500/20 text-${activeChallenge.difficulty==='Easy'?'green':activeChallenge.difficulty==='Medium'?'orange':'red'}-400 text-xs font-bold px-4 py-1.5 rounded-full tracking-wide uppercase`}>
                                        {activeChallenge.difficulty}
                                    </span>
                                    <span className="text-text-muted text-sm font-medium bg-panel px-3 py-1.5 rounded-full">~{activeChallenge.time_estimate_mins} mins</span>
                                    <span className="text-accent-primary font-bold text-sm tracking-wide bg-accent-primary/10 px-3 py-1.5 rounded-full border border-accent-primary/20">+{activeChallenge.xp_reward} XP</span>
                                </div>
                                
                                <div className="prose prose-invert max-w-none text-text-secondary">
                                    <div dangerouslySetInnerHTML={{ __html: (activeChallenge.description || "").replace(/\n/g, '<br/>') }} className="leading-relaxed text-[15px]" />
                                    
                                    <h3 className="text-lg font-bold text-text-primary mt-10 mb-4 flex items-center gap-2">
                                        <AlertTriangle size={18} className="text-accent-warning" /> Constraints
                                    </h3>
                                    <div className="bg-panel p-5 rounded-2xl border border-border-light font-mono text-[13px] text-accent-warning/80 shadow-inner">
                                        <div dangerouslySetInnerHTML={{ __html: (activeChallenge.constraints || "No constraints specified.").replace(/\n/g, '<br/>') }} />
                                    </div>
                                </div>
                            </>
                        )}
                        {activeTab !== 'description' && (
                            <div className="h-full flex items-center justify-center text-text-muted flex-col gap-4">
                                <Lightbulb size={48} className="opacity-20" />
                                <p>Unlock this section by establishing a neural link or solving the problem.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT PANE: Code + Output */}
                <div className="w-full lg:w-[55%] flex flex-col gap-4">
                    {/* Code Editor Area */}
                    <div className="flex-1 flex flex-col glass-panel !rounded-3xl overflow-hidden relative group">
                        <div className="absolute inset-0 bg-gradient-to-br from-accent-secondary/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-panel">
                            <div className="flex items-center gap-4">
                                <select 
                                    value={language} 
                                    onChange={handleLanguageChange} 
                                    disabled={isRunning} 
                                    className="bg-bg-base border border-border-medium text-text-secondary text-sm font-bold rounded-xl px-4 py-2 outline-none focus:border-accent-secondary cursor-pointer"
                                >
                                    <option value="python" className="text-black">Python3</option>
                                    <option value="javascript" className="text-black">Node.js</option>
                                    <option value="cpp" className="text-black">C++</option>
                                </select>
                            </div>
                            <div className="flex items-center gap-3">
                                {submitStatus === 'failed' && (
                                    <button onClick={handleFixError} disabled={isFixing || isRunning} className="bg-accent-secondary/10 hover:bg-accent-secondary/20 text-accent-secondary border border-accent-secondary/30 font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 text-xs animate-pulse">
                                        {isFixing ? <RotateCcw size={14} className="animate-spin" /> : <Wand2 size={14} />}
                                        Auto-Fix
                                    </button>
                                )}
                                <button onClick={handleClear} className="text-text-muted hover:text-text-primary transition-colors bg-panel hover:bg-panel-hover p-2.5 rounded-xl border border-border-light"><RotateCcw size={16} /></button>
                            </div>
                        </div>
                        <div className="flex-1 relative bg-bg-base pt-4">
                            <Editor 
                                height="100%"
                                language={language}
                                theme="vs-dark"
                                value={code}
                                onChange={(val) => setCode(val)}
                                options={{ 
                                    minimap: { enabled: false }, 
                                    fontSize: 15,
                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                    padding: { top: 16 },
                                    scrollBeyondLastLine: false,
                                    smoothScrolling: true,
                                    cursorBlinking: "smooth",
                                    cursorSmoothCaretAnimation: "on",
                                    formatOnPaste: true,
                                }}
                            />
                        </div>
                    </div>

                    {/* Output Console */}
                    <div className="h-72 flex flex-col glass-panel !rounded-3xl overflow-hidden">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-border-light bg-panel">
                            <div className="flex gap-6">
                                <button onClick={() => setBottomTab('testcase')} className={`${bottomTab === 'testcase' ? 'text-accent-primary border-b-2 border-accent-primary' : 'text-text-secondary hover:text-text-primary'} font-bold pb-1 flex items-center gap-2 transition-colors`}>
                                    <CheckCircle size={14}/> Testcase
                                </button>
                                <button onClick={() => setBottomTab('console')} className={`${bottomTab === 'console' ? 'text-accent-primary border-b-2 border-accent-primary' : 'text-text-secondary hover:text-text-primary'} font-bold pb-1 flex items-center gap-2 transition-colors`}>
                                    <TerminalSquare size={14} /> Test Result
                                </button>
                            </div>
                            <button onClick={handleRun} disabled={isRunning} className="bg-gradient-to-tr from-accent-secondary to-accent-primary hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] text-white font-bold px-6 py-2 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 text-sm tracking-wide">
                                {isRunning ? <RotateCcw size={16} className="animate-spin" /> : <Play size={16} className="fill-white" />}
                                Submit Solution
                            </button>
                        </div>
                        {bottomTab === 'console' ? (
                            <pre className={`flex-1 p-6 font-mono text-[14px] overflow-auto bg-bg-base whitespace-pre-wrap custom-scrollbar leading-relaxed ${submitStatus === 'failed' ? 'text-accent-danger' : submitStatus === 'success' ? 'text-accent-success' : 'text-text-secondary'}`}>
                                {output || "Awaiting execution..."}
                            </pre>
                        ) : (
                            <div className="flex-1 flex flex-col bg-bg-base p-4 overflow-hidden">
                                {(() => {
                                    const stCases = activeChallenge.structured_test_cases || [];
                                    const legCases = activeChallenge.legacy_test_cases ? activeChallenge.legacy_test_cases.split('\n').filter(c => c.trim().length > 0) : [];
                                    
                                    if (stCases.length > 0) {
                                        const cIdx = Math.min(selectedCase, stCases.length - 1);
                                        const tc = stCases[cIdx] || stCases[0];
                                        return (
                                            <>
                                                <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2">
                                                    {stCases.map((_, idx) => (
                                                        <button 
                                                            key={idx} 
                                                            onClick={() => setSelectedCase(idx)}
                                                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedCase === idx ? 'bg-panel-hover text-text-primary border border-border-medium' : 'bg-transparent text-text-muted hover:bg-panel border border-transparent'}`}
                                                        >
                                                            Case {idx + 1}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                                                    <div>
                                                        <span className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2 block">Input</span>
                                                        <div className="bg-panel border border-border-light p-4 rounded-xl font-mono text-sm text-text-secondary break-all whitespace-pre-wrap">
                                                            {tc.input_data}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <span className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2 block">Expected Output</span>
                                                        <div className="bg-panel border border-border-light p-4 rounded-xl font-mono text-sm text-text-secondary break-all whitespace-pre-wrap">
                                                            {tc.expected_output}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    } else if (legCases.length > 0) {
                                        const cIdx = Math.min(selectedCase, legCases.length - 1);
                                        const tc = legCases[cIdx] || legCases[0];
                                        return (
                                            <>
                                                <div className="flex gap-2 mb-4 overflow-x-auto custom-scrollbar pb-2">
                                                    {legCases.map((_, idx) => (
                                                        <button 
                                                            key={idx} 
                                                            onClick={() => setSelectedCase(idx)}
                                                            className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${selectedCase === idx ? 'bg-panel-hover text-text-primary border border-border-medium' : 'bg-transparent text-text-muted hover:bg-panel border border-transparent'}`}
                                                        >
                                                            Case {idx + 1}
                                                        </button>
                                                    ))}
                                                </div>
                                                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2">
                                                    <div>
                                                        <span className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2 block">Input Assertion</span>
                                                        <div className="bg-panel border border-border-light p-4 rounded-xl font-mono text-sm text-text-secondary break-all">
                                                            {tc}
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        );
                                    } else {
                                        return <div className="text-text-muted p-2 text-sm font-mono">No predefined testcases found for this challenge.</div>;
                                    }
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Default Sandbox Layout
    return (
        <div className="h-full w-full p-8 flex flex-col relative bg-bg-base">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 shrink-0 gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-accent-primary/10 text-accent-primary p-2.5 rounded-xl border border-accent-primary/20 shadow-[0_0_15px_rgba(0,217,255,0.2)]">
                        <TerminalSquare size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary mb-0.5">Code Lab Sandbox</h1>
                        <p className="text-text-muted text-sm">Experiment and run arbitrary code natively.</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {submitStatus === 'failed' && (
                        <button onClick={handleFixError} disabled={isFixing || isRunning} className="bg-gradient-to-tr from-accent-secondary to-accent-primary text-white font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-[0_0_20px_rgba(165,104,255,0.3)] disabled:opacity-50 text-sm animate-pulse border-none">
                            {isFixing ? <RotateCcw size={16} className="animate-spin" /> : <Wand2 size={16} />}
                            Auto-Fix
                        </button>
                    )}
                    <select 
                        value={language}
                        onChange={handleLanguageChange}
                        disabled={isRunning || isFixing}
                        className="bg-panel border border-border-medium text-text-secondary text-sm font-medium rounded-xl px-4 py-2.5 outline-none focus:border-accent-primary cursor-pointer shadow-sm min-w-[140px] disabled:opacity-50"
                    >
                        <option value="python" className="text-black">Python</option>
                        <option value="javascript" className="text-black">Node.js</option>
                        <option value="c" className="text-black">C (GCC)</option>
                        <option value="cpp" className="text-black">C++ (G++)</option>
                    </select>
                    <button onClick={handleClear} disabled={isRunning || isFixing} className="bg-panel border border-border-light text-text-muted hover:text-text-primary hover:bg-panel-hover p-2.5 rounded-xl transition-colors shadow-sm disabled:opacity-50">
                        <RotateCcw size={18} />
                    </button>
                    <button onClick={handleRun} disabled={isRunning || isFixing} className="bg-gradient-to-tr from-accent-secondary to-accent-primary hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] text-white font-bold px-6 py-2.5 rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 border-none">
                        {isRunning ? <RotateCcw size={16} className="animate-spin" /> : <Play size={16} className="fill-white" />}
                        Run Code
                    </button>
                </div>
            </div>

            <div className="glass-panel !rounded-3xl flex flex-col flex-1 overflow-hidden shadow-2xl mb-6 relative z-10 transition-colors">
                <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-border-light bg-panel">
                    <div className="flex items-center gap-4">
                        <span className="text-[13px] font-mono text-text-secondary tracking-wide">main.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : language === 'c' ? 'c' : 'cpp'}</span>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-accent-success/10 rounded-lg border border-accent-success/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-accent-success animate-pulse"></span>
                            <span className="text-[10px] text-accent-success uppercase tracking-widest font-bold">Synced</span>
                        </div>
                    </div>
                </div>
                <div className="flex-1 relative bg-bg-base pt-4">
                    <Editor 
                        height="100%"
                        language={language}
                        theme="vs-dark"
                        value={code}
                        onChange={(val) => setCode(val)}
                        options={{ 
                            minimap: { enabled: false }, 
                            fontSize: 15,
                            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                            padding: { top: 16 },
                            scrollBeyondLastLine: false,
                        }}
                    />
                </div>
            </div>

            <div className="glass-panel !rounded-3xl flex flex-col h-72 shrink-0 shadow-xl z-20">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-light bg-panel">
                    <div className="flex items-center gap-2 text-text-muted text-[12px] font-bold uppercase tracking-widest">
                        <TerminalSquare size={16} className="text-accent-primary" /> Output Console
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-success ml-2 animate-pulse"></span>
                    </div>
                </div>
                <pre className="flex-1 p-6 font-mono text-[14px] overflow-auto bg-bg-base text-text-secondary leading-relaxed custom-scrollbar whitespace-pre-wrap">
                    {output || "Output will appear here..."}
                </pre>
            </div>

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
                                Unregistered pilots are limited to 5 code executions. To unlock unlimited compute processing and save your lab environments, please establish a neural link.
                            </p>
                            <div className="flex gap-3 w-full pt-4">
                                <button onClick={() => setShowLimitModal(false)} className="flex-1 py-3 px-4 bg-panel hover:bg-panel-hover border border-border-light text-text-primary rounded-xl transition-colors text-sm font-bold uppercase tracking-wider">Cancel</button>
                                <button onClick={() => window.location.href = '/auth'} className="flex-1 py-3 px-4 bg-gradient-to-r from-accent-danger to-orange-500 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] text-white rounded-xl transition-all text-sm font-bold uppercase tracking-wider border-none">Establish Link</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CodeLab;
