/**
 * routes/auth.js — User Authentication Routes
 * --------------------------------------------
 * Handles all user account management: registration, login,
 * password reset, and logout.
 *
 * All routes are under /api/auth/ (mounted in server.js).
 *
 * Routes:
 *   POST /api/auth/register       → Create a new account
 *   POST /api/auth/login          → Sign in and get a session token
 *   POST /api/auth/forgot-password→ Request a password reset email
 *   POST /api/auth/reset-password → Apply a new password (from reset link)
 *   POST /api/auth/logout         → Invalidate the current session
 *
 * Dependencies:
 *   express-validator → validates and sanitizes request body fields
 *   supabase (service key) → handles Supabase Auth + DB operations
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../utils/supabase');
const router = express.Router();

// ── Reusable Validators ────────────────────────────────────────────────────────
// These are defined once and reused across multiple routes.

// Username: 4–20 characters, letters and numbers only (no spaces/symbols)
const usernameValidator = body('username')
  .matches(/^[a-zA-Z0-9]{4,20}$/)
  .withMessage('Username must be 4-20 alphanumeric characters');

// Email: must be a valid email format; normalizeEmail() lowercases it
const emailValidator = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Valid email required');

// Password: at least 8 chars, must include both a letter and a number
const passwordValidator = body('password')
  .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/)
  .withMessage('Password must be at least 8 characters and include a letter and number');

// ── POST /api/auth/register ─────────────────────────────────────────────────────
// Creates a Supabase Auth user + a matching row in public.users.
// The Supabase trigger (handle_new_user) auto-creates the public profile.
router.post('/register', [
  usernameValidator,
  emailValidator,
  passwordValidator,
  // Custom cross-field validator: confirmPassword must match password
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  })
], async (req, res) => {
  // Check all validator results — return 400 if anything failed
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  // Check username uniqueness BEFORE creating the auth user
  // (Supabase auth doesn't know about our custom username field)
  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .single();

  if (existing) {
    return res.status(400).json({ error: 'Username already taken' });
  }

  // Create the auth user in Supabase Auth (sends verification email by default)
  // We pass username in options.data so the DB trigger (handle_new_user) can use it
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }
    }
  });

  if (error) return res.status(400).json({ error: error.message });

  // Auto-confirm the email so users can log in immediately without waiting
  // for a verification email (useful in dev/demo). This uses the admin SDK.
  if (data.user?.id) {
    try {
      await supabase.auth.admin.updateUserById(data.user.id, {
        email_confirm: true
      });
    } catch (confirmErr) {
      console.warn('[Auth] Could not auto-confirm email:', confirmErr.message);
      // Non-fatal — user can still verify via email
    }
  }

  res.status(201).json({
    message: 'Registration successful! You can now log in.',
    user: { id: data.user?.id, email }
  });
});

// ── POST /api/auth/login ────────────────────────────────────────────────────────
// Signs in the user with email + password.
// Returns a Supabase session (containing access_token + refresh_token)
// and the full user profile merged from auth.users + public.users.
router.post('/login', [emailValidator, body('password').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  // Supabase validates credentials and returns a JWT session + user object
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  // Use a generic error message to avoid leaking whether an email exists
  if (error) return res.status(401).json({ error: 'Invalid credentials' });

  // Fetch the full profile from public.users (includes xp, coins, role, etc.)
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  // Send both the session (for token storage) and the merged user profile
  res.json({
    session: data.session,        // contains access_token the frontend stores
    user: { ...data.user, ...profile }
  });
});

// ── POST /api/auth/forgot-password ──────────────────────────────────────────────
// Sends a password reset email if an account exists with that email.
// Always returns a success message (security: never confirm whether email exists)
router.post('/forgot-password', [emailValidator], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;

  // Supabase sends a reset link to the email; redirectTo is where the link goes
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`
  });

  // Return success regardless of whether the email exists (security best practice)
  res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
});

// ── POST /api/auth/reset-password ───────────────────────────────────────────────
// Called from the /reset-password page after the user clicks the email link.
// The user must be authenticated via the reset token embedded in the URL.
router.post('/reset-password', [passwordValidator], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { password, access_token } = req.body;

  // Create a fresh client scoped to the user's reset token
  const supabaseUser = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  const { error } = await supabaseUser.auth.updateUser({ password });
  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: 'Password reset successfully' });
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────────
// Invalidates the session server-side so the token can no longer be used.
// The frontend also deletes the token from localStorage.
router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) await supabase.auth.admin.signOut(token);
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
