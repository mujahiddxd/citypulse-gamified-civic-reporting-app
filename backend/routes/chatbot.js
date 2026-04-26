/**
 * routes/chatbot.js — CityPulse Eco-Aware Help Chatbot
 * -----------------------------------------------------
 * Multi-tier chatbot with expanded FAQ, environmental awareness,
 * platform-specific knowledge, and AI fallback.
 *
 * Routes (under /api/chatbot):
 *   POST /        → Send a message, get a response
 *   GET  /history → Get last 50 messages for the current user
 */
const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// Helper: pick a random response from an array for variety
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// ── Expanded FAQ Knowledge Base ───────────────────────────────────────────────
const FAQ = [
  // ── Platform Basics ──
  {
    keywords: ['hello', 'hi', 'hey', 'help', 'what can', 'who are you', 'what is this'],
    responses: [
      "Hey there! 👋 I'm the CityPulse AI assistant. I can help you with submitting reports, understanding XP & levels, exploring the store, using the heatmap, climbing the leaderboard, and learning about waste management. What's on your mind?",
      "Hi! Welcome to CityPulse 🗺️ I know everything about our platform — from reporting garbage to earning rewards. Ask me anything!",
      "Hello! I'm here to help you navigate CityPulse. Whether it's about reports, coins, badges, or eco-tips — just ask away! 🌱",
    ]
  },
  {
    keywords: ['submit', 'report', 'how to report', 'file', 'complain', 'new report'],
    responses: [
      "To submit a report:\n1️⃣ Click 'Submit Report' in the navbar\n2️⃣ Fill in the garbage type & severity\n3️⃣ Click the map to pin the exact location (or use 'My Location')\n4️⃣ Optionally attach a photo (max 5MB)\n5️⃣ Hit Submit — you earn 10 XP instantly! 🎉",
      "Reporting is easy! Head to 'Submit Report', describe the issue, drop a pin on the map, and submit. You get 10 XP right away, and 50 more if an admin approves it. Pro tip: adding a photo speeds up approval! 📸",
    ]
  },
  {
    keywords: ['xp', 'points', 'earn', 'reward', 'how to get'],
    responses: [
      "Here's how XP works in CityPulse:\n• +10 XP — submitting a report\n• +50 XP — report gets approved by admin\n• +15-75 XP — daily login rewards (escalates over 7 days!)\n\nXP determines your level and leaderboard position. The more you report, the faster you climb! 🚀",
      "You earn XP by being an active citizen! Submit reports (+10 XP), get them approved (+50 XP), and claim daily login rewards (up to 75 XP on Day 7!). Your XP feeds into your level and leaderboard rank. 💪",
    ]
  },
  {
    keywords: ['coin', 'ecocoin', 'currency', 'money', 'spend'],
    responses: [
      "EcoCoins 🪙 are CityPulse's virtual currency! You earn them through:\n• Daily login rewards (25-150 coins/day)\n• Streak bonuses\n\nSpend them in the Premium Market on themes, profile borders, titles, and badges. Day 7 of your streak gives the biggest jackpot: 150 coins + a bonus item! 🎁",
      "EcoCoins fuel the CityPulse economy! Earn them daily (the amount increases each day of your streak), then visit the Store to buy cosmetic upgrades like themes, borders, and badges. Keep your streak alive for maximum coins! 🔥",
    ]
  },
  {
    keywords: ['level', 'leveling', 'level up', 'what level'],
    responses: [
      "Levels are calculated from your total XP using: Level = floor(√(XP/100)) + 1\n\n📊 Level milestones:\n• Level 2 → 100 XP\n• Level 3 → 400 XP\n• Level 4 → 900 XP\n• Level 5 → 1600 XP\n\nKeep reporting to level up faster!",
      "Your level reflects your impact! It's based on total XP. Each level takes more XP than the last — Level 2 needs 100 XP, Level 5 needs 1600 XP. Submit reports and claim daily rewards to keep progressing! 📈",
    ]
  },
  {
    keywords: ['badge', 'achievement', 'unlock'],
    responses: [
      "Badges unlock automatically as you hit milestones:\n🏅 First Report — 1 approved report\n🏅 5 Reports — 5 approved reports\n🏅 Cleanliness Champion — reach 500 XP\n🏅 Community Hero — reach 1000 XP\n\nBadges appear on your profile for everyone to see!",
      "Badges are earned, not bought! They auto-unlock when you hit key milestones like your first approval, 5 approvals, 500 XP, or 1000 XP. They're displayed on your profile as proof of your civic impact! 🎖️",
    ]
  },
  {
    keywords: ['leaderboard', 'ranking', 'top', 'rank', 'league'],
    responses: [
      "The Global Leaderboard ranks the top CityPulse users by XP. To appear on it, you need to opt in from your Dashboard (toggle 'Join League'). Top 3 get gold 🥇, silver 🥈, and bronze 🥉 medals!",
      "Want to compete? Opt into the League from your Dashboard! The leaderboard shows the top users by XP. Keep reporting and claiming daily rewards to climb the ranks. The top 3 spots get special medal icons! 🏆",
    ]
  },
  {
    keywords: ['heatmap', 'heat', 'density', 'map view', 'hotspot'],
    responses: [
      "The Heatmap visualizes garbage complaint density across the city:\n🔴 Red zones — high complaint density (needs urgent attention)\n🟡 Yellow zones — moderate issues\n🟢 Green zones — relatively clean\n\nYou can filter by garbage type, severity, and date range. It's a powerful tool for identifying problem areas! 📍",
    ]
  },
  {
    keywords: ['store', 'shop', 'buy', 'purchase', 'market', 'theme'],
    responses: [
      "The Premium Market is where you spend EcoCoins on cosmetics:\n🎨 Themes — change your entire dashboard color palette\n🖼️ Borders — add visual effects around your profile avatar\n🏷️ Titles — unique tags under your username\n🏅 Badges — special icons on your profile\n\nItems range from 75 to 800 coins. Click any item to see full details and buy/equip it!",
      "Visit the Store to customize your CityPulse experience! There are Legendary, Epic, Rare, and Common items — from the Cyberpunk theme (800 coins) to the Cleanup Crew badge (75 coins). Each item has a preview so you know what you're getting! 🛍️",
    ]
  },
  {
    keywords: ['inventory', 'equip', 'unequip', 'my items', 'owned'],
    responses: [
      "Your Inventory shows everything you own! Items are grouped by type (Themes, Borders, Titles, Badges). Click any item to see details, then hit 'Equip' to activate it or 'Unequip' to remove it. Changes apply instantly across the entire platform! ✨",
    ]
  },
  {
    keywords: ['daily', 'login', 'streak', 'day 7', 'weekly', 'claim'],
    responses: [
      "Daily login rewards escalate over a 7-day cycle:\n🌱 Day 1 → 25 coins, 15 XP\n🌿 Day 2 → 35 coins, 20 XP\n🌳 Day 3 → 50 coins, 25 XP\n💧 Day 4 → 40 coins, 20 XP\n🔥 Day 5 → 60 coins, 30 XP\n⚡ Day 6 → 75 coins, 35 XP\n👑 Day 7 → 150 coins, 75 XP + BONUS ITEM!\n\nDay 7 currently awards the 'Midnight Patrol' theme! Keep your streak alive — missing a day resets it. 🔥",
      "Your daily reward pops up every time you visit the Dashboard. Each day of the week gives different coins and XP (Day 7 is the jackpot with 150 coins + a free theme!). The weekly chart shows your progress. Don't break the streak! 📅",
    ]
  },
  {
    keywords: ['password', 'forgot', 'reset', 'login issue', 'can\'t login', 'account'],
    responses: [
      "Having trouble logging in? Click 'Forgot Password' on the login page — we'll send a reset link to your email. If you're still stuck, make sure you're using the same email you registered with. The reset link expires after 1 hour. 🔑",
    ]
  },
  {
    keywords: ['area', 'score', 'cleanliness', 'zone', 'area score'],
    responses: [
      "Area Scores measure neighborhood cleanliness on a 0-100 scale:\n🟢 80-100 → Clean zone\n🟡 50-79 → Moderate issues\n🔴 Below 50 → Critical — needs attention\n\nScores drop when complaints are filed and recover when issues are resolved. Your reports directly improve these scores! 🏙️",
    ]
  },
  {
    keywords: ['anonymous', 'privacy', 'hide name', 'hide identity'],
    responses: [
      "Absolutely! When submitting a report, check the 'Submit anonymously' box. Your username won't appear on that report — only the garbage details and location will be visible. Your XP is still earned privately! 🕶️",
    ]
  },
  {
    keywords: ['photo', 'image', 'picture', 'upload', 'camera'],
    responses: [
      "Photos are optional but highly recommended! They help admins verify and approve reports faster. Keep these in mind:\n📸 Max file size: 5MB\n📸 Supported formats: JPG, PNG, WebP\n📸 You can also attach images to comments on public reports\n\nA picture is worth a thousand reports! 😄",
    ]
  },
  {
    keywords: ['comment', 'discussion', 'public report', 'thread'],
    responses: [
      "You can comment on any public report! Head to 'Public Reports', click a report, and scroll to the comment section. You can:\n💬 Write text comments (up to 500 chars)\n📷 Attach an image to your comment\n🏛️ Admins can post 'Official Updates' that are highlighted differently\n\nComments help build community awareness around local issues! 🤝",
    ]
  },
  // ── Environmental Awareness ──
  {
    keywords: ['recycle', 'recycling', 'how to recycle', 'recyclable'],
    responses: [
      "Great question! Here's a quick recycling guide:\n♻️ Paper & Cardboard → Blue bin (flatten boxes!)\n♻️ Plastic (#1 & #2) → Blue bin (rinse containers)\n♻️ Glass → Green bin (remove caps)\n♻️ Metal/Aluminum → Blue bin\n🚫 NOT recyclable: Styrofoam, plastic bags, food-soiled paper\n\nWhen in doubt, check your local recycling guidelines. Every item recycled correctly matters! 🌍",
      "Recycling tips from CityPulse:\n• Rinse containers before recycling\n• Flatten cardboard to save space\n• Remove caps from bottles\n• Keep recyclables dry and clean\n• When in doubt, throw it out (contamination ruins entire batches)\n\nRecycling right is just as important as recycling at all! ♻️",
    ]
  },
  {
    keywords: ['compost', 'organic', 'food waste', 'biodegradable', 'wet waste'],
    responses: [
      "Composting turns organic waste into nutrient-rich soil! 🌱\n\n✅ Compostable: Fruit/veggie scraps, coffee grounds, eggshells, yard waste, tea bags\n❌ NOT compostable: Meat, dairy, oily food, pet waste\n\nIf you don't have a home compost, check if your city has a composting program. Composting reduces methane emissions from landfills by up to 50%! 🌿",
    ]
  },
  {
    keywords: ['e-waste', 'electronic', 'battery', 'phone', 'computer'],
    responses: [
      "E-waste needs special handling — never throw electronics in regular trash! ⚠️\n\n🔋 Batteries → designated collection points\n📱 Old phones → manufacturer take-back programs\n💻 Computers → certified e-waste recyclers\n🖨️ Printers/cartridges → office supply stores often take them\n\nE-waste contains toxic materials like lead and mercury. Proper disposal prevents soil and water contamination. Report any e-waste dumping on CityPulse! 🚨",
    ]
  },
  {
    keywords: ['plastic', 'single use', 'reduce plastic', 'plastic pollution'],
    responses: [
      "Plastic pollution is one of the biggest environmental challenges:\n\n🌊 8 million tons of plastic enter oceans yearly\n🐢 It takes 400+ years for a plastic bottle to decompose\n\nWhat you can do:\n• Carry reusable bags and water bottles\n• Say no to straws and cutlery\n• Choose products with minimal packaging\n• Report plastic dumping on CityPulse!\n\nEvery piece of plastic you refuse makes a difference! 💪",
    ]
  },
  {
    keywords: ['climate', 'global warming', 'carbon', 'emission', 'environment'],
    responses: [
      "Waste management is directly linked to climate change! 🌡️\n\nLandfills produce methane — a greenhouse gas 80x more potent than CO₂. By reporting garbage issues on CityPulse, you're helping:\n• Identify illegal dumping sites\n• Prioritize cleanup efforts\n• Reduce urban pollution\n• Track environmental improvements over time\n\nEvery report you submit is a small step toward a cleaner planet! 🌍",
    ]
  },
  {
    keywords: ['hazardous', 'chemical', 'toxic', 'dangerous waste', 'medical waste'],
    responses: [
      "⚠️ Hazardous waste requires special attention!\n\n🧪 Chemicals, paints, solvents → hazardous waste facility\n💊 Medications → pharmacy take-back programs\n🏥 Medical waste → contact local health department\n🛢️ Motor oil → auto shops or recycling centers\n\nNEVER dump hazardous waste in regular bins or down drains. If you spot illegal hazardous dumping, report it immediately on CityPulse with high severity! 🚨",
    ]
  },
  {
    keywords: ['segregation', 'sort', 'separate', 'dry waste', 'waste type'],
    responses: [
      "Waste segregation at source is crucial! Here's the basic breakdown:\n\n🟢 Wet/Organic → food scraps, garden waste\n🔵 Dry/Recyclable → paper, plastic, glass, metal\n🔴 Hazardous → batteries, chemicals, e-waste\n⚫ Reject → sanitary waste, diapers, broken ceramics\n\nProper segregation at home makes recycling 10x more effective. It's the single biggest thing you can do for waste management! 🏠",
    ]
  },
  // ── Fun / Engagement ──
  {
    keywords: ['fun fact', 'did you know', 'interesting', 'trivia'],
    responses: [
      "🌍 Fun Fact: The Great Pacific Garbage Patch is twice the size of Texas and contains 1.8 trillion pieces of plastic. That's why every report on CityPulse matters — clean cities start locally!",
      "🌿 Did you know? Recycling one aluminum can saves enough energy to run a TV for 3 hours. Small actions compound into massive impact!",
      "🐋 Fun Fact: Over 1 million marine animals die from ocean pollution every year. Proper waste disposal on land prevents garbage from reaching waterways. You're making a difference by reporting on CityPulse! 🌊",
      "♻️ Did you know? Glass is 100% recyclable and can be recycled endlessly without loss in quality. Yet only 33% of glass is actually recycled. Be the change! 🥂",
    ]
  },
  {
    keywords: ['motivat', 'inspire', 'why should i', 'does it matter', 'impact'],
    responses: [
      "Your reports genuinely make a difference! Here's proof:\n\n📊 CityPulse data is used by municipal teams to prioritize cleanups\n🗺️ Heatmaps reveal problem areas that officials might miss\n🏆 Community engagement creates social pressure for better waste management\n\nEvery single report moves the needle. You're not just filing complaints — you're building a cleaner city for everyone. Keep going! 💪🌱",
      "Think of it this way: one report might clean up one street corner. But thousands of reports from engaged citizens? That changes policy, funding, and infrastructure. CityPulse turns individual action into collective impact. You matter here. 🌍",
    ]
  },
  {
    keywords: ['thank', 'thanks', 'awesome', 'great', 'cool', 'nice'],
    responses: [
      "You're welcome! 😊 Happy to help. Keep making your city cleaner — every report counts!",
      "Glad I could help! 🌱 If you have more questions, I'm always here. Now go earn some XP! 💪",
      "Anytime! That's what I'm here for. Keep up the great work on CityPulse! 🏆",
    ]
  },
  {
    keywords: ['bye', 'goodbye', 'see you', 'later', 'quit'],
    responses: [
      "See you later! 👋 Keep reporting and keep that streak alive! 🔥",
      "Goodbye! Remember — every clean street starts with one report. 🌱 See you next time!",
    ]
  },
];

