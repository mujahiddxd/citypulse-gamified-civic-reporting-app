import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import '../styles/Login.css';

const RULES = {
  username: /^[a-zA-Z0-9]{4,20}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  password: /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/,
};

const Register = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState('');
  const { supabase } = useAuth();
  const navigate = useNavigate();

  const validate = () => {
    const e = {};
    if (!RULES.username.test(form.username)) e.username = 'Username must be 4-20 alphanumeric characters';
    if (!RULES.email.test(form.email)) e.email = 'Enter a valid email address';
    if (!RULES.password.test(form.password)) e.password = 'Password must be at least 8 characters and contain a letter and number';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errors[e.target.name]) setErrors(prev => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setServerError('');

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: form.username,
            email: form.email,
            password: form.password,
            confirmPassword: form.confirmPassword,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setServerError(data.error || data.errors?.[0]?.msg || 'Registration failed');
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setServerError('Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="login-container">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="login-card" style={{ maxWidth: '440px', textAlign: 'center' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>✅</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', marginBottom: '1rem', textTransform: 'uppercase' }}>You're In!</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Account created successfully. You can log in right now — no email verification needed.</p>
          <Link to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>🔐 Go to Login</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="login-card"
        style={{ maxWidth: '480px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🗺️</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', textTransform: 'uppercase' }}>Join CityPulse</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>Start making your city better</p>
        </div>

        {serverError && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{serverError}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input name="username" value={form.username} onChange={handleChange} className={`form-input ${errors.username ? 'error' : ''}`} placeholder="civichero123" />
            {errors.username && <span className="form-error">{errors.username}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input name="email" type="email" value={form.email} onChange={handleChange} className={`form-input ${errors.email ? 'error' : ''}`} placeholder="you@example.com" />
            {errors.email && <span className="form-error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input name="password" type="password" value={form.password} onChange={handleChange} className={`form-input ${errors.password ? 'error' : ''}`} placeholder="Secure123!" />
            {errors.password && <span className="form-error">{errors.password}</span>}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Min 8 chars • Uppercase • Lowercase • Number • Special char
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} className={`form-input ${errors.confirmPassword ? 'error' : ''}`} placeholder="Repeat password" />
            {errors.confirmPassword && <span className="form-error">{errors.confirmPassword}</span>}
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ justifyContent: 'center', padding: '0.875rem', fontSize: '1rem' }}>
            {loading ? 'Creating Account...' : '🚀 Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--red-400)', fontWeight: '600' }}>Log in</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Register;
