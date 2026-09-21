const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../utils/supabase');
const router = express.Router();

// Validation rules
const usernameValidator = body('username')
  .matches(/^[a-zA-Z0-9]{4,20}$/)
  .withMessage('Username must be 4-20 alphanumeric characters');

const emailValidator = body('email')
  .isEmail()
  .normalizeEmail()
  .withMessage('Valid email required');

const passwordValidator = body('password')
  .matches(/^(?=.*[a-zA-Z])(?=.*\d).{8,}$/)
  .withMessage('Password must be at least 8 characters and include a letter and number');

// POST /api/auth/register
router.post('/register', [
  usernameValidator,
  emailValidator,
  passwordValidator,
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.password) throw new Error('Passwords do not match');
    return true;
  })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  // Check username uniqueness
  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .single();

  if (existing) {
    return res.status(400).json({ error: 'Username already taken' });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username }
    }
  });

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json({
    message: 'Registration successful! Please check your email to verify.',
    user: { id: data.user?.id, email }
  });
});

// POST /api/auth/login
router.post('/login', [emailValidator, body('password').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return res.status(401).json({ error: 'Invalid credentials' });

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', data.user.id)
    .single();

  res.json({
    session: data.session,
    user: { ...data.user, ...profile }
  });
});

// POST /api/auth/forgot-password
router.post('/forgot-password', [emailValidator], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email } = req.body;
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.FRONTEND_URL}/reset-password`
  });

  // Always return success (security best practice)
  res.json({ message: 'If an account exists with this email, a reset link has been sent.' });
});

// POST /api/auth/reset-password
router.post('/reset-password', [passwordValidator], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { password, access_token } = req.body;
  const supabaseUser = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  const { error } = await supabaseUser.auth.updateUser({ password });
  if (error) return res.status(400).json({ error: error.message });

  res.json({ message: 'Password reset successfully' });
});

// POST /api/auth/logout
router.post('/logout', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (token) await supabase.auth.admin.signOut(token);
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
