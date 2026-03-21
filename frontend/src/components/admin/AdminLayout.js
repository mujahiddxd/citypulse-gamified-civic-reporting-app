import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clearAdminToken } from '../../pages/admin/AdminLogin';

const ADMIN_LINKS = [
  { path: '/admin', label: 'Overview', icon: '📊', exact: true },
  { path: '/admin/complaints', label: 'Complaints', icon: '📋' },
  { path: '/admin/analytics', label: 'Analytics', icon: '📈' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/feedback', label: 'Feedback', icon: '📝' },
];

const AdminLayout = ({ children, title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Override body styles while in admin — removes anime background
  useEffect(() => {
    const origBg = document.body.style.background;
    const origBgImage = document.body.style.backgroundImage;
    const origPadding = document.body.style.padding;
    document.body.style.background = '#f1f5f9';
    document.body.style.backgroundImage = 'none';
    document.body.style.padding = '0';
    return () => {
      document.body.style.background = origBg;
      document.body.style.backgroundImage = origBgImage;
      document.body.style.padding = origPadding;
    };
  }, []);

  const handleLogout = () => {
    clearAdminToken();
    navigate('/admin-login');
  };

  const isActive = (link) =>
    link.exact ? location.pathname === link.path : location.pathname.startsWith(link.path);

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      background: '#f1f5f9',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '240px' : '64px',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        transition: 'width 0.25s ease',
        overflow: 'hidden',
        boxShadow: '4px 0 20px rgba(0,0,0,0.25)',
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{
          padding: '1.25rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          flexShrink: 0,
        }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: '#C62828', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0,
          }}>🛡️</div>
          {sidebarOpen && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: '900', color: '#fff', fontSize: '1rem', lineHeight: 1 }}>
                City<span style={{ color: '#FFDC2B' }}>Pulse</span>
              </div>
              <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.65rem', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '2px' }}>
                Admin Portal
              </div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {ADMIN_LINKS.map(({ path, label, icon, exact }) => {
            const active = exact ? location.pathname === path : location.pathname.startsWith(path);
            return (
              <Link key={path} to={path} title={label} style={{
                display: 'flex', alignItems: 'center',
                gap: '0.75rem', padding: '0.7rem 0.85rem',
                borderRadius: '10px',
                background: active ? 'rgba(198,40,40,0.9)' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.55)',
                fontFamily: 'var(--font-display)', fontWeight: '700',
                fontSize: '0.85rem', letterSpacing: '0.04em',
                textTransform: 'uppercase', transition: 'all 0.15s',
                textDecoration: 'none', whiteSpace: 'nowrap', overflow: 'hidden',
              }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
              >
                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
                {sidebarOpen && label}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar footer */}
        <div style={{ padding: '0.75rem 0.5rem', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <button
            onClick={() => setSidebarOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 0.85rem', borderRadius: '10px',
              background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)',
              cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-display)',
              fontWeight: '700', width: '100%', textAlign: 'left', whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>{sidebarOpen ? '◀' : '▶'}</span>
            {sidebarOpen && 'Collapse'}
          </button>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.6rem 0.85rem', borderRadius: '10px',
              background: 'transparent', border: 'none', color: 'rgba(239,68,68,0.7)',
              cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-display)',
              fontWeight: '700', width: '100%', textAlign: 'left', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(239,68,68,0.7)'; }}
          >
            <span style={{ fontSize: '1rem', flexShrink: 0 }}>🚪</span>
            {sidebarOpen && 'Logout'}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{
          height: '60px', background: '#fff',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center',
          padding: '0 1.5rem', gap: '1rem', flexShrink: 0,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}>
          {title && (
            <h1 style={{
              fontFamily: 'var(--font-display)', fontSize: '1.3rem',
              fontWeight: '900', color: '#0f172a',
              textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0,
            }}>{title}</h1>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: '999px', padding: '0.3rem 0.85rem',
              fontFamily: 'var(--font-display)', fontSize: '0.72rem',
              fontWeight: '800', color: '#C62828', letterSpacing: '0.1em',
            }}>🛡️ ADMIN SESSION</div>
            <Link to="/" style={{
              color: '#64748b', fontSize: '0.8rem', fontWeight: '600',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px',
            }}>← Back to site</Link>
          </div>
        </header>

        {/* Scrollable content */}
        <main style={{
          flex: 1, overflowY: 'auto',
          padding: '2rem',
          background: '#f8fafc',
        }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
