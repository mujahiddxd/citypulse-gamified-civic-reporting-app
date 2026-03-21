import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) localStorage.setItem('access_token', session.access_token);
    api.get('/analytics/overview').then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [session?.access_token]);

  if (loading) return <AdminLayout title="Overview"><div>Loading...</div></AdminLayout>;

  const STAT_CARDS = stats ? [
    { value: stats.totalUsers, label: 'Total Users', icon: '👥', color: '#2196F3' },
    { value: stats.totalComplaints, label: 'Total Reports', icon: '📋', color: 'var(--red-500)' },
    { value: stats.pending, label: 'Pending', icon: '⏳', color: '#FF9800' },
    { value: stats.approved, label: 'Approved', icon: '✅', color: '#4CAF50' },
    { value: stats.rejected, label: 'Rejected', icon: '❌', color: '#F44336' },
    { value: stats.totalXP?.toLocaleString(), label: 'XP Distributed', icon: '⭐', color: '#FFD700' },
  ] : [];

  return (
    <AdminLayout title="📊 Overview">
      <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
        {STAT_CARDS.map((s, i) => (
          <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
            style={{ borderLeftColor: s.color }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{s.icon}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {stats && (
        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>🏆 Most Active User</h3>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: '800' }}>
              {stats.topUser?.username || 'N/A'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{stats.topUser?.xp?.toLocaleString() || 0} XP</div>
          </div>
          <div className="card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '1rem' }}>📍 Most Active Area</h3>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: '800' }}>
              {stats.topArea || 'N/A'}
            </div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Most approved reports</div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
