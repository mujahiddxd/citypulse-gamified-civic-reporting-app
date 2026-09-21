const express = require('express');
const supabase = require('../utils/supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const XP_PER_APPROVAL = 50;

// GET /api/admin/complaints - All complaints with filters
router.get('/complaints', requireAdmin, async (req, res) => {
  const { status, type, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('complaints')
    .select(`*, users (username, email, level, xp)`, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) query = query.eq('status', status);
  if (type) query = query.eq('type', type);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({ data, total: count, page: parseInt(page), limit: parseInt(limit) });
});

// PATCH /api/admin/complaints/:id/approve
router.patch('/complaints/:id/approve', requireAdmin, async (req, res) => {
  const { id } = req.params;

  // Get complaint
  const { data: complaint, error: fetchErr } = await supabase
    .from('complaints')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchErr || !complaint) return res.status(404).json({ error: 'Complaint not found' });
  if (complaint.status !== 'Pending') return res.status(400).json({ error: 'Complaint already processed' });

  const now = new Date();
  const createdAt = new Date(complaint.created_at);
  const resolutionTime = Math.round((now - createdAt) / (1000 * 60)); // minutes

  // Update complaint
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

  // Award XP
  if (complaint.user_id) {
    await supabase.rpc('award_xp', {
      p_user_id: complaint.user_id,
      p_xp: XP_PER_APPROVAL,
      p_reason: `Complaint approved: ${complaint.type}`,
      p_complaint_id: id
    });
  }

  // Update area score
  if (complaint.area_name) {
    await supabase.rpc('update_area_score', { p_area_name: complaint.area_name });
  }

  res.json({ message: 'Complaint approved', complaint: updated, xp_awarded: XP_PER_APPROVAL });
});

// PATCH /api/admin/complaints/:id/reject
router.patch('/complaints/:id/reject', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const { data, error } = await supabase
    .from('complaints')
    .update({ status: 'Rejected' })
    .eq('id', id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'Complaint rejected', complaint: data });
});

// GET /api/admin/users
router.get('/users', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('xp', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/admin/users/:id/role
router.patch('/users/:id/role', requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  const { data, error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/admin/feedback
router.get('/feedback', requireAdmin, async (req, res) => {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PATCH /api/admin/feedback/:id/read
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
