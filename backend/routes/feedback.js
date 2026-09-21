const express = require('express');
const { body, validationResult } = require('express-validator');
const supabase = require('../utils/supabase');
const router = express.Router();

router.post('/', [
  body('name').trim().notEmpty().withMessage('Name required'),
  body('email').isEmail().normalizeEmail(),
  body('subject').trim().notEmpty(),
  body('category').isIn(['Bug', 'Suggestion', 'Other']),
  body('message').trim().isLength({ min: 10, max: 2000 })
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, subject, category, message } = req.body;
  const { data, error } = await supabase.from('feedback').insert({ name, email, subject, category, message }).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json({ message: 'Feedback submitted successfully', id: data.id });
});

module.exports = router;
