import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAgentStore from './store/useAgentStore';
import useAuthStore from './store/useAuthStore';
import Layout from './components/Layout';
import AIChat from './pages/AIChat';
import Dashboard from './pages/Dashboard';
import DataLab from './pages/DataLab';
import CodeLab from './pages/CodeLab';
import DailyChallenge from './pages/DailyChallenge';
import Settings from './pages/Settings';
import History from './pages/History';
import Auth from './pages/Auth';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

// Admin & Contest Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminChallenges from './pages/admin/AdminChallenges';
import AdminChallengeForm from './pages/admin/AdminChallengeForm';
import AdminContests from './pages/admin/AdminContests';
import AdminContestForm from './pages/admin/AdminContestForm';
import AdminUsers from './pages/admin/AdminUsers';
import ContestList from './pages/contest/ContestList';
import ContestArena from './pages/contest/ContestArena';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6 bg-[#0A0D1B]/40 rounded-3xl border border-white/5 m-8 p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mb-4 border border-red-500/20">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h2 className="text-2xl font-black text-white tracking-widest uppercase">Access Restricted</h2>
        <p className="text-gray-400 max-w-md">This sector of the operating system requires a verified neural identity. Please authenticate to continue.</p>
        <button onClick={() => window.location.href = '/auth'} className="mt-4 px-8 py-3 bg-gradient-to-r from-[#8B5CF6] to-[#00D9FF] text-white font-bold rounded-xl hover:shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all uppercase tracking-widest text-xs">
          Establish Link
        </button>
      </div>
    );
  }
  return children;
};

function App() {
  const {
    activePage,
    setOverallStatus,
    updateAgentStatus,
    addLog,
  } = useAgentStore();

  const ws = useRef(null);

  useEffect(() => {
    ws.current = new WebSocket('ws://127.0.0.1:8000/ws/status');

    ws.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pipeline_start') {
          setOverallStatus('thinking');
          addLog(`Initializing swarm for: "${data.problem}"`, 'text-accent');
        } else if (data.type === 'agent_thinking') {
          updateAgentStatus(data.agent, 'thinking', data.action);
          addLog(`[${data.agent}] started: ${data.action}`, 'text-primary');
        } else if (data.type === 'agent_completed') {
          updateAgentStatus(data.agent, 'completed');
          addLog(`[${data.agent}] successfully completed task.`, 'text-green-400');
        } else if (data.type === 'feedback_loop') {
          updateAgentStatus('Reasoning Agent', 'idle');
          updateAgentStatus('Coding Agent', 'idle');
          updateAgentStatus('Critic Agent', 'idle');
          addLog(`CRITIC ALERT: ${data.message}`, 'text-yellow-400');
        } else if (data.type === 'pipeline_complete') {
          setOverallStatus('completed');
          addLog(`Swarm execution finished. Yielding final payload.`, 'text-accent');
        }
      } catch (err) { }
    };

    return () => {
      if (ws.current) ws.current.close();
    };
  }, [updateAgentStatus, setOverallStatus, addLog]);

  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route path="/*" element={
          <Layout>
            {activePage === 'dashboard' && <Dashboard />}
            {activePage === 'chat' && <AIChat />}
            {activePage === 'code-lab' && <CodeLab />}
            {activePage === 'data-lab' && <ProtectedRoute><DataLab /></ProtectedRoute>}
            {activePage === 'daily-challenge' && <ProtectedRoute><DailyChallenge /></ProtectedRoute>}
            {activePage === 'leaderboard' && <Leaderboard />}
            {activePage === 'settings' && <ProtectedRoute><Settings /></ProtectedRoute>}
            {activePage === 'history' && <ProtectedRoute><History /></ProtectedRoute>}
            {activePage === 'profile' && <ProtectedRoute><Profile /></ProtectedRoute>}
            
            {/* Contest Routes */}
            {activePage === 'contest-list' && <ContestList />}
            {activePage === 'contest-arena' && <ProtectedRoute><ContestArena /></ProtectedRoute>}

            {/* Admin Routes */}
            {activePage === 'admin-dashboard' && <ProtectedRoute><AdminDashboard /></ProtectedRoute>}
            {activePage === 'admin-challenges' && <ProtectedRoute><AdminChallenges /></ProtectedRoute>}
            {activePage === 'admin-challenge-form' && <ProtectedRoute><AdminChallengeForm /></ProtectedRoute>}
            {activePage === 'admin-contests' && <ProtectedRoute><AdminContests /></ProtectedRoute>}
            {activePage === 'admin-contest-form' && <ProtectedRoute><AdminContestForm /></ProtectedRoute>}
            {activePage === 'admin-users' && <ProtectedRoute><AdminUsers /></ProtectedRoute>}
          </Layout>
        } />
      </Routes>
    </Router>
  );
}

export default App;
