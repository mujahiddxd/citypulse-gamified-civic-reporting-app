import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { SkeletonPublicReports } from '../components/ui/SkeletonLoader';

const severityColor = (s) =>
    s === 'High' ? '#ef4444' : s === 'Medium' ? '#f59e0b' : '#22c55e';

const statusLabel = (s) => {
    if (s === 'resolved') return { text: '✅ Resolved', bg: '#dcfce7', color: '#16a34a' };
    if (s === 'in_progress') return { text: '🔄 In Progress', bg: '#fef9c3', color: '#854d0e' };
    if (s === 'Approved') return { text: '✅ Approved', bg: '#dcfce7', color: '#16a34a' };
    return { text: '🕐 Pending', bg: '#f1f5f9', color: '#475569' };
};

// ── Full Report Detail Modal ───────────────────────────────────────────────────
const ReportModal = ({ report, onClose, user }) => {
    if (!report) return null;
    const status = statusLabel(report.status);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
                    zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem', backdropFilter: 'blur(4px)',
                }}
            >
                <motion.div
                    initial={{ opacity: 0, y: 30, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 30 }}
                    onClick={e => e.stopPropagation()}
                    style={{
                        background: '#fff', borderRadius: '20px', maxWidth: '680px', width: '100%',
                        maxHeight: '90vh', overflowY: 'auto',
                        boxShadow: '0 30px 80px rgba(0,0,0,0.3)', position: 'relative',
                    }}
                >
                    {/* Close */}
                    <button onClick={onClose} style={{
                        position: 'absolute', top: '16px', right: '16px', zIndex: 10,
                        background: '#f1f5f9', border: 'none', borderRadius: '50%',
                        width: '36px', height: '36px', cursor: 'pointer', fontSize: '1.1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>✕</button>

                    {/* Photo */}
                    <div style={{ height: '260px', background: '#f1f5f9', borderRadius: '20px 20px 0 0', overflow: 'hidden', flexShrink: 0 }}>
                        {report.image_url ? (
                            <img src={report.image_url} alt="Report" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
                                <span style={{ fontSize: '4rem' }}>🗺️</span>
                                <span style={{ fontWeight: '600', marginTop: '0.5rem' }}>No photo provided</span>
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div style={{ padding: '1.75rem' }}>
                        {/* Badges row */}
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                            <span style={{
                                padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem',
                                fontWeight: '900', color: '#fff', background: severityColor(report.severity),
                                textTransform: 'uppercase', letterSpacing: '0.05em',
                            }}>{report.severity} Severity</span>
                            <span style={{
                                padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem',
                                fontWeight: '800', background: status.bg, color: status.color,
                            }}>{status.text}</span>
                            <span style={{
                                padding: '4px 12px', borderRadius: '999px', fontSize: '0.78rem', fontWeight: '700',
                                background: report.type === 'Garbage' ? '#fef2f2' : '#eff6ff',
                                color: report.type === 'Garbage' ? '#b91c1c' : '#1d4ed8',
                                border: `1px solid ${report.type === 'Garbage' ? '#fecaca' : '#bfdbfe'}`,
                            }}>{report.type === 'Garbage' ? '🗑️ Garbage' : 'Other'}</span>
                        </div>

                        {/* Heading */}
                        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: '900', color: '#0f172a', margin: '0 0 0.5rem' }}>
                            {report.area_name || 'Unknown Area'}
                        </h2>

                        {/* Description */}
                        {report.description && (
                            <p style={{ color: '#475569', lineHeight: 1.6, marginBottom: '1.25rem', fontSize: '0.95rem' }}>
                                {report.description}
                            </p>
                        )}

                        {/* Meta */}
                        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', padding: '1rem', background: '#f8fafc', borderRadius: '12px', marginBottom: '1.5rem' }}>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>Reported By</div>
                                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                                    {report.is_anonymous ? '👤 Anonymous' : `📝 ${report.users?.username || 'Citizen'}`}
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>Date</div>
                                <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem' }}>
                                    🕐 {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            </div>
                            {report.lat && report.lng && (
                                <div>
                                    <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700', marginBottom: '2px' }}>Location</div>
                                    <a
                                        href={`https://maps.google.com/?q=${report.lat},${report.lng}`}
                                        target="_blank" rel="noreferrer"
                                        style={{ fontWeight: '700', color: '#6366f1', fontSize: '0.9rem' }}
                                    >📍 View on Map ↗</a>
                                </div>
                            )}
                        </div>

                        {/* Comment Thread */}
                        <div style={{ borderTop: '2px solid #f1f5f9', paddingTop: '1.25rem' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: '900', color: '#0f172a', margin: '0 0 1rem' }}>
                                💬 Community Comments
                            </h3>
                            <CommentThread complaintId={report.id} user={user} />
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ── Comment Thread Component ────────────────────────────────────────────────────
const CommentThread = ({ complaintId, user }) => {
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(true);
    const [commentError, setCommentError] = useState('');
    const [posting, setPosting] = useState(false);
    const [postError, setPostError] = useState('');
    const [text, setText] = useState('');
    const [isOfficialUpdate, setIsOfficialUpdate] = useState(false);

    const isPrivileged = user?.role === 'admin' || user?.role === 'officer';

    const fetchComments = useCallback(async () => {
        setLoadingComments(true);
        setCommentError('');
        try {
            const { data } = await api.get(`/comments/${complaintId}`);
            setComments(data || []);
        } catch (e) {
            // Check if the table doesn't exist yet (common cause)
            const msg = e?.response?.data?.error || String(e);
            if (msg.includes('does not exist') || msg.includes('relation') || e?.response?.status === 500) {
                setCommentError('table_missing');
            } else {
                setCommentError('Failed to load comments. Please try again.');
            }
        } finally {
            setLoadingComments(false);
        }
    }, [complaintId]);

    useEffect(() => { fetchComments(); }, [fetchComments]);

    const handlePost = async () => {
        if (!text.trim() || posting) return;
        setPosting(true);
        setPostError('');
        try {
            const { data } = await api.post('/comments', {
                complaint_id: complaintId,
                content: text.trim(),
                is_official_update: isPrivileged ? isOfficialUpdate : false,
            });
            setComments(p => [...p, data]);
            setText('');
            setIsOfficialUpdate(false);
        } catch (e) {
            setPostError(e?.response?.data?.error || 'Failed to post comment.');
        } finally {
            setPosting(false);
        }
    };

    const handleDelete = async (commentId) => {
        try {
            await api.delete(`/comments/${commentId}`);
            setComments(p => p.filter(c => c.id !== commentId));
        } catch (e) {
            console.error(e);
        }
    };

    // Table not migrated yet
    if (commentError === 'table_missing') {
        return (
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '10px', padding: '1rem', fontSize: '0.85rem', color: '#854d0e' }}>
                ⚠️ The comments table hasn't been set up yet. Please run <code style={{ background: '#fef08a', padding: '1px 4px', borderRadius: '4px' }}>supabase/add_report_comments.sql</code> in Supabase SQL Editor to enable comments.
            </div>
        );
    }

    if (commentError) {
        return (
            <div style={{ color: '#ef4444', fontSize: '0.85rem', padding: '0.5rem' }}>⚠️ {commentError}</div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* Comment list */}
            {loadingComments ? (
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '0.5rem 0' }}>Loading comments…</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {comments.map(c => (
                        <div key={c.id} style={{
                            background: c.is_official_update
                                ? 'linear-gradient(135deg, #eff6ff, #dbeafe)'
                                : '#f8fafc',
                            border: c.is_official_update ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                            borderRadius: '10px', padding: '0.75rem 1rem',
                        }}>
                            {c.is_official_update && (
                                <div style={{
                                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                                    background: '#1d4ed8', color: '#fff', fontSize: '0.65rem',
                                    fontWeight: '800', padding: '2px 8px', borderRadius: '999px',
                                    marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase'
                                }}>🏛️ Official Update</div>
                            )}
                            <div style={{ fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.5 }}>{c.content}</div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                    @{c.users?.username || 'user'} · {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                                {(user?.id === c.users?.id || isPrivileged) && (
                                    <button onClick={() => handleDelete(c.id)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.72rem' }}>
                                        🗑️ delete
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && (
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.25rem 0' }}>
                            No comments yet — be the first!
                        </div>
                    )}
                </div>
            )}

            {/* Comment input */}
            {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.25rem' }}>
                    <textarea
                        value={text}
                        onChange={e => setText(e.target.value)}
                        placeholder="Write a comment…"
                        maxLength={500} rows={2}
                        style={{
                            width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px',
                            border: `1.5px solid ${postError ? '#ef4444' : '#cbd5e1'}`,
                            resize: 'vertical', fontSize: '0.88rem', fontFamily: 'var(--font-body)',
                            outline: 'none', boxSizing: 'border-box', background: '#f8fafc',
                        }}
                    />
                    {postError && <div style={{ color: '#ef4444', fontSize: '0.78rem' }}>⚠️ {postError}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {isPrivileged && (
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: '700', color: '#1d4ed8', cursor: 'pointer' }}>
                                <input type="checkbox" checked={isOfficialUpdate} onChange={e => setIsOfficialUpdate(e.target.checked)} style={{ accentColor: '#1d4ed8' }} />
                                Mark as Official Update
                            </label>
                        )}
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{text.length}/500</span>
                            <button onClick={handlePost} disabled={!text.trim() || posting}
                                style={{
                                    background: text.trim() ? '#0f172a' : '#e2e8f0',
                                    color: text.trim() ? '#FFDC2B' : '#94a3b8',
                                    border: 'none', borderRadius: '8px', padding: '0.45rem 1.1rem',
                                    fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '0.82rem',
                                    cursor: text.trim() ? 'pointer' : 'default',
                                }}>
                                {posting ? '…' : 'Post'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <p style={{ fontSize: '0.82rem', color: '#94a3b8', fontStyle: 'italic', margin: 0 }}>
                    <a href="/login" style={{ color: '#6366f1', fontWeight: '700' }}>Log in</a> to leave a comment.
                </p>
            )}
        </div>
    );
};

// ── Report Card ────────────────────────────────────────────────────────────────
const ReportCard = ({ report, delay, onViewReport }) => {
    const status = statusLabel(report.status);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.4 }}
            onClick={() => onViewReport(report)}
            style={{
                background: '#fff', border: '2px solid #e2e8f0', borderRadius: '16px',
                overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                display: 'flex', flexDirection: 'column', cursor: 'pointer',
                transition: 'transform 0.18s, box-shadow 0.18s',
            }}
            whileHover={{ y: -4, boxShadow: '0 14px 32px rgba(0,0,0,0.1)', border: '2px solid #C62828' }}
        >
            {/* Photo */}
            <div style={{ position: 'relative', height: '190px', background: '#f1f5f9', overflow: 'hidden', flexShrink: 0 }}>
                {report.image_url ? (
                    <img src={report.image_url} alt="Reported area" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94a3b8' }}>
                        <span style={{ fontSize: '3rem' }}>🗺️</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>No photo</span>
                    </div>
                )}
                <div style={{
                    position: 'absolute', top: '10px', left: '10px',
                    background: severityColor(report.severity), color: '#fff',
                    padding: '3px 10px', borderRadius: '999px', fontWeight: '900',
                    fontSize: '0.72rem', textTransform: 'uppercase', border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                }}>{report.severity}</div>
                <div style={{
                    position: 'absolute', top: '10px', right: '10px',
                    background: status.bg, color: status.color, padding: '3px 10px',
                    borderRadius: '999px', fontWeight: '800', fontSize: '0.72rem',
                    border: '2px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}>{status.text}</div>
            </div>

            {/* Body */}
            <div style={{ padding: '1.2rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                        {report.area_name || 'Unknown Area'}
                    </h3>
                    <span style={{
                        display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '6px',
                        fontSize: '0.75rem', fontWeight: '700',
                        background: report.type === 'Garbage' ? '#fef2f2' : '#eff6ff',
                        color: report.type === 'Garbage' ? '#b91c1c' : '#1d4ed8',
                        border: `1px solid ${report.type === 'Garbage' ? '#fecaca' : '#bfdbfe'}`,
                    }}>{report.type === 'Garbage' ? '🗑️ Garbage' : 'Other'}</span>
                </div>

                {report.description && (
                    <p style={{ fontSize: '0.87rem', color: '#475569', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {report.description}
                    </p>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', marginTop: 'auto' }}>
                    <span style={{ fontSize: '0.77rem', color: '#94a3b8', fontWeight: '600' }}>
                        🕐 {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span style={{ fontSize: '0.77rem', color: '#64748b', fontWeight: '600' }}>
                        {report.is_anonymous ? '👤 Anonymous' : `📝 ${report.users?.username || 'Citizen'}`}
                    </span>
                </div>

                {/* View hint */}
                <div style={{
                    width: '100%', padding: '0.6rem 0', marginTop: '0.25rem',
                    background: '#0f172a', color: '#FFDC2B',
                    borderRadius: '10px', fontFamily: 'var(--font-display)',
                    fontWeight: '900', fontSize: '0.85rem', letterSpacing: '0.04em',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                }}>
                    👁️ View Report &amp; Comments
                </div>
            </div>
        </motion.div>
    );
};

// ── Public Reports Page ─────────────────────────────────────────────────────────
const PublicReports = () => {
    const { user } = useAuth();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('');
    const [selectedReport, setSelectedReport] = useState(null);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        const start = Date.now();
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter);
            if (typeFilter) params.append('type', typeFilter);
            const { data } = await api.get(`/complaints/public?${params}`);
            setReports(data || []);
        } catch (err) {
            console.error(err);
            setReports([]);
        } finally {
            const elapsed = Date.now() - start;
            if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed));
            setLoading(false);
        }
    }, [filter, typeFilter]);

    useEffect(() => { fetchReports(); }, [fetchReports]);

    const filterBtn = (value, label) => (
        <button
            key={value}
            onClick={() => setFilter(value)}
            style={{
                padding: '0.55rem 1.25rem', borderRadius: '999px',
                border: '2px solid #111',
                background: filter === value ? '#111' : '#fff',
                color: filter === value ? '#FFDC2B' : '#111',
                fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '0.85rem',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: filter === value ? '3px 3px 0px #FFDC2B' : '2px 2px 0px #111',
            }}
        >{label}</button>
    );

    return (
        <div className="page" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem' }}>

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '2.5rem' }}>📢</span>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                            Community <span style={{ color: 'var(--accent)' }}>Reports</span>
                        </h1>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: '500', margin: 0 }}>
                        Browse reported issues, view details, and join the conversation.
                    </p>
                </motion.div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'center' }}>
                    {filterBtn('all', '📋 All Reports')}
                    {filterBtn('Approved', '✅ Approved')}
                    {filterBtn('in_progress', '🔄 In Progress')}
                    {filterBtn('resolved', '🏁 Resolved')}
                    <div style={{ marginLeft: 'auto' }}>
                        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '10px', border: '2px solid #111',
                                fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '0.85rem',
                                background: '#fff', cursor: 'pointer', boxShadow: '2px 2px 0px #111',
                            }}>
                            <option value="">All Types</option>
                            <option value="Garbage">🗑️ Garbage</option>
                        </select>
                    </div>
                </div>

                {!loading && (
                    <div style={{ marginBottom: '1.5rem', color: '#64748b', fontWeight: '700', fontSize: '0.9rem' }}>
                        Showing {reports.length} report{reports.length !== 1 ? 's' : ''}
                    </div>
                )}

                {/* Grid */}
                {loading ? (
                    <SkeletonPublicReports />
                ) : reports.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '5rem 0', color: '#94a3b8' }}>
                        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌱</div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: '700' }}>No reports found</div>
                        <p>Try changing your filters above.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                        {reports.map((r, i) => (
                            <ReportCard key={r.id || i} report={r} delay={i * 0.04} onViewReport={setSelectedReport} />
                        ))}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedReport && (
                <ReportModal report={selectedReport} onClose={() => setSelectedReport(null)} user={user} />
            )}
        </div>
    );
};

export default PublicReports;
