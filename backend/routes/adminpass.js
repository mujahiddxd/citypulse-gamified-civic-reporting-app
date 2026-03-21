const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

// POST /api/admin-pass/verify
router.post('/verify', requireAdmin, (req, res) => {
  const { pass } = req.body;
  if (!pass) return res.status(400).json({ error: 'Pass required' });

  const correct = process.env.ADMIN_PASS || 'GMAP-ADMIN-2026';

  if (pass === correct) {
    res.json({ success: true, token: Buffer.from(`${req.user.id}:${correct}:${Date.now()}`).toString('base64') });
  } else {
    res.status(401).json({ error: 'Incorrect admin pass' });
  }
});

module.exports = router;
