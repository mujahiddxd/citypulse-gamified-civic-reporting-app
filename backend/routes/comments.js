/**
 * routes/comments.js — Report Comments System
 * --------------------------------------------
 * Allows users and admins/officers to comment on public reports.
 * Comments are tied to a specific complaint (report) by complaint_id.
 *
 * Key feature: "Official Updates"
 *   When an admin or officer posts a comment, they can mark it
 *   as is_official_update=true, which displays it differently in
 *   the UI (e.g. with a badge or different styling).
 *
 * Routes (under /api/comments):
 *   GET    /:complaint_id  → Get all comments for a report (public)
 *   POST   /               → Post a new comment (auth required)
 *   DELETE /:id            → Delete a comment (owner or admin/officer)
 */
const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

// ── GET /api/comments/:complaint_id ──────────────────────────────────────────
// Fetches all comments for a specific complaint, sorted oldest-first
// (chronological order for the comment thread display).
// Also joins the users table to display the commenter's username and role.
router.get('/:complaint_id', async (req, res) => {
    const { complaint_id } = req.params;

    const { data, error } = await supabase
        .from('report_comments')
        .select(`
      id, content, is_official_update, created_at,
      users(id, username, role)  -- join to display who wrote the comment
    `)
        .eq('complaint_id', complaint_id)
        .order('created_at', { ascending: true }); // Oldest comment first (thread order)

    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// ── POST /api/comments ────────────────────────────────────────────────────────
// Submits a new comment on a complaint. Requires a logged-in user.
// Comments are limited to 500 characters.
// Only admins/officers can set is_official_update = true.
router.post('/', authenticate, async (req, res) => {
    const { complaint_id, content } = req.body;

    // Validate required fields
    if (!complaint_id || !content || !content.trim()) {
        return res.status(400).json({ error: 'complaint_id and content are required' });
    }
    if (content.trim().length > 500) {
        return res.status(400).json({ error: 'Comment must be under 500 characters' });
    }

    // Determine if this should be flagged as an official update
    // Regular users can't set this even if they send it in the body
    const isOfficial = req.user.role === 'admin' || req.user.role === 'officer';

    const { data: comment, error } = await supabase
        .from('report_comments')
        .insert({
            complaint_id,
            user_id: req.user.id,
            content: content.trim(),
            // Only mark official if the user IS admin/officer AND they requested it
            is_official_update: isOfficial && req.body.is_official_update === true,
        })
        // Return the new comment with user details in one query
        .select(`id, content, is_official_update, created_at, users(id, username, role)`)
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(comment);
});

// ── DELETE /api/comments/:id ──────────────────────────────────────────────────
// Deletes a comment. Only allows:
//   - The original author to delete their own comment, OR
//   - An admin or officer to delete any comment (moderation)
router.delete('/:id', authenticate, async (req, res) => {
    const { id } = req.params;

    // Fetch the comment's owner before deleting (to check permissions)
    const { data: existing, error: fetchError } = await supabase
        .from('report_comments')
        .select('user_id')
        .eq('id', id)
        .single();

    if (fetchError || !existing) return res.status(404).json({ error: 'Comment not found' });

    // Permission check: must be the owner OR an admin/officer
    const isOwner = existing.user_id === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'officer';

    if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    const { error } = await supabase.from('report_comments').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

module.exports = router;
