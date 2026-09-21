import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const PASS_KEY = 'gm_admin_pass_token';

// Check if admin pass is already verified this session
export const isAdminPassVerified = () => !!sessionStorage.getItem(PASS_KEY);

export const clearAdminPass = () => sessionStorage.removeItem(PASS_KEY);

const AdminPassGate = ({ children }) => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [verified, setVerified] = useState(isAdminPassVerified());
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!verified) setTimeout(() => inputRef.current?.focus(), 300);
  }, [verified]);

  useEffect(() => {
    if (session?.access_token) localStorage.setItem('access_token', session.access_token);
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pass.trim()) return;
    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/admin-pass/verify', { pass: pass.trim() });
      if (data.success) {
        sessionStorage.setItem(PASS_KEY, data.token);
        setVerified(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Incorrect pass. Try again.');
      setShake(true);
      setPass('');
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  if (verified) return children;

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #0f0f0f 0%, #1a0505 50%, #0f0f0f 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Animated background grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(198,40,40,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(198,40,40,0.07) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        pointerEvents: 'none',
      }} />

      {/* Glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(198,40,40,0.15) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        style={{ position: 'relative', width: '100%', maxWidth: '420px', padding: '1rem' }}
      >
        {/* Card */}
        <motion.div
          animate={shake ? { x: [-10, 10, -8, 8, -5, 5, 0] } : {}}
          transition={{ duration: 0.5 }}
          style={{
            background: 'rgba(20, 20, 20, 0.95)',
            border: '1px solid rgba(198,40,40,0.3)',
            borderRadius: '20px',
            padding: '2.5rem',
            boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 60px rgba(198,40,40,0.1)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Icon */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <motion.div
              animate={{ rotateY: [0, 360] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
              style={{
                width: '72px', height: '72px',
                background: 'linear-gradient(135deg, #C62828, #7f0000)',
                borderRadius: '18px',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', marginBottom: '1.25rem',
                boxShadow: '0 8px 32px rgba(198,40,40,0.4)',
              }}>
              🛡️
            </motion.div>
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: '900',
              textTransform: 'uppercase', letterSpacing: '0.05em', color: 'white',
              marginBottom: '0.4rem',
            }}>
              Admin Access
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
              Enter your secret admin pass to continue
            </p>
          </div>

          {/* User info pill */}
          {user && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '10px', padding: '0.625rem 0.875rem', marginBottom: '1.5rem',
            }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: '#C62828', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontFamily: 'var(--font-display)',
                fontWeight: '800', fontSize: '0.9rem', color: 'white', flexShrink: 0,
              }}>
                {user.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <div style={{ color: 'white', fontSize: '0.85rem', fontWeight: '600' }}>{user.username}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin Account</div>
              </div>
              <div style={{ marginLeft: 'auto', color: '#4CAF50', fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: '700', textTransform: 'uppercase' }}>
                ✓ Verified
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block', fontFamily: 'var(--font-display)', fontSize: '0.72rem',
                fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem',
              }}>
                Admin Pass
              </label>
              <input
                ref={inputRef}
                type="password"
                value={pass}
                onChange={e => { setPass(e.target.value); setError(''); }}
                placeholder="Enter your admin pass..."
                autoComplete="off"
                style={{
                  width: '100%', padding: '0.875rem 1rem',
                  background: 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${error ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '10px', color: 'white', fontSize: '1rem',
                  fontFamily: 'var(--font-body)', outline: 'none',
                  transition: 'border-color 0.2s',
                  letterSpacing: '0.15em',
                }}
                onFocus={e => e.target.style.borderColor = '#C62828'}
                onBlur={e => e.target.style.borderColor = error ? '#EF4444' : 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                  style={{
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: '8px', padding: '0.625rem 0.875rem',
                    color: '#FCA5A5', fontSize: '0.82rem', marginBottom: '1rem',
                  }}>
                  ⚠️ {error}
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading || !pass.trim()}
              style={{
                width: '100%', padding: '0.9rem',
                background: loading || !pass.trim()
                  ? 'rgba(198,40,40,0.4)'
                  : 'linear-gradient(135deg, #C62828, #E53935)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontFamily: 'var(--font-display)',
                fontSize: '0.95rem', fontWeight: '800',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                cursor: loading || !pass.trim() ? 'not-allowed' : 'pointer',
                boxShadow: pass.trim() ? '0 4px 20px rgba(198,40,40,0.4)' : 'none',
                transition: 'all 0.2s',
              }}>
              {loading ? '🔐 Verifying...' : '🚀 Enter Admin Panel'}
            </button>
          </form>

          {/* Back link */}
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)', fontSize: '0.82rem',
                fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                letterSpacing: '0.08em', transition: 'color 0.2s',
              }}
              onMouseOver={e => e.target.style.color = 'rgba(255,255,255,0.6)'}
              onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.3)'}
            >
              ← Back to Site
            </button>
          </div>
        </motion.div>

        {/* Bottom hint */}
        <div style={{ textAlign: 'center', marginTop: '1.25rem', color: 'rgba(255,255,255,0.2)', fontSize: '0.72rem', letterSpacing: '0.08em' }}>
          SESSION PROTECTED • GARBAGEMAP ADMIN
        </div>
      </motion.div>
    </div>
  );
};

export default AdminPassGate;
