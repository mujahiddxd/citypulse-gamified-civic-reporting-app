import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import AdminLayout from '../../components/admin/AdminLayout';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { SkeletonAdminTable } from '../../components/ui/SkeletonLoader';
import { CommentThread } from '../PublicReports';

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
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('Pending');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState({});
  const [selectedMapComplaint, setSelectedMapComplaint] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [activeImgIdx, setActiveImgIdx] = useState(0);
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
      setComplaints(prev => prev.map(c => c.id === id ? { ...c, status: action === 'approve' ? 'Approved' : action === 'resolve' ? 'resolved' : 'Rejected' } : c));
    } catch (err) {
      alert('Action failed');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('⚠️ Are you sure you want to PERMANENTLY delete this report? This cannot be undone.')) return;
    setActionLoading(prev => ({ ...prev, [id]: 'delete' }));
    try {
      await api.delete(`/admin/complaints/${id}`);
      setComplaints(prev => prev.filter(c => c.id !== id));
      setTotal(t => t - 1);
      setSelectedDetail(null);
      setSelectedMapComplaint(null);
    } catch (err) {
      alert('Deletion failed. Ensure you have admin privileges.');
    } finally {
      setActionLoading(prev => ({ ...prev, [id]: null }));
    }
  };

  return (
    <AdminLayout title="📋 Complaint Management">
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['Pending', 'Approved', 'resolved', 'Rejected', ''].map(s => (
          <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setFilter(s); setPage(1); }}>
            {s === 'resolved' ? 'Resolved' : s || 'All'} {s === 'Pending' ? '⏳' : s === 'Approved' ? '✅' : s === 'resolved' ? '🎉' : s === 'Rejected' ? '❌' : '📋'}
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
                  const statusColors = { Pending: '#f59e0b', Approved: '#22c55e', resolved: '#10b981', Rejected: '#ef4444' };

                  return (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => setSelectedDetail(c)}
                      style={{
                        background: '#fff',
                        borderRadius: '16px',
                        border: '1px solid #e2e8f0',
                        cursor: 'pointer',
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

                        {/* AI Verification pill */}
                        {c.ai_mode && (
                          <span style={{
                            position: 'absolute', bottom: '0.75rem', left: '0.75rem',
                            background: c.ai_verified === true ? 'rgba(34,197,94,0.9)'
                              : c.ai_user_override ? 'rgba(245,158,11,0.9)'
                              : c.ai_verified === false ? 'rgba(239,68,68,0.85)'
                              : 'rgba(100,116,139,0.85)',
                            color: '#fff', fontSize: '0.6rem', fontWeight: 800,
                            padding: '0.2rem 0.55rem', borderRadius: '999px',
                            textTransform: 'uppercase', letterSpacing: '0.04em',
                            backdropFilter: 'blur(4px)',
                          }}>
                            🤖 {c.ai_verified === true ? `AI ✅ ${c.ai_confidence}%`
                              : c.ai_user_override ? 'AI ❌ → User Override'
                              : c.ai_verified === false ? `AI ❌ ${c.ai_confidence}%`
                              : 'Manual Review'}
                          </span>
                        )}
                      </div>

                      {/* Body */}
                      <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {/* Area & Type */}
                        <div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 800, color: '#111', textTransform: 'uppercase' }}>
                            {c.area_name || 'Unknown Area'}
                          </div>
                          {c.municipality && (
                            <div style={{
                              display: 'inline-block', padding: '0.2rem 0.6rem', background: '#fef2f2',
                              border: '1px solid #fecaca', borderRadius: '6px', color: '#c62828',
                              fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase',
                              letterSpacing: '0.04em', marginTop: '0.4rem', marginBottom: '0.2rem'
                            }}>
                              🏛️ {c.municipality}
                            </div>
                          )}
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
                              onClick={(e) => { e.stopPropagation(); handleAction(c.id, 'approve'); }}
                              style={{ flex: 1, justifyContent: 'center', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem' }}
                            >{actionLoading[c.id] === 'approve' ? '...' : '✅ Approve'}</button>
                            <button
                              className="btn btn-sm"
                              disabled={!!actionLoading[c.id]}
                              onClick={(e) => { e.stopPropagation(); handleAction(c.id, 'reject'); }}
                              style={{ flex: 1, justifyContent: 'center', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem' }}
                            >{actionLoading[c.id] === 'reject' ? '...' : '❌ Reject'}</button>
                          </>
                        )}
                        {c.status === 'Approved' && (
                          <button
                            className="btn btn-sm"
                            disabled={!!actionLoading[c.id]}
                            onClick={(e) => { e.stopPropagation(); handleAction(c.id, 'resolve'); }}
                            style={{ flex: 1, justifyContent: 'center', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem' }}
                          >{actionLoading[c.id] === 'resolve' ? '...' : '🎉 Mark Resolved'}</button>
                        )}
                        {user?.role === 'admin' && (
                          <button
                            className="btn btn-sm"
                            disabled={!!actionLoading[c.id]}
                            onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                            style={{ flex: 0.4, justifyContent: 'center', background: '#fff', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '8px', fontWeight: 700, fontSize: '0.78rem' }}
                          >{actionLoading[c.id] === 'delete' ? '...' : '🗑️'}</button>
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

      {/* Detail Modal */}
      <AnimatePresence>
        {(selectedDetail || selectedMapComplaint) && (() => {
          const c = selectedDetail || selectedMapComplaint;
          const showMap = !!selectedMapComplaint;
          const severityColors = { Low: '#22c55e', Medium: '#f59e0b', High: '#ef4444' };
          const statusColors = { Pending: '#f59e0b', Approved: '#22c55e', resolved: '#10b981', Rejected: '#ef4444' };
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
              onClick={() => { setSelectedDetail(null); setSelectedMapComplaint(null); setActiveImgIdx(0); }}>
              <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
                style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '720px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderRadius: '20px 20px 0 0' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', textTransform: 'uppercase', color: '#111', fontWeight: 900, margin: 0 }}>
                    📋 Report Details
                  </h3>
                  <button onClick={() => { setSelectedDetail(null); setSelectedMapComplaint(null); setActiveImgIdx(0); }}
                    style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >✕</button>
                </div>

                {/* Multi-Image Display */}
                <div style={{ position: 'relative', width: '100%', maxHeight: '420px', overflow: 'hidden', background: '#000' }}>
                  {(() => {
                    const imgList = (c.images && c.images.length > 0) ? c.images : (c.image_url ? [c.image_url] : []);
                    if (imgList.length === 0) return (
                      <div style={{ width: '100%', height: '240px', background: 'linear-gradient(135deg,#f1f5f9,#e2e8f0)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4rem', color: '#cbd5e1' }}>🗑️</div>
                    );

                    const activeUrl = imgList[activeImgIdx] || imgList[0];

                    return (
                      <>
                        <img src={activeUrl} alt="Report" style={{ width: '100%', height: '420px', objectFit: 'contain', display: 'block' }} />
                        
                        {imgList.length > 1 && (
                          <>
                            {/* Navigation Arrows */}
                            <button onClick={() => setActiveImgIdx(p => (p - 1 + imgList.length) % imgList.length)}
                              style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '1.2rem' }}>
                              ←
                            </button>
                            <button onClick={() => setActiveImgIdx(p => (p + 1) % imgList.length)}
                              style={{ position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '1.2rem' }}>
                              →
                            </button>

                            {/* Indicator */}
                            <div style={{ position: 'absolute', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.4rem', padding: '0.4rem 0.8rem', background: 'rgba(0,0,0,0.5)', borderRadius: '20px' }}>
                              {imgList.map((_, i) => (
                                <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === activeImgIdx ? '#fff' : 'rgba(255,255,255,0.3)', transition: 'all 0.2s' }} />
                              ))}
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem' }}>
                  {/* Status & Severity */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                    <span style={{ background: severityColors[c.severity], color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '0.3rem 0.75rem', borderRadius: '999px', textTransform: 'uppercase' }}>{c.severity} Severity</span>
                    <span style={{ background: statusColors[c.status], color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '0.3rem 0.75rem', borderRadius: '999px', textTransform: 'uppercase' }}>{c.status}</span>
                    <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: '999px', textTransform: 'uppercase' }}>{c.type}</span>
                  </div>

                  {/* Area */}
                  <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, color: '#111', textTransform: 'uppercase', margin: '0 0 0.25rem' }}>{c.area_name || 'Unknown Area'}</h2>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1rem' }}>
                    {new Date(c.created_at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} at {new Date(c.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {/* Description */}
                  <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Description</div>
                    <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, margin: 0 }}>{c.description || 'No description provided.'}</p>
                  </div>

                  {/* Additional Info */}
                  {c.additional_info && (
                    <div style={{ background: '#fefce8', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#a16207', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Additional Info</div>
                      <p style={{ fontSize: '0.85rem', color: '#78350f', lineHeight: 1.5, margin: 0 }}>{c.additional_info}</p>
                    </div>
                  )}

                  {/* Municipality Info */}
                  {c.municipality && (
                    <div style={{ background: '#fef2f2', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #fecaca' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#c62828', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>Responsible Municipality</div>
                      <p style={{ fontSize: '0.95rem', color: '#991b1b', fontWeight: 700, margin: 0 }}>🏛️ {c.municipality}</p>
                    </div>
                  )}

                  {/* AI Verification Panel — visible to admin */}
                  {c.ai_mode && (
                    <div style={{
                      background: 'linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%)',
                      border: '1px solid #bfdbfe',
                      borderRadius: '12px',
                      padding: '1rem',
                      marginBottom: '1.25rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>🤖</span>
                        <h4 style={{
                          fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 800,
                          textTransform: 'uppercase', letterSpacing: '0.08em', color: '#1e40af', margin: 0,
                        }}>AI Verification Report</h4>
                        {c.ai_verified === true && (
                          <span style={{ marginLeft: 'auto', background: '#dcfce7', color: '#166534', fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '999px', border: '1px solid #86efac' }}>✅ VERIFIED</span>
                        )}
                        {c.ai_verified === false && (
                          <span style={{ marginLeft: 'auto', background: '#fef3c7', color: '#92400e', fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '999px', border: '1px solid #fde68a' }}>⚠️ NOT DETECTED</span>
                        )}
                        {c.ai_verified === null && (
                          <span style={{ marginLeft: 'auto', background: '#f1f5f9', color: '#64748b', fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.6rem', borderRadius: '999px', border: '1px solid #cbd5e1' }}>🔄 MANUAL</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '80px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>Confidence</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 900, color: '#111', marginTop: '0.15rem' }}>
                            {c.ai_confidence != null ? `${c.ai_confidence}%` : 'N/A'}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: '80px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>AI Severity</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 900, color: c.ai_severity === 'High' ? '#ef4444' : c.ai_severity === 'Medium' ? '#f59e0b' : '#22c55e', marginTop: '0.15rem' }}>
                            {c.ai_severity || 'N/A'}
                          </div>
                        </div>
                        <div style={{ flex: 1, minWidth: '80px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.6rem', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.6rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.06em' }}>User Override</div>
                          <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 900, color: c.ai_user_override ? '#f59e0b' : '#22c55e', marginTop: '0.15rem' }}>
                            {c.ai_user_override ? '⚠️ Yes' : '—'}
                          </div>
                        </div>
                      </div>
                      {c.ai_user_override && (
                        <div style={{
                          marginTop: '0.75rem', padding: '0.5rem 0.75rem',
                          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px',
                          fontSize: '0.78rem', color: '#92400e',
                        }}>
                          ⚠️ User overrode AI rejection — submitted despite AI not detecting garbage. Please review the image carefully.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Info Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em' }}>Reported By</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111', marginTop: '0.2rem' }}>{c.is_anonymous ? '🕶️ Anonymous' : (c.users?.username || 'Unknown')}</div>
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.75rem', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em' }}>Coordinates</div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#111', marginTop: '0.2rem', fontFamily: 'monospace' }}>{c.latitude?.toFixed(4)}, {c.longitude?.toFixed(4)}</div>
                    </div>
                  </div>

                  {/* Map */}
                  <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', marginBottom: '1.25rem', height: '220px' }}>
                    <MapContainer center={[c.latitude, c.longitude]} zoom={15} style={{ height: '100%', width: '100%' }} key={c.id + '-modal-map'}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                      <Marker position={[c.latitude, c.longitude]} icon={redIcon}>
                        <Popup><strong>{c.area_name}</strong></Popup>
                      </Marker>
                    </MapContainer>
                  </div>

                  {/* Community Comments Thread */}
                  <div style={{ borderTop: '2px solid #e2e8f0', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: '900', color: '#0f172a', margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      💬 Community Comments & Official Updates
                    </h3>
                    <CommentThread complaintId={c.id} user={user} />
                  </div>

                  {/* Actions */}
                  {c.status === 'Pending' && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        disabled={!!actionLoading[c.id]}
                        onClick={() => { handleAction(c.id, 'approve'); setSelectedDetail(prev => prev ? { ...prev, status: 'Approved' } : null); }}
                        style={{ flex: 1, padding: '0.85rem', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      >{actionLoading[c.id] === 'approve' ? 'Processing...' : '✅ Approve Report'}</button>
                      <button
                        disabled={!!actionLoading[c.id]}
                        onClick={() => { handleAction(c.id, 'reject'); setSelectedDetail(prev => prev ? { ...prev, status: 'Rejected' } : null); }}
                        style={{ flex: 1, padding: '0.85rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      >{actionLoading[c.id] === 'reject' ? 'Processing...' : '❌ Reject Report'}</button>
                    </div>
                  )}
                  {c.status === 'Approved' && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button
                        disabled={!!actionLoading[c.id]}
                        onClick={() => { handleAction(c.id, 'resolve'); setSelectedDetail(prev => prev ? { ...prev, status: 'resolved' } : null); }}
                        style={{ flex: 1, padding: '0.85rem', background: '#10b981', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                      >{actionLoading[c.id] === 'resolve' ? 'Processing...' : '🎉 Mark Report as Resolved'}</button>
                    </div>
                  )}

                  {/* Permanent Delete for Admin */}
                  {user?.role === 'admin' && (
                    <div style={{ marginTop: '1.5rem', borderTop: '1px dashed #e2e8f0', paddingTop: '1.25rem' }}>
                      <button
                        disabled={!!actionLoading[c.id]}
                        onClick={() => handleDelete(c.id)}
                        style={{ width: '100%', padding: '0.75rem', background: '#fff', color: '#ef4444', border: '1px solid #fee2e2', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                      >
                        {actionLoading[c.id] === 'delete' ? 'Deleting...' : '🗑️ Permanently Delete Report'}
                      </button>
                      <p style={{ textAlign: 'center', fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.5rem' }}>Only administrators can permanently remove records.</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

    </AdminLayout>
  );
};

export default AdminComplaints;
