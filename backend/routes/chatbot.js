/**
 * routes/chatbot.js — CityPulse Eco-Aware Help Chatbot
 * -----------------------------------------------------
 * Multi-tier chatbot with expanded FAQ, environmental awareness,
 * platform-specific knowledge, and AI fallback.
 */
const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Helper: pick a random response from an array for variety
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Intent-Based Knowledge Base ───────────────────────────────────────────────
const INTENTS = [
  {
    name: 'purpose',
    keywords: ['purpose', 'what do you do', 'how can you help', 'your role', 'who are you'],
    responses: [
      "I'm your CityPulse AI assistant! My purpose is to help you navigate the platform, explain how to earn rewards, provide recycling tips, and assist with reporting garbage. Think of me as your personal guide to a cleaner city! 🏙️",
      "I'm here to make your CityPulse experience smoother! I can guide you through submitting reports, tracking your XP, spending EcoCoins, or even give you tips on waste segregation. How can I assist you today? 🌿"
    ]
  },
  {
    name: 'about_citypulse',
    keywords: ['what is citypulse', 'what is this platform', 'about citypulse', 'citypulse for', 'what is this website'],
    responses: [
      "CityPulse is a gamified civic reporting platform! 🗺️ It allows citizens like you to report garbage issues in the city, earn XP and EcoCoins for your contributions, and compete on leaderboards. We turn urban cleanup into a rewarding community experience! 🏆",
      "CityPulse is where civic duty meets gamification. You report waste issues, we map them, and you get rewarded with coins and badges! It's all about building a cleaner, more sustainable city together. 🌍"
    ]
  },
  {
    name: 'greeting',
    keywords: ['hi', 'hello', 'hey', 'greetings', 'sup', 'yo'],
    responses: [
      "Hey there! 👋 How can I help you make the city cleaner today?",
      "Hi! I'm the CityPulse assistant. Ready to earn some XP? 🚀",
      "Hello! Welcome back to CityPulse. What's on your mind? 🌱"
    ]
  },
  {
    name: 'submit_report',
    keywords: ['submit', 'report', 'how to report', 'file', 'complain', 'new report', 'garbage'],
    responses: [
      "To submit a report:\n1️⃣ Click 'Submit Report' in the navbar\n2️⃣ Fill in the garbage type & severity\n3️⃣ Click the map to pin the exact location\n4️⃣ Optionally attach a photo (max 5MB)\n5️⃣ Hit Submit — you earn 10 XP instantly! 🎉",
      "Reporting is easy! Head to 'Submit Report', describe the issue, drop a pin on the map, and submit. You get 10 XP right away, and 50 more if an admin approves it. 📸"
    ]
  },
  {
    name: 'rewards_xp',
    keywords: ['xp', 'points', 'earn', 'reward', 'how to get', 'coins', 'ecocoin', 'money'],
    responses: [
      "You earn XP by submitting reports (+10 XP) and getting approvals (+50 XP). EcoCoins 🪙 are earned through daily login rewards! Spend them in the Premium Market on themes, borders, and badges. 🎁",
      "Impact = Rewards! Submit reports for XP and keep your daily streak alive for EcoCoins. You can use coins in the Store to customize your profile! 🚀"
    ]
  },
  {
    name: 'levels',
    keywords: ['level', 'leveling', 'level up', 'rank'],
    responses: [
      "Levels are based on your total XP. For example, Level 2 needs 100 XP, and Level 5 needs 1600 XP. Keep reporting and claiming daily rewards to climb higher! 📈",
      "Your level shows your commitment! Use the formula: Level = floor(√(XP/100)) + 1. The more active you are, the higher you'll go! 🏆"
    ]
  },
  {
    name: 'recycling',
    keywords: ['recycle', 'recycling', 'how to recycle', 'compost', 'segregation', 'sort'],
    responses: [
      "Quick Tip: Always rinse containers before recycling! ♻️ Blue bin for paper/plastic/metal, Green bin for glass. Proper segregation makes recycling 10x more effective! 🌍",
      "Waste segregation at source is key. Keep wet waste (food) separate from dry waste (paper, plastic). It's the best way to help the environment from home! 🏠"
    ]
  },
  {
    name: 'leaderboard',
    keywords: ['leaderboard', 'ranking', 'top users', 'league'],
    responses: [
      "The Global Leaderboard ranks the top users by XP. You can join the league from your Dashboard. Top 3 spots get gold, silver, and bronze medals! 🏅",
      "Want to see where you stand? Check the Leaderboard! You'll need to toggle 'Join League' in your profile settings to appear there. 🏆"
    ]
  },
  {
    name: 'heatmap',
    keywords: ['heatmap', 'map view', 'density', 'hotspot'],
    responses: [
      "The Heatmap visualizes garbage reports across the city. Red zones show high complaint density, while green areas are relatively clean. It's a great way to see which areas need the most help! 📍",
      "Check out the Heatmap to see environmental 'hotspots' in real-time. It helps authorities and volunteers prioritize cleanup efforts! 🔥"
    ]
  },
  {
    name: 'store',
    keywords: ['store', 'market', 'buy', 'shop', 'purchase', 'inventory'],
    responses: [
      "The Premium Market is where you spend EcoCoins! You can buy new dashboard themes, profile borders, titles, and badges. Once bought, you can equip them from your Inventory. 🎨",
      "Use your hard-earned EcoCoins in the Store! From Cyberpunk themes to Community Hero badges, there's plenty of ways to customize your profile. 🛍️"
    ]
  },
  {
    name: 'municipality',
    keywords: ['municipality', 'tmc', 'bmc', 'who is responsible', 'authority', 'local body', 'thane', 'mumbai', 'pune', 'bangalore'],
    responses: [
      "CityPulse automatically identifies the responsible municipality based on your location! For example, if you're in Thane, it's TMC; in Mumbai, it's BMC. We route your reports to the correct local body to ensure faster resolution. 🏛️",
      "We support various municipal corporations like BMC, TMC, PMC, and BBMP. When you drop a pin on the map, our system detects your area and assigns the report to the corresponding authority! 🗺️"
    ]
  }
];

