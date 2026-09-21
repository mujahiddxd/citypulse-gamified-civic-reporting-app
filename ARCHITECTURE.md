# 🏛️ GarbageMaps & CityPulse — Technical Architecture & System Design

## 1. High-Level Architecture Overview

GarbageMaps (CityPulse) follows a decoupled **3-tier cloud-native architecture** designed for high availability, security, and low-latency geospatial queries:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRESENTATION TIER (CLIENT)                      │
│   React 18 · React Router v6 · Leaflet / Leaflet.heat · Framer Motion  │
│   Hosted on: Vercel CDN (Global Edge Network)                          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         HTTPS / REST API (Axios)
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        APPLICATION TIER (API)                          │
│   Node.js · Express 4 · Helmet · Rate-Limiter · Express-Validator      │
│   Hosted on: Render (Containerized Web Service)                        │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
             Signed URLs /                      PostgreSQL Client
             File Uploads                    (Service Role Connection)
                   │                                 │
┌──────────────────▼─────────────────────────────────▼───────────────────┐
│                          DATA & SERVICES TIER                          │
│                          Supabase (PostgreSQL)                         │
│   ┌───────────────────────┬───────────────────────┬────────────────┐   │
│   │   PostgreSQL Engine   │    Supabase Auth      │  Cloud Storage │   │
│   │ (RLS, Triggers, Procs)│   (GoTrue JWT Auth)   │(Bucket: Images)│   │
│   └───────────────────────┴───────────────────────┴────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Layer Breakdown

### 2.1 Presentation Tier (`/frontend`)
Built as a modern React Single-Page Application (SPA) leveraging declarative UI and geospatial libraries:

- **Routing & Guards**: `react-router-dom` v6 with protected route wrappers (`PrivateRoute`, `AdminRoute`, and `AdminPassGate`).
- **Geospatial Mapping**:
  - `leaflet` and `react-leaflet` for interactive map pinning, marker clusters, and bounding boxes.
  - `leaflet.heat` for dynamic client-side heatmaps weighted by complaint severity.
- **State & Context Management**:
  - `AuthContext`: Manages user authentication lifecycle, JWT token caching, profile data, and session persistence with Supabase Auth.
