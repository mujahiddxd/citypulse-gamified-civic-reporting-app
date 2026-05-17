/**
 * MultiPhotoAIChecker.js — AI Verification for Multiple Photos
 * ---------------------------------------------------------------
 * Analyzes ALL uploaded photos via the /api/ai/analyze-batch endpoint.
 * Shows per-photo AI results AND a cross-photo similarity/consistency score.
 *
 * Props:
 *   imageFiles    — File[] array of uploaded images
 *   imagePreviews — string[] array of object URLs for previews
 *   onResult      — callback({ verified, confidence, severity, mode, userOverride, similarity })
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';

const MultiPhotoAIChecker = ({ imageFiles, imagePreviews, onResult }) => {
  const [status, setStatus] = useState('idle'); // idle | scanning | done | error
  const [results, setResults] = useState([]); // per-photo results
  const [similarity, setSimilarity] = useState(null);
  const [userOverride, setUserOverride] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  // Reset when images change
  useEffect(() => {
    setStatus('idle');
    setResults([]);
    setSimilarity(null);
    setUserOverride(false);
    setScanProgress(0);
    if (onResult) onResult(null);
  }, [imageFiles.length]);

  const analyzeBatch = async () => {
    if (!imageFiles || imageFiles.length === 0) return;

    setStatus('scanning');
    setResults([]);
    setSimilarity(null);
    setUserOverride(false);
    setScanProgress(0);

    try {
      // Convert all files to base64
      const base64Images = await Promise.all(
        imageFiles.map((file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(ev.target.result);
            reader.readAsDataURL(file);
          });
        })
      );

      // Animate progress while waiting
      const progressInterval = setInterval(() => {
        setScanProgress((p) => Math.min(p + 2, 90));
      }, 200);

      const { data } = await api.post('/ai/analyze-batch', {
        images: base64Images,
      });

      clearInterval(progressInterval);
      setScanProgress(100);

      setResults(data.results || []);
      setSimilarity(data.similarity || null);
      setStatus('done');

      // Aggregate result for parent: use the "worst" photo's verdict
      const anyVerified = data.results?.some((r) => r.verified === true);
      const allFailed = data.results?.every((r) => r.verified === false);
      const primaryResult = data.results?.[0] || {};

      if (onResult) {
        onResult({
          verified: allFailed ? false : anyVerified ? true : null,
          confidence: primaryResult.confidence || 0,
          severity: primaryResult.severity,
          mode: primaryResult.mode || 'ai_analyzed',
          ai_available: primaryResult.ai_available ?? false,
          userOverride: false,
          similarity: data.similarity,
          perPhotoResults: data.results,
        });
      }
    } catch (err) {
      console.error('Batch AI analysis failed:', err);
      setStatus('error');
      if (onResult) {
        onResult({
          verified: null,
          confidence: 0,
          severity: null,
          mode: 'admin_fallback',
          ai_available: false,
          userOverride: false,
        });
      }
    }
  };

  const handleOverride = () => {
    setUserOverride(true);
    if (onResult) {
      const primaryResult = results[0] || {};
      onResult({
        verified: primaryResult.verified,
        confidence: primaryResult.confidence || 0,
        severity: primaryResult.severity,
        mode: primaryResult.mode,
        ai_available: primaryResult.ai_available,
        userOverride: true,
        similarity,
        perPhotoResults: results,
      });
    }
  };

  if (!imageFiles || imageFiles.length === 0) return null;

  // ── Idle State ──
  if (status === 'idle') {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <button
          type="button"
          onClick={analyzeBatch}
          style={{
            width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
            color: 'white', fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '0.5rem', boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
          }}
        >
          🤖 Analyze All {imageFiles.length} Photo{imageFiles.length > 1 ? 's' : ''} with AI
        </button>
      </motion.div>
    );
  }

  // ── Scanning State ──
  if (status === 'scanning') {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', color: '#1e293b' }}>
          Analyzing {imageFiles.length} Photo{imageFiles.length > 1 ? 's' : ''}...
        </div>
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.3rem' }}>
          AI is checking each photo for garbage and comparing scene consistency
        </div>
        <div style={{ margin: '1rem auto 0', width: '80%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <motion.div
            animate={{ width: `${scanProgress}%` }}
            transition={{ duration: 0.3 }}
            style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', borderRadius: '3px' }}
          />
        </div>
      </motion.div>
    );
  }

  // ── Results State ──
  const garbageCount = results.filter((r) => r.verified === true).length;
  const notGarbageCount = results.filter((r) => r.verified === false).length;
  const unavailableCount = results.filter((r) => r.verified === null).length;
  const allNotGarbage = notGarbageCount === results.length;

  const simColor = similarity?.verdict === 'consistent' ? '#22c55e'
    : similarity?.verdict === 'partial' ? '#f59e0b' : '#ef4444';

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>

        {/* Header */}
        <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '0.85rem', textTransform: 'uppercase', color: '#1e293b' }}>
            🤖 AI Multi-Photo Analysis
          </h4>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {garbageCount > 0 && (
              <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.5rem', background: '#dcfce7', color: '#166534', borderRadius: '999px', border: '1px solid #86efac' }}>
                ✅ {garbageCount} Verified
              </span>
            )}
            {notGarbageCount > 0 && (
              <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '0.2rem 0.5rem', background: '#fef3c7', color: '#92400e', borderRadius: '999px', border: '1px solid #fde68a' }}>
                ⚠️ {notGarbageCount} Not Detected
              </span>
            )}
          </div>
        </div>

        {/* Per-Photo Results Grid */}
        <div style={{ padding: '1rem 1.25rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(results.length, 3)}, 1fr)`, gap: '0.75rem', marginBottom: '1rem' }}>
            {results.map((r, i) => (
              <div key={i} style={{
                borderRadius: '10px', overflow: 'hidden', border: '2px solid',
                borderColor: r.verified === true ? '#86efac' : r.verified === false ? '#fde68a' : '#e2e8f0',
              }}>
                {/* Photo Thumbnail */}
                <div style={{ position: 'relative', height: '80px', overflow: 'hidden' }}>
                  <img src={imagePreviews[i]} alt={`Photo ${i + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{
                    position: 'absolute', top: '4px', right: '4px',
                    background: r.verified === true ? '#22c55e' : r.verified === false ? '#f59e0b' : '#94a3b8',
                    color: 'white', fontSize: '0.6rem', fontWeight: 900,
                    padding: '0.15rem 0.4rem', borderRadius: '999px',
                  }}>
                    {r.verified === true ? '✅' : r.verified === false ? '⚠️' : '🔄'}
                  </div>
                  <div style={{
                    position: 'absolute', bottom: '0', left: '0', right: '0',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                    padding: '0.3rem 0.4rem', fontSize: '0.65rem', color: '#fff', fontWeight: 800,
                  }}>
                    Photo {i + 1}
                  </div>
                </div>

                {/* Mini Result */}
                <div style={{ padding: '0.6rem', background: '#fff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.4rem' }}>
                    <div style={{
                      width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        width: `${r.confidence || 0}%`, height: '100%', borderRadius: '2px',
                        background: r.confidence >= 70 ? '#22c55e' : r.confidence >= 40 ? '#f59e0b' : '#ef4444',
                      }} />
                    </div>
                    <span style={{ fontSize: '0.65rem', fontWeight: 900, color: '#475569', whiteSpace: 'nowrap' }}>
                      {r.confidence || 0}%
                    </span>
                  </div>
                  
                  {r.severity && (
                    <div style={{ marginBottom: '0.4rem' }}>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 800, padding: '0.15rem 0.4rem', borderRadius: '4px',
                        background: r.severity === 'High' ? '#fee2e2' : r.severity === 'Medium' ? '#fef3c7' : '#dcfce7',
                        color: r.severity === 'High' ? '#991b1b' : r.severity === 'Medium' ? '#92400e' : '#166534',
                      }}>
                        {r.severity === 'High' ? '🔴' : r.severity === 'Medium' ? '🟡' : '🟢'} {r.severity} Risk
                      </span>
                    </div>
                  )}

                  {/* AI Note / Statement */}
                  {r.statement && (
                    <div style={{ fontSize: '0.65rem', color: '#475569', lineHeight: 1.3, marginBottom: '0.5rem', background: '#f8fafc', padding: '0.4rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <strong style={{ display: 'block', marginBottom: '2px', color: '#1e293b' }}>AI Note:</strong>
                      {r.statement}
                    </div>
                  )}

                  {/* Detected Labels */}
                  {r.labels && r.labels.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                      {r.labels.slice(0, 3).map((l, lIdx) => (
                        <span key={lIdx} style={{
                          fontSize: '0.55rem', fontWeight: 600, padding: '0.1rem 0.3rem', borderRadius: '4px',
                          background: r.matched_labels?.includes(l.label) ? '#dcfce7' : '#f1f5f9',
                          color: r.matched_labels?.includes(l.label) ? '#166534' : '#64748b',
                          border: `1px solid ${r.matched_labels?.includes(l.label) ? '#86efac' : '#e2e8f0'}`,
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100px'
                        }} title={`${l.label} (${l.score}%)`}>
                          {l.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Similarity / Consistency Card */}
          {similarity && results.length >= 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{
                background: similarity.verdict === 'consistent' ? '#f0fdf4'
                  : similarity.verdict === 'partial' ? '#fffbeb' : '#fef2f2',
                border: `1px solid ${similarity.verdict === 'consistent' ? '#86efac'
                  : similarity.verdict === 'partial' ? '#fde68a' : '#fecaca'}`,
                borderRadius: '10px', padding: '0.85rem', marginBottom: '0.75rem',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: simColor, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', color: 'white', fontFamily: 'var(--font-display)',
                  fontSize: '0.9rem', fontWeight: 900, flexShrink: 0,
                  boxShadow: `0 2px 8px ${simColor}40`,
                }}>
                  {similarity.score}%
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', color: '#1e293b' }}>
                    📊 Photo Consistency Score
                  </div>
                  <div style={{ fontSize: '0.76rem', color: '#475569', lineHeight: 1.4, marginTop: '0.15rem' }}>
                    {similarity.details}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Warning if all photos failed verification */}
          {allNotGarbage && !userOverride && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              style={{
                background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px',
                padding: '0.85rem', marginBottom: '0.75rem',
              }}>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.3rem' }}>⚠️</span>
                <div>
                  <h5 style={{ margin: '0 0 0.3rem', fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: '#92400e' }}>
                    AI didn't detect garbage in any photo
                  </h5>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', color: '#78350f', lineHeight: 1.4 }}>
                    None of the uploaded images were identified as containing garbage. You can still submit — an admin will review it.
                  </p>
                  <button type="button" onClick={handleOverride}
                    style={{
                      padding: '0.45rem 0.85rem', background: '#f59e0b', color: '#fff', border: 'none',
                      borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer',
                      fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                    }}>
                    ✋ I'm sure — Submit Anyway
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Override confirmed */}
          {allNotGarbage && userOverride && (
            <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: '#92400e', fontWeight: 600, marginBottom: '0.75rem' }}>
              ✅ You've confirmed this is a valid report. It will be submitted for admin review.
            </div>
          )}

          {/* Re-analyze button */}
          <button type="button" onClick={() => { setStatus('idle'); setResults([]); setSimilarity(null); setUserOverride(false); if (onResult) onResult(null); }}
            style={{
              padding: '0.45rem 0.85rem', background: '#f1f5f9', color: '#475569',
              border: '1px solid #e2e8f0', borderRadius: '6px', fontWeight: 700,
              fontSize: '0.75rem', cursor: 'pointer',
            }}>
            🔄 Re-analyze All Photos
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default MultiPhotoAIChecker;
