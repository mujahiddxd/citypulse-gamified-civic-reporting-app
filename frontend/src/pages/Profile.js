import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { SkeletonProfile } from '../components/ui/SkeletonLoader';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { username } = useParams();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [tagline, setTagline] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [joiningLeague, setJoiningLeague] = useState(false);

  const isOwnProfile = authUser && authUser.username === username;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      
      // Special case: Master System Admin (case-insensitive)
      if (username?.toLowerCase() === 'systemadmin') {
        setProfile({
          username: 'SystemAdmin',
          role: 'admin',
          level: 99,
          xp: 999999,
          totalComplaints: '∞',
          tagline: 'Root System Administrator',
          bio: 'Global authority for the CityPulse Platform. Managing civic infrastructure and community safety.',
          badges: [{ name: 'System Root', icon: '🛡️' }, { name: 'Core Dev', icon: '⚡' }],
          activities: [{ label: 'System initialized', date: 'April 2026' }]
        });
        setTagline('Root System Administrator');
        setBio('Global authority for the CityPulse Platform.');
        setLoading(false);
        return;
      }

      // If username is "User", it's a fallback error - don't show "not found"
      if (username === 'User') {
        window.location.href = '/dashboard';
        return;
      }

      try {
        const { data } = await api.get(`/profile/${username}`);
        setProfile(data);
        setTagline(data.tagline || 'Civic Tech Explorer & Community Guardian');
        setBio(data.bio || 'Hi there, I am a dedicated citizen reporter helping to keep our city clean.');
      } catch (err) {
        setError('User not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  const handleJoinLeague = async (optIn) => {
    setJoiningLeague(true);
    try {
      await api.post('/profile/me/leaderboard-optin', { opted_in: optIn });
      setProfile(prev => ({ ...prev, leaderboard_opt_in: optIn }));
    } catch (err) {
      alert(optIn ? 'Failed to join league' : 'Failed to leave league');
    } finally {
      setJoiningLeague(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/profile/me', { tagline, bio });
      setProfile(prev => ({ ...prev, tagline, bio }));
      setIsEditing(false);
    } catch (err) {
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <SkeletonProfile />;
  if (error) return <div className="page" style={{ textAlign: 'center', paddingTop: '4rem', color: '#64748b' }}>{error}</div>;
  if (!profile) return null;

  const xpForNextLevel = profile.level * profile.level * 100;
  const xpForCurrentLevel = (profile.level - 1) * (profile.level - 1) * 100;
  const progress = ((profile.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;
  const levelProgress = Math.min(100, Math.max(0, progress));

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(10px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  };

  return (
    <div className="page" style={{ 
        background: '#0a0f18', // Deep space background
        minHeight: '100vh', 
        padding: '3rem 0'
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.5rem' }}>
        
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          
          {/* Left Column: Identity */}
          <div style={{ flex: '1.2', minWidth: '320px' }}>
            <motion.div 
              initial={{ opacity: 0, x: -20 }} 
              animate={{ opacity: 1, x: 0 }}
              style={{ ...glassStyle, padding: '2.5rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <button onClick={() => window.history.back()} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#fff' }}>🔙</button>
                {isOwnProfile && (
                    <button 
                        onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                        disabled={saving}
                        style={{
                            background: isEditing ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                            color: isEditing ? '#000' : '#fff',
                            border: 'none', padding: '0.4rem 1rem', borderRadius: '12px',
                            fontFamily: 'var(--font-display)', fontWeight: '800', cursor: 'pointer',
                            fontSize: '0.8rem'
                        }}
                    >
                        {saving ? '⌛ Saving...' : isEditing ? '✅ Save' : '✏️ Edit'}
                    </button>
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '120px', height: '120px', borderRadius: '40px', margin: '0 auto 1.5rem',
                  background: `linear-gradient(135deg, #FFDC2B 0%, #FF8A00 100%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '3rem', color: '#000', fontWeight: '900',
                  boxShadow: '0 20px 40px -10px rgba(255, 220, 43, 0.3)'
                }}>
                  {profile.username?.[0]?.toUpperCase()}
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: '900', color: '#fff', margin: '0 0 0.5rem' }}>@{profile.username}</h1>
                
                {isEditing ? (
                    <input 
                        value={tagline}
                        onChange={e => setTagline(e.target.value)}
                        style={{
                            width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px', color: '#fff', padding: '0.5rem', textAlign: 'center',
                            fontFamily: 'inherit', fontWeight: '600', marginBottom: '2rem'
                        }}
                    />
                ) : (
                    <p style={{ color: '#94a3b8', fontWeight: '600', marginBottom: '2rem' }}>{tagline}</p>
                )}

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem', textAlign: 'left' }}>
                  {isEditing ? (
                      <textarea 
                          value={bio}
                          onChange={e => setBio(e.target.value)}
                          rows={4}
                          style={{
                              width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                              borderRadius: '8px', color: '#fff', padding: '0.75rem',
                              fontFamily: 'inherit', fontSize: '0.9rem', marginBottom: '2rem', resize: 'none'
                          }}
                      />
                  ) : (
                      <p style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.6', marginBottom: '2rem' }}>{bio}</p>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>
                      <span style={{ fontSize: '1.1rem' }}>🌐</span> citypulse.tech/{profile.username}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>
                      <span style={{ fontSize: '1.1rem' }}>🐦</span> @{profile.username}_civic
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: '#94a3b8', fontSize: '0.9rem', fontWeight: '600' }}>
                      <span style={{ fontSize: '1.1rem' }}>📍</span> Mumbai, IN
                    </div>
                  </div>

                  {/* League Status / Action */}
                  {isOwnProfile && (
                    <div style={{ marginTop: '2rem' }}>
                      {!profile.leaderboard_opt_in ? (
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleJoinLeague(true)}
                          disabled={joiningLeague}
                          style={{
                            width: '100%', padding: '1rem',
                            background: 'linear-gradient(135deg, #FFDC2B 0%, #FF8A00 100%)',
                            color: '#000', border: 'none', borderRadius: '16px',
                            fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1rem',
                            cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(255, 220, 43, 0.4)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem'
                          }}
                        >
                          {joiningLeague ? '⌛ Joining...' : '🏆 Join Global League'}
                        </motion.button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
                           <div style={{
                                width: '100%', padding: '1rem',
                                background: 'rgba(255, 220, 43, 0.1)',
                                border: '1px solid rgba(255, 220, 43, 0.3)',
                                borderRadius: '16px', color: '#FFDC2B',
                                fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '0.9rem',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem'
                           }}>
                                🌟 Verified League Member
                           </div>
                           <button 
                             onClick={() => handleJoinLeague(false)}
                             style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', textDecoration: 'underline' }}
                           >
                             Leave League
                           </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
               <div style={{ ...glassStyle, padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff' }}>{profile.xp}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Total XP</div>
               </div>
               <div style={{ ...glassStyle, padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: '900', color: '#fff' }}>{profile.totalComplaints}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase' }}>Reports</div>
               </div>
            </div>
          </div>

          {/* Right Column */}
          <div style={{ flex: '1.8', minWidth: '320px' }}>
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{ ...glassStyle, padding: '2.5rem', marginBottom: '2rem' }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: '900', color: '#fff', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                🏆 Achievements
              </h2>
              <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {profile.badges?.length > 0 ? profile.badges.map((b, i) => (
                  <div key={i} style={{ textAlign: 'center', width: '80px' }}>
                     <div style={{
                        width: '80px', height: '80px', borderRadius: '24px',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '2rem', marginBottom: '0.75rem'
                     }}>
                        {b.icon}
                     </div>
                     <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#fff', textTransform: 'uppercase' }}>{b.name}</div>
                  </div>
                )) : (
                  <div style={{ color: '#64748b', fontWeight: '600' }}>No achievements unlocked yet.</div>
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              style={{ ...glassStyle, padding: '2.5rem' }}
            >
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: '900', color: '#fff', marginBottom: '2rem' }}>
                📅 Last Activities
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {profile.activities?.length > 0 ? profile.activities.map((act, i) => (
                  <div key={i} style={{ background: 'rgba(255,255,255,0.03)', padding: '1.25rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: '#f1f5f9', fontWeight: '700', fontSize: '0.95rem' }}>{act.label}</div>
                    <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: '600' }}>{act.date}</div>
                  </div>
                )) : (
                  <div style={{ color: '#64748b', fontWeight: '600' }}>No recent activities.</div>
                )}
              </div>
            </motion.div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
