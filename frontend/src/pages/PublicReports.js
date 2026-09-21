import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { ProfileCard } from '../components/ui/ProfileCard';
import { SkeletonPublicReports } from '../components/ui/SkeletonLoader';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

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

    const [downloading, setDownloading] = useState(false);

    const downloadReportPDF = async () => {
        setDownloading(true);
        try {
            const JsPDF = jsPDF.jsPDF || jsPDF;
            const doc = new JsPDF('p', 'mm', 'a4');
            const W = 210, M = 15;
            let y = M;

            const sevCol = report.severity === 'High' ? [239,68,68] : report.severity === 'Medium' ? [245,158,11] : [34,197,94];
            const staCol = report.status === 'resolved' ? [34,197,94] : report.status === 'in_progress' ? [139,92,246] : report.status === 'Approved' ? [59,130,246] : [245,158,11];

            // ── Header ────────────────────────────────────────────────────────────
            doc.setFillColor(15,23,42); doc.rect(0,0,W,48,'F');
            doc.setFillColor(198,40,40); doc.rect(0,48,W,3,'F');
            doc.setTextColor(255,220,43); doc.setFontSize(22);
            doc.text('CITYPULSE', M, 18);
            doc.setTextColor(255,255,255); doc.setFontSize(12);
            doc.text('Personal Complaint Receipt', M, 28);
            doc.setFontSize(8); doc.setTextColor(160,160,160);
            doc.text(`Complaint ID: ${report.id}`, M, 36);
            doc.text(`Generated: ${new Date().toLocaleString()}`, M, 42);
            doc.text('FOR MUNICIPALITY SUBMISSION', W-M, 42, { align: 'right' });
            y = 60;

            // ── Status & Severity Badges ───────────────────────────────────────
            doc.setFillColor(...sevCol); doc.roundedRect(M, y, 40, 8, 2, 2, 'F');
            doc.setTextColor(255,255,255); doc.setFontSize(9);
            doc.text(`SEVERITY: ${(report.severity||'N/A').toUpperCase()}`, M+20, y+5.5, { align:'center' });

            doc.setFillColor(...staCol); doc.roundedRect(M+45, y, 50, 8, 2, 2, 'F');
            doc.text(`STATUS: ${(report.status||'Pending').toUpperCase()}`, M+70, y+5.5, { align:'center' });
            y += 16;

            // ── Complaint Details ─────────────────────────────────────────────
            const field = (label, value, isLong=false) => {
                if (y > 268) return;
                doc.setFontSize(7); doc.setTextColor(100,116,139); doc.setFont(undefined,'bold');
                doc.text(label.toUpperCase(), M, y);
                doc.setFont(undefined,'normal'); doc.setFontSize(10); doc.setTextColor(15,23,42);
                if (isLong) {
                    const lines = doc.splitTextToSize(String(value||'N/A'), W-2*M);
                    doc.text(lines, M, y+5); y += lines.length*5 + 10;
                } else {
                    doc.text(String(value||'N/A'), M, y+5); y += 13;
                }
                doc.setDrawColor(241,245,249); doc.line(M, y-2, W-M, y-2);
            };

            field('Area / Location', report.area_name || 'Unknown Area');
            field('Complaint Type', report.type || 'Garbage');
            field('Reported By', report.is_anonymous ? 'Anonymous Citizen' : (report.users?.username || user?.username || 'Citizen'));
            field('Submission Date', new Date(report.created_at).toLocaleString('en-IN', { day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' }));
            if (report.lat && report.lng) field('GPS Coordinates', `${parseFloat(report.lat).toFixed(6)}, ${parseFloat(report.lng).toFixed(6)}`);
            field('Description', report.description || 'No description provided.', true);

            // ── Photo Evidence ─────────────────────────────────────────────────
            if (report.image_url) {
                try {
                    // Fetch image as blob → base64 (works for cross-origin Supabase URLs)
                    const response = await fetch(report.image_url);
                    const blob = await response.blob();
                    const imgBase64 = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onloadend = () => resolve(reader.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(blob);
                    });

                    // Determine image format from MIME type
                    const mimeType = blob.type || 'image/jpeg';
                    const fmt = mimeType.includes('png') ? 'PNG' : 'JPEG';

                    // Section heading
                    doc.setFontSize(7); doc.setTextColor(100,116,139); doc.setFont(undefined,'bold');
                    doc.text('PHOTO EVIDENCE', M, y); y += 4;
                    doc.setFont(undefined,'normal');

                    // Border frame for photo
                    const photoH = 75;
                    if (y + photoH > 280) { doc.addPage(); y = M; }
                    doc.setDrawColor(226,232,240); doc.setFillColor(248,250,252);
                    doc.roundedRect(M, y, W-2*M, photoH, 2, 2, 'FD');
                    doc.addImage(imgBase64, fmt, M, y, W-2*M, photoH, undefined, 'FAST');
                    y += photoH + 6;
                } catch(e) {
                    // Fallback: placeholder box with image URL
                    console.warn('Photo embed failed:', e);
                    doc.setFillColor(241,245,249); doc.roundedRect(M, y, W-2*M, 16, 2, 2, 'F');
                    doc.setDrawColor(203,213,225); doc.roundedRect(M, y, W-2*M, 16, 2, 2, 'S');
                    doc.setFontSize(7); doc.setTextColor(100,116,139); doc.setFont(undefined,'bold');
                    doc.text('PHOTO EVIDENCE', M+4, y+6);
                    doc.setFont(undefined,'normal'); doc.setFontSize(7);
                    doc.text(`URL: ${report.image_url}`, M+4, y+12);
                    y += 20;
                }
            }

            // ── Officer Remarks Box ───────────────────────────────────────────
            if (y < 240) {
                doc.setFillColor(255,251,235); doc.roundedRect(M,y,W-2*M,36,2,2,'F');
                doc.setDrawColor(245,158,11); doc.roundedRect(M,y,W-2*M,36,2,2,'S');
                doc.setFontSize(8); doc.setTextColor(120,53,15); doc.setFont(undefined,'bold');
                doc.text('OFFICER REMARKS (To be filled by Municipality)', M+4, y+7); doc.setFont(undefined,'normal');
                doc.setFontSize(7); doc.setTextColor(100,116,139);
                doc.text('Action Taken:', M+4, y+14);
                doc.text('Date of Action:', M+4, y+21);
                doc.text('Officer Name & Signature:', M+4, y+28);
                doc.text('______________________________', M+45, y+14);
                doc.text('______________________________', M+45, y+21);
                doc.text('__________________________', M+60, y+33);
                y += 40;
            }

            // ── Verification Box ──────────────────────────────────────────────
            if (y < 268) {
                doc.setFillColor(240,253,244); doc.roundedRect(M,y,W-2*M,14,2,2,'F');
                doc.setDrawColor(34,197,94); doc.roundedRect(M,y,W-2*M,14,2,2,'S');
                doc.setFontSize(7); doc.setTextColor(20,83,45); doc.setFont(undefined,'bold');
                doc.text('MUNICIPAL OFFICE STAMP & VERIFICATION', M+4, y+5); doc.setFont(undefined,'normal');
                doc.setTextColor(100,116,139);
                doc.text('Received by: _________________   Date: _________________   Ref No: _________________', M+4, y+11);
            }

            // ── Footer ────────────────────────────────────────────────────────
            doc.setFillColor(15,23,42); doc.rect(0,285,W,12,'F');
            doc.setTextColor(148,163,184); doc.setFontSize(7);
            doc.text('CityPulse Civic Platform — Personal Complaint Receipt — Keep for your records', W/2, 290, { align:'center' });

            const filename = `Complaint_${(report.area_name||'Report').replace(/[^a-z0-9]/gi,'_')}_${report.id?.slice(0,8)||'receipt'}.pdf`;
            doc.save(filename);
        } catch(e) { console.error('PDF error:', e); alert('PDF generation failed: ' + e.message); }
        finally { setDownloading(false); }
    };

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
                            <img className="report-modal-photo" src={report.image_url} alt="Report" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

                        {/* Download PDF Button */}
                        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '2px solid #f1f5f9' }}>
                            <button
                                onClick={downloadReportPDF}
                                disabled={downloading}
                                style={{
                                    width: '100%', padding: '0.9rem', borderRadius: '14px',
                                    border: '3px solid #111', background: downloading ? '#94a3b8' : '#C62828',
                                    color: '#fff', fontFamily: 'var(--font-display)', fontWeight: '900',
                                    fontSize: '1rem', cursor: downloading ? 'not-allowed' : 'pointer',
                                    boxShadow: downloading ? 'none' : '4px 4px 0 #111',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                                    transition: 'all 0.2s',
                                }}
                            >
                                {downloading ? '⌛ Generating PDF...' : '📄 Download My Complaint Receipt (PDF)'}
                            </button>
                            <p style={{ textAlign:'center', fontSize:'0.75rem', color:'#94a3b8', marginTop:'8px', fontWeight:'600' }}>
                                Includes complaint details, status &amp; officer remarks section for municipality submission.
                            </p>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ── Comment Thread Component ────────────────────────────────────────────────────
