const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// GET /api/profile/:username - Public profile
router.get('/:username', async (req, res) => {
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, xp, level, created_at')
    .eq('username', req.params.username)
    .single();

  if (error || !user) return res.status(404).json({ error: 'User not found' });

  const [
    { count: totalComplaints },
    { count: approvedComplaints },
    { data: badges },
    { data: rankData }
  ] = await Promise.all([
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'Approved'),
    supabase.from('user_badges').select('badges (name, description, icon), earned_at').eq('user_id', user.id),
    supabase.from('users').select('id').order('xp', { ascending: false })
  ]);

  const rank = rankData?.findIndex(u => u.id === user.id) + 1;

  const xpForNextLevel = (user.level) * (user.level) * 100;
  const xpForCurrentLevel = (user.level - 1) * (user.level - 1) * 100;
  const progress = ((user.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100;

  res.json({
    ...user,
    totalComplaints,
    approvedComplaints,
    badges: badges?.map(b => ({ ...b.badges, earned_at: b.earned_at })) || [],
    rank,
    levelProgress: Math.min(100, Math.max(0, progress)),
    xpForNextLevel
  });
});

// GET /api/profile/me/xp-history
router.get('/me/xp-history', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('xp_logs')
    .select('*')
    .eq('user_id', req.user.id)
    .order('timestamp', { ascending: false })
    .limit(20);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
