import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { supabase } from '../context/AuthContext';

const StatusBadge = ({ status }) => (
  <span className={`badge badge-${status.toLowerCase()}`}>{status}</span>
);

const Dashboard = () => {
  const { user, session } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [badges, setBadges] = useState([]);
  const [xpHistory, setXpHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.access_token) return;
    localStorage.setItem('access_token', session.access_token);
    fetchData();
  }, [session]);

  const fetchData = async () => {
    try {
      const [complaintsRes, badgesRes, xpRes] = await Promise.all([
        api.get('/complaints/my'),
        supabase.from('user_badges').select('badges (name, description, icon), earned_at').eq('user_id', user.id),
        api.get('/profile/me/xp-history')
      ]);
      setComplaints(complaintsRes.data);
      setBadges(badgesRes.data?.map(b => ({ ...b.badges, earned_at: b.earned_at })) || []);
      setXpHistory(xpRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: '900', textTransform: 'uppercase' }}>
          Welcome back, <span style={{ color: 'var(--red-500)' }}>{user?.username}</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Your civic impact dashboard</p>
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
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Level {user?.level || 1} Progress</span>
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {user?.xp || 0} / {xpForNextLevel} XP
          </span>
        </div>
        <div className="progress-bar">
          <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
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
                  style={{
                    padding: '0.5rem 0.875rem',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '999px',
                    fontSize: '0.85rem',
                    cursor: 'default',
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
