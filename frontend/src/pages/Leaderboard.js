import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import '../styles/Leaderboard.css';

const RANK_STYLES = {
  1: { bg: '#FFDC2B', border: '#111111', icon: '🥇', color: '#111111' },
  2: { bg: '#e2e8f0', border: '#111111', icon: '🥈', color: '#111111' },
  3: { bg: '#f59e0b', border: '#111111', icon: '🥉', color: '#111111' },
};

const Leaderboard = () => {
  const [data, setData] = useState({ season: null, leaderboard: [] });
  const [loading, setLoading] = useState(true);
  const { authUser } = useAuth(); // Added useAuth hook

  useEffect(() => {
    api.get('/leaderboard').then(r => {
      setData(r.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const { season, leaderboard: leaders } = data;

  return (
    <div className="page" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: '900', textTransform: 'uppercase' }}>
          🏆 <span style={{ color: 'var(--accent)' }}>Global</span> Leaderboard
        </h1>
        {season && (
          <div style={{ marginTop: '1rem', display: 'inline-block', padding: '0.5rem 1rem', background: '#FFDC2B', borderRadius: '9999px', border: '2px solid #111', boxShadow: '2px 2px 0px #111' }}>
            <span style={{ fontWeight: '800', fontFamily: 'var(--font-display)', color: '#111', marginRight: '0.5rem' }}>SEASON {season.number}</span>
            <span style={{ fontSize: '0.8rem', color: '#111', fontWeight: '700' }}>• Ends in {season.daysLeft} days</span>
          </div>
        )}
        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Top civic champions of the current season</p>
      </motion.div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem' }}>Loading leaderboard...</div>
      ) : (
        <div className="leaderboard-container">
          {(leaders || []).map((user, index) => {
            const rankStyle = RANK_STYLES[user.rank] || {};
            const inventory = user.inventory || [];
            const equippedBorder = inventory.find(i => i.startsWith('EQUIPPED_BORDER:'))?.split(':')[1];
            const equippedTitle = inventory.find(i => i.startsWith('EQUIPPED_TITLE:'))?.split(':')[1];
            const hasGoldenShimmer = inventory.includes('Golden Shimmer');
            const isEquipped = user.id === authUser?.id; // Defined isEquipped

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`leaderboard-user-card ${isEquipped ? 'leaderboard-user-card-equipped' : ''}`}
                style={{
                  background: isEquipped ? 'rgba(99, 102, 241, 0.05)' : rankStyle.bg || '#ffffff',
                  border: isEquipped ? '3px solid var(--accent)' : `2px solid ${rankStyle.border || '#111111'}`,
                  borderRadius: 'var(--radius-lg)',
                  transition: 'transform 0.1s',
                  boxShadow: '4px 4px 0px #111111',
                  cursor: 'default',
                }}
                whileHover={{ transform: 'translate(-2px, -2px)', boxShadow: '6px 6px 0px #111111' }}
              >
                {/* Rank */}
                <div className="leaderboard-rank-badge" style={{ color: rankStyle.color || 'var(--text-primary)' }}>
                  {index < 3 ? rankStyle.icon : `#${index + 1}`}
                </div>

                {/* Avatar with optional equipped border */}
                <div
                  className={`leaderboard-avatar ${equippedBorder === 'neon-aura' ? 'effect-neon-aura' : ''}`}
                  style={{
                    background: `hsl(${(user.id.charCodeAt(0) * 47) % 360}, 60%, 40%)`
                  }}>
                  {user.username[0].toUpperCase()}
                </div>

                {/* Info */}
                <div className="leaderboard-user-info">
                  <Link to={`/profile/${user.username}`} className={`leaderboard-username ${equippedTitle === 'champion-title' ? 'effect-champion-title' : ''}`} style={{
                    color: rankStyle.color || 'var(--text-primary)'
                  }}>
                    {user.username}
                  </Link>
                  {hasGoldenShimmer && <span className="effect-golden-checkmark" style={{ marginLeft: '0.4rem', fontSize: '0.9rem' }}>🌟</span>}
                  <div className="leaderboard-user-badges">
                    {user.badges?.slice(0, 4).map((b, i) => (
                      <span key={i} title={b.name} style={{ fontSize: '0.9rem' }}>{b.icon}</span>
                    ))}
                    <span className="leaderboard-approved-label">
                      {user.approvedCount} approved reports
                    </span>
                  </div>
                </div>

                {/* XP & Level */}
                <div className="leaderboard-stats">
                  <div className="leaderboard-sxp" style={{ color: rankStyle.color || 'var(--primary-blue)' }}>
                    {user.seasonXp?.toLocaleString()} S-XP
                  </div>
                  <div className="leaderboard-alltime">
                    ALL-TIME: {user.allTimeXp?.toLocaleString()} XP • Lv. {user.level}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {(!leaders || leaders.length === 0) && !loading && (
        <div className="leaderboard-empty">
          No data yet. Be the first on the leaderboard!
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
