import React, { useState, useEffect } from 'react';
import { Shield, Users, Code, Trophy, Loader2 } from 'lucide-react';
import axios from 'axios';
import useAuthStore from '../../store/useAuthStore';

export default function AdminDashboard() {
  const { token } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    axios.get(`${import.meta.env.VITE_CLOUD_API_URL}/api/admin/dashboard-stats`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setStats(res.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [token]);
  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="p-3 bg-red-500/10 rounded-xl text-red-500 border border-red-500/20">
          <Shield className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 tracking-wider">
            SYSTEM ADMIN
          </h1>
          <p className="text-gray-400">Manage challenges, test cases, and global contests.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Total Users" value={stats?.total_users || 0} icon={Users} color="text-blue-500" bg="bg-blue-500/10" border="border-blue-500/20" />
          <StatCard title="Total Submissions" value={stats?.total_submissions || 0} icon={Code} color="text-green-500" bg="bg-green-500/10" border="border-green-500/20" />
          <StatCard title="Active Contests" value={stats?.active_contests || 0} icon={Trophy} color="text-purple-500" bg="bg-purple-500/10" border="border-purple-500/20" />
          <StatCard title="System Load" value={stats?.system_load || "0%"} icon={Shield} color="text-red-500" bg="bg-red-500/10" border="border-red-500/20" />
        </div>
      )}

      {/* Add more widgets here */}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg, border }) {
  return (
    <div className={`p-6 rounded-2xl bg-black/40 border ${border} backdrop-blur-md flex items-center gap-4`}>
      <div className={`p-4 rounded-xl ${bg} ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-gray-400 text-sm">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
    </div>
  );
}
