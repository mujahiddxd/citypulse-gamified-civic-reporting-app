/**
 * routes/chatbot.js — In-App Help Chatbot
 * ----------------------------------------
 * Provides an intelligent chatbot for users to ask questions about
 * the platform. Works in two tiers:
 *
 *   Tier 1 — FAQ keyword matching (fast, no API cost):
 *     Scans the user's message for known keywords and returns a
 *     pre-written answer. E.g. if the message contains "xp" or "earn",
 *     return the XP explanation.
 *
 *   Tier 2 — OpenAI GPT fallback (if API key is configured):
 *     If no FAQ match found AND an OpenAI key is in the environment,
 *     calls GPT-3.5-turbo with the last 6 messages of chat history
 *     as context, plus a system prompt describing the app.
 *
 *   Tier 3 — Static fallback:
 *     If neither tier works, returns a generic help message.
 *
 * All conversations are saved to the chat_history table (non-blocking).
 *
 * Routes (under /api/chatbot):
 *   POST /      → Send a message, get a response
 *   GET  /history → Get last 50 messages for the current user
 */
const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// ── FAQ Responses ─────────────────────────────────────────────────────────────
// Each entry has an array of keywords to match (any one triggers the response)
// and the pre-written response string to return.
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
  { keywords: ['hello', 'hi', 'hey', 'help', 'what can'], response: 'Hi! I can help with: submitting reports, XP & levels, badges, heatmap, leaderboard, or anything about CityPulse. What do you need?' },
];

// ── POST /api/chatbot ─────────────────────────────────────────────────────────
// Processes a user message and returns a bot response.
// Body: { message: string, history: Array<{role, content}> }
router.post('/', authenticate, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) return res.json({ response: 'Please type a message!' });

    const lower = message.toLowerCase(); // Normalize for keyword matching

    // ── Tier 1: FAQ keyword matching ──────────────────────────────────────────
    for (const faq of FAQ) {
      // Check if ANY keyword in the list appears in the message
      if (faq.keywords.some(kw => lower.includes(kw))) {
        // Save both user message and bot response to chat_history (fire-and-forget)
        // .then(() => {}).catch(() => {}) prevents any DB errors from crashing the response
        supabase.from('chat_history').insert([
          { user_id: req.user.id, role: 'user', content: message },
          { user_id: req.user.id, role: 'assistant', content: faq.response }
        ]).then(() => { }).catch(() => { });
        return res.json({ response: faq.response });
      }
    }

    // ── Tier 2: OpenAI GPT fallback ───────────────────────────────────────────
    // Only called if OPENAI_API_KEY is set and looks valid (starts with 'sk-')
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
      try {
        const OpenAI = require('openai'); // Lazy require — only import if needed
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            // System message gives GPT context about the app
            { role: 'system', content: 'You are a helpful assistant for CityPulse, a civic reporting platform where users report garbage and crowd issues, earn XP, and level up. Be concise and helpful.' },
            // Include the last 6 messages of history for conversational context
            ...history.slice(-6),
            { role: 'user', content: message }
          ],
          max_tokens: 250 // Keep responses concise
        });

        const response = completion.choices[0].message.content;

        // Save the AI response to history too
        supabase.from('chat_history').insert([
          { user_id: req.user.id, role: 'user', content: message },
          { user_id: req.user.id, role: 'assistant', content: response }
        ]).then(() => { }).catch(() => { });

        return res.json({ response });
      } catch (err) {
        console.error('OpenAI error:', err.message);
        // Fall through to the static fallback below
      }
    }

    // ── Tier 3: Static fallback ───────────────────────────────────────────────
    // Returned when no FAQ matched and OpenAI is not available
    res.json({ response: "I can help with submitting reports, XP & levels, badges, heatmap, or leaderboard. Try asking something like 'how do I submit a report?' or 'how does XP work?'" });

  } catch (err) {
    res.json({ response: "I can help with submitting reports, XP & levels, badges, and the heatmap. What would you like to know?" });
  }
});

// ── GET /api/chatbot/history ──────────────────────────────────────────────────
// Returns the last 50 messages from the current user's chat history.
// Messages are ordered oldest-first so the UI can render them chronologically.
router.get('/history', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('chat_history').select('*')
    .eq('user_id', req.user.id)
    .order('timestamp', { ascending: true }) // Oldest first for chat display
    .limit(50);
  res.json(data || []);
});

module.exports = router;
