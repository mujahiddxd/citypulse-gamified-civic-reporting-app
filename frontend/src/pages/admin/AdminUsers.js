import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) localStorage.setItem('access_token', session.access_token);
    api.get('/admin/users').then(r => { setUsers(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [session]);

  const toggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Change role to ${newRole}?`)) return;
    try {
      await api.patch(`/admin/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) { alert('Failed'); }
  };

  return (
    <AdminLayout title="👥 User Management">
      {loading ? <div>Loading...</div> : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Level</th>
                <th>XP</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td><Link to={`/profile/${u.username}`} style={{ color: 'var(--red-400)' }}>{u.username}</Link></td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td>Lv. {u.level}</td>
                  <td style={{ color: '#FFD700', fontFamily: 'var(--font-display)', fontWeight: '700' }}>{u.xp?.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-approved' : 'badge-pending'}`}>{u.role}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleRole(u.id, u.role)}>
                      {u.role === 'admin' ? '⬇️ Demote' : '⬆️ Promote'}
                    </button>
                  </td>
                </tr>
              ))}
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
    api.get('/admin/feedback').then(r => { setFeedback(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, [session]);

  const markRead = async (id) => {
    await api.patch(`/admin/feedback/${id}/read`);
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, is_read: true } : f));
  };

  const CAT_ICONS = { Bug: '🐛', Suggestion: '💡', Other: '💬' };

  return (
    <AdminLayout title="📝 Feedback Submissions">
      {loading ? <div>Loading...</div> : (
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {feedback.map(f => (
              <div key={f.id}
                onClick={() => { setSelected(f); if (!f.is_read) markRead(f.id); }}
                style={{
                  padding: '1rem',
                  background: selected?.id === f.id ? 'var(--bg-elevated)' : 'var(--bg-card)',
                  border: `1px solid ${selected?.id === f.id ? 'var(--border-active)' : 'var(--border)'}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  opacity: f.is_read ? 0.7 : 1,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: '700', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                      {CAT_ICONS[f.category]} {f.subject}
                    </span>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>{f.name} • {f.email}</div>
                  </div>
                  {!f.is_read && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--red-500)', flexShrink: 0, marginTop: '4px' }} />}
                </div>
              </div>
            ))}
            {feedback.length === 0 && <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No feedback yet</div>}
          </div>

          {selected && (
            <div className="card" style={{ width: '360px', flexShrink: 0 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                {CAT_ICONS[selected.category]} {selected.category}
              </div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{selected.subject}</h3>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {selected.name} • {selected.email} • {new Date(selected.created_at).toLocaleString()}
              </div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: '1.7', fontSize: '0.9rem' }}>{selected.message}</p>
            </div>
          )}
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminUsers;
