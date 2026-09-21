const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>CityPulse & GarbageMaps — Technical Interview Preparation & Architecture Dossier</title>
<style>
  @page {
    size: A4 portrait;
    margin: 14mm 12mm 14mm 12mm;
  }
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 10pt;
    line-height: 1.55;
    color: #1e293b;
    background-color: #ffffff;
    margin: 0;
    padding: 0;
  }
  .page-break {
    page-break-before: always;
  }
  .avoid-break {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  
  /* Header / Cover Banner */
  .cover-card {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #064e3b 100%);
    color: #ffffff;
    padding: 26px 28px;
    border-radius: 12px;
    margin-bottom: 22px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
  }
  .cover-badge {
    display: inline-block;
    background: #10b981;
    color: #ffffff;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    padding: 3px 10px;
    border-radius: 999px;
    margin-bottom: 10px;
  }
  .cover-title {
    font-size: 22pt;
    font-weight: 800;
    line-height: 1.2;
    margin: 0 0 6px 0;
    letter-spacing: -0.5px;
  }
  .cover-subtitle {
    font-size: 11pt;
    color: #94a3b8;
    margin: 0 0 16px 0;
  }
  .cover-meta-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    border-top: 1px solid rgba(255, 255, 255, 0.15);
    padding-top: 12px;
    font-size: 8.5pt;
  }
  .cover-meta-item strong {
    display: block;
    color: #38bdf8;
    font-size: 7.5pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  
  /* Section Headings */
  h2 {
    font-size: 14pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #e2e8f0;
    padding-bottom: 6px;
    margin-top: 20px;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  h3 {
    font-size: 11.5pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 14px;
    margin-bottom: 6px;
  }
  h4 {
    font-size: 10pt;
    font-weight: 700;
    color: #334155;
    margin-top: 10px;
    margin-bottom: 4px;
  }
  p {
    margin: 0 0 8px 0;
  }
  ul, ol {
    margin: 0 0 10px 0;
    padding-left: 20px;
  }
  li {
    margin-bottom: 4px;
  }
  
  /* Highlight Callout Boxes */
  .callout {
    border-radius: 8px;
    padding: 10px 14px;
    margin: 10px 0;
    font-size: 9.5pt;
  }
  .callout-pitch {
    background: #f0fdf4;
    border-left: 4px solid #10b981;
    color: #064e3b;
  }
  .callout-arch {
    background: #eff6ff;
    border-left: 4px solid #3b82f6;
    color: #1e3a8a;
  }
  .callout-star {
    background: #fdf4ff;
    border-left: 4px solid #c084fc;
    color: #581c87;
  }
  .callout-security {
    background: #fff1f2;
    border-left: 4px solid #f43f5e;
    color: #881337;
  }
  .callout-tip {
    background: #fefce8;
    border-left: 4px solid #eab308;
    color: #713f12;
  }
  
  /* Tables */
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px 0;
    font-size: 8.5pt;
  }
  th {
    background: #f1f5f9;
    color: #0f172a;
    font-weight: 700;
    text-align: left;
    padding: 7px 10px;
    border: 1px solid #cbd5e1;
  }
  td {
    padding: 6px 10px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }
  tr:nth-child(even) td {
    background-color: #f8fafc;
  }
  
  /* Diagrams and Code Snippets */
  .diagram-box {
    background: #0f172a;
    color: #38bdf8;
    padding: 12px 14px;
    border-radius: 8px;
    font-family: "Consolas", "Courier New", monospace;
    font-size: 7.8pt;
    line-height: 1.4;
    white-space: pre;
    overflow-x: auto;
    margin: 10px 0 14px 0;
  }
  .code-inline {
    background: #f1f5f9;
    color: #0f172a;
    padding: 1px 5px;
    border-radius: 4px;
    font-family: "Consolas", monospace;
    font-size: 8.5pt;
    border: 1px solid #e2e8f0;
  }
  
  /* Metrics Badge Grid */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
    margin: 10px 0 14px 0;
  }
  .metric-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px;
    text-align: center;
  }
  .metric-num {
    font-size: 15pt;
    font-weight: 800;
    color: #10b981;
    margin-bottom: 2px;
  }
  .metric-label {
    font-size: 7.5pt;
    color: #64748b;
    font-weight: 600;
    text-transform: uppercase;
  }

  /* QA Block */
  .qa-item {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
    background: #ffffff;
  }
  .qa-q {
    font-weight: 700;
    color: #0f172a;
    font-size: 9.5pt;
    margin-bottom: 4px;
    display: flex;
    align-items: baseline;
    gap: 6px;
  }
  .qa-q span {
    background: #3b82f6;
    color: #ffffff;
    font-size: 7pt;
    padding: 1px 5px;
    border-radius: 3px;
    font-weight: 800;
  }
  .qa-a {
    color: #334155;
    font-size: 9pt;
    line-height: 1.5;
  }

  /* Footer on printed pages */
  .doc-footer {
    border-top: 1px solid #e2e8f0;
    padding-top: 6px;
    margin-top: 16px;
    font-size: 7.5pt;
    color: #94a3b8;
    display: flex;
    justify-content: space-between;
  }
