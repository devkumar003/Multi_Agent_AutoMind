import React, { useRef, useEffect } from 'react';
import { Terminal } from 'lucide-react';
import useAgentStore from '../store/useAgentStore';
import { motion } from 'framer-motion';

const ActivityLog = () => {
    const { logs } = useAgentStore();
    const endRef = useRef(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="flex flex-col flex-1 min-h-[200px] overflow-hidden relative">

            <div className="bg-panel border-b border-border-light p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal size={18} className="text-accent-secondary" />
                    <h3 className="font-semibold text-text-primary">Execution Telemetry</h3>
                </div>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-accent-danger/50"></div>
                    <div className="w-3 h-3 rounded-full bg-accent-warning/50"></div>
                    <div className="w-3 h-3 rounded-full bg-accent-success/50"></div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs custom-scrollbar bg-bg-base">
                {logs.map((log, idx) => (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={idx}
                        className="flex gap-3 text-text-secondary"
                    >
                        <span className="text-text-muted shrink-0">[{log.time}]</span>
                        <span className={`${log.color || 'text-accent-primary'} font-bold shrink-0`}>❯</span>
                        <span className="leading-relaxed whitespace-pre-wrap flex-1">{log.message}</span>
                    </motion.div>
                ))}
                <div ref={endRef} />
                {logs.length === 0 && (
                    <div className="text-text-muted italic flex h-full items-center justify-center animate-pulse">
                        System standing by. Awaiting commands...
                    </div>
                )}
            </div>
        </div>
    );
}

export default ActivityLog;
