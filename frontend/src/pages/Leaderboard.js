import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';

const RANK_STYLES = {
  1: { bg: 'rgba(255,215,0,0.1)', border: 'rgba(255,215,0,0.4)', icon: '🥇', color: '#FFD700' },
  2: { bg: 'rgba(192,192,192,0.1)', border: 'rgba(192,192,192,0.4)', icon: '🥈', color: '#C0C0C0' },
  3: { bg: 'rgba(205,127,50,0.1)', border: 'rgba(205,127,50,0.4)', icon: '🥉', color: '#CD7F32' },
};

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/leaderboard').then(r => {
      setLeaders(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  return (
    <div className="page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: '900', textTransform: 'uppercase' }}>
          🏆 <span style={{ color: 'var(--red-500)' }}>Global</span> Leaderboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Top civic champions, ranked by XP</p>
      </motion.div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem' }}>Loading leaderboard...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          {leaders.map((user, index) => {
            const rankStyle = RANK_STYLES[user.rank] || {};
            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.07 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1.25rem',
                  padding: '1.25rem 1.5rem',
                  background: rankStyle.bg || 'var(--bg-card)',
                  border: `1px solid ${rankStyle.border || 'var(--border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  transition: 'transform 0.2s',
                  cursor: 'default',
                }}
                whileHover={{ transform: 'translateX(4px)' }}
              >
                {/* Rank */}
                <div style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontSize: user.rank <= 3 ? '1.8rem' : '1.3rem',
                  fontWeight: '900',
                  color: rankStyle.color || 'var(--text-muted)',
                  flexShrink: 0,
                }}>
                  {user.rank <= 3 ? rankStyle.icon : `#${user.rank}`}
                </div>

                {/* Avatar */}
                <div style={{
                  width: '44px', height: '44px',
                  borderRadius: '50%',
                  background: `hsl(${(user.id.charCodeAt(0) * 47) % 360}, 60%, 40%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)',
                  fontWeight: '800',
                  fontSize: '1.1rem',
                  flexShrink: 0,
                }}>
                  {user.username[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Link to={`/profile/${user.username}`} style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    color: rankStyle.color || 'var(--text-primary)',
                    letterSpacing: '0.03em',
                  }}>
                    {user.username}
                  </Link>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                    {user.badges?.slice(0, 4).map((b, i) => (
                      <span key={i} title={b.name} style={{ fontSize: '0.9rem' }}>{b.icon}</span>
                    ))}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {user.approvedCount} approved reports
                    </span>
                  </div>
                </div>

                {/* XP & Level */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: '900', color: rankStyle.color || 'var(--text-primary)' }}>
                    {user.xp?.toLocaleString()}
                  </div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    XP • Lv. {user.level}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {leaders.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
          No data yet. Be the first on the leaderboard!
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
