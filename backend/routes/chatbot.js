const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

const FAQ = [
  { keywords: ['submit', 'report', 'how to', 'file', 'complain'], response: 'To submit a report: click "Submit Report" in the navbar, fill in the details, click the map to pin your location (or hit "Use My Location"), then submit. You earn 10 XP instantly!' },
  { keywords: ['xp', 'points', 'earn', 'reward'], response: 'You earn 10 XP when you submit a report, and 50 XP when an admin approves it. XP is used to level up and climb the leaderboard!' },
  { keywords: ['level', 'leveling', 'level up'], response: 'Levels use the formula: Level = floor(sqrt(XP/100)) + 1. Level 2 = 100 XP, Level 3 = 400 XP, Level 4 = 900 XP, and so on.' },
  { keywords: ['badge', 'achievement', 'unlock'], response: 'Badges unlock automatically! First Report (1 approval), 5 Reports (5 approvals), Cleanliness Champion (500 XP), Community Hero (1000 XP).' },
  { keywords: ['leaderboard', 'ranking', 'top', 'rank'], response: 'The leaderboard shows the top 10 users by XP. Check it from the navbar — top 3 get gold, silver, and bronze medals!' },
  { keywords: ['heatmap', 'heat', 'density', 'map'], response: 'The Heatmap shows complaint density. Red = high density, yellow = medium, green = low. Filter by type, severity, and date.' },
  { keywords: ['admin', 'approve', 'rejected', 'pending', 'status'], response: 'Admins review all submitted reports. Approved reports earn you 50 XP and appear on the map. Rejected reports don\'t earn XP.' },
  { keywords: ['password', 'forgot', 'reset', 'login'], response: 'Click "Forgot Password" on the login page and a reset link will be sent to your email.' },
  { keywords: ['area', 'score', 'cleanliness', 'zone'], response: 'Area Score = 100 minus complaint weights. Green = Clean (80-100), Yellow = Moderate (50-79), Red = Critical (below 50).' },
  { keywords: ['anonymous', 'privacy', 'hide name'], response: 'Yes! Check "Submit anonymously" when reporting and your username won\'t be shown on that report.' },
  { keywords: ['photo', 'image', 'picture', 'upload'], response: 'Photo upload is optional (max 5MB). Attaching a photo helps admins review your report faster.' },
  { keywords: ['hello', 'hi', 'hey', 'help', 'what can'], response: 'Hi! I can help with: submitting reports, XP & levels, badges, heatmap, leaderboard, or anything about GarbageMaps. What do you need?' },
];

router.post('/', authenticate, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) return res.json({ response: 'Please type a message!' });

    const lower = message.toLowerCase();

    // Find best FAQ match
    for (const faq of FAQ) {
      if (faq.keywords.some(kw => lower.includes(kw))) {
        // Save chat history (non-blocking)
        supabase.from('chat_history').insert([
          { user_id: req.user.id, role: 'user', content: message },
          { user_id: req.user.id, role: 'assistant', content: faq.response }
        ]).then(() => {}).catch(() => {});
        return res.json({ response: faq.response });
      }
    }

    // Try OpenAI if key exists
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: 'You are a helpful assistant for GarbageMaps, a civic reporting platform where users report garbage and crowd issues, earn XP, and level up. Be concise and helpful.' },
            ...history.slice(-6),
            { role: 'user', content: message }
          ],
          max_tokens: 250
        });
        const response = completion.choices[0].message.content;
        supabase.from('chat_history').insert([
          { user_id: req.user.id, role: 'user', content: message },
          { user_id: req.user.id, role: 'assistant', content: response }
        ]).then(() => {}).catch(() => {});
        return res.json({ response });
      } catch (err) {
        console.error('OpenAI error:', err.message);
      }
    }

    // Default fallback
    res.json({ response: "I can help with submitting reports, XP & levels, badges, heatmap, or leaderboard. Try asking something like 'how do I submit a report?' or 'how does XP work?'" });
  } catch (err) {
    res.json({ response: "I can help with submitting reports, XP & levels, badges, and the heatmap. What would you like to know?" });
  }
});

router.get('/history', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('chat_history').select('*')
    .eq('user_id', req.user.id)
    .order('timestamp', { ascending: true }).limit(50);
  res.json(data || []);
});

module.exports = router;
