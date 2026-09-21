import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => { await logout(); navigate('/'); };
  const isActive = (path) => location.pathname === path;

  return (
    <nav style={{
      background: 'white', borderBottom: '1px solid #e5e7eb',
      position: 'sticky', top: 0, zIndex: 1000,
      height: '64px', display: 'flex', alignItems: 'center',
      padding: '0 2rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', maxWidth: '1400px', margin: '0 auto' }}>

        {/* Logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{
            width: '34px', height: '34px', background: '#C62828',
            borderRadius: '8px', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.1rem',
          }}>🗺️</div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: '800', letterSpacing: '0.03em', textTransform: 'uppercase', color: '#111827' }}>
            Garbage<span style={{ color: '#C62828' }}>Maps</span>
          </span>
        </Link>

        {/* Nav Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
          {[
            { path: '/heatmap', label: 'Heatmap' },
            { path: '/leaderboard', label: 'Leaderboard' },
            { path: '/feedback', label: 'Feedback' },
          ].map(({ path, label }) => (
            <Link key={path} to={path} style={{
              padding: '0.45rem 0.875rem',
              fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: '700',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: isActive(path) ? '#C62828' : '#4B5563',
              borderRadius: '6px',
              background: isActive(path) ? '#FEF2F2' : 'transparent',
              transition: 'all 0.15s',
            }}>{label}</Link>
          ))}
          {user?.role === 'admin' && (
            <Link to="/admin" style={{
              padding: '0.45rem 0.875rem',
              fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: '700',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              color: '#C62828', borderRadius: '6px', transition: 'all 0.15s',
              background: location.pathname.startsWith('/admin') ? '#FEF2F2' : 'transparent',
            }}>⚙️ Admin</Link>
          )}
        </div>

        {/* Auth */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          {user ? (
            <>
              <Link to="/submit" style={{
                padding: '0.5rem 1rem', background: '#C62828', color: 'white',
                borderRadius: '7px', fontFamily: 'var(--font-display)', fontSize: '0.82rem',
                fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>+ Report</Link>

              <Link to={`/profile/${user.username}`} style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.4rem 0.75rem', background: '#FEF2F2',
                border: '1px solid #FECACA', borderRadius: '7px',
                fontSize: '0.82rem', color: '#991B1B',
                fontFamily: 'var(--font-display)', fontWeight: '700',
              }}>
                ⭐ {user.xp || 0} XP
              </Link>

              <button onClick={handleLogout} style={{
                padding: '0.4rem 0.75rem', background: 'transparent',
                border: '1px solid #e5e7eb', borderRadius: '7px',
                color: '#6B7280', fontSize: '0.82rem', cursor: 'pointer',
                fontFamily: 'var(--font-display)', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" style={{
                padding: '0.5rem 1rem', background: 'white', color: '#374151',
                border: '1.5px solid #d1d5db', borderRadius: '7px',
                fontFamily: 'var(--font-display)', fontSize: '0.82rem',
                fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Login</Link>
              <Link to="/register" style={{
                padding: '0.5rem 1rem', background: '#C62828', color: 'white',
                borderRadius: '7px', fontFamily: 'var(--font-display)', fontSize: '0.82rem',
                fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
