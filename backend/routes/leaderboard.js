const express = require('express');
const supabase = require('../utils/supabase');
const router = express.Router();

router.get('/', async (req, res) => {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, username, xp, level, created_at')
    .order('xp', { ascending: false })
    .limit(10);

  if (error) return res.status(500).json({ error: error.message });

  const leaderboard = await Promise.all(users.map(async (user, index) => {
    const { data: badges } = await supabase
      .from('user_badges')
      .select('badges (name, icon)')
      .eq('user_id', user.id);

    const { count: approvedCount } = await supabase
      .from('complaints')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'Approved');

    return {
      rank: index + 1,
      ...user,
      badges: badges?.map(b => b.badges).filter(Boolean) || [],
      approvedCount: approvedCount || 0
    };
  }));

  res.json(leaderboard);
});

module.exports = router;
