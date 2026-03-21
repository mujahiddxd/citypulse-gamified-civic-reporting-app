import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { supabase } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DailyRewardModal from '../components/ui/DailyRewardModal';
import '../styles/Dashboard.css';

const StatusBadge = ({ status }) => (
  <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
);

const Dashboard = () => {
  const { user, session, setUser } = useAuth();
  const { theme, equippedBorder, equippedTitle } = useTheme();
  const [complaints, setComplaints] = useState([]);
  const [badges, setBadges] = useState([]);
  const [xpHistory, setXpHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [leagueOptIn, setLeagueOptIn] = useState(false);
  const [leagueLoading, setLeagueLoading] = useState(false);
  const [dailyReward, setDailyReward] = useState(null);
  const [showRewardModal, setShowRewardModal] = useState(false);

  useEffect(() => {
    if (!session?.access_token) return;
    localStorage.setItem('access_token', session.access_token);
    fetchData();
    checkDailyReward();
  }, [session?.access_token]);

  const checkDailyReward = async () => {
    try {
      const { data } = await api.post('/store/daily-reward', {});
      if (data.granted) {
        setDailyReward(data);
        setShowRewardModal(true);
      }
    } catch (err) {
      console.warn('[Daily Reward] Check failed:', err.message);
    }
  };

  const claimReward = async () => {
    // Update user coins/xp in AuthContext from the already-granted reward data
    if (dailyReward && setUser) {
      setUser(prev => ({
        ...prev,
        coins: dailyReward.new_coins,
        xp: dailyReward.new_xp,
      }));
    }
  };

  const fetchData = async () => {
    try {
      const [complaintsRes, badgesRes, xpRes, meRes] = await Promise.all([
        api.get('/complaints/my'),
        supabase.from('user_badges').select('badges (name, description, icon), earned_at').eq('user_id', user.id),
        api.get('/profile/me/xp-history'),
        api.get('/profile/me')
      ]);
      setComplaints(complaintsRes.data);
      setBadges(badgesRes.data?.map(b => ({ ...b.badges, earned_at: b.earned_at })) || []);
      setXpHistory(xpRes.data);
      setLeagueOptIn(meRes.data?.leaderboard_opt_in || false);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleLeague = async () => {
    setLeagueLoading(true);
    try {
      const { data } = await api.post('/profile/me/leaderboard-optin', { opted_in: !leagueOptIn });
      setLeagueOptIn(data.leaderboard_opt_in);
    } catch (err) {
      console.error(err);
    } finally {
      setLeagueLoading(false);
    }
  };

  const xpForNextLevel = user?.level ? user.level * user.level * 100 : 100;
  const xpForCurrentLevel = user?.level ? (user.level - 1) * (user.level - 1) * 100 : 0;
  const progress = user ? Math.min(100, ((user.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100) : 0;

  const approved = complaints.filter(c => c.status === 'Approved').length;
  const pending = complaints.filter(c => c.status === 'Pending').length;

  if (loading) return <div className="page" style={{ display: 'flex', justifyContent: 'center', paddingTop: '4rem' }}>Loading...</div>;

  return (
    <div className="page">
      {/* Daily Reward Modal */}
      <AnimatePresence>
        {showRewardModal && dailyReward && (
          <DailyRewardModal
            data={dailyReward}
            onClaim={claimReward}
            onClose={() => setShowRewardModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="dashboard-header">
        <h1 className="dashboard-title">
          Welcome back, <span className={equippedTitle === 'champion-title' ? 'effect-champion-title' : ''} style={{ color: 'var(--accent)' }}>{user?.username}</span>
          {user?.inventory?.includes('Golden Shimmer') && <span className="effect-golden-checkmark" style={{ marginLeft: '0.5rem' }}>🌟</span>}
        </h1>
        <p className="dashboard-subtitle">Your civic impact dashboard</p>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        {[
          { value: user?.xp || 0, label: 'Total XP', icon: '⭐' },
          { value: `Lv. ${user?.level || 1}`, label: 'Current Level', icon: '🎯' },
          { value: approved, label: 'Approved', icon: '✅' },
          { value: pending, label: 'Pending', icon: '⏳' },
        ].map((s, i) => (
          <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Level Progress */}
      <div className="card level-progress-card">
        <div className="progress-header">
          <div>
            <span className="progress-label">Level {user?.level || 1} Progress</span>
          </div>
          <span className="progress-label">
            {user?.xp || 0} / {xpForNextLevel} XP
          </span>
        </div>
        <div className="progress-track">
          <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
        </div>
        <div className="progress-hint">
          {Math.round(xpForNextLevel - (user?.xp || 0))} XP to Level {(user?.level || 1) + 1}
        </div>
      </div>

      <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
        {/* Badges */}
        <div className="card">
          <div className="section-header">
            <h2 className="section-title" style={{ fontSize: '1.1rem' }}>🎖️ Badges</h2>
            <Link to={`/profile/${user?.username}`} style={{ fontSize: '0.8rem', color: 'var(--red-400)' }}>View All</Link>
          </div>
          {badges.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {badges.map((b, i) => (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                  title={b.description}
                  className="badge-item"
                  style={{
                    padding: '0.5rem 0.875rem',
                  }}>
                  {b.icon} {b.name}
                </motion.div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No badges yet. Submit reports to earn them!</p>
          )}
        </div>

        {/* XP History */}
        <div className="card">
          <h2 className="section-title" style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>⚡ Recent XP</h2>
          {xpHistory.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {xpHistory.slice(0, 5).map((log, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{log.reason}</span>
                  <span style={{ color: 'var(--green)', fontFamily: 'var(--font-display)', fontWeight: '700' }}>+{log.xp} XP</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No XP earned yet. Start reporting!</p>
          )}
        </div>
      </div>

      {/* League Opt-In Card */}
      <div className="card" style={{
        background: leagueOptIn
          ? 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)'
          : 'linear-gradient(135deg, #fff 0%, #f8fafc 100%)',
        border: leagueOptIn ? '2px solid #6366f1' : '2px solid #e2e8f0',
        boxShadow: leagueOptIn ? '4px 4px 0px #6366f1' : '4px 4px 0px #e2e8f0',
        transition: 'all 0.3s',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '2.5rem' }}>🏆</span>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: '900', color: leagueOptIn ? '#fff' : '#0f172a', margin: 0 }}>
                {leagueOptIn ? 'You\'re in the League!' : 'Join the League'}
              </h2>
              <p style={{ color: leagueOptIn ? '#a5b4fc' : '#64748b', fontSize: '0.88rem', margin: '0.25rem 0 0', maxWidth: '380px' }}>
                {leagueOptIn
                  ? 'Your XP is visible on the Global Leaderboard. Keep reporting to climb the ranks!'
                  : 'Opt-in to appear on the Global Leaderboard. Your reports earn XP and rank you among CityPulse champions.'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleLeague}
            disabled={leagueLoading}
            style={{
              padding: '0.7rem 1.5rem', borderRadius: '10px',
              border: '2px solid',
              borderColor: leagueOptIn ? '#ef4444' : '#6366f1',
              background: leagueOptIn ? 'rgba(239,68,68,0.1)' : '#6366f1',
              color: leagueOptIn ? '#ef4444' : '#fff',
              fontFamily: 'var(--font-display)', fontWeight: '800',
              fontSize: '0.88rem', cursor: leagueLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
          >
            {leagueLoading ? '...' : leagueOptIn ? '🚪 Leave League' : '🏆 Join League'}
          </button>
        </div>
      </div>

      {/* Recent Complaints */}
      <div className="card">
        <div className="section-header">
          <h2 className="section-title">📋 My Reports</h2>
          <Link to="/submit" className="btn btn-primary btn-sm">+ New Report</Link>
        </div>
        {complaints.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Area</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {complaints.slice(0, 10).map(c => (
                  <tr key={c.id}>
                    <td>{c.type}</td>
                    <td>{c.area_name || 'N/A'}</td>
                    <td><span className={`badge badge-${c.severity.toLowerCase()}`}>{c.severity}</span></td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
            <p>No reports yet. Be the first to report an issue in your area!</p>
            <Link to="/submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Submit Your First Report</Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
