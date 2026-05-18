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

// ── GET /api/profile/search ──────────────────────────────────────────────────
// Returns users matching a search query. If no query, returns all users sorted by XP.
// Used for the community Citizens tab on the public reports page.
router.get('/search', async (req, res) => {
  const { q } = req.query;

  let query = supabase
    .from('users')
    .select('id, username, xp, level, role')
    .order('xp', { ascending: false })
    .limit(50); // Cap at 50 so the page stays performant

  if (q && q.trim()) {
    query = query.ilike('username', `%${q.trim()}%`);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
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

// ── PUT /api/profile/me ──────────────────────────────────────────────────────
// Updates the logged-in user's profile information.
// Supports updating bio and tagline with a built-in profanity filter.
router.put('/me', authenticate, async (req, res) => {
  const { bio, tagline } = req.body;

  // Profanity Filter (Basic list including English and common Hindi/Hinglish terms)
  const badWords = [
    'f*ck', 'sh*t', 'b*tch', 'a**hole', 'd*ck', // English
    'bhosadi', 'mc', 'bc', 'behenchod', 'madarchod', 'chutiya', 'gaand', 'l*nd' // Common Gaalis
  ];

  const content = `${bio} ${tagline}`.toLowerCase();
  const hasProfanity = badWords.some(word => {
    const regex = new RegExp(`\\b${word.replace(/\*/g, '.')}\\b`, 'i');
    return regex.test(content);
  });

  if (hasProfanity) {
    return res.status(400).json({ 
        error: 'Please use respectful language. Profanity is not allowed in CityPulse profiles.' 
    });
  }

  const { data, error } = await supabase
    .from('users')
    .update({ bio, tagline })
    .eq('id', req.user.id)
    .select('bio, tagline')
    .single();

  if (error) {
    if (error.message.includes('column "bio" of relation "users" does not exist')) {
      return res.status(400).json({ error: 'Profile editing is being enabled by the administrator. Please try again soon!' });
    }
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
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

// ── GET /api/profile/:username ────────────────────────────────────────────────
// Public-facing profile page. Accessible without login.
// Fetches the user by username and aggregates their stats in parallel.
router.get('/:username', async (req, res) => {
  // Find user by username
  let query = supabase
    .from('users')
    .select('id, username, xp, level, created_at, inventory, bio, tagline')
    .eq('username', req.params.username)
    .single();

  let { data: user, error } = await query;

  if (error && error.message.includes('column users.bio does not exist')) {
    const fallback = await supabase
      .from('users')
      .select('id, username, xp, level, created_at, inventory')
      .eq('username', req.params.username)
      .single();
    user = fallback.data;
    error = fallback.error;
  }

  if (error || !user) return res.status(404).json({ error: 'User not found' });

  // Run all aggregate queries in parallel
  const [
    { count: totalComplaints },
    { count: approvedComplaints },
    { data: badges },
    { data: rankData },
    { data: recentComplaints }
  ] = await Promise.all([
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'Approved'),
    supabase.from('user_badges').select('badges (name, description, icon), earned_at').eq('user_id', user.id),
    supabase.from('users').select('id').order('xp', { ascending: false }),
    supabase.from('complaints').select('created_at, municipality').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
  ]);

  const rank = rankData?.findIndex(u => u.id === user.id) + 1;

  // Level Progress Calculation
  const xpForNextLevel = (user.level) * (user.level) * 100;
  const xpForCurrentLevel = (user.level - 1) * (user.level - 1) * 100;
  const progress = ((user.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  // Generate dynamic activities
  const activities = [];
  
  // 1. Join Date
  activities.push({
    label: 'Joined the community',
    date: new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    timestamp: new Date(user.created_at).getTime()
  });

  // 2. Recent Reports
  recentComplaints?.forEach(c => {
    activities.push({
      label: `Submitted a report in ${c.municipality || 'the city'}`,
      date: new Date(c.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      timestamp: new Date(c.created_at).getTime()
    });
  });

  // 3. Badges Earned
  badges?.forEach(b => {
    activities.push({
      label: `Earned "${b.badges.name}" badge`,
      date: new Date(b.earned_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
      timestamp: new Date(b.earned_at).getTime()
    });
  });

  // Sort activities and take top 5
  activities.sort((a, b) => b.timestamp - a.timestamp);

  res.json({
    ...user,
    totalComplaints,
    approvedComplaints,
    badges: badges?.map(b => ({ ...b.badges, earned_at: b.earned_at })) || [],
    rank,
    levelProgress: Math.min(100, Math.max(0, progress)),
    xpForNextLevel,
    activities: activities.slice(0, 5)
  });
});

module.exports = router;
