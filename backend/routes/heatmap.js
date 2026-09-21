const express = require('express');
const supabase = require('../utils/supabase');
const router = express.Router();

router.get('/', async (req, res) => {
  const { type, severity, status, from, to } = req.query;

  let query = supabase
    .from('complaints')
    .select('latitude, longitude, severity, type, status, created_at');

  if (type) query = query.eq('type', type);
  if (severity) query = query.eq('severity', severity);
  if (status) query = query.eq('status', status);
  else query = query.eq('status', 'Approved');
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  const severityWeights = { High: 1.0, Medium: 0.6, Low: 0.3 };
  const points = data.map(c => ({
    lat: c.latitude,
    lng: c.longitude,
    intensity: severityWeights[c.severity] || 0.5
  }));

  res.json(points);
});

module.exports = router;
