import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, ShieldCheck, Activity, Award, Cpu, Zap, Fingerprint, Database, Clock, Trophy } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';

const Profile = () => {
  const { user, token } = useAuthStore();
  const [booting, setBooting] = useState(true);
  const [profileData, setProfileData] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch('http://127.0.0.1:8000/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setProfileData(data);
        }
      } catch (error) {
        console.error("Failed to fetch profile", error);
      } finally {
        setTimeout(() => setBooting(false), 800);
      }
    };

    if (token) {
      fetchProfile();
    } else {
      setBooting(false);
    }
  }, [token]);

  const stats = profileData?.stats || {
    xp: 0,
    level: 1,
    streak: 0,
    rank: 'Unranked',
    modulesCompleted: 0
  };

  const activities = profileData?.activities || [];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (booting) {
    return (
      <div className="h-full flex items-center justify-center font-mono">
        <div className="flex flex-col items-center gap-4">
          <Fingerprint className="text-[#8B5CF6] animate-pulse" size={48} />
          <div className="text-[#8B5CF6] text-xs tracking-[0.3em]">LOADING_NEURAL_PROFILE...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full overflow-y-auto custom-scrollbar relative">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#8B5CF6]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#00D9FF]/5 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-6xl mx-auto space-y-8 relative z-10"
      >
        {/* Top Section: Identity Card */}
        <motion.div variants={itemVariants} className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-[#8B5CF6] to-[#00D9FF] rounded-[2rem] opacity-20 group-hover:opacity-40 transition duration-500 blur-md"></div>
          <div className="relative bg-[#0A0D1B]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-8 flex flex-col md:flex-row items-center gap-8 overflow-hidden">
            {/* Holographic Avatar */}
            <div className="relative shrink-0">
              <div className="w-32 h-32 rounded-full border-4 border-white/5 flex items-center justify-center relative overflow-hidden bg-black/40 shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(139,92,246,0.4),transparent_70%)]" />
                <div className="scanline w-full h-[20px] bg-gradient-to-b from-transparent via-white/20 to-transparent absolute top-0" style={{ animationDuration: '3s' }} />
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-500 uppercase tracking-tighter">
                  {user?.username ? user.username.substring(0, 2) : 'ID'}
                </span>
              </div>
              <div className="absolute -bottom-2 -right-2 bg-[#00FFA3]/20 border border-[#00FFA3]/50 text-[#00FFA3] text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-[0_0_10px_rgba(0,255,163,0.2)]">
                <div className="w-1.5 h-1.5 bg-[#00FFA3] rounded-full animate-pulse" />
                ONLINE
              </div>
            </div>

            {/* Identity Details */}
            <div className="flex-1 text-center md:text-left space-y-2">
              <div className="flex items-center justify-center md:justify-start gap-3 mb-1">
                <ShieldCheck size={20} className="text-[#8B5CF6]" />
                <span className="text-[10px] font-black text-[#8B5CF6] tracking-[0.3em] uppercase">Verified Protocol</span>
              </div>
              <h1 className="text-4xl font-black text-white tracking-tight uppercase truncate">
                {user?.username || 'GUEST_PILOT'}
              </h1>
              <p className="text-gray-400 font-mono text-sm">{user?.email || 'unregistered@matrix.local'}</p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-6 pt-4 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <Award size={16} className="text-yellow-500" />
                  <span className="text-xs font-bold text-gray-300">Rank: <span className="text-white">{stats.rank}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap size={16} className="text-[#00D9FF]" />
                  <span className="text-xs font-bold text-gray-300">Level: <span className="text-white">{stats.level}</span></span>
                </div>
              </div>
            </div>

            {/* Level Ring (Decorative) */}
            <div className="hidden lg:flex shrink-0 relative w-32 h-32 items-center justify-center">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.05)" strokeWidth="8" fill="none" />
                <circle cx="50" cy="50" r="40" stroke="url(#gradient)" strokeWidth="8" fill="none" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - 0.75)} strokeLinecap="round" className="drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#00D9FF" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="text-center">
                <span className="block text-2xl font-black text-white">{stats.level}</span>
                <span className="block text-[8px] font-bold text-gray-500 tracking-widest uppercase">Level</span>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Stats */}
          <motion.div variants={containerVariants} className="space-y-6">
            <motion.div variants={itemVariants} className="bg-[#0A0D1B]/60 backdrop-blur-md border border-white/5 rounded-3xl p-6">
              <h3 className="text-xs font-black text-gray-500 tracking-widest uppercase mb-6 flex items-center gap-2">
                <Activity size={14} /> Telemetry Data
              </h3>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="font-bold text-gray-400">Total XP</span>
                    <span className="font-mono text-[#8B5CF6]">{stats.xp} / 3000</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#00D9FF] rounded-full" style={{ width: `${(stats.xp / 3000) * 100}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors">
                    <Cpu size={16} className="text-[#00D9FF] mb-2" />
                    <div className="text-2xl font-black text-white">{stats.modulesCompleted}</div>
                    <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mt-1">Modules</div>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 hover:bg-white/10 transition-colors">
                    <Zap size={16} className="text-yellow-500 mb-2" />
                    <div className="text-2xl font-black text-white">{stats.streak}</div>
                    <div className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mt-1">Day Streak</div>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Neural Capabilities (Radar Chart mock) */}
            <motion.div variants={itemVariants} className="bg-[#0A0D1B]/60 backdrop-blur-md border border-white/5 rounded-3xl p-6 relative overflow-hidden group">
              <div className="absolute -inset-20 bg-[radial-gradient(circle_at_center,rgba(0,217,255,0.05),transparent_70%)] pointer-events-none group-hover:scale-110 transition-transform duration-700" />
              <h3 className="text-xs font-black text-gray-500 tracking-widest uppercase mb-6 flex items-center gap-2 relative z-10">
                <Database size={14} /> Cognitive Array
              </h3>

              <div className="space-y-4 relative z-10">
                {[
                  { label: 'Logic Synthesis', val: 85, color: 'bg-[#8B5CF6]' },
                  { label: 'Code Generation', val: 92, color: 'bg-[#00D9FF]' },
                  { label: 'Pattern Recognition', val: 78, color: 'bg-[#00FFA3]' },
                  { label: 'System Architecture', val: 65, color: 'bg-yellow-400' }
                ].map((skill, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      <span>{skill.label}</span>
                      <span className="font-mono">{skill.val}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.val}%` }}
                        transition={{ duration: 1, delay: 0.5 + (i * 0.1) }}
                        className={`h-full ${skill.color} shadow-[0_0_10px_currentColor] opacity-80`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Right Column: Activity Feed */}
          <motion.div variants={itemVariants} className="lg:col-span-2 bg-[#0A0D1B]/60 backdrop-blur-md border border-white/5 rounded-3xl p-6 flex flex-col h-[500px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-gray-500 tracking-widest uppercase flex items-center gap-2">
                <Clock size={14} /> System Activity Log
              </h3>
              <div className="text-[10px] font-bold bg-[#8B5CF6]/20 text-[#8B5CF6] px-2 py-1 rounded-md">LIVE</div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-2">
                  <Activity size={24} />
                  <span className="text-xs tracking-widest uppercase">No Activity Detected</span>
                </div>
              ) : (
                activities.map((log) => {
                  let Icon = Activity;
                  let color = 'text-gray-400';
                  let bg = 'bg-gray-400/10';

                  if (log.type === 'login' || log.type === 'auth') { Icon = ShieldCheck; color = 'text-green-400'; bg = 'bg-green-400/10'; }
                  else if (log.type === 'data') { Icon = Database; color = 'text-[#00D9FF]'; bg = 'bg-[#00D9FF]/10'; }
                  else if (log.type === 'code') { Icon = Cpu; color = 'text-[#8B5CF6]'; bg = 'bg-[#8B5CF6]/10'; }
                  else if (log.type === 'challenge') { Icon = Trophy; color = 'text-yellow-400'; bg = 'bg-yellow-400/10'; }
                  else if (log.type === 'chat') { Icon = Fingerprint; color = 'text-[#A568FF]'; bg = 'bg-[#A568FF]/10'; }

                  return (
                    <div key={log.id} className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors group">
                      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                        <Icon size={18} className={color} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-gray-200 group-hover:text-[#A568FF] transition-colors">{log.title}</h4>
                        <span className="text-[10px] font-mono text-gray-500 mt-1 block">{log.time}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
