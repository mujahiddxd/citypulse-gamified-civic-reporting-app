import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const ADMIN_TOKEN_KEY = 'citypulse_admin_token';

// Admin session helpers (exported for use in AdminRoute)
export const getAdminToken = () => localStorage.getItem(ADMIN_TOKEN_KEY);
export const clearAdminToken = () => localStorage.removeItem(ADMIN_TOKEN_KEY);
export const setAdminToken = (token) => localStorage.setItem(ADMIN_TOKEN_KEY, token);

export const verifyAdminToken = async (token) => {
    try {
        const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        const BASE = API.replace(/\/api\/?$/, '');
        const res = await fetch(`${BASE}/api/admin-auth/verify`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        return data.valid === true;
    } catch {
        return false;
    }
};

// ── Admin Login Page ───────────────────────────────────────────────────────────
const AdminLogin = () => {
    const [adminId, setAdminId] = useState('');
    const [adminPass, setAdminPass] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPass, setShowPass] = useState(false);
    const navigate = useNavigate();

    // If already have a valid token, redirect to admin
    useEffect(() => {
        const token = getAdminToken();
        if (token) {
            verifyAdminToken(token).then(valid => {
                if (valid) navigate('/admin', { replace: true });
            });
        }
    }, [navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!adminId.trim() || !adminPass.trim()) {
            setError('Both fields are required');
            return;
        }
        setLoading(true);
        setError('');

        try {
            // REACT_APP_API_URL is e.g. "http://localhost:5000/api"
            // We need the bare origin so we don't double-up /api
            const API = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
            const BASE = API.replace(/\/api\/?$/, '');
            const res = await fetch(`${BASE}/api/admin-auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_id: adminId.trim(), admin_pass: adminPass }),
            });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || 'Login failed');
                return;
            }

            setAdminToken(data.token);
            navigate('/admin', { replace: true });
        } catch (err) {
            setError('Could not connect to server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #0a0a0a 0%, #130305 50%, #0a0a0a 100%)',
            fontFamily: 'monospace',
            padding: '2rem',
        }}>
            {/* Animated grid background */}
            <div style={{
                position: 'fixed', inset: 0, pointerEvents: 'none',
                backgroundImage: 'linear-gradient(rgba(198,40,40,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(198,40,40,0.04) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
            }} />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                style={{
                    width: '100%',
                    maxWidth: '440px',
                    background: 'rgba(15, 15, 15, 0.95)',
                    border: '1px solid rgba(198, 40, 40, 0.3)',
                    borderRadius: '16px',
                    padding: '2.5rem',
                    boxShadow: '0 30px 100px rgba(0,0,0,0.8), 0 0 60px rgba(198,40,40,0.08)',
                    backdropFilter: 'blur(20px)',
                    position: 'relative',
                }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <motion.div
                        animate={{ filter: ['drop-shadow(0 0 8px rgba(198,40,40,0.4))', 'drop-shadow(0 0 20px rgba(198,40,40,0.8))', 'drop-shadow(0 0 8px rgba(198,40,40,0.4))'] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ fontSize: '3rem', marginBottom: '1rem' }}
                    >
                        🛡️
                    </motion.div>
                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.6rem', fontWeight: '900',
                        color: '#fff', margin: 0, textTransform: 'uppercase', letterSpacing: '0.1em'
                    }}>
                        Admin Portal
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.8rem', marginTop: '0.5rem', letterSpacing: '0.15em' }}>
                        AUTHORIZED PERSONNEL ONLY
                    </p>
                    <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(198,40,40,0.5), transparent)', margin: '1.25rem 0 0' }} />
                </div>

                {/* Form */}
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                            Admin ID
                        </label>
                        <input
                            type="text"
                            value={adminId}
                            onChange={e => setAdminId(e.target.value)}
                            autoComplete="off"
                            spellCheck={false}
                            placeholder="Enter Admin ID"
                            style={{
                                width: '100%', padding: '0.75rem 1rem', boxSizing: 'border-box',
                                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px', color: '#fff', fontSize: '0.95rem',
                                fontFamily: 'monospace', outline: 'none', letterSpacing: '0.05em',
                                transition: 'border-color 0.2s',
                            }}
                            onFocus={e => e.target.style.borderColor = 'rgba(198,40,40,0.6)'}
                            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                            Admin Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPass ? 'text' : 'password'}
                                value={adminPass}
                                onChange={e => setAdminPass(e.target.value)}
                                placeholder="Enter Admin Password"
                                style={{
                                    width: '100%', padding: '0.75rem 3rem 0.75rem 1rem', boxSizing: 'border-box',
                                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px', color: '#fff', fontSize: '0.95rem',
                                    fontFamily: 'monospace', outline: 'none', letterSpacing: '0.1em',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={e => e.target.style.borderColor = 'rgba(198,40,40,0.6)'}
                                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPass(p => !p)}
                                style={{
                                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                    background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)',
                                    fontSize: '1rem', padding: 0,
                                }}
                            >
                                {showPass ? '🙈' : '👁️'}
                            </button>
                        </div>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                                color: '#fca5a5', padding: '0.7rem 1rem', borderRadius: '8px', fontSize: '0.85rem',
                            }}
                        >
                            ⚠️ {error}
                        </motion.div>
                    )}

                    <motion.button
                        type="submit"
                        disabled={loading}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                            marginTop: '0.5rem',
                            padding: '0.9rem', width: '100%',
                            background: loading ? 'rgba(198,40,40,0.3)' : 'linear-gradient(135deg, #c62828, #b71c1c)',
                            border: '1px solid rgba(198,40,40,0.4)',
                            borderRadius: '8px', color: '#fff',
                            fontFamily: 'var(--font-display)', fontWeight: '900',
                            fontSize: '0.95rem', letterSpacing: '0.1em', textTransform: 'uppercase',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            boxShadow: loading ? 'none' : '0 4px 20px rgba(198,40,40,0.3)',
                        }}
                    >
                        {loading ? '🔐 Authenticating...' : '🔐 Enter Admin Portal'}
                    </motion.button>
                </form>

                <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                    <a href="/" style={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.78rem', textDecoration: 'none' }}>
                        ← Return to CityPulse
                    </a>
                </div>
            </motion.div>
        </div>
    );
};

export default AdminLogin;
