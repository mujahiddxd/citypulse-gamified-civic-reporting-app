/**
 * routes/heatmap.js — Heatmap Geo Data
 * --------------------------------------
 * Returns geographic data points used to render the Leaflet.heat
 * heatmap layer on the React frontend map.
 *
 * Each point includes: lat, lng, intensity (based on severity),
 * plus metadata (type, severity, area_name, image_url) for popups.
 *
 * Route: GET /api/heatmap
 *
 * Query params (all optional):
 *   type     — 'Garbage'
 *   severity — 'Low' | 'Medium' | 'High'
 *   status   — defaults to 'Approved' if not provided
 *   from     — ISO date string (filter by created_at >=)
 *   to       — ISO date string (filter by created_at <=)
 *
 * Intensity mapping:
 *   High severity   → 1.0 (brightest/hottest on the heatmap)
 *   Medium severity → 0.6
 *   Low severity    → 0.3
 */
const express = require('express');
const supabase = require('../utils/supabase');
const router = express.Router();

router.get('/', async (req, res) => {
  const { type, severity, status, from, to } = req.query;

  // Fetch only the fields needed for the heatmap (no need for full complaint data)
  let query = supabase
    .from('complaints')
    .select('latitude, longitude, severity, type, status, created_at, area_name, image_url');

  // Apply optional filters
  if (type) query = query.eq('type', type);
  if (severity) query = query.eq('severity', severity);
  if (status) query = query.eq('status', status);
  else query = query.eq('status', 'Approved'); // Default: only approved complaints
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Map severity to a numeric intensity value for the heatmap library
  const severityWeights = { High: 1.0, Medium: 0.6, Low: 0.3 };

  // Transform DB rows into the format expected by Leaflet.heat:
  // { lat, lng, intensity } plus extra metadata for click popups
  const points = data.map(c => ({
    lat: c.latitude,
    lng: c.longitude,
    intensity: severityWeights[c.severity] || 0.5, // Default 0.5 if severity is unknown
    severity: c.severity,
    type: c.type,
    area_name: c.area_name,
    image_url: c.image_url
  }));

  res.json(points);
});

module.exports = router;
