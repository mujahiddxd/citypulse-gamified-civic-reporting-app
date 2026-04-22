/**
 * routes/analytics.js — Admin Analytics Dashboard Data
 * ------------------------------------------------------
 * Provides aggregated statistics for the admin analytics dashboard.
 * All routes are protected by requireAdmin — only admins can access these.
 *
 * Routes (under /api/analytics):
 *   GET /overview              → High-level platform stats (counts, totals)
 *   GET /complaints-over-time  → Daily complaint counts for a line chart
 *   GET /type-distribution     → Garbage (for pie chart)
 *   GET /area-counts           → Top 10 areas by approved complaint count (bar chart)
 *   GET /top-users             → Top 10 users by all-time XP
 */
// analytics.js
const express = require('express');
const supabase = require('../utils/supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// ── GET /api/analytics/overview ──────────────────────────────────────────────
// Returns a snapshot of key platform metrics.
// Runs all count queries in parallel for performance.
router.get('/overview', requireAdmin, async (req, res) => {
  // Run all 5 counts in parallel using Promise.all (no sequential waiting)
  const [
    { count: totalUsers },       // Total registered users
    { count: totalComplaints },  // All complaints ever submitted
    { count: pending },          // Awaiting admin review
    { count: approved },         // Approved by admin
    { count: rejected },         // Rejected by admin
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('complaints').select('*', { count: 'exact', head: true }),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'Pending'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'Approved'),
    supabase.from('complaints').select('*', { count: 'exact', head: true }).eq('status', 'Rejected'),
  ]);

  // Sum all XP ever awarded across the whole platform
  const { data: xpData } = await supabase.from('xp_logs').select('xp');
  const totalXP = xpData?.reduce((sum, r) => sum + r.xp, 0) || 0;

  // The highest-XP user (for a "top contributor" stat)
  const { data: topUser } = await supabase
    .from('users')
    .select('username, xp')
    .order('xp', { ascending: false })
    .limit(1)
    .single();

  // Calculate the most complained-about area (hotspot)
  const { data: areaData } = await supabase
    .from('complaints')
    .select('area_name')
    .eq('status', 'Approved');

  const areaCounts = {};
  areaData?.forEach(c => {
    if (c.area_name) areaCounts[c.area_name] = (areaCounts[c.area_name] || 0) + 1;
  });
  // Sort areas by count descending, pick the top one
  const topArea = Object.entries(areaCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  res.json({ totalUsers, totalComplaints, pending, approved, rejected, totalXP, topUser, topArea });
});

// ── GET /api/analytics/complaints-over-time ───────────────────────────────────
// Groups complaints by day and returns counts by status.
// Used to power a line/bar chart showing complaint trends over time.
// Query params: from (date), to (date) — both optional
router.get('/complaints-over-time', requireAdmin, async (req, res) => {
  const { from, to } = req.query;
  let query = supabase.from('complaints').select('created_at, status, type');
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Group complaints by their date (YYYY-MM-DD) and tally by status
  const grouped = {};
  data.forEach(c => {
    const date = c.created_at.split('T')[0]; // Extract date part from ISO timestamp
    if (!grouped[date]) grouped[date] = { date, total: 0, approved: 0, rejected: 0 };
    grouped[date].total++;
    if (c.status === 'Approved') grouped[date].approved++;
    if (c.status === 'Rejected') grouped[date].rejected++;
  });

  // Return sorted by date ascending for chronological chart display
  res.json(Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)));
});

// ── GET /api/analytics/type-distribution ─────────────────────────────────────
// Returns how many complaints are of each type.
// Used for a pie chart: "Garbage"
router.get('/type-distribution', requireAdmin, async (req, res) => {
  const { data } = await supabase.from('complaints').select('type');
  const counts = {};
  // Count occurrences of each type
  data?.forEach(c => { counts[c.type] = (counts[c.type] || 0) + 1; });
  // Format as [{name: 'Garbage', value: 42}, ...]  for chart libraries
  res.json(Object.entries(counts).map(([name, value]) => ({ name, value })));
});

// ── GET /api/analytics/area-counts ────────────────────────────────────────────
// Top 10 areas by approved complaint count.
// Used as a horizontal bar chart to identify problem areas.
router.get('/area-counts', requireAdmin, async (req, res) => {
  const { data } = await supabase.from('complaints').select('area_name').eq('status', 'Approved');
  const counts = {};
  data?.forEach(c => { if (c.area_name) counts[c.area_name] = (counts[c.area_name] || 0) + 1; });
  // Sort by count desc, take top 10
  res.json(
    Object.entries(counts)
      .map(([area, count]) => ({ area, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  );
});

// ── GET /api/analytics/top-users ──────────────────────────────────────────────
// Returns the top 10 users by all-time XP.
// Shown in a chart alongside other analytics data.
router.get('/top-users', requireAdmin, async (req, res) => {
  const { data } = await supabase
    .from('users')
    .select('username, xp, level')
    .order('xp', { ascending: false })
    .limit(10);
  res.json(data);
});

module.exports = router;