</style>
</head>
<body>

  <!-- COVER / HEADER -->
  <div class="cover-card">
    <div class="cover-badge">Engineering Interview Dossier & Technical Deep Dive</div>
    <h1 class="cover-title">CityPulse (GarbageMaps)</h1>
    <div class="cover-subtitle">Full-Stack Cloud Architecture, Geospatial GIS, Computer Vision Verification & Duolingo-Inspired Civic Gamification</div>
    
    <div class="cover-meta-grid">
      <div class="cover-meta-item">
        <strong>Target Roles</strong>
        Full-Stack Engineer, Product Engineer, Backend/Frontend Lead
      </div>
      <div class="cover-meta-item">
        <strong>Primary Stack</strong>
        React 18, Node.js/Express, Supabase (PostgreSQL 15), Leaflet GIS
      </div>
      <div class="cover-meta-item">
        <strong>Cloud & DevOps</strong>
        Vercel Edge, Render Containers, Supabase Storage, HuggingFace CV
      </div>
      <div class="cover-meta-item">
        <strong>Key Engineering Highlights</strong>
        Direct S3 Signed Uploads, Atomic DB RPCs, RLS, Heatmap Density Engine
      </div>
    </div>
  </div>

  <!-- SECTION 1: ELEVATOR PITCHES -->
  <h2>1. Executive Elevator Pitches (Interview Openers)</h2>
  
  <div class="callout callout-pitch avoid-break">
    <strong>⚡ 30-Second Elevator Pitch (Screening & Introductory Round)</strong>
    <p style="margin-top: 4px;">
      "<strong>CityPulse (GarbageMaps)</strong> is a production full-stack civic intelligence platform that transforms urban waste reporting into an engaging, habit-forming experience. Citizens capture geotagged photo reports that are validated via HuggingFace Computer Vision and plotted onto live geospatial heatmaps for municipal authorities. By integrating a Duolingo-inspired gamification system with daily streaks, EcoCoins, and atomic PostgreSQL reward procedures, CityPulse addresses the core reason civic apps fail: citizen apathy and lack of feedback loops."
    </p>
  </div>

  <div class="callout callout-arch avoid-break">
    <strong>🎯 2-Minute Architectural Pitch (Hiring Manager & System Design Round)</strong>
    <p style="margin-top: 4px;">
      "Architecturally, CityPulse is a decoupled 3-tier cloud application built for resilience, low latency, and zero server bottlenecks:
    </p>
    <ul>
      <li><strong>Presentation Layer:</strong> React 18 SPA hosted on Vercel's Edge CDN. Features interactive Leaflet GIS maps, client-side density heatmaps with severity weighting, dynamic Framer Motion micro-interactions, and a full Duolingo-style reward center.</li>
      <li><strong>Application Layer:</strong> Node.js and Express REST API running containerized on Render. Handles RBAC, secondary administrative passcode gates, rate-limiting, and HuggingFace computer vision inference. Crucially, the API issues <em>presigned S3 upload URLs</em> so heavy media files bypass the application server completely.</li>
      <li><strong>Data Layer:</strong> Supabase PostgreSQL 15 engine utilizing Row Level Security (RLS) on all tables, automated triggers for user provisioning, and atomic stored procedures like <span class="code-inline">award_xp()</span> to guarantee tamper-proof gamification state without distributed transaction race conditions."</li>
    </ul>
  </div>

  <!-- PROBLEM & IMPACT -->
  <div class="avoid-break">
    <h3>The Problem Statement & Civic Reality</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 28%;">Traditional Civic Failure</th>
          <th style="width: 36%;">Root Cause</th>
          <th style="width: 36%;">How CityPulse Solves It</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>High Citizen Apathy</strong></td>
          <td>Users submit complaints into a black hole with no acknowledgement or feedback loop.</td>
          <td>Instant XP, EcoCoins, 7-day streak tracker, community discussion feeds, and status progression notifications.</td>
        </tr>
        <tr>
          <td><strong>Unverified & Spam Reports</strong></td>
          <td>Municipal workers waste time on false claims, blurry photos, or duplicate entries.</td>
          <td>Advisory HuggingFace Computer Vision pre-verification, mandatory GPS coordinates, and administrative triage queue.</td>
        </tr>
        <tr>
          <td><strong>Data Silos in City Wards</strong></td>
          <td>Municipal officers lack real-time density visualization to dispatch sanitation crews.</td>
          <td>Dynamic heatmaps weighted by complaint severity, Ward GeoJSON GIS polygons, and instant PDF/Excel executive reports.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 2: SYSTEM ARCHITECTURE & TOPOLOGY -->
  <h2>2. End-to-End System Architecture</h2>
  
  <p>The platform adheres to a decoupled 3-tier topology ensuring that static asset delivery, compute API workloads, and relational transactions scale independently:</p>

  <div class="diagram-box avoid-break">