// ── POST /api/chatbot ─────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) return res.json({ response: 'Please type a message!' });

    const lower = message.toLowerCase().replace(/[?.,!]/g, ''); // Basic normalization

    // ── Tier 1: Intent Matching ──
    let bestMatch = null;
    let maxKeywordScore = 0;

    for (const intent of INTENTS) {
      let score = 0;
      // Check for exact phrase matches first (higher priority)
      for (const kw of intent.keywords) {
        if (lower.includes(kw)) {
          // If the keyword is a multi-word phrase, give it more weight
          const weight = kw.split(' ').length;
          score += weight;
        }
      }

      if (score > maxKeywordScore) {
        maxKeywordScore = score;
        bestMatch = intent;
      }
    }

    // Special check for "what is citypulse" vs "hi"
    // If the message is very short and matches greeting, but also matches something else, prioritize the other.
    if (bestMatch && maxKeywordScore > 0) {
      const response = pick(bestMatch.responses);
      
      // Background save to history
      supabase.from('chat_history').insert([
        { user_id: req.user.id, role: 'user', content: message },
        { user_id: req.user.id, role: 'assistant', content: response }
      ]).then(() => {}).catch(() => {});
      
      return res.json({ response });
    }

    // ── Tier 2: OpenAI GPT fallback (only if key exists) ──
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are the CityPulse AI assistant. CityPulse is a gamified garbage reporting platform.
              - Users earn XP for reports.
              - EcoCoins for daily rewards.
              - Store for cosmetics.
              - Heatmap for waste density.
              Be friendly, helpful, and concise.`
            },
            ...history.slice(-6),
            { role: 'user', content: message }
          ],
          max_tokens: 200
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

    // ── Tier 3: Smart fallback ──
    const fallbacks = [
      "I'm not quite sure I caught that. Are you asking about how to submit a report, how rewards work, or maybe looking for recycling tips? 🌱",
      "That sounds interesting! I'm best at answering questions about CityPulse reports, XP, and eco-tips. Could you rephrase or ask about one of those? 🗺️",
      "I'm still learning! Try asking me 'What is CityPulse?', 'How do I earn coins?', or 'Give me a recycling tip!' ✨"
    ];
    const response = pick(fallbacks);
    
    supabase.from('chat_history').insert([
      { user_id: req.user.id, role: 'user', content: message },
      { user_id: req.user.id, role: 'assistant', content: response }
    ]).then(() => {}).catch(() => {});
    
    res.json({ response });

  } catch (err) {
    res.json({ response: "Oops, something went wrong! Try asking about reports or XP. 🌿" });
  }
});

// ── GET /api/chatbot/history ──────────────────────────────────────────────────
router.get('/history', authenticate, async (req, res) => {
  try {
    const { data } = await supabase
      .from('chat_history').select('*')
      .eq('user_id', req.user.id)
      .order('timestamp', { ascending: true })
      .limit(50);
    res.json(data || []);
  } catch (err) {
    res.json([]);
  }
});

module.exports = router;