export const CommentThread = ({ complaintId, user }) => {
    const [comments, setComments] = useState([]);
    const [loadingComments, setLoadingComments] = useState(true);
    const [commentError, setCommentError] = useState('');
    const [posting, setPosting] = useState(false);
    const [postError, setPostError] = useState('');
    const [text, setText] = useState('');
    const [isOfficialUpdate, setIsOfficialUpdate] = useState(false);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = React.useRef(null);

    const isPrivileged = user?.role === 'admin' || user?.role === 'officer';

    const fetchComments = useCallback(async () => {
        setLoadingComments(true);
        setCommentError('');
        try {
            const { data } = await api.get(`/comments/${complaintId}`);
            setComments(data || []);
        } catch (e) {
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

    const handleFile = (file) => {
        if (!file) return;
        if (!file.type.startsWith('image/')) { setPostError('Only images are allowed'); return; }
        if (file.size > 5 * 1024 * 1024) { setPostError('Image must be under 5MB'); return; }
        setPostError('');
        setImageFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setImagePreview(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleImageSelect = (e) => handleFile(e.target.files?.[0]);

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                handleFile(items[i].getAsFile());
                break;
            }
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFile(file);
    };

    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handlePost = async () => {
        if ((!text.trim() && !imageFile) || posting) return;
        setPosting(true);
        setPostError('');
        try {
            let uploadedImageUrl = null;
            if (imageFile) {
                try {
                    const { data: uploadData } = await api.post('/complaints/upload-image', {
                        filename: imageFile.name || 'comment.png',
                        contentType: imageFile.type || 'image/png'
                    });
                    await fetch(uploadData.uploadUrl, {
                        method: 'PUT',
                        body: imageFile,
                        headers: { 'Content-Type': imageFile.type || 'image/png' }
                    });
                    uploadedImageUrl = uploadData.publicUrl;
                } catch (imgErr) {
                    console.error('Image upload failed:', imgErr);
                    setPostError('Failed to upload comment image. Please try again.');
                    setPosting(false);
                    return;
                }
            }
            const payload = {
                complaint_id: complaintId,
                content: text.trim(),
                is_official_update: isPrivileged ? isOfficialUpdate : false,
            };
            if (uploadedImageUrl) payload.image_url = uploadedImageUrl;

            const { data } = await api.post('/comments', payload);
            setComments(p => [...p, data]);
            setText('');
            setIsOfficialUpdate(false);
            clearImage();
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
        } catch (e) { console.error(e); }
    };

    if (commentError === 'table_missing') {
        return (
            <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: '10px', padding: '1rem', fontSize: '0.85rem', color: '#854d0e' }}>
                ⚠️ The comments table hasn't been set up yet. Run <code style={{ background: '#fef08a', padding: '1px 4px', borderRadius: '4px' }}>supabase/add_report_comments.sql</code> in Supabase SQL Editor.
            </div>
        );
    }
    if (commentError) return <div style={{ color: '#ef4444', fontSize: '0.85rem', padding: '0.5rem' }}>⚠️ {commentError}</div>;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loadingComments ? (
                <div style={{ color: '#94a3b8', fontSize: '0.82rem', padding: '0.5rem 0' }}>Loading comments…</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                    {comments.map(c => (
                        <div key={c.id} style={{
                            background: c.is_official_update ? 'linear-gradient(135deg, #eff6ff, #dbeafe)' : '#f8fafc',
                            border: c.is_official_update ? '1.5px solid #93c5fd' : '1px solid #e2e8f0',
                            borderRadius: '10px', padding: '0.75rem 1rem',
                        }}>
                            {c.is_official_update && (
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#1d4ed8', color: '#fff', fontSize: '0.65rem', fontWeight: '800', padding: '2px 8px', borderRadius: '999px', marginBottom: '6px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>🏛️ Official Update</div>
                            )}
                            {c.content && <div style={{ fontSize: '0.88rem', color: '#1e293b', lineHeight: 1.5 }}>{c.content}</div>}
                            {c.image_url && (
                                <div style={{ marginTop: '0.5rem' }}>
                                    <img src={c.image_url} alt="Attachment"
                                        style={{ maxWidth: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer', border: '1px solid #e2e8f0' }}
                                        onClick={() => window.open(c.image_url, '_blank')} />
                                </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                    @{c.users?.username || 'user'} · {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </span>
                                {(user?.id === c.users?.id || isPrivileged) && (
                                    <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '0.72rem' }}>🗑️ delete</button>
                                )}
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && (
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic', padding: '0.25rem 0' }}>No comments yet — be the first!</div>
                    )}
                </div>
            )}

            {/* Comment input */}
            {user ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '0.25rem' }}>
                    <textarea value={text} onChange={e => setText(e.target.value)} 
                        onPaste={handlePaste}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        placeholder="Write a comment... (You can also paste or drag & drop an image here!)" maxLength={500} rows={2}
                        style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: '10px', border: `1.5px solid ${isDragging ? '#3b82f6' : (postError ? '#ef4444' : '#cbd5e1')}`, resize: 'vertical', fontSize: '0.88rem', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box', background: isDragging ? '#eff6ff' : '#f8fafc' }} />
                    {imagePreview && (
                        <div style={{ position: 'relative', display: 'inline-block', maxWidth: '180px' }}>
                            <img src={imagePreview} alt="Preview" style={{ width: '100%', maxHeight: '100px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #e2e8f0' }} />
                            <button onClick={clearImage} style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.65rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                    )}
                    {postError && <div style={{ color: '#ef4444', fontSize: '0.78rem' }}>⚠️ {postError}</div>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} style={{ display: 'none' }} />
                            <button onClick={() => fileInputRef.current?.click()} title="Attach image"
                                style={{ background: imageFile ? '#dbeafe' : '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.4rem 0.7rem', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 700, color: '#475569' }}>
                                📷 {imageFile ? 'Change' : 'Image'}
                            </button>
                            {isPrivileged && (
                                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', fontWeight: '700', color: '#1d4ed8', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={isOfficialUpdate} onChange={e => setIsOfficialUpdate(e.target.checked)} style={{ accentColor: '#1d4ed8' }} />
                                    Official
                                </label>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>{text.length}/500</span>
                            <button onClick={handlePost} disabled={(!text.trim() && !imageFile) || posting}
                                style={{ background: (text.trim() || imageFile) ? '#0f172a' : '#e2e8f0', color: (text.trim() || imageFile) ? '#FFDC2B' : '#94a3b8', border: 'none', borderRadius: '8px', padding: '0.45rem 1.1rem', fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '0.82rem', cursor: (text.trim() || imageFile) ? 'pointer' : 'default' }}>
                                {posting ? '📤 ...' : '💬 Post'}
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
    const navigate = useNavigate();
    const location = useLocation();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [matchedUsers, setMatchedUsers] = useState([]);
    const [viewType, setViewType] = useState('reports'); // 'reports' or 'citizens'
    const [selectedReport, setSelectedReport] = useState(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filter !== 'all') params.append('status', filter);
            if (typeFilter) params.append('type', typeFilter);
            if (debouncedSearch) params.append('search', debouncedSearch);
            
            // Always fetch both reports and citizens in parallel
            const [reportsRes, usersRes] = await Promise.all([
                api.get(`/complaints/public?${params}`),
                api.get(`/profile/search${debouncedSearch ? `?q=${debouncedSearch}` : ''}`)
            ]);
            setReports(reportsRes.data || []);
            setMatchedUsers(usersRes.data || []);

            // Check if there's an ID in the URL to auto-open
            const searchParams = new URLSearchParams(location.search);
            const reportId = searchParams.get('id');
            if (reportId && reportsRes.data) {
                const found = reportsRes.data.find(r => r.id === reportId);
                if (found) setSelectedReport(found);
            }
        } catch (err) {
            console.error(err);
            setReports([]);
            setMatchedUsers([]);
        } finally {
            setLoading(false);
        }
    }, [filter, typeFilter, debouncedSearch, location.search]);

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

                    {/* Search Bar */}
                    <div style={{ 
                        position: 'relative', flex: 1, minWidth: '240px', marginLeft: '0.5rem'
                    }}>
                        <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1.1rem', pointerEvents: 'none' }}>🔍</span>
                        <input 
                            type="text"
                            placeholder="Search area or user..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            style={{
                                width: '100%', padding: '0.65rem 1rem 0.65rem 2.8rem', borderRadius: '999px',
                                border: '2px solid #111', fontFamily: 'var(--font-display)', fontWeight: '700',
                                fontSize: '0.88rem', outline: 'none', boxShadow: '2px 2px 0px #111',
                                boxSizing: 'border-box'
                            }}
                        />
                    </div>

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
                
                {/* View Switcher Tabs */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem' }}>
                    <button 
                        onClick={() => setViewType('reports')}
                        style={{
                            padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none',
                            fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '1rem',
                            cursor: 'pointer', transition: 'all 0.3s',
                            background: viewType === 'reports' ? 'var(--accent)' : 'transparent',
                            color: '#111',
                            boxShadow: viewType === 'reports' ? '4px 4px 0px #111' : 'none',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        📄 Reports 
                        <span style={{ fontSize: '0.8rem', background: '#111', color: '#fff', padding: '2px 8px', borderRadius: '999px', marginLeft: '0.5rem' }}>
                            {reports.length}
                        </span>
                    </button>
                    <button 
                        onClick={() => setViewType('citizens')}
                        style={{
                            padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none',
                            fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '1rem',
                            cursor: 'pointer', transition: 'all 0.3s',
                            background: viewType === 'citizens' ? 'var(--accent)' : 'transparent',
                            color: '#111',
                            boxShadow: viewType === 'citizens' ? '4px 4px 0px #111' : 'none',
                            display: 'flex', alignItems: 'center', gap: '0.5rem'
                        }}
                    >
                        👥 Citizens
                        {matchedUsers.length > 0 && (
                            <span style={{ fontSize: '0.8rem', background: '#111', color: '#fff', padding: '2px 8px', borderRadius: '999px', marginLeft: '0.5rem' }}>
                                {matchedUsers.length}
                            </span>
                        )}
                    </button>
                </div>

                <AnimatePresence mode="wait">
                    {viewType === 'citizens' ? (
                        <motion.div 
                            key="citizens-view"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                        >
                            {!loading && matchedUsers.length > 0 ? (
                                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                                    {matchedUsers.map((u, i) => (
                                        <div 
                                            key={u.id} 
                                            onClick={() => navigate(`/profile/${u.username}`)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <ProfileCard 
                                                name={u.username}
                                                handle={u.username}
                                                title={u.role === 'admin' ? '🛡️ Administrator' : u.role === 'officer' ? '👮 Official' : `🌟 Level ${u.level} Citizen`}
                                                status={u.xp > 1000 ? '🔥 Elite Contributor' : 'Active'}
                                                avatarUrl={`https://ui-avatars.com/api/?name=${u.username}&background=random&size=128`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            ) : !loading ? (
                                <div style={{ textAlign: 'center', padding: '5rem 0', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🔍</div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: '700' }}>No citizens found</div>
                                    <p>Try searching for a different name above.</p>
                                </div>
                            ) : null}
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="reports-view"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                        >
                            {!loading && (
                                <div style={{ marginBottom: '1.5rem', color: '#64748b', fontWeight: '700', fontSize: '0.9rem' }}>
                                    Showing {reports.length} report{reports.length !== 1 ? 's' : ''} found
                                </div>
                            )}

                            {loading ? (
                                <SkeletonPublicReports />
                            ) : reports.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '5rem 0', color: '#94a3b8' }}>
                                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌱</div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: '700' }}>No reports found</div>
                                    <p>Try changing your filters or search term above.</p>
                                </div>
                            ) : (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
                                    {reports.map((r, i) => (
                                        <ReportCard key={r.id || i} report={r} delay={i * 0.04} onViewReport={setSelectedReport} />
                                    ))}
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Detail Modal */}
            {selectedReport && (
                <ReportModal report={selectedReport} onClose={() => setSelectedReport(null)} user={user} />
            )}
        </div>
    );
};

export default PublicReports;