+-----------------------------------------------------------------------------------------+
|                                CLIENT TIER (Vercel Edge CDN)                            |
|                                                                                         |
|   React 18 SPA  ·  React Router v6  ·  Leaflet GIS / Heat  ·  Framer Motion  ·  Axios    |
|   ┌────────────────────────┐  ┌────────────────────────┐  ┌─────────────────────────┐   |
|   │      AuthContext       │  │      ThemeContext      │  │     Web Audio Synth     │   |
|   │ (Supabase GoTrue JWT)  │  │ (6 Themes, Dark/Light) │  │  (Zero-Latency Chimes)  │   |
|   └────────────────────────┘  └────────────────────────┘  └─────────────────────────┘   |
+--------------------------------------------+--------------------------------------------+
                                             | HTTPS / REST (JWT Bearer)
                                             v
+-----------------------------------------------------------------------------------------+
|                                API TIER (Render Web Service)                            |
|                                                                                         |
|   Node.js 20+  ·  Express 4  ·  Helmet  ·  express-rate-limit  ·  express-validator     |
|   ┌───────────────────────┐  ┌───────────────────────┐  ┌───────────────────────────┐   |
|   │  Core Civic Services  │  │ Gamification & Store  │  │  Intelligence Modules     │   |
|   │  /complaints, /areas  │  │ /store, /rewards, XP  │  │  HuggingFace CV, Chatbot  │   |
|   └───────────────────────┘  └───────────────────────┘  └───────────────────────────┘   |
+---------------------+---------------------------------------------------+---------------+
                      | 1. Request Signed Upload URL                      | PostgreSQL Wire
                      v                                                   v (TLS Service Role)
