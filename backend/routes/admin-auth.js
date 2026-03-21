/**
 * routes/admin-auth.js — Standalone Admin Login
 * ----------------------------------------------
 * This is a completely SEPARATE login system from Supabase Auth.
 * Admins do NOT use a Supabase account — they authenticate with a
 * hardcoded Admin ID + Password stored in environment variables.
 *
 * On success, this issues a custom JWT signed with ADMIN_JWT_SECRET.
 * That JWT is then used in every admin request (Authorization: Bearer <token>).
 * The `authenticate` middleware in middleware/auth.js recognizes and
 * validates these admin JWTs.
 *
 * Why separate from Supabase?
 *   ● Admins don't appear in the leaderboard or user lists
 *   ● Admin credentials are managed via env vars, not the database
 *   ● Simpler to revoke access (just change the env var and restart)
 *
 * Routes:
 *   POST /api/admin-auth/login   → Validate credentials, return JWT
 *   GET  /api/admin-auth/verify  → Verify if a JWT is still valid
 */
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// Admin credentials and JWT secret from environment variables.
// Defaults are for development only — ALWAYS change these in production!
const ADMIN_ID = process.env.ADMIN_ID || 'CITYPULSE_ADMIN';
const ADMIN_PASS = process.env.ADMIN_PASS || 'GMAP@Admin#2026';
const JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'citypulse-admin-secret-key-2026';

// ── POST /api/admin-auth/login ────────────────────────────────────────────────
// Compares the submitted admin_id and admin_pass against env vars.
// If they match, issues a JWT valid for 8 hours.
// No database lookup needed — no Supabase involved here.
router.post('/login', (req, res) => {
    const { admin_id, admin_pass } = req.body;

    // Validate required fields are present
    if (!admin_id || !admin_pass) {
        return res.status(400).json({ error: 'Admin ID and password are required' });
    }

    // Simple credential check (constant-time comparison not needed for admin panel)
    if (admin_id !== ADMIN_ID || admin_pass !== ADMIN_PASS) {
        return res.status(401).json({ error: 'Invalid Admin ID or Password' });
    }

    // Sign a JWT payload with role:'admin' and the admin's ID
    // expiresIn: '8h' means this token auto-expires after 8 hours
    const token = jwt.sign(
        { role: 'admin', admin_id, iat: Date.now() },
        JWT_SECRET,
        { expiresIn: '8h' }
    );

    // The frontend stores this token in localStorage as 'citypulse_admin_token'
    res.json({ success: true, token, role: 'admin' });
});

// ── GET /api/admin-auth/verify ────────────────────────────────────────────────
// Used by the frontend AdminRoute component on every page load to check
// if the stored admin JWT is still valid before showing the admin panel.
// Called automatically when navigating to any /admin/* page.
router.get('/verify', (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ valid: false, error: 'No token' });
    }

    try {
        const token = authHeader.split(' ')[1];
        // jwt.verify() throws if token is invalid or expired
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ valid: true, role: decoded.role });
    } catch (err) {
        res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }
});

module.exports = router;
// Also export JWT_SECRET so other modules can use it without re-reading the env
module.exports.JWT_SECRET = JWT_SECRET;
