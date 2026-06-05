import React, { useRef, useEffect, useState } from 'react';
import { Send, Sparkles, Mic, Paperclip, X, FileText, FileJson, FileCode, File } from 'lucide-react';
import useAgentStore from '../store/useAgentStore';

const InputPanel = ({ onSubmit }) => {
    const { problem, setProblem, overallStatus, chatMode, messages } = useAgentStore();
    const isThinking = overallStatus === 'thinking';
    const textareaRef = useRef(null);
    const fileInputRef = useRef(null);
    const [selectedFiles, setSelectedFiles] = useState([]);

    const suggestions = [
        "Solve the N-Queens problem dynamically?",
        "Design a scalable microservices architecture..",
        "Write an optimized Python Quicksort"
    ];

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [problem]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if ((problem.trim() || selectedFiles.length > 0) && !isThinking) {
                handleInternalSubmit();
            }
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            setSelectedFiles(prev => [...prev, ...files]);
        }
        // Reset input so same file can be selected again
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleInternalSubmit = () => {
        onSubmit(selectedFiles);
        setSelectedFiles([]); // Clear files after submit
    };

    const getFileIcon = (fileName) => {
        const ext = fileName.split('.').pop().toLowerCase();
        if (['js', 'jsx', 'ts', 'tsx', 'py', 'cpp', 'java'].includes(ext)) return <FileCode size={14} />;
        if (['json', 'yaml', 'yml'].includes(ext)) return <FileJson size={14} />;
        if (['txt', 'md', 'csv'].includes(ext)) return <FileText size={14} />;
        return <File size={14} />;
    };

    return (
        <div className="flex flex-col items-center justify-center w-full mt-6 mb-10 z-20">

            {/* Input Container */}
            <div className="relative w-full max-w-4xl group transition-all duration-300">
                {/* Dynamic Outer Glow based on Mode */}
                <div className={`absolute -inset-0.5 rounded-3xl blur-[20px] opacity-40 transition duration-700 group-hover:opacity-70 group-focus-within:opacity-100 group-focus-within:blur-[30px] 
                    ${isThinking ? 'bg-accent-primary animate-pulse' : 
                      chatMode === 'fast' ? 'bg-gradient-to-r from-accent-secondary to-accent-secondary/50' : 
                      chatMode === 'smart' ? 'bg-gradient-to-r from-accent-primary to-accent-secondary' : 
                      'bg-gradient-to-r from-accent-success to-accent-secondary'}`}>
                </div>

                <div className="relative flex flex-col bg-bg-base/60 backdrop-blur-3xl border border-border-light rounded-3xl shadow-[inset_0_0_20px_rgba(255,255,255,0.02),_0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 overflow-hidden">
                    
                    {/* File Previews */}
                    {selectedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 px-4 pt-4 pb-2">
                            {selectedFiles.map((file, i) => (
                                <div key={i} className="flex items-center gap-2 bg-panel border border-border-light rounded-lg px-3 py-1.5 text-xs text-text-secondary group/file">
                                    {getFileIcon(file.name)}
                                    <span className="max-w-[120px] truncate">{file.name}</span>
                                    <button 
                                        onClick={() => removeFile(i)}
                                        className="text-text-muted hover:text-accent-danger transition-colors border-none bg-transparent"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="flex items-end px-4 py-3">
                        <div className={`p-3 shrink-0 self-start transition-colors duration-300
                            ${chatMode === 'fast' ? 'text-accent-secondary' : 
                              chatMode === 'smart' ? 'text-accent-primary' : 
                              'text-accent-success'}`}>
                            <Sparkles size={24} className={isThinking ? 'animate-pulse' : ''} />
                        </div>

                        <div className="w-full relative flex flex-col justify-center">
                            <textarea
                                ref={textareaRef}
                                value={problem}
                                onChange={(e) => setProblem(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={chatMode === 'fast' ? "> Ask the Fast LLM..." : chatMode === 'smart' ? "> Ask the Smart Router..." : "> Command the Swarm..."}
                                className="w-full bg-transparent text-text-primary text-lg placeholder-text-muted focus:outline-none resize-none pt-3 pb-2 px-2 max-h-[200px] overflow-y-auto no-scrollbar font-mono tracking-tight"
                                rows={1}
                                disabled={isThinking}
                                style={{ minHeight: '56px' }}
                            />
                            {!problem && <span className="absolute left-2 top-3 text-lg text-text-muted pointer-events-none font-mono animate-pulse">_</span>}
                        </div>

                        <div className="flex items-center gap-2 pl-2 shrink-0 mb-1">
                            <input 
                                type="file" 
                                multiple 
                                ref={fileInputRef} 
                                onChange={handleFileChange} 
                                className="hidden" 
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isThinking}
                                className="p-2 text-text-muted hover:text-text-primary transition rounded-full hover:bg-panel border-none bg-transparent"
                                title="Upload files"
                            >
                                <Paperclip size={20} />
                            </button>
                            <button className="p-2 text-text-muted hover:text-text-primary transition rounded-full hover:bg-panel hidden sm:block border-none bg-transparent">
                                <Mic size={20} />
                            </button>
                            <button
                                onClick={handleInternalSubmit}
                                disabled={(!problem.trim() && selectedFiles.length === 0) || isThinking}
                                className={`flex items-center justify-center h-12 w-12 sm:w-auto sm:px-6 rounded-2xl font-bold transition-all duration-500 uppercase tracking-widest text-xs
                                    ${(!problem.trim() && selectedFiles.length === 0) || isThinking ? 'bg-panel text-text-muted cursor-not-allowed border border-border-light' : 
                                    chatMode === 'fast' ? 'bg-gradient-to-r from-accent-secondary/20 to-accent-secondary/40 text-accent-secondary border border-accent-secondary/50 hover:shadow-[0_0_30px_rgba(0,217,255,0.4)] hover:scale-105 active:scale-95' :
                                    chatMode === 'smart' ? 'bg-gradient-to-r from-accent-primary/20 to-accent-primary/40 text-accent-primary border border-accent-primary/50 hover:shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:scale-105 active:scale-95' :
                                    'bg-gradient-to-r from-accent-success/20 to-accent-success/40 text-accent-success border border-accent-success/50 hover:shadow-[0_0_30px_rgba(0,255,163,0.4)] hover:scale-105 active:scale-95'}`}
                            >
                                {isThinking ? (
                                    <div className="w-5 h-5 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send size={18} className="sm:hidden" />
                                        <span className="hidden sm:block tracking-wide">Run</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Suggestions — only when chat is empty */}
            {messages.length === 0 && (
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6 max-w-4xl w-full">
                {suggestions.map((s, i) => (
                    <button
                        key={i}
                        onClick={() => setProblem(s)}
                        disabled={isThinking}
                        className="px-5 py-2 rounded-xl bg-panel border border-border-light text-text-secondary hover:text-text-primary hover:bg-panel-hover hover:border-border-medium transition-all text-sm font-medium whitespace-nowrap shadow-sm hover:shadow-md"
                    >
                        {s}
                    </button>
                ))}
            </div>
            )}

        </div>
    );
};

export default InputPanel;
