/**
 * src/App.js — Root Application Component
 * -----------------------------------------
 * The top-level React component that:
 *   1. Wraps the entire app in the AuthProvider (provides user/session data globally)
 *   2. Sets up React Router's BrowserRouter (enables URL-based navigation)
 *   3. Defines all page routes and their access control
 *
 * ROUTE STRUCTURE:
 * ────────────────
 * Public routes  — anyone can visit, no login needed
 *   /             Home page
 *   /login        Login form
 *   /register     Registration form
 *   /forgot-password, /reset-password
 *   /leaderboard, /heatmap, /feedback, /profile/:username
 *   /statistics, /reports, /about
 *
 * Private routes — require a logged-in Supabase user (PrivateRoute guard)
 *   /dashboard    User's personal dashboard
 *   /submit       Submit a new complaint
 *   /store        Cosmetic store (browse without login, but buy requires auth)
 *   /inventory    View and manage owned items
 *
 * Admin routes   — require a valid ADMIN JWT (AdminRoute guard)
 *   /admin-login  Standalone admin login form (no Supabase)
 *   /admin        Admin dashboard
 *   /admin/complaints, /admin/analytics, /admin/users, /admin/feedback
 *
 * HOW ROUTE GUARDS WORK:
 * ──────────────────────
 * PrivateRoute: checks if useAuth() returns a user (Supabase session).
 *   If not logged in → redirects to /login.
 *
 * AdminRoute: reads the admin JWT from localStorage ('citypulse_admin_token')
 *   and calls /api/admin-auth/verify to confirm it's valid.
 *   If invalid → redirects to /admin-login.
 *   This check happens asynchronously (shows "Authenticating..." meanwhile).
 *
 * NAVBAR & CHATBOT:
 * ─────────────────
 * Navbar is hidden on /admin* routes (admin has its own sidebar layout).
 * ChatbotWidget is shown only when a user is logged in AND not on admin pages.
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/ui/Navbar';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import { SkeletonDashboard } from './components/ui/SkeletonLoader';

// ── Page Imports ──────────────────────────────────────────────────────────────
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
// getAdminToken reads from localStorage; verifyAdminToken calls /api/admin-auth/verify
import AdminLogin, { getAdminToken, verifyAdminToken } from './pages/admin/AdminLogin';
import Store from './pages/Store';
import Statistics from './pages/Statistics';
import PublicReports from './pages/PublicReports';
import About from './pages/About';
import Inventory from './pages/Inventory';

// ── PrivateRoute ──────────────────────────────────────────────────────────────
// Wraps any route that requires a logged-in user.
// Shows a loading screen while AuthContext is initializing (e.g. on page refresh).
// Redirects to /login if no user session is found.
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <SkeletonDashboard />;
  return user ? children : <Navigate to="/login" />;
};

// ── AdminRoute ────────────────────────────────────────────────────────────────
// Wraps admin pages with a check against the standalone admin JWT.
// Completely separate from Supabase — does NOT use useAuth().
// On first render, verifies the stored token with the backend.
const AdminRoute = ({ children }) => {
  const [checking, setChecking] = React.useState(true); // True while verifying token
  const [valid, setValid] = React.useState(false); // True if token is valid

  React.useEffect(() => {
    const token = getAdminToken(); // Reads 'citypulse_admin_token' from localStorage
    if (!token) { setChecking(false); return; } // No token → skip verify, will redirect

    // Call the backend to verify the token (checks expiry too)
    verifyAdminToken(token).then(ok => {
      setValid(ok);
      setChecking(false);
    });
  }, []);

  if (checking) return <SkeletonDashboard />;
  if (!valid) return <Navigate to="/admin-login" replace />;
  return children; // Token is valid → render the admin page
};

// ── AppContent ────────────────────────────────────────────────────────────────
// The inner component (inside BrowserRouter so useLocation() works).
// Renders the Navbar and routes, and conditionally shows the ChatbotWidget.
const AppContent = () => {
  const { user } = useAuth();
  const location = useLocation();
  // Hide the regular Navbar on all /admin/* pages (they have their own layout)
  const isAdminRoute = location.pathname.startsWith('/admin');

  return (
    <>
      {/* Show Navbar only for non-admin pages */}
      {!isAdminRoute && <Navbar />}

      <Routes>
        {/* Public routes — no auth required */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/heatmap" element={<HeatmapPage />} />
        <Route path="/feedback" element={<FeedbackPage />} />
        <Route path="/profile/:username" element={<Profile />} />
        <Route path="/statistics" element={<Statistics />} />
        <Route path="/reports" element={<PublicReports />} />
        <Route path="/about" element={<About />} />

        {/* Private routes — wrapped in PrivateRoute guard */}
        <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
        <Route path="/submit" element={<PrivateRoute><SubmitComplaint /></PrivateRoute>} />
        <Route path="/store" element={<Store />} />
        <Route path="/inventory" element={<PrivateRoute><Inventory /></PrivateRoute>} />

        {/* Standalone admin login — no auth guard (it IS the login page) */}
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Admin routes — wrapped in AdminRoute guard (JWT-based, not Supabase) */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/complaints" element={<AdminRoute><AdminComplaints /></AdminRoute>} />
        <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
        <Route path="/admin/feedback" element={<AdminRoute><AdminFeedback /></AdminRoute>} />
      </Routes>

      {/* Show chatbot floating widget only when logged in and not on admin pages */}
      {user && !isAdminRoute && <ChatbotWidget />}
    </>
  );
};

// ── App ───────────────────────────────────────────────────────────────────────
// Root component: wraps everything in AuthProvider (global auth state)
// and BrowserRouter (URL routing). Order matters:
//   AuthProvider must be outside BrowserRouter's content (AppContent uses both).
const App = () => (
  <AuthProvider>
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  </AuthProvider>
);

export default App;