// ── POST /api/chatbot ─────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { message, history = [] } = req.body;
    if (!message || !message.trim()) return res.json({ response: 'Please type a message!' });

    const lower = message.toLowerCase();

    // ── Tier 1: FAQ keyword matching (multi-keyword scoring) ──
    let bestMatch = null;
    let bestScore = 0;

    for (const faq of FAQ) {
      const score = faq.keywords.filter(kw => lower.includes(kw)).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = faq;
      }
    }

    if (bestMatch && bestScore > 0) {
      const response = pick(bestMatch.responses);
      supabase.from('chat_history').insert([
        { user_id: req.user.id, role: 'user', content: message },
        { user_id: req.user.id, role: 'assistant', content: response }
      ]).then(() => {}).catch(() => {});
      return res.json({ response });
    }

    // ── Tier 2: OpenAI GPT fallback ──
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.startsWith('sk-')) {
      try {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are the CityPulse AI assistant — a knowledgeable, friendly chatbot for CityPulse, a gamified civic garbage reporting platform. 

KEY PLATFORM FEATURES:
- Users submit garbage/waste reports with photos, location pins, and severity levels
- Reports earn XP (10 for submitting, 50 for admin approval)
- Daily login rewards escalate over 7 days (25-150 coins, Day 7 gives bonus theme)
- EcoCoins buy cosmetics in the Premium Market (themes, borders, titles, badges)
- Heatmap shows complaint density (red=high, green=clean)
- Leaderboard ranks users by XP (opt-in)
- Area Scores rate neighborhood cleanliness (0-100)
- Badges unlock at milestones (1 report, 5 reports, 500 XP, 1000 XP)
- Comments on public reports support images

ENVIRONMENTAL KNOWLEDGE:
- You know waste segregation, recycling, composting, e-waste disposal, hazardous waste
- You promote environmental awareness and sustainability
- You can share eco-tips, fun facts, and motivational content

BEHAVIOR:
- Be warm, concise, and helpful
- Use emojis naturally but not excessively
- Give specific, actionable answers
- If asked about unrelated topics, briefly answer then redirect to platform/eco topics
- Never say "I don't understand" — always provide a helpful response
- Vary your language — don't repeat the same phrases`
            },
            ...history.slice(-6),
            { role: 'user', content: message }
          ],
          max_tokens: 300
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

    // ── Tier 3: Smart fallback (varied responses) ──
    const fallbacks = [
      "That's an interesting question! While I'm most knowledgeable about CityPulse and waste management, try asking me about:\n• 📋 How to submit reports\n• 🪙 EcoCoins & daily rewards\n• ♻️ Recycling & composting tips\n• 🗺️ Using the heatmap\n• 🏆 Leaderboard & badges",
      "I'd love to help with that! My expertise is in CityPulse features and environmental topics. Here are some things I can help with:\n• How XP and levels work\n• Daily reward schedule\n• Waste segregation tips\n• Store & inventory guide\n• Fun eco facts!",
      "Great question! I specialize in CityPulse platform help and eco-awareness. Try asking me 'how do I earn coins?', 'give me a recycling tip', or 'what's my daily reward?' 🌱",
    ];
    const response = pick(fallbacks);
    supabase.from('chat_history').insert([
      { user_id: req.user.id, role: 'user', content: message },
      { user_id: req.user.id, role: 'assistant', content: response }
    ]).then(() => {}).catch(() => {});
    res.json({ response });

  } catch (err) {
    res.json({ response: "Oops, something went wrong on my end! Try asking about reports, XP, or recycling tips. 🌿" });
  }
});

// ── GET /api/chatbot/history ──────────────────────────────────────────────────
router.get('/history', authenticate, async (req, res) => {
  const { data } = await supabase
    .from('chat_history').select('*')
    .eq('user_id', req.user.id)
    .order('timestamp', { ascending: true })
    .limit(50);
  res.json(data || []);
});

module.exports = router;
