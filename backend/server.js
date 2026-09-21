/**
 * server.js — Main Entry Point for the GarbageMap / CityPulse API
 * ---------------------------------------------------------------
 * This file boots the Express HTTP server and wires together all
 * middleware and route modules.
 *
 * Architecture overview:
 *   Browser (React) ──HTTP/REST──► Express (server.js)
 *                                       │
 *                   ┌───────────────────┤
 *                   ▼                   ▼
 *             Supabase DB         OpenAI API
 *
 * Startup flow:
 *   1. Load .env variables via dotenv
 *   2. Apply security middleware (Helmet, CORS, Rate limiting)
 *   3. Parse request bodies (JSON + form data, up to 10 MB)
 *   4. Log all HTTP requests with Morgan (skipped during tests)
 *   5. Mount each feature's router under /api/<feature>
 *   6. Listen on PORT (default 5000)
 */
require('dotenv').config(); // Load environment variables from backend/.env
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');   // Sets secure HTTP headers automatically
const morgan = require('morgan');   // Logs every HTTP request line with status + timing
const rateLimit = require('express-rate-limit'); // Limits request frequency per IP

// ── Route modules ──────────────────────────────────────────────────────────────
// Each file handles one feature domain and exports an Express Router.
const authRoutes = require('./routes/auth');        // Register, login, password reset
const complaintsRoutes = require('./routes/complaints');  // Submit, view complaints
const adminRoutes = require('./routes/admin');       // Approve/reject, manage users
const adminPassRoutes = require('./routes/adminpass');   // Legacy admin pass fallback
const leaderboardRoutes = require('./routes/leaderboard'); // Season-based XP leaderboard
const profileRoutes = require('./routes/profile');     // User public profiles + XP history
const chatbotRoutes = require('./routes/chatbot');     // FAQ chatbot + OpenAI fallback
const feedbackRoutes = require('./routes/feedback');    // Contact/feedback form submissions
const analyticsRoutes = require('./routes/analytics');  // Admin dashboard charts
const heatmapRoutes = require('./routes/heatmap');     // Geo data for the map heatmap layer
const areasRoutes = require('./routes/areas');       // Area cleanliness scores
const storeRoutes = require('./routes/store');       // Buy/equip items, daily reward
const statisticsRoutes = require('./routes/statistics'); // Public platform stats
const commentsRoutes = require('./routes/comments');   // Comments on public reports
const adminAuthRoutes = require('./routes/admin-auth'); // Standalone admin JWT login
const aiRoutes = require('./routes/ai');               // AI garbage photo analysis
const wardsRoutes = require('./routes/wards');         // Ward map & report generation

const app = express();

// ── Security Middleware ────────────────────────────────────────────────────────
// Helmet adds headers like X-Frame-Options, Content-Security-Policy, etc.
app.use(helmet());

const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(u => u.trim().replace(/\/$/, ''))
  .concat(['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://localhost:3002']);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, '')) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// ── Rate Limiting ──────────────────────────────────────────────────────────────
// General limit: max 500 requests per IP every 15 minutes (relaxed for dev)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes in milliseconds
  max: 500,
  message: 'Too many requests from this IP, please try again later.'
});
// Stricter limit for auth endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many authentication attempts.'
});

app.use('/api/', limiter);         // Apply general limit to all /api/* routes
app.use('/api/auth/', authLimiter);// Override with stricter limit for auth

// ── Body Parsing ───────────────────────────────────────────────────────────────
// Parses JSON request bodies (e.g. { "email": "...", "password": "..." })
// 10mb limit supports base64-encoded images sent in request body
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Request Logging ────────────────────────────────────────────────────────────
// 'combined' format logs: IP, method, path, status, response time, user-agent
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── Route Mounting ─────────────────────────────────────────────────────────────
// Mount routes with /api and root fallback to prevent 404s if /api is omitted in frontend config
const mountRoutes = (prefix = '') => {
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/complaints`, complaintsRoutes);
  app.use(`${prefix}/admin`, adminRoutes);
  app.use(`${prefix}/admin-pass`, adminPassRoutes);
  app.use(`${prefix}/leaderboard`, leaderboardRoutes);
  app.use(`${prefix}/profile`, profileRoutes);
  app.use(`${prefix}/chatbot`, chatbotRoutes);
  app.use(`${prefix}/feedback`, feedbackRoutes);
  app.use(`${prefix}/analytics`, analyticsRoutes);
  app.use(`${prefix}/heatmap`, heatmapRoutes);
  app.use(`${prefix}/areas`, areasRoutes);
  app.use(`${prefix}/store`, storeRoutes);
  app.use(`${prefix}/statistics`, statisticsRoutes);
  app.use(`${prefix}/comments`, commentsRoutes);
  app.use(`${prefix}/admin-auth`, adminAuthRoutes);
  app.use(`${prefix}/ai`, aiRoutes);
  app.use(`${prefix}/wards`, wardsRoutes);
  app.use(`${prefix}/rewards`, require('./routes/rewards'));
};

mountRoutes('/api');
mountRoutes('');

// ── Health Check ───────────────────────────────────────────────────────────────
// Simple endpoint to verify the server is running (used by monitoring tools)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Global Error Handler ───────────────────────────────────────────────────────
// If any route calls next(err) or throws, this catches it and returns 500.
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// ── Start Server ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 CityPulse API running on port ${PORT}`);
});

module.exports = app; // Exported for potential test usage