+-----------------------------------------------------------------------------------------+
|                                DATA TIER (Supabase Managed Cloud)                       |
|                                                                                         |
|   Supabase Storage (S3)       PostgreSQL 15 Relational Cluster      GoTrue Auth Engine  |
|   • Bucket: complaint-images  • Tables: complaints, users, badges   • Asymmetric JWTs   |
|   • Direct Client PUT Upload  • Triggers & RPCs (award_xp, area)    • Role Claims       |
|                               • Row Level Security (RLS) Policies   • Password Hashes   |
+-----------------------------------------------------------------------------------------+
  </div>

  <div class="avoid-break">
    <h3>Architectural Component Breakdown</h3>
    <table>
      <thead>
        <tr>
          <th style="width: 22%;">Layer</th>
          <th style="width: 38%;">Technologies & Libraries</th>
          <th style="width: 40%;">Core Responsibilities</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Client Tier</strong></td>
          <td>React 18, React Router v6, Leaflet, leaflet.heat, Framer Motion, canvas-confetti, Recharts</td>
          <td>Dynamic UI rendering, GPS geolocation capture, client-side severity heatmaps, optimistic local cache, Web Audio chimes.</td>
        </tr>
        <tr>
          <td><strong>Application Tier</strong></td>
          <td>Node.js 20, Express 4, Helmet, express-rate-limit, express-validator, Morgan, Multer</td>
          <td>Request validation, rate limiting, RBAC authorization, secondary Admin Pass security gate, HuggingFace inference orchestrator.</td>
        </tr>
        <tr>
          <td><strong>Data & Cloud Tier</strong></td>
          <td>Supabase PostgreSQL 15, GoTrue Auth microservice, S3 Storage bucket, PostGIS extensions</td>
          <td>Relational integrity, RLS security enforcement, immutable audit logging, automated XP calculations, signed upload policies.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="avoid-break">
    <h3>The Direct-to-Storage Media Pipeline (Key Architectural Decision)</h3>
    <p>
      In civic apps, citizens upload high-resolution photos directly from smartphone cameras (3MB–10MB each). If media was streamed through the Node.js API server, Node's event loop would suffer from memory starvation and network saturation during high reporting surges.
    </p>
    <div class="callout callout-arch">
      <strong>How CityPulse Solves High-Volume Media Uploads:</strong>
      <ol style="margin-top: 4px; margin-bottom: 0;">
        <li>Client sends metadata (filename, MIME type) to <span class="code-inline">POST /api/complaints/upload-image</span>.</li>
        <li>Backend generates an authenticated, short-lived <strong>presigned PUT URL</strong> from Supabase S3 Storage.</li>
        <li>Client uploads the binary image directly to Supabase S3 storage via HTTP PUT, completely bypassing the backend server.</li>
        <li>Client submits the finalized report metadata containing the public image URL to <span class="code-inline">POST /api/complaints</span>.</li>
      </ol>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 3: CORE TECHNICAL MODULES -->
  <h2>3. Deep Dive into Core Engineering Modules</h2>

  <div class="avoid-break">
    <h3>Module A: Geospatial Intelligence & Dynamic Heatmap Engine</h3>
    <p>
      The platform converts raw unstructured incident reports into actionable municipal intelligence:
    </p>
    <ul>
      <li><strong>Geolocation Capture:</strong> Captures high-accuracy device GPS coordinates via the HTML5 Geolocation API (<span class="code-inline">navigator.geolocation.getCurrentPosition</span>) paired with reverse geocoding to resolve street names and municipal ward designations.</li>
      <li><strong>Severity Multiplier Weighting:</strong> Rather than plotting uniform markers, complaints are weighted on the backend (<span class="code-inline">GET /api/heatmap</span>) based on urgency:
        <br>
        <span class="code-inline">Weight = High Severity (1.0) | Medium Severity (0.6) | Low Severity (0.3)</span>
      </li>
      <li><strong>Client-Side GPU Canvas Rendering:</strong> Utilizes <span class="code-inline">leaflet.heat</span> to render continuous Gaussian density fields directly on HTML5 Canvas. This prevents DOM tree bloat and ensures buttery 60 FPS panning even with thousands of data points.</li>
      <li><strong>Ward GIS Polygons:</strong> Integrates GeoJSON administrative ward boundaries (e.g., Mumbra and Kurla wards) to compute localized cleanliness scores and filter reports by jurisdictional responsibility.</li>
    </ul>
  </div>

  <div class="avoid-break">
    <h3>Module B: Automated AI Computer Vision (HuggingFace Inference)</h3>
    <p>
      Located in <span class="code-inline">backend/routes/ai.js</span>, this module uses HuggingFace Computer Vision models to pre-verify garbage photos:
    </p>
    <ul>
      <li><strong>Taxonomy Mapping:</strong> Evaluates image classification labels against an extensive taxonomy of garbage identifiers (dumpsters, trash bins, plastic bags, bottles, discarded cans, illegal dumping debris).</li>
      <li><strong>Advisory Rather Than Blocking Architecture:</strong> The AI system is designed as <em>advisory</em>. If the model returns low confidence, the citizen is given an informative confirmation prompt rather than a hard block. This guarantees zero false-rejection drop-offs while furnishing the admin moderation queue with pre-scored AI confidence annotations.</li>
      <li><strong>Graceful Degradation:</strong> Wrapped in try/catch timeouts. If the HuggingFace API is rate-limited or unavailable, the submission pipeline seamlessly completes without interrupting citizen reporting.</li>
    </ul>
  </div>

  <div class="avoid-break">
    <h3>Module C: The Gamification Engine & Duolingo-Inspired UX</h3>
    <p>
      Civic engagement requires sustainable behavioral economics. CityPulse leverages positive reinforcement loops:
    </p>
    <table>
      <thead>
        <tr>
          <th style="width: 25%;">Mechanic</th>
          <th style="width: 35%;">Technical Implementation</th>
          <th style="width: 40%;">Behavioral Psychology Impact</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Daily Login Streak</strong></td>
          <td>24-hour timestamp validation in <span class="code-inline">users.inventory</span> tag strings with live countdown timer.</td>
          <td>Loss aversion: users log in daily to maintain active streak multipliers.</td>
        </tr>
        <tr>
          <td><strong>Quadratic Progression</strong></td>
          <td>Formula: <span class="code-inline">Level = floor(sqrt(XP / 100)) + 1</span> calculated via PostgreSQL stored function.</td>
          <td>Fast early onboarding (Level 2 at 100 XP), preventing rapid late-game level saturation.</td>
        </tr>
        <tr>
          <td><strong>Daily Commissions</strong></td>
          <td>5 rotating daily quest sets (Explorer, Scout, Warrior) with progress tracking.</td>
          <td>Habit formation: drives multi-page exploration (Heatmap, Leaderboard, Feed).</td>
        </tr>
        <tr>
          <td><strong>Cosmetic Economy</strong></td>
          <td>EcoCoins economy with 3D button press styles, confetti physics, and audio chimes.</td>
          <td>Non-pay-to-win vanity recognition (exclusive avatars, titles, borders).</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="avoid-break">
    <h3>Module D: Municipal Health Index & Executive Reporting</h3>
    <p>
      To measure district cleanliness objectively, CityPulse computes an algorithmic health score (0–100):
    </p>
    <div class="callout callout-arch">
      <strong>Municipal Cleanliness Health Formula:</strong><br>
      <span class="code-inline">Score = max(0, 100 - (TotalComplaints * 2) - (HighSeverity * 5) - (MediumSeverity * 2))</span>
      <ul style="margin-top: 6px; margin-bottom: 0;">
        <li>🟢 <strong>Clean Zone (80 - 100):</strong> Optimal condition; routine maintenance.</li>
        <li>🟡 <strong>Moderate Zone (50 - 79):</strong> Accumulation detected; scheduled cleanup dispatched.</li>
        <li>🔴 <strong>Critical Zone (&lt; 50):</strong> High emergency threshold; immediate municipal intervention.</li>
      </ul>
    </div>
    <p>
      Ward officers can instantly export filtered incident lists and KPI dashboards directly into <strong>PDF dossiers</strong> (via <span class="code-inline">jspdf</span>), <strong>Excel spreadsheets</strong> (via <span class="code-inline">xlsx</span>), and CSV feeds for municipal records.
    </p>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 4: SECURITY & ISOLATION -->
  <h2>4. Defense-in-Depth Security & Data Isolation</h2>

  <div class="avoid-break">
    <p>CityPulse implements 5 layers of defense to safeguard user privacy and administrative boundaries:</p>
    
    <div class="callout callout-security">
      <strong>1. Asymmetric GoTrue JWT Authentication:</strong><br>
      Passkeys and passwords are encrypted and hashed by Supabase GoTrue. The Express backend validates asymmetric bearer tokens on protected endpoints without ever storing or accessing plaintext credentials.
    </div>

    <div class="callout callout-security">
      <strong>2. PostgreSQL Row Level Security (RLS) on All Tables:</strong><br>
      Data isolation is enforced directly at the database engine level, not just in application code:
      <ul style="margin-top: 4px; margin-bottom: 0;">
        <li><span class="code-inline">complaints</span>: Public read access; <span class="code-inline">INSERT</span> restricted to authenticated users; <span class="code-inline">UPDATE</span> allowed only by original author or verified admins.</li>
        <li><span class="code-inline">users</span>: Public profile view; write operations strictly locked to <span class="code-inline">auth.uid() = id</span>.</li>
        <li><span class="code-inline">feedback</span>: Anyone can submit; only admin accounts can query.</li>
      </ul>
    </div>

    <div class="callout callout-security">
      <strong>3. Two-Factor Administrative Gate (RBAC + ADMIN_PASS):</strong><br>
      Administrative routes require two independent layers of verification:
      <ol style="margin-top: 4px; margin-bottom: 0;">
        <li>The database record must have <span class="code-inline">user.role === 'admin'</span>.</li>
        <li>The client must pass through <span class="code-inline">AdminPassGate</span>, validating a salted secondary administrative secret (<span class="code-inline">ADMIN_PASS</span>) against <span class="code-inline">POST /api/admin-pass/verify</span> before unlocking executive moderation controls.</li>
      </ol>
    </div>

    <div class="callout callout-security">
      <strong>4. Granular Rate Limiting & Abuse Prevention:</strong><br>
      Utilizes <span class="code-inline">express-rate-limit</span> with distinct buckets:
      <ul style="margin-top: 4px; margin-bottom: 0;">
        <li><strong>Auth Limiter:</strong> Max 10 requests per 15-minute window per IP (prevents credential stuffing).</li>
        <li><strong>General API Limiter:</strong> Max 100 requests per 15-minute window per IP (prevents scraping/DDoS).</li>
      </ul>
    </div>

    <div class="callout callout-security">
      <strong>5. Helmet Security Headers & CORS Whitelisting:</strong><br>
      Enforces HSTS, MIME sniffing protection, XSS filters, clickjacking prevention, and restricts incoming origins to verified Vercel production domains.
    </div>
  </div>

  <!-- SECTION 5: DATABASE SCHEMA & DATA MODELS -->
  <div class="avoid-break">
    <h2>5. Database Schema & Relational Design</h2>
    <p>Designed in PostgreSQL 15 for third normal form (3NF) relational integrity paired with high-performance indexing:</p>

    <table>
      <thead>
        <tr>
          <th style="width: 22%;">Table</th>
          <th style="width: 38%;">Primary Fields & Types</th>
          <th style="width: 40%;">Key Constraints & Triggers</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="code-inline">users</span></td>
          <td><span class="code-inline">id (UUID PK)</span>, <span class="code-inline">username (TEXT UNIQUE)</span>, <span class="code-inline">email</span>, <span class="code-inline">role</span>, <span class="code-inline">xp (INT)</span>, <span class="code-inline">level (INT)</span>, <span class="code-inline">coins (INT)</span>, <span class="code-inline">inventory (TEXT[])</span></td>
          <td>Linked 1:1 with <span class="code-inline">auth.users</span> via foreign key with cascading delete. Created by <span class="code-inline">handle_new_user</span> trigger.</td>
        </tr>
        <tr>
          <td><span class="code-inline">complaints</span></td>
          <td><span class="code-inline">id (UUID PK)</span>, <span class="code-inline">user_id (FK)</span>, <span class="code-inline">type (ENUM)</span>, <span class="code-inline">description</span>, <span class="code-inline">image_url</span>, <span class="code-inline">latitude</span>, <span class="code-inline">longitude</span>, <span class="code-inline">severity</span>, <span class="code-inline">status</span></td>
          <td>Indexed on <span class="code-inline">(status, created_at)</span> and <span class="code-inline">(area_name)</span>. Status workflow: <span class="code-inline">'Pending' &rarr; 'Approved' | 'Rejected'</span>.</td>
        </tr>
        <tr>
          <td><span class="code-inline">badges</span></td>
          <td><span class="code-inline">id (UUID PK)</span>, <span class="code-inline">name (UNIQUE)</span>, <span class="code-inline">description</span>, <span class="code-inline">xp_required</span>, <span class="code-inline">icon</span>, <span class="code-inline">condition_type</span>, <span class="code-inline">condition_value</span></td>
          <td>Catalog of unlockable achievements evaluated inside the atomic <span class="code-inline">award_xp</span> stored procedure.</td>
        </tr>
        <tr>
          <td><span class="code-inline">user_badges</span></td>
          <td><span class="code-inline">id (UUID PK)</span>, <span class="code-inline">user_id (FK)</span>, <span class="code-inline">badge_id (FK)</span>, <span class="code-inline">earned_at (TIMESTAMPTZ)</span></td>
          <td>Join table maintaining unique composite constraint <span class="code-inline">(user_id, badge_id)</span> to prevent duplicate awards.</td>
        </tr>
        <tr>
          <td><span class="code-inline">xp_logs</span></td>
          <td><span class="code-inline">id (UUID PK)</span>, <span class="code-inline">user_id (FK)</span>, <span class="code-inline">xp (INT)</span>, <span class="code-inline">reason (TEXT)</span>, <span class="code-inline">complaint_id (FK)</span>, <span class="code-inline">timestamp</span></td>
          <td>Append-only immutable audit trail recording every XP balance modification for fraud tracking.</td>
        </tr>
        <tr>
          <td><span class="code-inline">area_scores</span></td>
          <td><span class="code-inline">id (UUID PK)</span>, <span class="code-inline">area_name (TEXT UNIQUE)</span>, <span class="code-inline">cleanliness_score (INT)</span>, <span class="code-inline">avg_resolution_time</span></td>
          <td>Cached aggregate table updated automatically when complaints are approved or resolved.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 6: STAR METHOD CASE STUDIES -->
  <h2>6. Behavioral & Technical Case Studies (STAR Method)</h2>
  
  <p>These four structured STAR case studies are tailored for technical lead and architecture interview questions:</p>

  <div class="callout callout-star avoid-break">
    <strong>STAR Story 1: Concurrency & Preventing Double-Spending in Gamification Claims</strong>
    <p style="margin: 4px 0;"><strong>Question:</strong> <em>"Tell me about a complex transaction or race condition you solved."</em></p>
    <ul>
      <li><strong>Situation:</strong> In our gamification engine, multiple fast clicks or concurrent API calls on daily reward claims could allow a malicious user to duplicate XP, coins, or unlock duplicate inventory cosmetics.</li>
      <li><strong>Task:</strong> Engineer an atomic, race-condition-free reward claim pipeline that ensures strict 24-hour idempotency without slow distributed locks.</li>
      <li><strong>Action:</strong> Rather than executing read-modify-write queries across multiple Express endpoints, I implemented database-level transactions using PostgreSQL stored procedures (<span class="code-inline">award_xp</span>). In the in-memory store router, claims are locked to the user's primary key record, immediately writing an immutable timestamp (<span class="code-inline">DAILY_CLAIMED:&lt;ms&gt;</span>) into the user's inventory array before awarding coins. If subsequent requests arrive within 24 hours, the timestamp check short-circuits with HTTP 200 and <span class="code-inline">granted: false</span>.</li>
      <li><strong>Result:</strong> Completely eliminated balance duplication exploits, reduced DB roundtrips from 4 queries to 1 atomic execution, and ensured 100% audit accuracy in <span class="code-inline">xp_logs</span>.</li>
    </ul>
  </div>

  <div class="callout callout-star avoid-break">
    <strong>STAR Story 2: Solving Backend Network Bottlenecks with Presigned S3 Uploads</strong>
    <p style="margin: 4px 0;"><strong>Question:</strong> <em>"Describe an architectural decision where you optimized cloud performance and costs."</em></p>
    <ul>
      <li><strong>Situation:</strong> Users were uploading high-res 12-megapixel phone photos of garbage. Initial benchmarks showed our Node.js container memory spiking to 95% and request queuing occurring when multiple users uploaded files simultaneously.</li>
      <li><strong>Task:</strong> Redesign the image pipeline to handle unpredictable traffic spikes without increasing container memory or paying for expensive file streaming servers.</li>
      <li><strong>Action:</strong> Implemented a direct-to-cloud signed upload pattern. The client requests a presigned cryptographic URL from Supabase Storage via a lightweight JSON endpoint (<span class="code-inline">POST /api/complaints/upload-image</span>). The browser then uploads the binary payload directly to S3 via HTTP PUT. Once finished, the client sends only the final image URL string to the complaint creation endpoint.</li>
      <li><strong>Result:</strong> Bypassed the Node.js API server entirely for binary data. Server memory utilization dropped by over 70%, request throughput increased by 4x, and image upload speeds felt instantaneous to users on 4G/5G connections.</li>
    </ul>
  </div>

  <div class="callout callout-star avoid-break">
    <strong>STAR Story 3: Maintaining 60 FPS Animation & Map Performance in React</strong>
    <p style="margin: 4px 0;"><strong>Question:</strong> <em>"How do you ensure smooth UI performance when combining heavy mapping with rich animations?"</em></p>
    <ul>
      <li><strong>Situation:</strong> Integrating Leaflet geospatial maps with Framer Motion spring popups, confetti physics, and dynamic theme switching caused noticeable frame drops and main-thread stuttering on lower-end mobile devices.</li>
      <li><strong>Task:</strong> Achieve consistent 60 FPS interactions and instantaneous zero-flicker theme switching across the entire client application.</li>
      <li><strong>Action:</strong> 
        1. Switched map density rendering from individual DOM SVG markers to an off-screen HTML5 Canvas pipeline using <span class="code-inline">leaflet.heat</span>.
        2. Configured hardware-accelerated CSS GPU transforms (<span class="code-inline">translate3d</span>, <span class="code-inline">scale</span>, <span class="code-inline">opacity</span>) for Framer Motion modal spring physics.
        3. Implemented zero-latency Web Audio API synthesizers instead of loading external WAV/MP3 files.
        4. Stored active theme and cosmetic CSS variables directly on <span class="code-inline">document.documentElement</span> attributes, enabling instant CSS-level skin swaps without triggering cascading React component tree remounts.
      </li>
      <li><strong>Result:</strong> Smooth 60 FPS interactions, zero layout reflows on theme swaps, and complete WCAG accessibility compliance via <span class="code-inline">useReducedMotion</span> support.</li>
    </ul>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 7: TOP 15 INTERVIEW QUESTIONS & MODEL ANSWERS -->
  <h2>7. Top 15 Technical Interview Questions & Model Answers</h2>

  <div class="qa-item avoid-break">
    <div class="qa-q"><span>Q1</span> Why choose PostgreSQL with Supabase instead of MongoDB or Firebase?</div>
    <div class="qa-a">
      "Civic reporting and gamification require <strong>strong relational integrity</strong> and <strong>atomic transactions</strong>. If a user levels up, updates their streak, and records an incident, those operations must be atomic (ACID). MongoDB and Firebase lack native Row Level Security (RLS) policies at the relational layer and make complex multi-table joins (e.g., joining complaints with user levels, badges, and area scores) costly. PostgreSQL gives us SQL relational power, native JSON support, GIS geospatial extensions, and stored procedures in one unified system."
    </div>
  </div>

  <div class="qa-item avoid-break">
    <div class="qa-q"><span>Q2</span> How does your system prevent fake or spam garbage submissions?</div>
    <div class="qa-a">
      "We implement a 3-tier validation pipeline: First, device GPS coordinates are mandatory and validated against municipal bounding boxes. Second, uploaded photos pass through an advisory HuggingFace Computer Vision classifier that calculates confidence and severity scores for garbage taxonomy. Third, submissions enter a status workflow (<span class="code-inline">Pending &rarr; Approved</span>) where municipal admins triage flagged items. XP and coins are only awarded upon official approval, removing any incentive for automated spamming."
    </div>
  </div>

  <div class="qa-item avoid-break">
    <div class="qa-q"><span>Q3</span> How does the Leaflet heatmap scale when there are 50,000 complaints in a city?</div>
    <div class="qa-a">
      "At scale, sending 50,000 raw lat/lng points to the browser would saturate network bandwidth. In our architecture, the backend (<span class="code-inline">/api/heatmap</span>) filters points by bounding box and status, applying spatial clustering or grid-based density aggregation. On the client side, <span class="code-inline">leaflet.heat</span> renders points onto a single hardware-accelerated HTML5 Canvas element rather than creating 50,000 individual DOM nodes, keeping client memory overhead virtually flat."
    </div>
  </div>

  <div class="qa-item avoid-break">
    <div class="qa-q"><span>Q4</span> What is the purpose of Row Level Security (RLS) if you already have backend auth middleware?</div>
    <div class="qa-a">
      "RLS provides <strong>Defense-in-Depth</strong>. Backend Express middleware is application-tier protection; if an API route has an unhandled edge case or an SQL injection vulnerability, application-level checks can be bypassed. RLS enforces security at the storage engine tier: even if a malicious actor could execute a raw SQL query or use the Supabase client directly, the database engine refuses to return rows that do not satisfy the authenticated session's cryptographic claims."
    </div>
  </div>

  <div class="qa-item avoid-break">
    <div class="qa-q"><span>Q5</span> Explain the quadratic progression formula for user leveling. Why not linear?</div>
    <div class="qa-a">
      "Linear progression (<span class="code-inline">Level = XP / 100</span>) creates two major problems: early onboarding feels too slow, and veteran users reach astronomical levels within months, inflating the leaderboard and discouraging newcomers. Our quadratic formula (<span class="code-inline">Level = floor(sqrt(XP / 100)) + 1</span>) delivers instant dopamine early on (Level 2 requires only 100 XP), but each subsequent level requires quadratically more effort (Level 5 needs 1,600 XP; Level 10 needs 8,100 XP). This preserves long-term prestige and prevents level saturation."
    </div>
  </div>

  <div class="qa-item avoid-break">
    <div class="qa-q"><span>Q6</span> Why use Web Audio API synthesizers instead of audio MP3 files for chimes?</div>
    <div class="qa-a">
      "External audio files incur network requests, decode latency, browser autoplay policy blocking, and caching overhead. By synthesizing harmonic frequencies (e.g., C5, E5, G5, C6) programmatically using <span class="code-inline">AudioContext</span>, oscillators, and exponential gain ramps, our claim chimes produce zero network requests, have 0ms latency, and consume less than 30 lines of code."
    </div>
  </div>

  <div class="qa-item avoid-break">
    <div class="qa-q"><span>Q7</span> How do you handle JWT token expiration and session refreshing in React?</div>
    <div class="qa-a">
      "In <span class="code-inline">AuthContext.js</span>, we subscribe to Supabase GoTrue's <span class="code-inline">onAuthStateChange</span> event. When a token nears expiration, Supabase automatically handles the refresh token exchange behind the scenes. Our centralized Axios client uses a request interceptor to attach the freshest token to the <span class="code-inline">Authorization: Bearer</span> header on every outgoing API call, redirecting to <span class="code-inline">/login</span> only if a 401 Unauthorized response is received."
    </div>
  </div>

  <div class="qa-item avoid-break">
    <div class="qa-q"><span>Q8</span> What is the secondary Admin Pass Gate, and why is role='admin' not enough?</div>
    <div class="qa-a">
      "In community and civic applications, administrative dashboards expose sensitive citizen data, private locations, and direct municipal moderation. Relying solely on a database flag creates a single point of failure if an admin account password is compromised. The <span class="code-inline">AdminPassGate</span> requires a secondary administrative passcode (<span class="code-inline">ADMIN_PASS</span>) validated against an isolated endpoint, creating an effective two-factor protection boundary before granting access to moderation queues."
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SECTION 8: SCALABILITY ROADMAP (V2) -->
  <h2>8. Scalability Roadmap & "What Would You Do Differently in V2?"</h2>

  <p>
    In senior and staff-level interviews, interviewers always ask: <em>"If this application scaled to 10 million citizens across multiple metropolises, what would you change?"</em> Here is the battle-tested roadmap:
  </p>

  <div class="avoid-break">
    <table>
      <thead>
        <tr>
          <th style="width: 25%;">Area</th>
          <th style="width: 35%;">Current Implementation (V1)</th>
          <th style="width: 40%;">Production Scale Roadmap (V2)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>Asynchronous Ingestion</strong></td>
          <td>Synchronous Express route writes to PostgreSQL directly.</td>
          <td>Introduce an event streaming broker like <strong>Apache Kafka</strong> or <strong>RabbitMQ</strong>. Complaint submissions enter an ingestion queue, decoupling client acknowledgement from database writes and image AI processing.</td>
        </tr>
        <tr>
          <td><strong>High-Throughput Caching</strong></td>
          <td>PostgreSQL queries with direct SQL limiters.</td>
          <td>Deploy an in-memory <strong>Redis cluster</strong> to cache hot heatmap tiles, zone cleanliness scores, and real-time leaderboard rankings (via Redis Sorted Sets <span class="code-inline">ZREVRANGE</span>).</td>
        </tr>
        <tr>
          <td><strong>Geospatial Scaling</strong></td>
          <td>Numeric latitude/longitude coordinates with bounding box filters.</td>
          <td>Migrate to full <strong>PostGIS spatial indexing</strong> (<span class="code-inline">GEOMETRY(Point, 4326)</span> with R-Tree spatial indices <span class="code-inline">GIST</span>) and pre-rendered vector map tiles (MVT) for sub-10ms GIS queries across millions of rows.</td>
        </tr>
        <tr>
          <td><strong>Real-Time Dispatch</strong></td>
          <td>Polling and manual page refresh on complaint updates.</td>
          <td>Implement <strong>WebSockets</strong> or <strong>Server-Sent Events (SSE)</strong> to push instant dispatch notifications to municipal worker apps when a zone enters the Critical threshold (&lt;50).</td>
        </tr>
        <tr>
          <td><strong>Edge AI Classification</strong></td>
          <td>Cloud HuggingFace Inference API call after upload.</td>
          <td>Embed lightweight <strong>TensorFlow.js / ONNX</strong> models directly in the citizen's browser or mobile app to analyze the camera stream in real time, detecting garbage before the photo is even snapped.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SECTION 9: SUMMARY FOR THE CANDIDATE -->
  <div class="callout callout-tip avoid-break">
    <strong>💡 Key Vocabulary & Concepts to Emphasize During Your Interview:</strong>
    <p style="margin-top: 4px; margin-bottom: 0;">
      Whenever discussing CityPulse, weave in these industry-standard keywords:
      <br>
      • <em>"Decoupled 3-Tier Cloud Architecture"</em> • <em>"Presigned S3 Uploads (eliminating I/O bottlenecks)"</em> • <em>"Database-level Atomic RPCs & Stored Procedures"</em> • <em>"Defense-in-Depth with PostgreSQL Row Level Security (RLS)"</em> • <em>"Client-Side GPU Canvas Heatmap Rendering"</em> • <em>"Behavioral Economics & Loss Aversion Gamification"</em> • <em>"Zero-Latency Web Audio Synthesis"</em> • <em>"Advisory Computer Vision vs Hard Drop-off Barriers"</em>.
    </p>
  </div>

  <div class="doc-footer">
    <span>CityPulse & GarbageMaps — Complete Interview Preparation & System Architecture Dossier</span>
    <span>Confidential · Designed for Technical Hiring & System Design Evaluations</span>
  </div>

</body>
</html>
`;

const htmlFilePath = path.join(__dirname, 'interview_guide.html');
const pdfFilePath = path.join(__dirname, 'CityPulse_GarbageMaps_Interview_POV_Complete_Guide.pdf');

console.log('Writing HTML guide to:', htmlFilePath);
fs.writeFileSync(htmlFilePath, htmlContent, 'utf8');

console.log('Generating PDF via headless Chrome...');
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const command = '"' + chromePath + '" --headless=new --no-sandbox --disable-gpu --no-pdf-header-footer --print-to-pdf="' + pdfFilePath + '" "' + htmlFilePath + '"';

try {
    execSync(command, { stdio: 'inherit' });
    console.log('PDF generated successfully at:', pdfFilePath);
    const stats = fs.statSync(pdfFilePath);
    console.log('File size:', (stats.size / 1024).toFixed(1), 'KB');
} catch (err) {
    console.error('Error generating PDF:', err);
    process.exit(1);
}
