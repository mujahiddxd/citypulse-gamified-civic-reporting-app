# 🏛️ CityPulse & GarbageMaps — Complete System Architecture Specification

## 1. Executive Summary & Architectural Vision

**CityPulse (GarbageMaps)** is a production-grade, full-stack civic intelligence platform designed to bridge the gap between citizens and municipal authorities. It combines **geospatial intelligence**, **automated computer vision AI verification**, and **gamified civic incentives** to enable rapid detection, reporting, and resolution of urban garbage accumulation and crowd congestion.

### Core Architectural Goals
- **Real-Time Responsiveness**: Sub-second UI updates, instantaneous local theme/mode transitions, and live geospatial heatmaps.
- **Decoupled 3-Tier Scalability**: Independent horizontal scaling of client assets (Vercel CDN Edge), stateless API compute (Render Web Service), and relational storage (Supabase Managed Cloud).
- **Data Integrity & Gamification Consistency**: Atomic database-level transactions, stored procedures, and triggers ensuring XP, levels, and badges cannot be exploited or desynchronized.
- **Defense-in-Depth Security**: Row Level Security (RLS) on all database tables, asymmetric JWT authentication, secondary administrative gates, and hardened CORS/rate-limiting middleware.

---

## 2. High-Level System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 PRESENTATION LAYER (SPA)                               │
│                                                                                        │
│  React 18 · React Router v6 · Leaflet GIS · Recharts · Framer Motion · DotLottie React │
│                                                                                        │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌────────────────────────┐  │
│  │       AuthContext       │  │      ThemeContext       │  │      Axios Client      │  │
│  │ (Session, User, Profile)│  │(6 Themes, Dark/Light M.)│  │(JWT Interceptor, Retry)│  │
│  └─────────────────────────┘  └─────────────────────────┘  └────────────────────────┘  │
│                     Hosted on: Vercel Global Edge Network (CDN)                        │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTPS / REST (JSON)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                APPLICATION LAYER (REST API)                            │
│                                                                                        │
│           Node.js 20+ · Express 4 · Helmet · Rate Limiters · Express Validator         │
│                                                                                        │
│  ┌───────────────────────┬───────────────────────┬──────────────────────────────────┐  │
│  │ Core Civic Services   │ Gamification & Store  │ Advanced Intelligence            │  │
│  ├───────────────────────┼───────────────────────┼──────────────────────────────────┤  │
│  │ • /api/auth           │ • /api/leaderboard    │ • /api/ai (Computer Vision)      │  │
│  │ • /api/complaints     │ • /api/profile        │ • /api/wards (GeoJSON & Reports) │  │
│  │ • /api/heatmap        │ • /api/store          │ • /api/chatbot (FAQ + GPT-3.5)   │  │
│  │ • /api/areas          │ • /api/rewards        │ • /api/comments (Discussions)    │  │
│  │ • /api/analytics      │ • /api/feedback       │ • /api/admin-pass (Security Gate)│  │
│  └───────────────────────┴───────────────────────┴──────────────────────────────────┘  │
│                        Hosted on: Render Containerized Web Service                     │
└──────────────────┬─────────────────────────────────────────────────┬───────────────────┘
                   │ Direct Signed S3 Upload                         │ PostgreSQL Protocol
                   │ (Media Evidence)                                │ (Service Role TLS)
                   ▼                                                 ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DATA & CLOUD SERVICES LAYER                               │
│                                                                                        │
│                                SUPABASE (POSTGRESQL 15+)                               │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Relational PostgreSQL Engine                                                     │  │
│  │ • Tables: users, complaints, badges, user_badges, xp_logs, area_scores, etc.     │  │
│  │ • Triggers: on_auth_user_created, award_xp(), update_area_score(), auto-badges   │  │
│  │ • Row Level Security (RLS) Active Policies on ALL Tables                         │  │
│  ├───────────────────────────────────┬──────────────────────────────────────────────┤  │
│  │ GoTrue Auth Engine                │ Supabase Storage (S3-Compatible)             │  │
│  │ • Asymmetric JWT Issuance         │ • Bucket: "complaint-images" (Public)        │  │
│  │ • Role Extraction & Password Hash │ • Signed URL Direct Client Uploads           │  │
│  └───────────────────────────────────┴──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Presentation Layer Architecture (`/frontend`)

### 3.1 State & Context Architecture
- **`AuthContext`**:
  - Subscribes to Supabase GoTrue authentication state changes (`onAuthStateChange`).
  - Automatically loads and refreshes JWT session tokens in memory and `localStorage`.
  - Joins the authenticated auth record with the application's `public.users` table.
  - Exposes `user`, `session`, `loading`, `getToken()`, and `logout()`.
