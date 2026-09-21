const express = require('express');
const supabase = require('../utils/supabase');
const router = express.Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('area_scores')
    .select('*')
    .order('score', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const classified = data.map(area => ({
    ...area,
    zone: area.score >= 80 ? 'Clean' : area.score >= 50 ? 'Moderate' : 'Critical',
    zoneColor: area.score >= 80 ? '#4CAF50' : area.score >= 50 ? '#FF9800' : '#F44336'
  }));

  res.json(classified);
});

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
