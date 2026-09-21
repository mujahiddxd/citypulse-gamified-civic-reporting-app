# 🗺️ GarbageMaps — Smart Civic Reporting Platform

A **production-ready, full-stack, resume-level** web application for citizen-powered urban intelligence. Built with React, Node.js, Express, and Supabase.

---

## 🏗️ Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                       │
│  React Router · Leaflet Maps · Recharts · Framer Motion  │
└──────────────────────────┬───────────────────────────────┘
                           │ Axios (REST API)
┌──────────────────────────▼───────────────────────────────┐
│                   BACKEND (Node/Express)                  │
│   JWT Auth · Rate Limiting · Input Validation · CORS      │
└──────────────────────────┬───────────────────────────────┘
                           │ Supabase Client
┌──────────────────────────▼───────────────────────────────┐
│                  SUPABASE (PostgreSQL)                    │
│  Auth · Storage · RLS · PostgreSQL Functions · Triggers   │
└──────────────────────────────────────────────────────────┘
```

---

## 📁 Folder Structure

```
garbagemap/
├── backend/
│   ├── middleware/
│   │   └── auth.js           # JWT authentication + admin guard
│   ├── routes/
│   │   ├── auth.js           # Register, Login, Forgot/Reset Password
│   │   ├── complaints.js     # Submit, list, upload image
│   │   ├── admin.js          # Approve/reject, user management
│   │   ├── analytics.js      # Dashboard charts data
│   │   ├── leaderboard.js    # Top 10 users
│   │   ├── profile.js        # Public profiles, XP history
│   │   ├── chatbot.js        # OpenAI + FAQ fallback
│   │   ├── feedback.js       # Feedback submissions
│   │   ├── heatmap.js        # Heatmap data endpoint
│   │   └── areas.js          # Area cleanliness scores
│   ├── utils/
│   │   └── supabase.js       # Supabase client (service role)
│   ├── server.js             # Express app entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   └── AdminLayout.js     # Sidebar navigation
│   │   │   ├── chatbot/
│   │   │   │   └── ChatbotWidget.js   # Floating AI chatbot
│   │   │   └── ui/
│   │   │       └── Navbar.js          # Top navigation bar
│   │   ├── context/
│   │   │   └── AuthContext.js         # Auth state + Supabase client
│   │   ├── pages/
│   │   │   ├── Home.js
│   │   │   ├── Login.js               # Also exports ForgotPassword, ResetPassword
│   │   │   ├── Register.js
│   │   │   ├── ForgotPassword.js
│   │   │   ├── ResetPassword.js
│   │   │   ├── Dashboard.js
│   │   │   ├── SubmitComplaint.js
│   │   │   ├── Leaderboard.js
│   │   │   ├── Profile.js
│   │   │   ├── HeatmapPage.js
│   │   │   ├── FeedbackPage.js
│   │   │   └── admin/
│   │   │       ├── AdminDashboard.js
│   │   │       ├── AdminComplaints.js
│   │   │       ├── AdminAnalytics.js
│   │   │       ├── AdminUsers.js
│   │   │       └── AdminFeedback.js
│   │   ├── utils/
│   │   │   └── api.js                 # Axios instance + interceptors
│   │   ├── App.js                     # Routes + protected routes
│   │   ├── index.js
│   │   └── index.css                  # Complete design system
│   ├── package.json
│   └── .env.example
│
└── supabase/
    └── schema.sql             # Complete DB schema + functions + RLS
```

---

## ⚡ Quick Start

### 1. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the entire `supabase/schema.sql` file
3. Go to **Storage** → Create a bucket named `complaint-images` (set to public)
4. Copy your project URL, anon key, and service role key

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in your values in .env
npm run dev
```

`.env` values:
```
PORT=5000
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...  (service_role key)
SUPABASE_ANON_KEY=eyJ...
OPENAI_API_KEY=sk-...  (optional, for AI chatbot)
FRONTEND_URL=http://localhost:3000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
# Fill in your values
npm start
```

`.env` values:
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SUPABASE_URL=https://xxxx.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJ...
```

---

## 🔑 API Routes

### Auth
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| POST | `/api/auth/register` | No | Register new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| POST | `/api/auth/forgot-password` | No | Send reset email |
| POST | `/api/auth/reset-password` | No | Set new password |

### Complaints
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/complaints` | No | Get approved complaints |
| GET | `/api/complaints/my` | Yes | Get user's own complaints |
| POST | `/api/complaints` | Yes | Submit new complaint |
| POST | `/api/complaints/upload-image` | Yes | Get signed upload URL |

