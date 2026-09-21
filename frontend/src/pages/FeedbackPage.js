import React, { useState } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';

const FeedbackPage = () => {
  const [form, setForm] = useState({ name: '', email: '', subject: '', category: 'Suggestion', message: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/feedback', form);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.errors?.[0]?.msg || 'Failed to submit feedback');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="card" style={{ maxWidth: '440px', textAlign: 'center', padding: '3rem' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', textTransform: 'uppercase' }}>Feedback Received!</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>Thank you for helping improve CityPulse.</p>
          <button className="btn btn-secondary" style={{ marginTop: '1.5rem' }} onClick={() => setSuccess(false)}>Submit Another</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page" style={{ maxWidth: '640px', margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: '900', textTransform: 'uppercase' }}>
          📝 Send <span style={{ color: 'var(--red-500)' }}>Feedback</span>
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Help us improve the platform. We read every submission.</p>
      </motion.div>

      <div className="card">
        {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="grid grid-2">
            <div className="form-group">
              <label className="form-label">Name *</label>
              <input className="form-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" required />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input type="email" className="form-input" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Category *</label>
            <select className="form-select" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
              <option value="Bug">🐛 Bug Report</option>
              <option value="Suggestion">💡 Suggestion</option>
              <option value="Other">💬 Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Subject *</label>
            <input className="form-input" value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Brief subject" required />
          </div>

          <div className="form-group">
            <label className="form-label">Message *</label>
            <textarea className="form-textarea" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Describe your feedback in detail..." rows={6} required minLength={10} />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center', padding: '0.875rem' }}>
            {loading ? '⏳ Sending...' : '🚀 Send Feedback'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default FeedbackPage;
