/**
 * routes/areas.js — Area Cleanliness Scores
 * ------------------------------------------
 * Returns pre-computed cleanliness scores for geographic areas.
 * The scores are calculated by the Postgres `update_area_score()` function
 * and stored in the `area_scores` table whenever a complaint is approved.
 *
 * Scores use a 0–100 scale:
 *   80–100 → Clean  (shown in green)
 *   50–79  → Moderate (shown in orange)
 *   0–49   → Critical (shown in red)
 *
 * These zones and colors are computed server-side for consistency.
 *
 * Routes (under /api/areas):
 *   GET /                 → All areas sorted by score (worst first)
 *   GET /:area_name       → Single area by exact name
 */
const express = require('express');
const supabase = require('../utils/supabase');
const router = express.Router();

// ── GET /api/areas ────────────────────────────────────────────────────────────
// Returns all tracked areas, sorted from worst score to best.
// Each area is enriched with a human-readable zone label and CSS color.
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('area_scores')
    .select('*')
    .order('score', { ascending: true }); // Worst areas first (lowest score = most complaints)

  if (error) return res.status(500).json({ error: error.message });

  // Add zone classification based on score thresholds
  const classified = data.map(area => ({
    ...area,
    // Zone label for display
    zone: area.score >= 80 ? 'Clean' : area.score >= 50 ? 'Moderate' : 'Critical',
    // CSS hex color matching the zone
    zoneColor: area.score >= 80 ? '#4CAF50' : area.score >= 50 ? '#FF9800' : '#F44336'
  }));

  res.json(classified);
});

// ── GET /api/areas/:area_name ─────────────────────────────────────────────────
// Returns the score record for a single area (exact name match).
// Used when drilling down into a specific area from the map.
router.get('/:area_name', async (req, res) => {
  const { data, error } = await supabase
    .from('area_scores')
    .select('*')
    .eq('area_name', req.params.area_name)
    .single();

  if (error) return res.status(404).json({ error: 'Area not found' });
  res.json(data);
});

module.exports = router;
