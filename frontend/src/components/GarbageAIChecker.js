/**
 * GarbageAIChecker.js — AI Photo Verification Component
 * -------------------------------------------------------
 * Plugs into the SubmitComplaint form right below the image upload.
 *
 * Behavior:
 *   1. User uploads a photo → "Analyze Photo" button appears
 *   2. Clicking it sends the image to /api/ai/analyze-garbage
 *   3. AI returns verdict (verified/not-verified/unavailable)
 *   4. If NOT verified → shows warning but STILL allows submission
 *      (user can override with "Submit Anyway" acknowledgement)
 *   5. Passes verification state up to parent via onResult callback
 *
 * Props:
 *   imageFile      — File object from the image input
 *   imagePreview   — base64 preview string (data URL)
 *   onResult       — callback({ verified, confidence, severity, userOverride })
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import './GarbageAIChecker.css';

const GarbageAIChecker = ({ imageFile, imagePreview, onResult }) => {
  const [status, setStatus] = useState('idle'); // idle | scanning | done | error
  const [result, setResult] = useState(null);
  const [userOverride, setUserOverride] = useState(false);

  // Reset when image changes
  useEffect(() => {
    setStatus('idle');
    setResult(null);
    setUserOverride(false);
    if (onResult) onResult(null);
  }, [imageFile]);

  const analyzePhoto = async () => {
    if (!imagePreview) return;

    setStatus('scanning');
    setResult(null);
    setUserOverride(false);

    try {
      const { data } = await api.post('/ai/analyze-garbage', {
        image: imagePreview,
      });

      setResult(data);
      setStatus('done');

      // Report result to parent
      if (onResult) {
        onResult({
          verified: data.verified,
          confidence: data.confidence,
          severity: data.severity,
          mode: data.mode,
          ai_available: data.ai_available,
          userOverride: false,
        });
      }
    } catch (err) {
      console.error('AI analysis failed:', err);
      setStatus('error');
      setResult({
        verified: null,
        confidence: 0,
        severity: null,
        statement: 'Could not connect to AI service. Your report will be reviewed by an admin.',
        labels: [],
        mode: 'admin_fallback',
        ai_available: false,
      });

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
    if (onResult && result) {
      onResult({
        verified: result.verified,
        confidence: result.confidence,
        severity: result.severity,
        mode: result.mode,
        ai_available: result.ai_available,
        userOverride: true,
      });
    }
  };

  // Don't show anything if no image is uploaded
  if (!imageFile || !imagePreview) return null;

  // ── Idle: Show Analyze Button ──
  if (status === 'idle') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <button
          type="button"
          className="ai-checker-btn"
          onClick={analyzePhoto}
        >
          <span className="btn-shimmer" />
          🤖 Analyze Garbage Photo with AI
        </button>
      </motion.div>
    );
  }

  // ── Scanning: Show Loading Animation ──
  if (status === 'scanning') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="ai-scanning-container"
      >
        <div className="ai-scanning-icon">🔍</div>
        <div className="ai-scanning-text">Analyzing Image...</div>
        <div className="ai-scanning-subtext">
          AI is scanning for garbage, litter, and waste materials
        </div>
        <div className="ai-progress-bar">
          <div className="ai-progress-fill" />
        </div>
      </motion.div>
    );
  }

  // ── Done / Error: Show Results ──
  if (!result) return null;

  const isVerified = result.verified === true;
  const isNotVerified = result.verified === false;
  const isUnavailable = result.verified === null;

  const confidenceColor = result.confidence >= 70
    ? '#22c55e'
    : result.confidence >= 40
      ? '#f59e0b'
      : '#ef4444';

  const severityEmoji = {
    Low: '🟢',
    Medium: '🟡',
    High: '🔴',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="ai-result-card" style={{
        background: isVerified ? '#f0fdf4' : isNotVerified ? '#fffbeb' : '#f8fafc'
      }}>
        {/* Header */}
        <div className="ai-result-header" style={{
          background: isVerified ? '#f0fdf4' : isNotVerified ? '#fffbeb' : '#f8fafc'
        }}>
          <h4>🤖 AI Verification Result</h4>
          {isVerified && (
            <span className="ai-badge ai-badge-verified">✅ Garbage Detected</span>
          )}
          {isNotVerified && (
            <span className="ai-badge ai-badge-not-verified">⚠️ Not Detected</span>
          )}
          {isUnavailable && (
            <span className="ai-badge ai-badge-unavailable">🔄 Manual Review</span>
          )}
        </div>

        {/* Body */}
        <div className="ai-result-body">
          {/* Confidence + Severity Row */}
          {result.ai_available && (
            <div className="ai-confidence-row">
              <div
                className="ai-confidence-circle"
                style={{
                  background: isVerified ? '#dcfce7' : '#fef3c7',
                }}
              >
                {result.confidence}%
              </div>
              <div className="ai-confidence-details">
                <div className="ai-confidence-label">Confidence Score</div>
                <div className="ai-confidence-bar-track">
                  <div
                    className="ai-confidence-bar-fill"
                    style={{
                      width: `${result.confidence}%`,
                      background: confidenceColor,
                    }}
                  />
                </div>

                {/* Severity */}
                {result.severity && (
                  <div className="ai-severity-row">
                    <span className={`ai-severity-badge ai-severity-${result.severity.toLowerCase()}`}>
                      {severityEmoji[result.severity]} AI Estimated: {result.severity} Severity
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* AI Statement */}
          <div className={`ai-statement ${isVerified ? 'ai-statement-verified' :
              isNotVerified ? 'ai-statement-warning' :
                'ai-statement-neutral'
            }`}>
            {result.statement}
          </div>

          {/* Detected Labels */}
          {result.labels && result.labels.length > 0 && (
            <div className="ai-labels-row">
              {result.labels.map((l, i) => (
                <span
                  key={i}
                  className={`ai-label-chip ${result.matched_labels?.includes(l.label) ? 'matched' : ''
                    }`}
                >
                  {l.label} ({l.score}%)
                </span>
              ))}
            </div>
          )}

          {/* Warning Banner — when AI says NOT garbage */}
          {isNotVerified && !userOverride && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="ai-warning-banner"
            >
              <span className="ai-warning-icon">⚠️</span>
              <div className="ai-warning-content">
                <h5>AI didn't detect garbage</h5>
                <p>
                  The AI analysis didn't find clear garbage in this image. However,
                  you can still submit your report — an admin will review it manually.
                  If you're sure this is a valid garbage complaint, click below to proceed.
                </p>
                <button
                  type="button"
                  className="ai-override-btn"
                  onClick={handleOverride}
                >
                  ✋ I'm sure — Submit Anyway
                </button>
              </div>
            </motion.div>
          )}

          {/* Override Confirmed */}
          {isNotVerified && userOverride && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                marginTop: '0.75rem',
                padding: '0.65rem 1rem',
                background: '#fef3c7',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: '#92400e',
                fontWeight: 600,
              }}
            >
              ✅ You've confirmed this is a valid report. It will be submitted for admin review.
            </motion.div>
          )}

          {/* Unavailable notice */}
          {isUnavailable && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{
                marginTop: '0.75rem',
                padding: '0.65rem 1rem',
                background: '#f1f5f9',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.82rem',
                color: '#64748b',
              }}
            >
              📋 Your report will be submitted and reviewed manually by an admin.
            </motion.div>
          )}

          {/* Retry Button */}
          <button
            type="button"
            className="ai-retry-btn"
            onClick={() => {
              setStatus('idle');
              setResult(null);
              setUserOverride(false);
              if (onResult) onResult(null);
            }}
          >
            🔄 Re-analyze
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default GarbageAIChecker;
