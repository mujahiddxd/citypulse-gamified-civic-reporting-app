// analytics.js
const express = require('express');
const supabase = require('../utils/supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/overview', requireAdmin, async (req, res) => {
  const [
    { count: totalUsers },
    { count: totalComplaints },
    { count: pending },
    { count: approved },
    { count: rejected },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('complaints').select('*', { count: 'exact', head: true }),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'Rejected'),
  ]);

  const { data: xpData } = await supabase.from('xp_logs').select('xp');
  const totalXP = xpData?.reduce((sum, r) => sum + r.xp, 0) || 0;

  const { data: topUser } = await supabase
    .from('users')
    .select('username, xp')
    .order('xp', { ascending: false })
    .limit(1)
    .single();

  const { data: areaData } = await supabase
    .from('complaints')
    .select('area_name')
    .eq('status', 'Approved');

  const areaCounts = {};
  areaData?.forEach(c => {
    if (c.area_name) areaCounts[c.area_name] = (areaCounts[c.area_name] || 0) + 1;
  });
  const topArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  res.json({ totalUsers, totalComplaints, pending, approved, rejected, totalXP, topUser, topArea });
});

router.get('/complaints-over-time', requireAdmin, async (req, res) => {
  const { from, to } = req.query;
  let query = supabase.from('complaints').select('created_at, status, type');
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const grouped = {};
  data.forEach(c => {
    const date = c.created_at.split('T')[0];
    if (!grouped[date]) grouped[date] = { date, total: 0, approved: 0, rejected: 0 };
    grouped[date].total++;
    if (c.status === 'Approved') grouped[date].approved++;
    if (c.status === 'Rejected') grouped[date].rejected++;
  });

  res.json(Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)));
});

router.get('/type-distribution', requireAdmin, async (req, res) => {
  const { data } = await supabase.from('complaints').select('type');
  const counts = {};
  data?.forEach(c => { counts[c.type] = (counts[c.type] || 0) + 1; });
  res.json(Object.entries(counts).map(([name, value]) => ({ name, value })));
});

router.get('/area-counts', requireAdmin, async (req, res) => {
  const { data } = await supabase.from('complaints').select('area_name').eq('status', 'Approved');
  const counts = {};
  data?.forEach(c => { if (c.area_name) counts[c.area_name] = (counts[c.area_name] || 0) + 1; });
  res.json(Object.entries(counts).map(([area, count]) => ({ area, count })).sort((a, b) => b.count - a.count).slice(0, 10));
});

router.get('/top-users', requireAdmin, async (req, res) => {
  const { data } = await supabase.from('users').select('username, xp, level').order('xp', { ascending: false }).limit(10);
  res.json(data);
});

module.exports = router;