### Admin
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/admin/complaints` | Admin | All complaints with filters |
| PATCH | `/api/admin/complaints/:id/approve` | Admin | Approve + award XP |
| PATCH | `/api/admin/complaints/:id/reject` | Admin | Reject complaint |
| GET | `/api/admin/users` | Admin | All users |
| PATCH | `/api/admin/users/:id/role` | Admin | Change user role |

### Other
| Method | Route | Auth | Description |
|--------|-------|------|-------------|
| GET | `/api/leaderboard` | No | Top 10 users |
| GET | `/api/profile/:username` | No | Public profile |
| GET | `/api/heatmap` | No | Heatmap data points |
| GET | `/api/analytics/overview` | Admin | Stats overview |
| POST | `/api/chatbot` | Yes | AI chat |
| POST | `/api/feedback` | No | Submit feedback |

---

## 🎮 Gamification System

### Level Formula
```
Level = floor(sqrt(XP / 100)) + 1

Level 1: 0 XP
Level 2: 100 XP
Level 3: 400 XP
Level 4: 900 XP
Level 5: 1600 XP
```

### XP Awards
- Submit complaint: **+10 XP**
- Complaint approved: **+50 XP**

### Badges
| Badge | Condition |
|-------|-----------|
| 🌱 First Report | 1 approved report |
| ⭐ Civic Starter | 3 approved reports |
| 🏅 5 Reports | 5 approved reports |
| 🥇 10 Reports | 10 approved reports |
| 🧹 Cleanliness Champion | 500 XP |
| 🦸 Community Hero | 1000 XP |
| 🏆 City Champion | 5000 XP |

All badge unlocking happens automatically via PostgreSQL `award_xp()` function.

---

## 🗺️ Heatmap

The heatmap uses `leaflet.heat` loaded dynamically. Data points are weighted by severity:
- **High**: 1.0 intensity (red)
- **Medium**: 0.6 intensity (orange/yellow)
- **Low**: 0.3 intensity (green)

Filterable by type, severity, date range, and status.

---

## 📍 Area Cleanliness Score

```
Score = 100 − (count × 2) − (high_severity × 5) − (medium_severity × 2)
```

| Zone | Score |
|------|-------|
| 🟢 Clean | 80–100 |
| 🟡 Moderate | 50–79 |
| 🔴 Critical | < 50 |

---

## 🔒 Security Features

- JWT via Supabase Auth (auto-expiry)
- Row Level Security (RLS) on all tables
- Rate limiting (100 req/15min general, 10/15min auth)
- Input validation with express-validator (frontend + backend)
- Helmet.js security headers
- CORS configured to allowed origins only
- Password reset with automatic token expiry
- Secure file uploads via signed Supabase Storage URLs

---

## 🚀 Deployment

### Frontend — Vercel

```bash
cd frontend
npm run build
# Deploy /build folder to Vercel
# Set env vars in Vercel dashboard
```

### Backend — Railway / Render

```bash
# On Railway: connect GitHub repo
# Set environment variables in dashboard
# Start command: npm start
```

### Supabase
- Enable Email Auth in Authentication settings
- Configure email redirect URLs for password reset
- Set up Storage bucket CORS for your domain

---

## 🧰 Tech Stack Summary

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router 6 |
| Maps | React Leaflet, Leaflet.heat |
| Animations | Framer Motion |
| Charts | Recharts |
| Styling | Custom CSS Design System (dark, red civic aesthetic) |
| HTTP Client | Axios with interceptors |
| Backend | Node.js, Express 4 |
| Auth | Supabase Auth (JWT) |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| AI Chatbot | OpenAI GPT-3.5 + FAQ fallback |
| Security | Helmet, express-rate-limit, express-validator |

---

## 🎨 Design System

- **Font**: Barlow Condensed (display) + Barlow (body)
- **Primary Color**: `#C62828` (civic red)
- **Background**: `#0A0A0A` deep black
- **Cards**: `#181818` elevated dark surfaces
- **Accent**: Red glow effects, left-border stat cards

---

Built with ❤️ for smarter cities.
