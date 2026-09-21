import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const ADMIN_LINKS = [
  { path: '/admin', label: 'Overview', icon: '📊' },
  { path: '/admin/complaints', label: 'Complaints', icon: '📋' },
  { path: '/admin/analytics', label: 'Analytics', icon: '📈' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/feedback', label: 'Feedback', icon: '📝' },
];

const AdminLayout = ({ children, title }) => {
  const location = useLocation();

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 64px)' }}>
      {/* Sidebar */}
      <nav style={{
        width: '220px',
        background: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        padding: '1.5rem 0',
        flexShrink: 0,
      }}>
        <div style={{ padding: '0 1rem 1rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.7rem',
            fontWeight: '700',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            color: 'var(--red-400)',
          }}>Admin Panel</div>
        </div>
        {ADMIN_LINKS.map(({ path, label, icon }) => {
          const active = location.pathname === path;
          return (
            <Link key={path} to={path} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              padding: '0.75rem 1rem',
              fontFamily: 'var(--font-display)',
              fontSize: '0.85rem',
              fontWeight: '600',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: active ? 'white' : 'var(--text-secondary)',
              background: active ? 'var(--red-700)' : 'transparent',
              borderRadius: '6px',
              margin: '0 0.5rem',
              transition: 'all 0.2s',
            }}>
              <span>{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <main style={{ flex: 1, padding: '2rem', overflow: 'auto' }}>
        {title && (
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '2rem' }}>
            {title}
          </h1>
        )}
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;
