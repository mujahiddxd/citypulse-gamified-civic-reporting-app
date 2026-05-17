import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { SkeletonAdminTable } from '../../components/ui/SkeletonLoader';
import ProfileCard from '../../components/ui/ProfileCard';

export const AdminUsers = () => {
  const { session } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (session?.access_token) localStorage.setItem('access_token', session.access_token);
    const fetchUsers = async () => {
      setLoading(true);
      const start = Date.now();
      try {
        const r = await api.get('/admin/users');
        setUsers(r.data);
      } catch (err) {
        console.error(err);
      } finally {
        const elapsed = Date.now() - start;
        
        setLoading(false);
      }
    };
    fetchUsers();
  }, [session?.access_token]);

  const changeRole = async (userId, newRole) => {
    if (!window.confirm(`Change this user's role to ${newRole.toUpperCase()}?`)) return;
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert(`Failed to update role: ${err.response?.data?.error || err.message}`);
    }
  };

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout title="👥 User Management">
      {/* Search */}
      <div style={{ marginBottom: '1.25rem' }}>
        <input
          type="text"
          placeholder="🔍 Search by username or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '0.65rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
            fontSize: '0.9rem', width: '320px', background: '#fff', outline: 'none',
            fontFamily: 'var(--font-body)',
          }}
        />
        <span style={{ marginLeft: '0.75rem', color: '#94a3b8', fontSize: '0.85rem' }}>
          {filtered.length} of {users.length} users
        </span>
      </div>
      {loading ? <SkeletonAdminTable rows={8} cols={7} /> : (
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: '1rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
              <tr>
                <th style={{ padding: '1.25rem 1rem', color: '#64748b', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User</th>
                <th style={{ padding: '1.25rem 1rem', color: '#64748b', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</th>
                <th style={{ padding: '1.25rem 1rem', color: '#64748b', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Level & XP</th>
                <th style={{ padding: '1.25rem 1rem', color: '#64748b', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Role</th>
                <th style={{ padding: '1.25rem 1rem', color: '#64748b', fontWeight: '700', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: i === filtered.length - 1 ? 'none' : '1px solid #f1f5f9', background: 'white', transition: 'background 0.2s' }}
                    onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={e => e.currentTarget.style.background = 'white'}
                >
                  <td style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
                    <img src={`https://ui-avatars.com/api/?name=${u.username}&background=0D8ABC&color=fff&size=40`} alt="Avatar" style={{ borderRadius: '50%', border: '2px solid #e2e8f0' }} />
                    <span style={{ fontWeight: '700', color: '#0f172a', fontFamily: 'var(--font-display)', fontSize: '1.05rem' }}>{u.username}</span>
                  </td>
                  <td style={{ padding: '1rem', color: '#475569', fontSize: '0.95rem' }}>{u.email}</td>
                  <td style={{ padding: '1rem', color: '#475569', fontSize: '0.95rem' }}>
                    <span style={{ fontWeight: 'bold', color: '#0f172a' }}>Lv. {u.level || 1}</span>
                    <span style={{ color: '#94a3b8', margin: '0 0.4rem' }}>•</span> 
                    {u.xp?.toLocaleString() || 0} XP
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{
                      padding: '0.35rem 0.75rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em',
                      background: u.role === 'admin' ? '#fee2e2' : u.role === 'officer' ? '#fef3c7' : '#f1f5f9',
                      color: u.role === 'admin' ? '#991b1b' : u.role === 'officer' ? '#92400e' : '#475569',
                      border: `1px solid ${u.role === 'admin' ? '#fecaca' : u.role === 'officer' ? '#fde68a' : '#e2e8f0'}`,
                    }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {(u.role === 'user' || u.role === 'officer') && (
                        <button onClick={() => changeRole(u.id, u.role === 'user' ? 'officer' : 'admin')}
                          style={{ padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseOver={e => { e.currentTarget.style.background = '#dbeafe'; e.currentTarget.style.borderColor = '#93c5fd'; }}
                          onMouseOut={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.borderColor = '#bfdbfe'; }}
                        >
                          ↑ Promote
                        </button>
                      )}
                      {(u.role === 'admin' || u.role === 'officer') && (
                        <button onClick={() => changeRole(u.id, u.role === 'admin' ? 'officer' : 'user')}
                          style={{ padding: '0.5rem 0.875rem', borderRadius: '8px', border: '1px solid #fecaca', background: '#fef2f2', color: '#b91c1c', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseOver={e => { e.currentTarget.style.background = '#fee2e2'; e.currentTarget.style.borderColor = '#fca5a5'; }}
                          onMouseOut={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#fecaca'; }}
                        >
                          ↓ Demote
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No users found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminLayout>
  );
};

export const AdminFeedback = () => {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) localStorage.setItem('access_token', session.access_token);
    const fetchFeedback = async () => {
      setLoading(true);
      const start = Date.now();
      try {
        const r = await api.get('/admin/feedback');
        setFeedback(r.data);
      } catch (err) {
        console.error(err);
      } finally {
        const elapsed = Date.now() - start;
        
        setLoading(false);
      }
    };
    fetchFeedback();
  }, [session]);

  const markRead = async (id) => {
    await api.patch(`/admin/feedback/${id}/read`);
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, is_read: true } : f));
  };

  const CAT_ICONS = { Bug: '🐛', Suggestion: '💡', Other: '💬' };

  return (
    <AdminLayout title="📝 Feedback Submissions">
      {loading ? <SkeletonAdminTable rows={6} cols={4} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {feedback.map(f => {
            const isSelected = selected?.id === f.id;
            return (
              <div key={f.id}
                style={{
                  background: isSelected ? 'var(--bg-elevated)' : 'var(--bg-card)',
                  border: `2px solid ${isSelected ? 'var(--primary-blue)' : 'var(--border)'}`,
                  borderRadius: '12px',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease',
                  opacity: (!f.is_read || isSelected) ? 1 : 0.75,
                  boxShadow: isSelected ? 'var(--shadow-card)' : 'none',
                }}
              >
                <div 
                  onClick={() => { setSelected(isSelected ? null : f); if (!f.is_read) markRead(f.id); }}
                  style={{ 
                    padding: '1.25rem', cursor: 'pointer', display: 'flex', 
                    justifyContent: 'space-between', alignItems: 'center' 
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontWeight: '800', textTransform: 'uppercase', fontSize: '1.05rem', color: isSelected ? 'var(--primary-blue)' : 'var(--text-primary)' }}>
                        {CAT_ICONS[f.category]} {f.subject}
                      </span>
                      {!f.is_read && (
                        <span style={{ background: '#ef4444', color: 'white', padding: '0.1rem 0.5rem', borderRadius: '999px', fontSize: '0.65rem', fontWeight: 'bold', textTransform: 'uppercase' }}>
                          New
                        </span>
                      )}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {f.name} &bull; {f.email} &bull; {new Date(f.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ 
                    width: '32px', height: '32px', borderRadius: '50%', background: isSelected ? 'var(--primary-blue)' : 'var(--bg-elevated)', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: isSelected ? 'white' : 'var(--text-muted)',
                    transform: isSelected ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease, background 0.3s',
                    flexShrink: 0
                  }}>
                    ▼
                  </div>
                </div>
                
                {isSelected && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem', background: 'var(--bg-card)' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                        Category: {f.category}
                      </div>
                      <p style={{ color: 'var(--text-secondary)', lineHeight: '1.8', fontSize: '0.95rem', whiteSpace: 'pre-wrap', margin: 0 }}>
                        {f.message}
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            );
          })}
          {feedback.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '4rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px dashed var(--border)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <h3 style={{ fontFamily: 'var(--font-display)', textTransform: 'uppercase' }}>Inbox Zero</h3>
              <p>No feedback submissions yet.</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
