import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ShieldCheck, ArrowRight, Brain, Zap, Terminal, Fingerprint, Activity } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { useNavigate } from 'react-router-dom';

const FuturisticBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Moving Nebulas */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#8B5CF6]/10 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#00D9FF]/10 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Scanner Line */}
      <motion.div 
        initial={{ top: '-10%' }}
        animate={{ top: '110%' }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        className="absolute left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#8B5CF6]/40 to-transparent shadow-[0_0_15px_#8B5CF6]"
      />

      {/* Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.05]" 
           style={{ 
             backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', 
             backgroundSize: '30px 30px' 
           }} 
      />
    </div>
  );
};

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [booting, setBooting] = useState(true);
  
  const { login, register, loading, error, clearError, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setBooting(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    if (isLogin) {
      await login(email, password);
    } else {
      await register(username, email, password);
    }
  };

  if (booting) {
    return (
      <div className="min-h-screen bg-[#060816] flex flex-col items-center justify-center font-mono">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-[#8B5CF6] text-sm tracking-[0.5em] mb-4"
        >
          INITIALIZING_CORE_SYSTEM
        </motion.div>
        <div className="w-64 h-1 bg-white/5 rounded-full overflow-hidden relative">
          <motion.div 
            initial={{ left: '-100%' }}
            animate={{ left: '100%' }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 w-1/2 h-full bg-gradient-to-r from-transparent via-[#8B5CF6] to-transparent"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060816] flex items-center justify-center p-4 overflow-hidden relative selection:bg-[#8B5CF6]/30">
      <FuturisticBackground />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-lg z-10"
      >
        {/* Decorative HUD Elements */}
        <div className="absolute -top-16 -left-16 w-32 h-32 border-t-2 border-l-2 border-[#8B5CF6]/20 rounded-tl-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-32 h-32 border-b-2 border-r-2 border-[#00D9FF]/20 rounded-br-3xl pointer-events-none" />
        
        {/* Floating Data Tags */}
        <motion.div 
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
          className="absolute -right-24 top-20 hidden xl:flex flex-col gap-2"
        >
          <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-[#8B5CF6] font-bold tracking-tighter">NODE_SECURED</div>
          <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-[#00D9FF] font-bold tracking-tighter">ENCRYPTION_ACTIVE</div>
        </motion.div>

        <div className="bg-[#0A0D1B]/40 backdrop-blur-3xl border border-white/10 rounded-[40px] p-10 shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden group">
          {/* Inner Glow Pulse */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#8B5CF6]/5 via-transparent to-[#00D9FF]/5 animate-pulse pointer-events-none" />
          
          {/* Top Header Section */}
          <div className="flex items-start justify-between mb-12">
            <div className="space-y-1">
              <h1 className="text-4xl font-black text-white tracking-tighter flex items-center gap-2">
                CORE <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#8B5CF6] to-[#00D9FF]">OS</span>
              </h1>
              <p className="text-xs font-bold text-gray-500 tracking-[0.2em] uppercase">Auth_Protocol_v4.2</p>
            </div>
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#8B5CF6]/20 to-[#00D9FF]/20 border border-white/10 shadow-[0_0_20px_rgba(139,92,246,0.2)]">
              <Fingerprint className="text-[#8B5CF6]" size={32} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative">
            <AnimatePresence mode='wait'>
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="space-y-2"
                >
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-[#8B5CF6]">
                    <User size={12} /> Identifier
                  </label>
                  <input 
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="E.g. NEURAL_PILOT_01"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 transition-all font-mono text-sm"
                    required={!isLogin}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-gray-500">
                <Mail size={12} /> Neural_Link
              </label>
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="uplink@protocol.sh"
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 transition-all font-mono text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-black text-gray-500">
                <Lock size={12} /> Access_Key
              </label>
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/[0.03] border border-white/10 rounded-2xl py-4 px-6 text-white placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]/40 transition-all font-mono text-sm"
                required
              />
            </div>

            {error && (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 text-red-400 text-xs font-bold"
              >
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                {error.toUpperCase()}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full relative group/btn h-16 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(139,92,246,0.3)]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6] via-[#00D9FF] to-[#8B5CF6] bg-[length:200%_auto] animate-gradient" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                {loading ? (
                  <Activity className="animate-spin text-white" size={24} />
                ) : (
                  <span className="flex items-center gap-3 text-white font-black tracking-[0.3em] text-sm">
                    {isLogin ? 'ESTABLISH_LINK' : 'GENERATE_PROTOCOL'}
                    <ArrowRight size={18} className="group-hover:translate-x-2 transition-transform duration-300" />
                  </span>
                )}
              </div>
            </button>
          </form>

          {/* Interaction Section */}
          <div className="mt-10 pt-8 border-t border-white/5 flex flex-col items-center gap-6">
            <button 
              onClick={() => { setIsLogin(!isLogin); clearError(); }}
              className="text-gray-500 hover:text-white text-[10px] font-black tracking-widest uppercase transition-all flex items-center gap-2 group"
            >
              <span className="w-4 h-[1px] bg-gray-700 group-hover:w-8 transition-all" />
              {isLogin ? "Request_New_Identity" : "Return_To_Secure_Uplink"}
              <span className="w-4 h-[1px] bg-gray-700 group-hover:w-8 transition-all" />
            </button>
            
            <div className="flex gap-8 opacity-40">
              <div className="flex flex-col items-center gap-1">
                <ShieldCheck size={16} className="text-green-500" />
                <span className="text-[8px] font-bold">SECURE</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Brain size={16} className="text-[#8B5CF6]" />
                <span className="text-[8px] font-bold">NEURAL</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Zap size={16} className="text-[#00D9FF]" />
                <span className="text-[8px] font-bold">FAST</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 4s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Auth;