- **`ThemeContext`**:
  - Implements the platform's multi-theme engine across 6 palettes and Dark/Light modes.
  - Controls DOM attributes `[data-theme]` and `[data-mode]` on `document.documentElement`.
  - Manages equipped cosmetics: `equippedBorder`, `equippedTitle`, and `equippedBadge`.
  - Instant optimistic UI application via `localStorage` paired with backend database inventory synchronization (`POST /api/store/equip`).

### 3.2 Routing & Navigation Security Hierarchy
The routing tree in [App.js](file:///c:/Users/Shaban%20Chaudhary/Desktop/Projects/community%20projects/Garbage%20and%20crowd%20Management/garbagemap/frontend/src/App.js) implements strict security boundaries:
```
Public Routes (/, /login, /register, /forgot-password, /leaderboard, /heatmap, /feedback, /profile/:username)
  │
  ├── PrivateRoute (Requires Active JWT Session)
  │     ├── /dashboard (Citizen Command Center)
  │     ├── /submit (Report Filing with Geolocation)
  │     ├── /store (Cosmetics & Reward Redemptions)
  │     └── /inventory (Wardrobe & Equippable Cosmetics)
  │
  └── AdminRoute (Requires user.role === 'admin')
        │
        └── AdminPassGate (Requires Secondary Passcode Authentication)
              ├── /admin (Executive Dashboard)
              ├── /admin/complaints (Moderation & Verification Queue)
              ├── /admin/analytics (Geospatial & Category Trends)
              ├── /admin/users (Role Management & Sanctions)
              └── /admin/feedback (Citizen Feedback Triage)
```

### 3.3 Geospatial & Visual Rendering Pipeline
- **Map Engine**: Built on `leaflet` and `react-leaflet` using OpenStreetMap tiles with custom-engineered SVG and canvas markers.
- **Dynamic Density Heatmap**: Driven by `leaflet.heat`, dynamically compiling thousands of geographic coordinates weighted by complaint severity into GPU-accelerated gradient fields.
- **Data Visualizations**: Recharts rendering responsive Bar, Line, and Donut charts tracking civic cleanup velocity, complaint volumes, and ward cleanliness indices.

---

## 4. Application Layer Architecture (`/backend`)

### 4.1 Middleware Pipeline
1. **`helmet()`**: Automatically injects HTTP headers protecting against clickjacking, MIME sniffing, and cross-site scripting.
2. **`cors()`**: Configured with origin normalization, supporting comma-separated allowed domains, local development ports, and Vercel production preview URLs.
3. **`express-rate-limit`**:
   - **General Limiter**: 100 requests per 15-minute window per IP.
   - **Auth Limiter**: 10 attempts per 15-minute window per IP to eliminate credential-stuffing attacks.
4. **`express-validator`**: Pre-controller schema validation sanitizing email addresses, enforcing password entropy, and checking alphanumeric username compliance.
5. **`authenticate`**: Validates Supabase JWT Bearer headers against the Supabase GoTrue API, attaching the authenticated user and their database role to `req.user`.
6. **`requireAdmin`**: RBAC guard returning `403 Forbidden` if `req.user.role !== 'admin'`.

---

### 4.2 Module-by-Module Route Catalog

| Module | Route Prefix | Primary Endpoints | Responsibilities |
| :--- | :--- | :--- | :--- |
| **Auth** | `/api/auth` | `POST /register`<br>`POST /login`<br>`POST /forgot-password`<br>`POST /reset-password` | Credential validation, user registration, JWT generation, password resets. |
| **Complaints** | `/api/complaints` | `GET /`<br>`GET /my`<br>`POST /`<br>`POST /upload-image` | Public complaint feed, user report history, signed S3 upload URLs, submission processing (+10 XP). |
| **Admin** | `/api/admin` | `GET /complaints`<br>`PATCH /complaints/:id/approve`<br>`PATCH /complaints/:id/reject`<br>`GET /users`<br>`PATCH /users/:id/role` | Moderation queue, complaint verification, automated XP distribution (+50 XP), area recalculations, RBAC role elevation. |
| **Admin Pass** | `/api/admin-pass`| `POST /verify` | Validates secondary administrative secret (`ADMIN_PASS`), issuing salted Base64 tokens. |
| **Heatmap** | `/api/heatmap` | `GET /` | Returns filtered lat/lng pairs with severity intensity multipliers (`High: 1.0`, `Medium: 0.6`, `Low: 0.3`). |
| **Areas** | `/api/areas` | `GET /`<br>`GET /:area_name` | Serves area cleanliness health scores (0–100) and zone status classification (Clean / Moderate / Critical). |
| **Analytics** | `/api/analytics` | `GET /overview`<br>`GET /complaints-over-time`<br>`GET /type-distribution` | Computes platform KPIs, circulating XP, top problem areas, and historical trends. |
| **Leaderboard**| `/api/leaderboard`| `GET /` | Fetches top 10 users ranked by XP joined with earned badges and approved complaint counts. |
| **Profile** | `/api/profile` | `GET /:username`<br>`GET /me/xp-history` | Public profile statistics, rank, level progress percentage, and private XP transaction history. |
| **Chatbot** | `/api/chatbot` | `POST /` | 2-tier AI civic assistant: Contextual FAQ keyword matching with auto-conversation logging and OpenAI GPT-3.5 fallback. |
| **Feedback** | `/api/feedback` | `POST /`<br>`GET /` | Ingestion and admin review of citizen suggestions and bug reports. |

---

### 4.3 Advanced Intelligence & Municipal Extensions

#### A. Computer Vision Garbage Verification (`routes/ai.js`)
- **Engine**: HuggingFace Inference API utilizing an extensive ImageNet garbage taxonomy (trash cans, dumpsters, plastic bags, bottles, litter).
- **Function**: Scans uploaded photos and generates advisory verification metadata:
  - `verified`: Boolean indicating trash presence.
  - `confidence`: Probability percentage.
  - `severity`: Estimated density (Low / Medium / High).
- **Workflow**: Advisory rather than blocking—citizens can proceed with a warning, while admins receive pre-scored AI annotations in the moderation queue.

#### B. Ward GIS & Report Generation (`routes/wards.js`)
- **Geographic Modeling**: Real GeoJSON polygons for city administrative boundaries (e.g., Mumbra & Kurla wards).
- **Metrics**: Real-time aggregation of active reports per ward, assigned municipal officers, and contact directories.
- **Reporting Engine**: Server-side and client-side data serialization enabling instant exports to **PDF reports** (`jspdf`), **Excel spreadsheets** (`xlsx`), and **CSV files**.

#### C. Virtual Economy & Cosmetic Store (`routes/store.js`)
- **Virtual Currency**: Citizens earn **EcoCoins** alongside XP for verified reports.
- **Inventory Model**: Utilizes an efficient `TEXT[]` array on the `users` table storing owned items and active equipped tags:
  - Owned items: `"theme-cyberpunk"`, `"gold-frame"`
  - Equipped state: `"EQUIPPED_THEME:cyberpunk"`, `"EQUIPPED_BORDER:gold-frame"`, `"EQUIPPED_TITLE:Eco Legend"`
  - Daily login streak: `"DAILY_STREAK:7"`, `"DAILY_CLAIMED:<timestamp>"`
- **Daily Login Rewards**: 24-hour cycle granting bonus EcoCoins and XP for daily active streaks.

#### D. Civic Discussions (`routes/comments.js`)
- Threaded discussions on public reports.
- Supports **Official Update** badge highlights when municipal officers or admins post resolution status notes.

---

## 5. Data & Services Layer (`/supabase/schema.sql`)

### 5.1 Relational Schema Architecture

```
┌─────────────────────────┐             ┌─────────────────────────┐
│       auth.users        │             │      public.badges      │
│  (Supabase Auth Engine) │             ├─────────────────────────┤
└────────────┬────────────┘             │ id (PK)                 │
             │ 1:1                      │ name (UNIQUE)           │
             ▼                          │ description             │
┌─────────────────────────┐             │ xp_required             │
│      public.users       │             │ icon                    │
├─────────────────────────┤             │ condition_type          │
│ id (PK, FK auth.users)  │             │ condition_value         │
│ username (UNIQUE)       │             └────────────┬────────────┘
│ email                   │                          │ 1:N
│ role (user | admin)     │                          ▼
│ xp (DEFAULT 0)          │             ┌─────────────────────────┐
│ level (DEFAULT 1)       │             │   public.user_badges    │
│ inventory (TEXT[])      │             ├─────────────────────────┤
│ avatar_url              │             │ id (PK)                 │
│ created_at              │◄──┐         │ user_id (FK users)      │
└────────────┬────────────┘   │         │ badge_id (FK badges)    │
             │ 1:N            │         │ earned_at               │
             ▼                │         └─────────────────────────┘
┌─────────────────────────┐   │
│    public.complaints    │   │ 1:N
├─────────────────────────┤   │
│ id (PK)                 │   │         ┌─────────────────────────┐
│ user_id (FK users) ─────┼───┘         │     public.xp_logs      │
│ type (Garbage | Crowd)  │             ├─────────────────────────┤
│ description             │             │ id (PK)                 │
│ image_url               │◄────────┐   │ user_id (FK users)      │
│ latitude, longitude     │         │   │ xp                      │
│ area_name               │         │   │ reason                  │
│ severity (Low|Med|High) │         └───┤ complaint_id (FK)       │
│ status (Pending|Appr|Rej│             │ timestamp               │
│ resolution_time (mins)  │             └─────────────────────────┘
│ created_at              │
└─────────────────────────┘
```

---

### 5.2 Automated Database Triggers & Stored Procedures

#### 1. User Creation Hook (`handle_new_user`)
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```
Automatically maps new GoTrue authentication signups into `public.users`, extracting metadata usernames with zero client-side delay.

#### 2. Atomic Gamification Transaction (`award_xp`)
```sql
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_xp INTEGER,
  p_reason TEXT,
  p_complaint_id UUID DEFAULT NULL
) RETURNS VOID AS $$ ... $$
```
Executes an atomic multi-step transaction:
1. Increments `xp` on the citizen's record in `public.users`.
2. Computes the citizen's new level via `calculate_level(new_xp)`.
3. Inserts an immutable audit entry in `public.xp_logs`.
4. Evaluates all unearned badges in `public.badges`. If criteria (`xp` threshold or `approved_count`) are met, automatically unlocks the achievement in `public.user_badges`.

#### 3. Area Cleanliness Index Recalculation (`update_area_score`)
Automatically triggered on complaint approval. Aggregates all approved issues for a given `area_name`, calculates the weighted health index, computes average resolution time, and updates or inserts into `public.area_scores`.

---

## 6. Mathematical & Algorithmic Models

### 6.1 Quadratic Level Formula
To maintain sustained engagement without rapid saturation, progression requirements scale quadratically:

$$\text{Level} = \left\lfloor\sqrt{\frac{\text{XP}}{100}}\right\rfloor + 1$$

$$\text{XP Required for Level } L = (L - 1)^2 \times 100$$

| Level | Title Tier | Minimum XP Required | Delta XP to Next Level |
| :--- | :--- | :--- | :--- |
| **Level 1** | Novice Citizen | 0 XP | 100 XP |
| **Level 2** | Active Contributor | 100 XP | 300 XP |
| **Level 3** | Civic Guardian | 400 XP | 500 XP |
| **Level 4** | Community Leader | 900 XP | 700 XP |
| **Level 5** | City Champion | 1,600 XP | 900 XP |
| **Level 10**| Urban Legend | 8,100 XP | 1,900 XP |

---

### 6.2 Municipal Cleanliness Health Index
An objective score from 0 to 100 measuring the cleanliness of municipal zones:

$$\text{Cleanliness Score} = \max\left(0, 100 - (N \times 2) - (H \times 5) - (M \times 2)\right)$$

Where:
- $N$ = Total approved active complaints in the area.
- $H$ = Count of **High Severity** complaints.
- $M$ = Count of **Medium Severity** complaints.

**Zone Classification**:
- 🟢 **Clean Zone ($80 \le \text{Score} \le 100$)**: Routine maintenance schedule.
- 🟡 **Moderate Zone ($50 \le \text{Score} < 80$)**: Scheduled sanitation crew dispatch.
- 🔴 **Critical Zone ($\text{Score} < 50$)**: High-priority emergency municipal intervention.

---

## 7. Security Architecture & Threat Mitigation

1. **Authentication Token Flow**: GoTrue signs asymmetric HS256/RS256 JWTs carrying the user's UUID. The backend extracts claims using `@supabase/supabase-js` without storing raw passwords.
2. **PostgreSQL Row Level Security (RLS)**:
   - `complaints`: Public `SELECT` allowed; `INSERT` restricted to authenticated citizens; `UPDATE` restricted to submission author or verified admins.
   - `users`: Public profile `SELECT` enabled; updates restricted to `auth.uid() = id`.
   - `feedback`: Public `INSERT` allowed; `SELECT` restricted exclusively to administrative roles.
3. **Admin Pass Gate Isolation**: Administrative routes require both `user.role === 'admin'` in the database AND a salted, timestamped Base64 session token derived from the environment variable `ADMIN_PASS`.
4. **CORS & Network Boundaries**: Cross-Origin requests are strictly validated against production domains, preventing malicious third-party script exploitation.

---

## 8. Deployment & DevOps Topology

```
                  ┌─────────────────────────────────────┐
                  │          DNS / CUSTOM DOMAIN        │
                  └──────────────────┬──────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 ▼                                       ▼
    [ Vercel CDN Edge Network ]             [ Render Cloud Services ]
    • React Single Page App                 • Node.js 20+ Express API
    • Continuous Deployment from GitHub     • Auto-restart & Health Monitoring
    • vercel.json SPA Route Rewrites        • Environment Secret Management
    • Global Asset Caching                  • Automatic SSL Termination
                 │                                       │
                 └───────────────────┬───────────────────┘
                                     ▼
                      [ Supabase Managed Cloud ]
                      • PostgreSQL 15 Database Cluster
                      • Automated Daily Backups
                      • GoTrue Authentication Microservice
                      • S3-Compatible Media Storage Bucket
```
