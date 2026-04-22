import React, { useEffect, useState } from 'react';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { SkeletonAdminTable } from '../../components/ui/SkeletonLoader';

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

  const toggleRole = async (userId, currentRole) => {
    const cycle = { user: 'officer', officer: 'admin', admin: 'user' };
    const newRole = cycle[currentRole] || 'user';
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
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', overflowX: 'auto' }}>
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
              {filtered.map(u => (
                <tr key={u.id}>
                  <td><a href={`/profile/${u.username}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--red-400)' }}>{u.username}</a></td>
                  <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                  <td>Lv. {u.level}</td>
                  <td style={{ color: '#FFD700', fontFamily: 'var(--font-display)', fontWeight: '700' }}>{u.xp?.toLocaleString()}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-approved' : 'badge-pending'}`}>{u.role}</span>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleRole(u.id, u.role)}>
                      {u.role === 'admin' ? '⬇️ Demote to User' : (u.role === 'officer' ? '⬆️ Promote to Admin' : '⬆️ Promote to Officer')}
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
