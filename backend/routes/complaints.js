const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// GET /api/complaints - Get all approved complaints (public)
router.get('/', async (req, res) => {
  const { type, severity, area, from, to, limit = 100 } = req.query;

  let query = supabase
    .from('complaints')
    .select(`
      *,
      users (username, level)
    `)
    .eq('status', 'Approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (type) query = query.eq('type', type);
  if (severity) query = query.eq('severity', severity);
  if (area) query = query.ilike('area_name', `%${area}%`);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// GET /api/complaints/my - Get user's own complaints
router.get('/my', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/complaints/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('complaints')
    .select(`*, users (username, level, xp)`)
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Complaint not found' });
  res.json(data);
});

// POST /api/complaints - Submit new complaint
router.post('/', authenticate, [
  body('type').isIn(['Garbage', 'Crowd Management']).withMessage('Invalid type'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters'),
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
  body('severity').optional().isIn(['Low', 'Medium', 'High']),
  body('area_name').trim().notEmpty().withMessage('Area name required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { type, description, latitude, longitude, severity, area_name, additional_info, is_anonymous, image_url } = req.body;

  const { data, error } = await supabase
    .from('complaints')
    .insert({
      user_id: req.user.id,
      type,
      description,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      severity: severity || 'Medium',
      area_name,
      additional_info,
      is_anonymous: is_anonymous || false,
      image_url,
      status: 'Pending'
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Award 10 XP for submitting (regardless of approval)
  await supabase.rpc('award_xp', {
    p_user_id: req.user.id,
    p_xp: 10,
    p_reason: 'Complaint submitted',
    p_complaint_id: data.id
  });

  res.status(201).json(data);
});

// POST /api/complaints/upload-image - Get signed upload URL
router.post('/upload-image', authenticate, async (req, res) => {
  const { filename, contentType } = req.body;
  const filePath = `complaints/${req.user.id}/${Date.now()}-${filename}`;

  const { data, error } = await supabase.storage
    .from('complaint-images')
    .createSignedUploadUrl(filePath);

  if (error) return res.status(500).json({ error: error.message });

  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/complaint-images/${filePath}`;
  res.json({ uploadUrl: data.signedUrl, publicUrl });
});

module.exports = router;
