import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';

const Profile = () => {
  const { username } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/profile/${username}`)
      .then(r => { setProfile(r.data); setLoading(false); })
      .catch(() => { setError('User not found'); setLoading(false); });
  }, [username]);

  if (loading) return <div className="page" style={{ textAlign: 'center', paddingTop: '4rem' }}>Loading...</div>;
  if (error) return <div className="page" style={{ textAlign: 'center', paddingTop: '4rem', color: 'var(--text-muted)' }}>{error}</div>;
  if (!profile) return null;

  const xpForNextLevel = profile.level * profile.level * 100;
  const levelProgress = profile.levelProgress || 0;

  // Extract equipped items
  const inventory = profile.inventory || [];
  const equippedBorder = inventory.find(i => i.startsWith('EQUIPPED_BORDER:'))?.split(':')[1];
  const equippedTitle = inventory.find(i => i.startsWith('EQUIPPED_TITLE:'))?.split(':')[1];
  const hasGoldenShimmer = inventory.includes('Golden Shimmer');

  return (
    <div className="page" style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Hero Banner */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="card" style={{ marginBottom: '1.5rem', overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '80px',
            background: 'linear-gradient(135deg, var(--red-900), var(--red-700))',
          }} />
          <div style={{ position: 'relative', paddingTop: '1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div
              className={equippedBorder === 'neon-aura' ? 'effect-neon-aura' : ''}
              style={{
                width: '100px', height: '100px',
                borderRadius: '16px',
                background: `linear-gradient(135deg, hsl(${(profile.id?.charCodeAt(0) * 47) % 360}, 60%, 40%), hsl(${(profile.id?.charCodeAt(0) * 47) % 360}, 60%, 20%))`,
                border: '4px solid var(--bg-card)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-display)',
                fontWeight: '900',
                fontSize: '2.5rem',
                color: 'white',
                boxShadow: 'var(--shadow)',
                position: 'relative',
                zIndex: 2
              }}>
              {profile.username?.[0]?.toUpperCase()}
            </div>

            <div style={{ flex: 1, marginBottom: '0.5rem' }}>
              <h1 className={equippedTitle === 'champion-title' ? 'effect-champion-title' : ''} style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: '900', textTransform: 'uppercase', color: 'var(--text-primary)' }}>
                {profile.username}
                {hasGoldenShimmer && <span className="effect-golden-checkmark" style={{ marginLeft: '0.8rem', fontSize: '1.5rem' }}>🌟</span>}
              </h1>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', color: 'var(--red-400)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Level {profile.level}
                </span>
                {profile.rank && (
                  <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    #{profile.rank} Global
                  </span>
                )}
                <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                  Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>

          {/* XP Progress */}
          <div style={{ marginTop: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Level {profile.level} → {profile.level + 1}
              </span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {profile.xp} / {xpForNextLevel} XP
              </span>
            </div>
            <div className="progress-bar">
              <motion.div className="progress-fill" initial={{ width: 0 }} animate={{ width: `${levelProgress}%` }} transition={{ duration: 1, ease: 'easeOut' }} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
        {[
          { value: profile.xp?.toLocaleString() || 0, label: 'Total XP' },
          { value: profile.totalComplaints || 0, label: 'Reports' },
          { value: profile.approvedComplaints || 0, label: 'Approved' },
          { value: `#${profile.rank || 'N/A'}`, label: 'Global Rank' },
        ].map((s, i) => (
          <motion.div key={s.label} className="stat-card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <div className="stat-value" style={{ fontSize: '2rem' }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Badges */}
      <div className="card">
        <h2 className="section-title" style={{ marginBottom: '1.25rem' }}>🎖️ Badges Earned</h2>
        {profile.badges?.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem' }}>
            {profile.badges.map((badge, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  padding: '0.875rem 1.25rem',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  textAlign: 'center',
                  minWidth: '110px',
                }}
              >
                <div style={{ fontSize: '2rem', marginBottom: '0.25rem' }}>{badge.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{badge.name}</div>
                {badge.earned_at && (
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {new Date(badge.earned_at).toLocaleDateString()}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>No badges yet.</p>
        )}
      </div>
    </div>
  );
};

export default Profile;
