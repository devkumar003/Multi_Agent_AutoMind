import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SignedIn, SignedOut, RedirectToSignIn } from '@clerk/clerk-react';
import useAgentStore from './store/useAgentStore';
import Layout from './components/Layout';
import AIChat from './pages/AIChat';
import Dashboard from './pages/Dashboard';
import DataLab from './pages/DataLab';
import CodeLab from './pages/CodeLab';
import DailyChallenge from './pages/DailyChallenge';
import Settings from './pages/Settings';
import History from './pages/History';
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
  return (
    <>
      <SignedIn>
        {children}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
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
        <Route path="/*" element={
          <Layout>
            {activePage === 'dashboard' && <Dashboard />}
            {activePage === 'chat' && <AIChat />}
            {activePage === 'code-lab' && <CodeLab />}
            {activePage === 'data-lab' && <DataLab />}
            
            {activePage === 'daily-challenge' && <ProtectedRoute><DailyChallenge /></ProtectedRoute>}
            {activePage === 'leaderboard' && <ProtectedRoute><Leaderboard /></ProtectedRoute>}
            
            {activePage === 'settings' && <Settings />}
            {activePage === 'history' && <History />}
            {activePage === 'profile' && <ProtectedRoute><Profile /></ProtectedRoute>}
            
            {/* Contest Routes */}
            {activePage === 'contest-list' && <ProtectedRoute><ContestList /></ProtectedRoute>}
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
