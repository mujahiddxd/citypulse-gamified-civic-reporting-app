import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { theme, mode, toggleMode, equippedBorder } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowProfileMenu(false);
    navigate('/');
  };

  const isActive = (path) => location.pathname.startsWith(path) && path !== '/';

  return (
    <div style={{ padding: '0.75rem 1rem', position: 'sticky', top: 0, zIndex: 1000 }}>
      <nav style={{
        height: '74px', display: 'flex', alignItems: 'center',
        padding: '0 1rem 0 2rem', maxWidth: '1200px', margin: '1rem auto 0 auto',
        borderRadius: '9999px', // Pill Shape
        background: 'var(--primary-blue)', // The vibrant blue
        border: '3px solid #111111',
        boxShadow: '6px 6px 0px #111111',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>

          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              fontWeight: '800',
              letterSpacing: '0.02em',
              color: '#ffffff',
            }}>
              City<span style={{ color: 'var(--accent)' }}>Pulse</span>
            </span>
          </Link>

          {/* Nav Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {[
              { path: '/heatmap', label: 'Map' },
              { path: '/leaderboard', label: 'Ranks' },
              { path: '/store', label: 'Shop' },
              { path: '/inventory', label: 'Inventory' },
              { path: '/statistics', label: 'Stats' },
              { path: '/reports', label: 'Feed' },
              { path: '/about', label: 'About' },
            ].map(({ path, label }) => (
              <Link key={path} to={path} style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '9999px',
                fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: '700',
                background: isActive(path) ? '#111111' : 'transparent',
                color: isActive(path) ? 'var(--accent)' : '#ffffff',
                transition: 'all 0.2s',
              }}>{label}</Link>
            ))}

            {(user?.role === 'admin' || user?.role === 'officer') && (
              <Link to="/admin" style={{
                padding: '0.5rem 1rem',
                fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: '800',
                letterSpacing: '0.05em', textTransform: 'uppercase',
                color: 'var(--danger)', borderRadius: '10px', transition: 'all 0.2s',
                background: location.pathname.startsWith('/admin') ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
              }}>Admin</Link>
            )}
          </div>

          {/* Right Side Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>

            {/* Theme Toggle Omitted / Simplified for Neo-Brutalist standardizing */}

            {user ? (
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className={equippedBorder === 'neon-aura' ? 'effect-neon-aura' : ''}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    cursor: 'pointer', padding: '0.3rem 0.6rem',
                    borderRadius: '9999px', background: '#ffffff',
                    border: '2px solid #111111',
                    position: 'relative',
                    zIndex: 2,
                    boxShadow: '2px 2px 0px #111111'
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    background: 'var(--accent)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontWeight: '900', color: '#111',
                    fontSize: '0.9rem', border: '2px solid #111'
                  }}>
                    {user.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#111', paddingRight: '0.5rem' }}>
                    {user.coins?.toLocaleString()} 🪙
                  </span>
                </div>

                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      style={{
                        position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                        width: '200px', background: 'var(--bg-elevated)',
                        backdropFilter: 'var(--glass-blur)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '16px', padding: '0.5rem',
                        boxShadow: 'var(--shadow)', zIndex: 1100
                      }}
                    >
                      <Link to={`/profile/${user.username}`} onClick={() => setShowProfileMenu(false)} className="btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem' }}>
                        👤 View Profile
                      </Link>
                      <Link to="/dashboard" onClick={() => setShowProfileMenu(false)} className="btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem' }}>
                        📊 Dashboard
                      </Link>
                      <Link to="/submit" onClick={() => setShowProfileMenu(false)} className="btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '0.75rem' }}>
                        📢 New Report
                      </Link>
                      <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />
                      <button onClick={handleLogout} className="btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', color: 'var(--danger)', padding: '0.75rem' }}>
                        🚪 Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <Link to="/login" style={{ color: '#ffffff', fontWeight: '600', padding: '0 1rem', textDecoration: 'none' }}>Login</Link>
                <Link to="/register" className="btn btn-primary" style={{ padding: '0.5rem 1.5rem', fontSize: '1rem' }}>Sign up</Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
