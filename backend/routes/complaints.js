/**
 * routes/complaints.js — Complaint Submission & Retrieval
 * --------------------------------------------------------
 * The core feature of GarbageMap: users submit geo-tagged reports
 * about garbage or crowd issues. This router handles reading and
 * creating complaint records.
 *
 * Routes (all under /api/complaints):
 *   GET  /              → All approved complaints (public, with filters)
 *   GET  /my            → Logged-in user's own complaints (auth required)
 *   GET  /area-score    → Cleanliness score for a named area
 *   GET  /public        → Public community feed (resolved/approved)
 *   GET  /:id           → Single complaint by ID
 *   POST /              → Submit a new complaint (auth required)
 *   POST /upload-image  → Get a signed URL to upload an image to Supabase Storage
 *
 * NOTE: Routes with path parameters (/:id) must come AFTER specific paths
 * (/my, /area-score, /public) or Express will match them too early.
 *
 * Gamification: Submitting a complaint awards 10 XP immediately via
 * the `award_xp` Postgres RPC function. Approval awards 50 XP (see admin.js).
 */
const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// ── GET /api/complaints ─────────────────────────────────────────────────────────
// Returns all approved complaints for the map display.
// Supports filtering by type, severity, area name, and date range.
// Also joins the users table to get the submitter's username and level.
router.get('/', async (req, res) => {
  // Extract optional query parameters for filtering
  const { type, severity, area, from, to, limit = 100 } = req.query;

  // Build the Supabase query: only show 'Approved' complaints, newest first
  let query = supabase
    .from('complaints')
    .select(`
      *,
      users (username, level)  -- join users table with just username and level
    `)
    .eq('status', 'Approved')
    .order('created_at', { ascending: false })
    .limit(limit);

  // Apply optional filters only if query params are provided
  if (type) query = query.eq('type', type);
  if (severity) query = query.eq('severity', severity);
  if (area) query = query.ilike('area_name', `%${area}%`); // case-insensitive partial match
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lte('created_at', to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json(data);
});

// ── GET /api/complaints/my ────────────────────────────────────────────────────
// Returns ALL complaints submitted by the currently logged-in user,
// including Pending and Rejected ones (so they can track their own reports).
// Requires a valid token (authenticate middleware).
router.get('/my', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('complaints')
    .select('*')
    .eq('user_id', req.user.id) // req.user.id is set by the authenticate middleware
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── GET /api/complaints/area-score?area=<name> ───────────────────────────────
// Calculates a cleanliness score (1.0–5.0) for a named area based on
// the severity of complaints there. Used on the heatmap page.
//
// Score algorithm:
//   Start at 5.0, deduct:  High=-0.6, Medium=-0.3, Low=-0.1 per complaint
//   Minimum score is clamped to 1.0 so areas are never shown as "zero"
router.get('/area-score', async (req, res) => {
  try {
    const { area } = req.query;
    if (!area) return res.status(400).json({ error: 'Area parameter is required' });

    // Fetch all complaints matching this area name (partial, case-insensitive)
    const { data, error } = await supabase
      .from('complaints')
      .select('severity, type')
      .ilike('area_name', `%${area}%`);

    if (error) throw error;

    // If no complaints exist, the area is pristine — return max score
    if (!data || data.length === 0) {
      return res.json({ score: 5.0, totalReports: 0, garbageCount: 0, crowdCount: 0, message: 'Pristine Area!' });
    }

    // Tally complaints by type and deduct from score by severity
    let deduction = 0;
    let garbageCount = 0;
    let crowdCount = 0;

    data.forEach(c => {
      if (c.type === 'Garbage') garbageCount++;
      if (c.type === 'Crowd Management') crowdCount++;

      if (c.severity === 'High') deduction += 0.6;
      else if (c.severity === 'Medium') deduction += 0.3;
      else if (c.severity === 'Low') deduction += 0.1;
    });

    // Clamp to minimum of 1.0 (1 star = most polluted)
    let score = 5.0 - deduction;
    if (score < 1.0) score = 1.0;

    res.json({
      score: score.toFixed(1), // Return as 1 decimal place string e.g. "3.4"
      totalReports: data.length,
      garbageCount,
      crowdCount
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/complaints/public ───────────────────────────────────────────────
// Public community feed showing approved/resolved/in-progress reports.
// Used on the /reports page for community visibility.
// NOTE: This route MUST be declared before /:id to avoid being swallowed by it.
router.get('/public', async (req, res) => {
  const { status, type, limit = 60 } = req.query;

  let query = supabase
    .from('complaints')
    .select(`id, area_name, type, severity, status, description, image_url, created_at, is_anonymous, users(username)`)
    .order('created_at', { ascending: false })
    .limit(parseInt(limit));

  if (status && status !== 'all') {
    query = query.eq('status', status);
  } else {
    // Default: show resolved, in-progress, and approved (all "public" statuses)
    query = query.in('status', ['resolved', 'in_progress', 'Approved']);
  }
  if (type) query = query.eq('type', type);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

// ── GET /api/complaints/:id ───────────────────────────────────────────────────
// Fetches a single complaint by its UUID.
// Also joins the submitter's username, level, and xp for display.
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('complaints')
    .select(`*, users (username, level, xp)`)
    .eq('id', req.params.id)
    .single(); // Returns one record or null (not an array)

  if (error) return res.status(404).json({ error: 'Complaint not found' });
  res.json(data);
});

// ── POST /api/complaints ──────────────────────────────────────────────────────
// Submit a new complaint. Requires authentication.
// Validates all fields, stores the complaint as 'Pending',
// then immediately awards 10 XP to the submitter via a Postgres RPC call.
//
// Body fields:
//   type         — 'Garbage' or 'Crowd Management'
//   description  — 10–1000 character description
//   latitude     — decimal between -90 and 90
//   longitude    — decimal between -180 and 180
//   severity     — 'Low', 'Medium', or 'High' (optional, defaults to 'Medium')
//   area_name    — human-readable area name (e.g. "Sector 7, Lahore")
//   image_url    — URL of uploaded image (optional)
//   is_anonymous — boolean, hide username on the public feed
//   additional_info — optional extra notes
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

  // Insert the complaint — status starts as 'Pending' (awaiting admin review)
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

  // Award 10 XP immediately on submission, regardless of admin approval.
  // award_xp() is a stored Postgres function that also updates the user's level
  // and checks for badge unlocks automatically.
  await supabase.rpc('award_xp', {
    p_user_id: req.user.id,
    p_xp: 10,
    p_reason: 'Complaint submitted',
    p_complaint_id: data.id
  });

  res.status(201).json(data);
});

// ── POST /api/complaints/upload-image ────────────────────────────────────────
// Returns a signed upload URL for Supabase Storage.
// The frontend uses this URL to upload the image directly to Supabase
// (without routing through our backend), then sends the resulting publicUrl
// when submitting the complaint form.
//
// Body: { filename: string, contentType: string }
// Returns: { uploadUrl: string, publicUrl: string }
router.post('/upload-image', authenticate, async (req, res) => {
  const { filename, contentType } = req.body;

  // Build a unique storage path: complaints/<userId>/<timestamp>-<filename>
  const filePath = `complaints/${req.user.id}/${Date.now()}-${filename}`;

  // createSignedUploadUrl() returns a one-time-use URL the client can PUT to
  const { data, error } = await supabase.storage
    .from('complaint-images')
    .createSignedUploadUrl(filePath);

  if (error) return res.status(500).json({ error: error.message });

  // Construct the public URL that will be permanently accessible after upload
  const publicUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/complaint-images/${filePath}`;
  res.json({ uploadUrl: data.signedUrl, publicUrl });
});

module.exports = router;
