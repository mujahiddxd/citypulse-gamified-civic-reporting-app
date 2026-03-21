/**
 * routes/leaderboard.js — Season-Based XP Leaderboard
 * -----------------------------------------------------
 * Returns the top 10 users ranked by XP earned in the current season.
 * A "season" is a 14-day period, starting from January 1, 2024
 * and automatically cycling every 14 days.
 *
 * Only users who have explicitly opted in (leaderboard_opt_in = true)
 * appear on the leaderboard. Admins and officers are excluded.
 *
 * Route: GET /api/leaderboard
 *
 * Season XP is calculated from the number of complaints approved
 * DURING the current season (not all-time XP). All-time XP is used
 * as a tiebreaker when two users have the same season XP.
 */
const express = require('express');
const supabase = require('../utils/supabase');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    // ── Step 1: Calculate the current season's date range ────────────────────
    // Seasons are 14-day intervals anchored to 2024-01-01.
    // This formula finds which season number we're in right now,
    // then calculates when the current season started and how many days remain.
    const anchorDate = new Date('2024-01-01T00:00:00Z');
    const now = new Date();
    const msIn14Days = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds

    const elapsedMs = Math.max(0, now.getTime() - anchorDate.getTime());
    const currentSeasonInt = Math.floor(elapsedMs / msIn14Days) + 1; // Season 1 = first 14 days

    const seasonStartDateMs = anchorDate.getTime() + ((currentSeasonInt - 1) * msIn14Days);
    const seasonEndDateMs = seasonStartDateMs + msIn14Days;
    const seasonStartDate = new Date(seasonStartDateMs).toISOString();
    const daysLeft = Math.ceil((seasonEndDateMs - now.getTime()) / (1000 * 60 * 60 * 24));

    // ── Step 2: Find all approved complaints since the season started ─────────
    // Each approved complaint = 50 season XP for that user
    const { data: seasonComplaints, error: compErr } = await supabase
      .from('complaints')
      .select('user_id')
      .eq('status', 'Approved')
      .gte('approved_at', seasonStartDate); // Only complaints approved in this season

    if (compErr) throw compErr;

    // ── Step 3: Build a map of userId → seasonXP ──────────────────────────────
    const seasonXpMap = {};
    (seasonComplaints || []).forEach(c => {
      if (!c.user_id) return;
      // Accumulate 50 XP per approval for each user
      seasonXpMap[c.user_id] = (seasonXpMap[c.user_id] || 0) + 50;
    });

    // ── Step 4: Fetch opt-in users (exclude admins/officers) ──────────────────
    // leaderboard_opt_in is a boolean column users toggle themselves
    const { data: users, error: userErr } = await supabase
      .from('users')
      .select('id, username, xp, level, created_at, inventory, leaderboard_opt_in, role')
      .eq('leaderboard_opt_in', true)
      .not('role', 'in', '("admin","officer")') // Exclude staff from the board
      .order('xp', { ascending: false })
      .limit(100); // Fetch more than we need, then sort by season XP below

    if (userErr) throw userErr;

    // ── Step 5: Merge, sort, and take top 10 ──────────────────────────────────
    let board = users.map(u => ({
      ...u,
      seasonXp: seasonXpMap[u.id] || 0, // Zero if they had no approvals this season
    }));

    // Primary sort: season XP descending. Tiebreaker: all-time XP descending
    board.sort((a, b) => {
      if (b.seasonXp !== a.seasonXp) return b.seasonXp - a.seasonXp;
      return b.xp - a.xp;
    });

    board = board.slice(0, 10); // Only top 10 entries

    // ── Step 6: Enrich each entry with badges and approved complaint count ─────
    const finalBoard = await Promise.all(board.map(async (user, index) => {
      // Fetch all badges this user has earned (joined from badges table)
      const { data: badges } = await supabase
        .from('user_badges')
        .select('badges (name, icon)')
        .eq('user_id', user.id);

      // Count how many complaints this user has had approved (all-time)
      const { count: approvedCount } = await supabase
        .from('complaints')
        .select('*', { count: 'exact', head: true }) // head:true = count only, no data returned
        .eq('user_id', user.id)
        .eq('status', 'Approved');

      return {
        rank: index + 1, // 1-indexed rank
        id: user.id,
        username: user.username,
        level: user.level,
        allTimeXp: user.xp,
        seasonXp: user.seasonXp,
        inventory: user.inventory,
        badges: badges?.map(b => b.badges).filter(Boolean) || [],
        approvedCount: approvedCount || 0
      };
    }));

    // Return both the season metadata and the leaderboard array
    res.json({
      season: { number: currentSeasonInt, daysLeft, startDate: seasonStartDate },
      leaderboard: finalBoard
    });

  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
