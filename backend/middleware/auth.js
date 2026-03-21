/**
 * middleware/auth.js — Authentication & Authorization Middleware
 * -------------------------------------------------------------
 * This file exports three Express middleware functions used to
 * protect backend routes based on who is making the request.
 *
 * HOW AUTHENTICATION WORKS IN THIS APP:
 * ─────────────────────────────────────
 * There are TWO types of authenticated users:
 *
 *   1. Regular users → Log in via Supabase Auth (email + password).
 *      Supabase issues a JWT that the frontend stores in localStorage
 *      as `access_token` and sends in the Authorization header.
 *
 *   2. Admin users  → Log in via the standalone /admin-login page.
 *      This generates a CUSTOM JWT (signed with ADMIN_JWT_SECRET)
 *      that is completely separate from Supabase Auth.
 *
 * The `authenticate` middleware tries both types, in order:
 *   Step 1 → Try to decode the token as a custom admin JWT
 *   Step 2 → If that fails, try verifying it via Supabase
 *
 * After successful auth, the decoded user is attached to `req.user`
 * so route handlers can access it (e.g. req.user.id, req.user.role).
 */
const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Backend Supabase client — uses SERVICE KEY to bypass RLS
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Secret used to sign and verify the standalone admin JWT.
// Must match the secret in routes/admin-auth.js.
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'citypulse-admin-secret-key-2026';

/**
 * authenticate(req, res, next)
 * ─────────────────────────────
 * Verifies the Bearer token in the Authorization header.
 * Attaches req.user and req.isAdminJwt, then calls next().
 *
 * req.user shape (admin):   { id: 'admin', role: 'admin', admin_id: '...' }
 * req.user shape (regular): { id, email, username, role, xp, coins, ... }
 *
 * Try admin JWT first (fastest — no DB call needed),
 * then fall back to Supabase token verification.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Reject if no Authorization header is present
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  // Extract the token part after "Bearer "
  const token = authHeader.split(' ')[1];

  // ── Step 1: Try decoding as a custom admin JWT ──────────────────────────────
  try {
    const decoded = jwt.verify(token, ADMIN_JWT_SECRET);
    if (decoded.role === 'admin') {
      // Valid admin token — attach a minimal user object and skip Supabase
      req.user = { id: 'admin', role: 'admin', admin_id: decoded.admin_id };
      req.isAdminJwt = true;
      return next();
    }
  } catch (_) {
    // jwt.verify() threw — this is not a valid admin JWT, fall through to Supabase
  }

  // ── Step 2: Fall back to Supabase token verification ───────────────────────
  try {
    // Ask Supabase to validate the token and return the auth user
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Fetch the user's extended profile from our public.users table
    // (Supabase auth.users only has email/id, our table has xp, coins, role, etc.)
    const { data: profile } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    // Merge auth user + profile so routes get everything in req.user
    req.user = { ...user, ...profile };
    req.isAdminJwt = false;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * requireAdmin(req, res, next)
 * ─────────────────────────────
 * Convenience guard: runs authenticate() first, then checks that
 * the user has role === 'admin'. Used on sensitive admin-only routes
 * like user management and feedback viewing.
 */
const requireAdmin = async (req, res, next) => {
  await authenticate(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

/**
 * requireOfficerOrAdmin(req, res, next)
 * ──────────────────────────────────────
 * Similar to requireAdmin but also allows users with role 'officer'.
 * Officers can approve/reject complaints but cannot manage users.
 */
const requireOfficerOrAdmin = async (req, res, next) => {
  await authenticate(req, res, () => {
    if (req.user?.role !== 'admin' && req.user?.role !== 'officer') {
      return res.status(403).json({ error: 'Officer or Admin access required' });
    }
    next();
  });
};

module.exports = { authenticate, requireAdmin, requireOfficerOrAdmin };