- **Data Visualization**: `recharts` for civic metrics (complaints by type, resolution rates, cleanliness trend curves).
- **HTTP Client**: Centralized Axios instance ([frontend/src/utils/api.js](file:///c:/Users/Shaban%20Chaudhary/Desktop/Projects/community%20projects/Garbage%20and%20crowd%20Management/garbagemap/frontend/src/utils/api.js)) with automatic request interceptors injecting JWT Bearer tokens.

### 2.2 Application Tier (`/backend`)
A modular Node.js Express REST API acting as the business logic and moderation layer:

- **Entry Point**: [backend/server.js](file:///c:/Users/Shaban%20Chaudhary/Desktop/Projects/community%20projects/Garbage%20and%20crowd%20Management/garbagemap/backend/server.js) initializes security headers, CORS origin verification, and route registration.
- **Middleware**:
  - `helmet`: Applies industry-standard HTTP security headers (HSTS, frameguard, XSS filter).
  - `express-rate-limit`: Prevents abuse (100 req/15min general limiter, 10 req/15min auth limiter).
  - `auth.js`: Verifies Supabase JWT tokens and extracts authenticated user identities.
  - `admin.js`: Guards administrative endpoints by checking user role permissions.
- **Route Modules**:
  | Route Prefix | Module | Purpose |
  | :--- | :--- | :--- |
  | `/api/auth` | `routes/auth.js` | User authentication, registration, password resets |
  | `/api/complaints` | `routes/complaints.js` | Complaint submission, user complaint history, media upload |
  | `/api/admin` | `routes/admin.js` | Approval/rejection workflows, user role management |
  | `/api/heatmap` | `routes/heatmap.js` | Geospatial coordinates and severity-weighted points |
  | `/api/analytics` | `routes/analytics.js` | Aggregated civic metrics and area cleanliness scores |
  | `/api/leaderboard` | `routes/leaderboard.js` | Top citizens sorted by earned XP |
  | `/api/profile` | `routes/profile.js` | Citizen profile statistics and unlocked badges |
  | `/api/chatbot` | `routes/chatbot.js` | AI assistance with FAQ fallback |
  | `/api/feedback` | `routes/feedback.js` | Citizen feedback intake |

### 2.3 Data & Services Tier (Supabase)
- **PostgreSQL Database**: Relational schema maintaining data integrity with foreign keys, cascading deletes, and check constraints.
- **Row Level Security (RLS)**: Fine-grained access control ensuring citizens can only modify their own submissions while public reports remain readable.
- **Storage**: S3-compatible Supabase Storage bucket (`complaint-images`) storing geotagged photo evidence.
- **Database Functions & Triggers**: Automated database triggers to keep gamification state in sync without requiring complex distributed transactions.

---

## 3. Data Flow & Execution Sequences

### 3.1 Complaint Submission & Image Upload Flow
```
Citizen Client                     Backend API                   Supabase Storage / DB
      │                                 │                                 │
      │── 1. POST /upload-image ───────►│                                 │
      │   (Filename, MIME type)         │── 2. Create Signed Upload URL ─►│
      │                                 │◄── 3. Return Signed URL ────────│
      │◄── 4. Signed URL Received ──────│                                 │
      │                                                                   │
      │── 5. Direct PUT Image File ──────────────────────────────────────►│
      │   (Bypasses API server for high performance)                      │
      │                                                                   │
      │── 6. POST /complaints ─────────►│                                 │
      │   (Lat, Lng, Type, Image URL)   │── 7. INSERT into complaints ───►│
      │                                 │   (Status: 'Pending')           │
      │                                 │── 8. Award +10 Submission XP ──►│
      │◄── 9. HTTP 201 Created ─────────│                                 │
```

### 3.2 Complaint Moderation & Gamification Flow
```
Admin Client                       Backend API                       PostgreSQL DB
      │                                 │                                 │
      │── 1. PATCH /admin/complaints/:id/approve                          │
      │────────────────────────────────►│                                 │
      │                                 │── 2. UPDATE complaints ────────►│
      │                                 │      SET status = 'Approved'    │
      │                                 │                                 │
      │                                 │── 3. Call award_xp(user, 50) ──►│
      │                                 │      - Increment user XP        │
      │                                 │      - Recalculate Level        │
      │                                 │      - Check Badge Conditions   │
      │                                 │      - Insert Earned Badges     │
      │◄── 4. HTTP 200 Success ─────────│◄── 5. Transaction Completed ───│
```

---

## 4. Mathematical & Business Logic Models

### 4.1 Gamification Level Formula
Levels grow quadratically with required XP, rewarding consistent long-term contributors:

$$\text{Level} = \left\lfloor\sqrt{\frac{\text{XP}}{100}}\right\rfloor + 1$$

- **Level 1**: 0 – 99 XP (Novice Citizen)
- **Level 2**: 100 – 399 XP (Active Contributor)
- **Level 3**: 400 – 899 XP (Civic Guardian)
- **Level 4**: 900 – 1599 XP (Community Leader)
- **Level 5**: 1600+ XP (City Champion)

### 4.2 Area Cleanliness Score
Calculates an objective health score (0–100) for municipal administrative zones:

$$\text{Cleanliness Score} = 100 - (\text{Count} \times 2) - (\text{High Severity} \times 5) - (\text{Medium Severity} \times 2)$$

- 🟢 **Clean Zone (80 – 100)**: Minimal issues; routine maintenance required.
- 🟡 **Moderate Zone (50 – 79)**: Noticeable accumulation; scheduled cleanup needed.
- 🔴 **Critical Zone (< 50)**: Severe dumping or crowd surge; urgent civic dispatch required.

---

## 5. Security & Isolation Architecture

1. **Authentication Boundary**: 
   - All authenticated requests carry an asymmetric JWT generated by Supabase GoTrue Auth.
   - The backend validates the JWT signature and extracts the claims before passing execution to route handlers.
2. **Role-Based Access Control (RBAC)**:
   - Users are classified as `user` or `admin`.
   - Admin routes check role claims in the database and require the secondary **Admin Pass Gate** (`ADMIN_PASS`) for sensitive administrative actions.
3. **Network Isolation**:
   - The backend connects to Supabase using the privileged `SUPABASE_SERVICE_KEY` over TLS.
   - The frontend client only has access to the restricted `REACT_APP_SUPABASE_ANON_KEY`, where all queries are gated by PostgreSQL Row Level Security (RLS) policies.
4. **CORS Hardening**:
   - Cross-Origin Resource Sharing is locked to configured client origins (`FRONTEND_URL`), disallowing unauthorized external domains.

---

## 6. Deployment Topology & Infrastructure

```
                  ┌──────────────────────┐
                  │    DNS (Domain)      │
                  └──────────┬───────────┘
                             │
            ┌────────────────┴────────────────┐
            ▼                                 ▼
   [ Vercel Edge Network ]           [ Render Web Service ]
   - Frontend React Assets           - Node.js API Service
   - Automatic SSL / CDN             - Auto-restart / Health checks
   - vercel.json SPA rewrites        - Environment configuration
            │                                 │
            └────────────────┬────────────────┘
                             ▼
                [ Supabase Managed Cloud ]
                - PostgreSQL Database
                - GoTrue Auth Engine
                - S3 Media Storage
```
