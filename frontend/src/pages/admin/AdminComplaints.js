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
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Area</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {complaints.map((c, i) => (
                  <motion.tr key={c.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: i * 0.02 }}>
                    <td style={{ color: 'var(--text-primary)' }}>{c.users?.username || 'Anonymous'}</td>
                    <td>{c.type}</td>
                    <td>{c.area_name}</td>
                    <td><span className={`badge badge-${c.severity.toLowerCase()}`}>{c.severity}</span></td>
                    <td><span className={`badge badge-${c.status.toLowerCase()}`}>{c.status}</span></td>
                    <td>{new Date(c.created_at).toLocaleDateString()}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => setSelectedMapComplaint(c)}
                        >
                          📍 Map
                        </button>
                        {c.status === 'Pending' && (
                          <>
                            <button
                              className="btn btn-success btn-sm"
                              disabled={!!actionLoading[c.id]}
                              onClick={() => handleAction(c.id, 'approve')}
                            >
                              {actionLoading[c.id] === 'approve' ? '...' : '✅'}
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={!!actionLoading[c.id]}
                              onClick={() => handleAction(c.id, 'reject')}
                            >
                              {actionLoading[c.id] === 'reject' ? '...' : '❌'}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>

          {complaints.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>No complaints found</div>
          )}
        </div>
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
