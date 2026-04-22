import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { SkeletonAdminTable } from '../../components/ui/SkeletonLoader';

// Fix leaflet icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const AdminComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedMapComplaint, setSelectedMapComplaint] = useState(null);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) localStorage.setItem('access_token', session.access_token);
    fetchComplaints();
  }, [filter, page, session?.access_token]);

  const fetchComplaints = async () => {
    setLoading(true);
    const start = Date.now();
    try {
      const { data } = await api.get(`/admin/complaints?status=${filter}&page=${page}&limit=15`);
      setComplaints(data.data);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      const elapsed = Date.now() - start;
        
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    setActionLoading(prev => ({ ...prev, [id]: action }));
    try {
      await api.patch(`/admin/complaints/${id}/${action}`);
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: action === 'approve' ? 'Approved' : 'Rejected' } : c));
    } catch (err) {
      alert('Action failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  return (
    <AdminLayout title="📋 Complaint Management">
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['Pending', 'Approved', 'Rejected', ''].map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilter(s); setPage(1); }}>
            {s || 'All'} {s === 'Pending' ? '⏳' : s === 'Approved' ? '✅' : s === 'Rejected' ? '❌' : '📋'}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: '2.2' }}>{total} total</span>
      </div>

      {loading ? <SkeletonAdminTable rows={8} cols={7} /> : (
        <>
          {complaints.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800 }}>No complaints found</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
              <AnimatePresence>
                {complaints.map((c, i) => {
                  const severityColors = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' };
                  const statusColors = { Pending: '#f59e0b', Approved: '#22c55e', Rejected: '#ef4444' };

                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.03 }}
                      style={{
                        background: '#fff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        overflow: 'hidden',
                        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      {/* Image */}
                      <div style={{ position: 'relative', height: '180px', background: '#f1f5f9', overflow: 'hidden' }}>
                        {c.image_url ? (
                          <img
                            src={c.image_url}
                            alt="Report"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
                          />
                        ) : null}
                        <div style={{
                          display: c.image_url ? 'none' : 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          height: '100%', fontSize: '3rem', color: '#cbd5e1',
                          background: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                        }}>🗑️</div>

                        {/* Severity pill */}
                        <span style={{
                          position: 'absolute', top: '0.75rem', left: '0.75rem',
                          background: severityColors[c.severity] || '#94a3b8',
                          color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                          padding: '0.25rem 0.6rem', borderRadius: '999px',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>{c.severity}</span>

                        {/* Status pill */}
                        <span style={{
                          position: 'absolute', top: '0.75rem', right: '0.75rem',
                          background: statusColors[c.status] || '#94a3b8',
                          color: '#fff', fontSize: '0.65rem', fontWeight: 800,
                          padding: '0.25rem 0.6rem', borderRadius: '999px',
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                        }}>{c.status}</span>
                      </div>

                      {/* Body */}
                      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Area & Type */}
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: '#111', textTransform: 'uppercase' }}>
                            {c.area_name || 'Unknown Area'}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, marginTop: '2px' }}>
                            {c.type} • {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>

                        {/* Description */}
                        <p style={{
                          fontSize: '0.85rem', color: '#475569', lineHeight: 1.5,
                          display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical',
                          overflow: 'hidden', margin: 0, flex: 1,
                        }}>
                          {c.description || 'No description provided.'}
                        </p>

                        {/* User */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.7rem', color: '#fff', fontWeight: 800,
                          }}>
                            {(c.users?.username || 'A')[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                            {c.is_anonymous ? '🕶️ Anonymous' : (c.users?.username || 'Unknown')}
                          </span>
                        </div>
                      </div>

                      {/* Actions bar */}
                      <div style={{
                        padding: '0.75rem 1.25rem',
                        borderTop: '1px solid #f1f5f9',
                        display: 'flex', gap: '0.5rem',
                        background: '#fafbfc',
                      }}>
                        <button
                          className="btn btn-sm"
                          onClick={() => setSelectedMapComplaint(c)}
                          style={{ flex: 1, justifyContent: 'center', background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem' }}
                        >📍 Map</button>

                        {c.status === 'Pending' && (
                          <>
                            <button
                              className="btn btn-sm"
                              disabled={!!actionLoading[c.id]}
                              onClick={() => handleAction(c.id, 'approve')}
                              style={{ flex: 1, justifyContent: 'center', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem' }}
                            >{actionLoading[c.id] === 'approve' ? '...' : '✅ Approve'}</button>
                            <button
                              className="btn btn-sm"
                              disabled={!!actionLoading[c.id]}
                              onClick={() => handleAction(c.id, 'reject')}
                              style={{ flex: 1, justifyContent: 'center', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem' }}
                            >{actionLoading[c.id] === 'reject' ? '...' : '❌ Reject'}</button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {total > 15 && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem', justifyContent: 'center' }}>
          <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
          <span style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.6' }}>
            Page {page} of {Math.ceil(total / 15)}
          </span>
          <button className="btn btn-secondary btn-sm" disabled={page >= Math.ceil(total / 15)} onClick={() => setPage(p => p + 1)}>Next →</button>
        </div>
      )}

      {/* Map Modal */}
      <AnimatePresence>
        {selectedMapComplaint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setSelectedMapComplaint(null)}>
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              style={{ background: 'white', borderRadius: '16px', border: '4px solid #111', width: '90%', maxWidth: '800px', overflow: 'hidden', boxShadow: '8px 8px 0px #111' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ padding: '1.5rem', borderBottom: '2px solid #111', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', textTransform: 'uppercase', color: '#111', fontWeight: 900 }}>📍 Location for {selectedMapComplaint.area_name}</h3>
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedMapComplaint(null)}>Close</button>
              </div>

              <div style={{ height: '400px', width: '100%' }}>
                <MapContainer center={[selectedMapComplaint.latitude, selectedMapComplaint.longitude]} zoom={15} style={{ height: '100%', width: '100%' }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                  <Marker position={[selectedMapComplaint.latitude, selectedMapComplaint.longitude]} icon={redIcon}>
                    <Popup>
                      <strong>{selectedMapComplaint.type}</strong><br />
                      Reported by {selectedMapComplaint.users?.username || 'Anonymous'}
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
              <div style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '2px solid #111' }}>
                <div style={{ fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 800 }}>Coordinates</div>
                <div style={{ fontFamily: 'monospace', fontSize: '1.1rem', color: '#111', background: '#e2e8f0', padding: '0.5rem', borderRadius: '4px', display: 'inline-block', marginTop: '0.25rem' }}>
                  Lat: {selectedMapComplaint.latitude.toFixed(6)}, Lng: {selectedMapComplaint.longitude.toFixed(6)}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </AdminLayout>
  );
};

export default AdminComplaints;
