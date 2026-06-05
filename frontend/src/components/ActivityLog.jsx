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

            <div className="bg-black/40 border-b border-white/5 p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Terminal size={18} className="text-secondary" />
                    <h3 className="font-semibold text-gray-200">Execution Telemetry</h3>
                </div>
                <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs custom-scrollbar bg-black/20">
                {logs.map((log, idx) => (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        key={idx}
                        className="flex gap-3 text-gray-300"
                    >
                        <span className="text-gray-500 shrink-0">[{log.time}]</span>
                        <span className={`${log.color || 'text-primary'} font-bold shrink-0`}>❯</span>
                        <span className="leading-relaxed whitespace-pre-wrap flex-1">{log.message}</span>
                    </motion.div>
                ))}
                <div ref={endRef} />
                {logs.length === 0 && (
                    <div className="text-gray-600 italic flex h-full items-center justify-center animate-pulse">
                        System standing by. Awaiting commands...
                    </div>
                )}
            </div>
        </div>
    );
}

export default ActivityLog;
