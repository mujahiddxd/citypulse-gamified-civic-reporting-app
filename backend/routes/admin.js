/**
 * routes/admin.js — Admin Complaint Management & User Administration
 * ------------------------------------------------------------------
 * Protected routes for admins and officers to manage the platform.
 * All routes in this file require either admin or officer authentication
 * via the middleware functions imported from middleware/auth.js.
 *
 * Routes (all under /api/admin):
 *   GET   /complaints          → List all complaints with filters + pagination (officer/admin)
 *   PATCH /complaints/:id/approve → Approve a complaint, award XP to submitter (officer/admin)
 *   PATCH /complaints/:id/reject  → Reject a complaint (officer/admin)
 *   GET   /users               → List all users sorted by XP (admin only)
 *   PATCH /users/:id/role      → Change a user's role (admin only)
 *   GET   /feedback            → View all feedback submissions (admin only)
 *   PATCH /feedback/:id/read   → Mark feedback as read (admin only)
 *
 * Gamification: When approving a complaint, this route:
 *   1. Updates complaint status to 'Approved'
 *   2. Records how long it took to review (resolution_time in minutes)
 *   3. Calls award_xp() DB function → awards 50 XP + 50 coins to the submitter
 *   4. Calls update_area_score() DB function → recalculates the area's cleanliness score
 */
const express = require('express');
const supabase = require('../utils/supabase');
const { requireAdmin, requireOfficerOrAdmin } = require('../middleware/auth');
const router = express.Router();

// XP (and coin) amount awarded per complaint approval
const XP_PER_APPROVAL = 50;

// ── GET /api/admin/complaints ────────────────────────────────────────────────
// Lists all complaints in the system (any status) with pagination.
// Officers and admins can use this to review the queue.
router.get('/complaints', requireOfficerOrAdmin, async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit; // Calculate how many rows to skip (for pagination)

  let query = supabase
    .from('complaints')
    // Join users table to display who submitted each complaint
    .select(`*, users (username, email, level, xp)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    // range(start, end) implements pagination (inclusive, 0-indexed)
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // Return data + total count so the frontend can render pagination controls
  res.json({ data, total: count, page: parseInt(page), limit: parseInt(limit) });
});

// ── PATCH /api/admin/complaints/:id/approve ───────────────────────────────────
// Approves a pending complaint. This is the main review action.
// Steps:
//   1. Fetch the complaint to verify it exists and is still Pending
//   2. Calculate how long it took to review (for analytics)
//   3. Update the status to 'Approved' and record timestamps
//   4. Award XP + Coins to the submitter
//   5. Recalculate the area's cleanliness score
router.patch('/complaints/:id/approve', requireOfficerOrAdmin, async (req, res) => {
  const { id } = req.params;

  // Step 1: Verify complaint exists and hasn't already been processed
  const { data: complaint, error: fetchErr } = await supabase
    .from('complaints')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !complaint) return res.status(404).json({ error: 'Complaint not found' });
  if (complaint.status !== 'Pending') return res.status(400).json({ error: 'Complaint already processed' });

  // Step 2: Calculate resolution time (how long from submission to approval)
  const now = new Date();
  const createdAt = new Date(complaint.created_at);
  const resolutionTime = Math.round((now - createdAt) / (1000 * 60)); // Convert ms → minutes

  // Step 3: Update complaint row to mark it as Approved
  const { data: updated, error: updateErr } = await supabase
    .from('complaints')
    .update({
      status: 'Approved',
      approved_at: now.toISOString(),
      resolution_time: resolutionTime
    })
    .eq('id', id)
    .select()
    .single();

  if (updateErr) return res.status(500).json({ error: updateErr.message });

  // Step 4: Award XP and Coins to the user who submitted the complaint
  // award_xp() is a Postgres function that also triggers badge checks + level recalculation
  if (complaint.user_id) {
    await supabase.rpc('award_xp', {
      p_user_id: complaint.user_id,
      p_xp: XP_PER_APPROVAL,
      p_coins: XP_PER_APPROVAL, // Award coins equal to XP (1:1 ratio)
      p_reason: `Complaint approved: ${complaint.type}`,
      p_complaint_id: id
    });
  }

  // Step 5: Recalculate this area's cleanliness score (updates area_scores table)
  if (complaint.area_name) {
    await supabase.rpc('update_area_score', { p_area_name: complaint.area_name });
  }

  res.json({ message: 'Complaint approved', complaint: updated, xp_awarded: XP_PER_APPROVAL });
});

// ── PATCH /api/admin/complaints/:id/reject ────────────────────────────────────
// Rejects a complaint. No XP is awarded for rejected complaints.
// An optional reason can be sent in the body (currently stored but not displayed).
router.patch('/complaints/:id/reject', requireOfficerOrAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body; // Optional rejection reason (future use)

  const { data, error } = await supabase
    .from('complaints')
    .update({ status: 'Rejected' })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Complaint rejected', complaint: data });
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────
// Returns all registered users sorted by XP (highest first).
// Used in the AdminUsers page to view and manage user roles.
// Restricted to admin only (not officers).
router.get('/users', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('xp', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── PATCH /api/admin/users/:id/role ──────────────────────────────────────────
// Promotes or demotes a user's role (user → officer → admin, or any combination).
// Only admins can change roles (officers cannot promote other users).
router.patch('/users/:id/role', requireAdmin, async (req, res) => {
  const { role } = req.body;

  // Validate that the requested role is one of the allowed values
  if (!['user', 'admin', 'officer'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── GET /api/admin/feedback ───────────────────────────────────────────────────
// Returns all user feedback/contact form submissions in reverse chronological order.
// Unread items can be marked as read via the PATCH route below.
router.get('/feedback', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── PATCH /api/admin/feedback/:id/read ───────────────────────────────────────
// Marks a feedback item as read (sets is_read = true).
// Used in the AdminFeedback page when an admin views a submission.
router.patch('/feedback/:id/read', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('feedback')
    .update({ is_read: true })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
