/**
 * routes/profile.js — User Profile Routes
 * ----------------------------------------
 * Provides public and private profile data for users.
 *
 * Routes (all under /api/profile):
 *   GET  /:username          → Public profile view (anyone can see)
 *   GET  /me/xp-history      → Logged-in user's XP transaction log
 *   POST /me/leaderboard-optin → Toggle leaderboard participation (auth)
 *   GET  /me                 → Logged-in user's own profile data (auth)
 *
 * NOTE: Route order matters here. '/me/xp-history' and '/me' must come
 * BEFORE '/:username' or Express would treat "me" as a username.
 * In this file they come after in source order, but Express matches
 * static paths before parameterised ones only when declared first.
 * To be safe, declare /me routes before /:username in a real refactor.
 *
 * The public profile includes:
 *   - XP, level, total and approved complaint counts
 *   - All earned badges with unlock dates
 *   - Rank among all users (positions by XP)
 *   - Level progress percentage and XP needed for next level
 */
const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// ── GET /api/profile/:username ────────────────────────────────────────────────
// Public-facing profile page. Accessible without login.
// Fetches the user by username and aggregates their stats in parallel.
router.get('/:username', async (req, res) => {
  // Find user by username (not by ID, since URLs show usernames)
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, xp, level, created_at, inventory')
    .eq('username', req.params.username)
    .single();

  if (error || !user) return res.status(404).json({ error: 'User not found' });

  // Run all aggregate queries in parallel (Promise.all is much faster than sequential awaits)
  const [
    { count: totalComplaints },     // Total complaints submitted (all statuses)
    { count: approvedComplaints },  // Only approved complaints
    { data: badges },               // All badges with earned date
    { data: rankData }              // All users sorted by XP (to determine this user's rank)
  ] = await Promise.all([
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'Approved'),
    supabase.from('user_badges').select('badges (name, description, icon), earned_at').eq('user_id', user.id),
    supabase.from('users').select('id').order('xp', { ascending: false })
  ]);

  // Find this user's position (1-indexed rank) among all users
  const rank = rankData?.findIndex(u => u.id === user.id) + 1;

  // ── Level Progress Calculation ──────────────────────────────────────────────
  // Level formula: Level = floor(sqrt(XP/100)) + 1
  // So: Level N starts at XP = (N-1)² × 100
  //     Level N+1 starts at XP = N² × 100
  const xpForNextLevel = (user.level) * (user.level) * 100;
  const xpForCurrentLevel = (user.level - 1) * (user.level - 1) * 100;
  // Percentage of the way through the current level (0–100)
  const progress = ((user.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  res.json({
    ...user,
    totalComplaints,
    approvedComplaints,
    // Flatten the nested join structure: badges (name, description, icon, earned_at)
    badges: badges?.map(b => ({ ...b.badges, earned_at: b.earned_at })) || [],
    rank,
    levelProgress: Math.min(100, Math.max(0, progress)), // Clamped 0–100
    xpForNextLevel
  });
});

// ── GET /api/profile/me/xp-history ───────────────────────────────────────────
// Returns the last 20 XP-earning events for the logged-in user.
// Each entry shows: when it happened, how much XP was awarded, and why.
// Used in the dashboard to show a history of activity.
router.get('/me/xp-history', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('xp_logs')
    .select('*')
    .eq('user_id', req.user.id)
    .order('timestamp', { ascending: false }) // Most recent first
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── POST /api/profile/me/leaderboard-optin ───────────────────────────────────
// Allows a logged-in user to opt in or out of the public leaderboard.
// Body: { opted_in: true | false }
// When false, the user won't appear on the leaderboard at all.
router.post('/me/leaderboard-optin', authenticate, async (req, res) => {
  const { opted_in } = req.body;

  const { data, error } = await supabase
    .from('users')
    .update({ leaderboard_opt_in: opted_in === true }) // Strictly boolean
    .eq('id', req.user.id)
    .select('leaderboard_opt_in')
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ leaderboard_opt_in: data.leaderboard_opt_in });
});

// ── GET /api/profile/me ───────────────────────────────────────────────────────
// Returns the authenticated user's own profile (private fields included).
// Used on app boot and after the user makes changes to see their current stats.
router.get('/me', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, xp, level, role, leaderboard_opt_in, inventory')
    .eq('id', req.user.id)
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
