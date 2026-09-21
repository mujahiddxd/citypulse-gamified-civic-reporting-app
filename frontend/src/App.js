import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/ui/Navbar';
import ChatbotWidget from './components/chatbot/ChatbotWidget';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import SubmitComplaint from './pages/SubmitComplaint';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';
import HeatmapPage from './pages/HeatmapPage';
import FeedbackPage from './pages/FeedbackPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminComplaints from './pages/admin/AdminComplaints';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import AdminUsers from './pages/admin/AdminUsers';
import AdminFeedback from './pages/admin/AdminFeedback';
import AdminPassGate from './pages/admin/AdminPassGate';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
};

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-screen">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (user.role !== 'admin') return <Navigate to="/dashboard" />;
  return children;
};

const AppContent = () => {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/heatmap" element={<HeatmapPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/profile/:username" element={<Profile />} />

        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/submit" element={<PrivateRoute><SubmitComplaint /></PrivateRoute>} />

        <Route path="/admin" element={<AdminRoute><AdminPassGate><AdminDashboard /></AdminPassGate></AdminRoute>} />
        <Route path="/admin/complaints" element={<AdminRoute><AdminPassGate><AdminComplaints /></AdminPassGate></AdminRoute>} />
        <Route path="/admin/analytics" element={<AdminRoute><AdminPassGate><AdminAnalytics /></AdminPassGate></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminPassGate><AdminUsers /></AdminPassGate></AdminRoute>} />
        <Route path="/admin/feedback" element={<AdminRoute><AdminPassGate><AdminFeedback /></AdminPassGate></AdminRoute>} />
      </Routes>
      {user && <ChatbotWidget />}
    </>
  );
};

const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
