# 🎨 GarbageMaps & CityPulse — Design System & UI/UX Specification

## 1. Design Philosophy & Brand Identity

**GarbageMaps (CityPulse)** is a smart civic reporting platform designed to transform urban maintenance from a frustrating bureaucratic task into an engaging, community-driven civic movement.

### Core Visual Principles
- **Civic Urgency**: Bold, authoritative red tones (`#C62828`) convey immediacy and civic responsibility.
- **Modern Simplicity**: Clean, high-contrast surfaces with thoughtful negative space prevent cognitive overload when viewing dense geospatial maps.
- **Gamified Delight**: Dynamic micro-animations, level-up milestones, unlocking badges, and podium rankings motivate sustained citizen engagement.
- **Accessibility & Field-Readiness**: High-contrast typography and touch-optimized controls (>44px touch targets) make mobile reporting effortless under direct sunlight.

---

## 2. Design Tokens & Visual Specs

### 2.1 Color Palette

```
Civic Red (Primary)
├── 900: #7F0000  (Deep borders, heavy contrast)
├── 800: #B71C1C  (Hover dark states)
├── 700: #C62828  ★ Primary Brand Action
├── 600: #D32F2F  (Button hover, vibrant accents)
├── 500: #E53935  (Active alerts, focus outlines)
└── 400: #EF5350  (Links, highlights)

Surfaces & Backgrounds
├── Base Background:    #F8FAFC  (Clean cool slate)
├── Elevated / Cards:   #FFFFFF  (Pure white with soft drop-shadow)
├── Section Background: #F1F5F9  (Subtle distinction)
└── Input Background:   #FFFFFF  (With #E5E7EB border)

Status & Semantic Colors
├── High Severity / Danger:  #DC2626  (Critical garbage / crowd surge)
├── Medium Severity / Alert: #D97706  (Moderate accumulation)
├── Low Severity / Clean:    #16A34A  (Cleaned / resolved / low impact)
└── Information / Pending:   #2563EB  (Civic updates, announcements)
```

### 2.2 Typography System

The interface pairs an industrial, high-impact condensed display typeface with a legible geometric body typeface:

- **Display & Headings**: `Barlow Condensed` (Weights: 600, 700, 800, 900)
  - Used for: Page titles, navigation links, stat figures, button labels, badge names.
  - Characteristics: Uppercase tracking (`letter-spacing: 0.05em–0.08em`), commanding civic authority.
- **Body & Data**: `Barlow` (Weights: 300, 400, 500, 600)
  - Used for: Descriptions, table contents, form inputs, dialog text.
  - Line Height: 1.6 for comfortable readability across mobile and desktop.

### 2.3 Elevation & Shadows

- **Default Card Shadow**: `0 1px 4px rgba(0, 0, 0, 0.07), 0 4px 16px rgba(0, 0, 0, 0.05)`
- **Interactive Card Hover**: `0 4px 24px rgba(0, 0, 0, 0.10)`
- **Civic Action Glow (Primary Button Hover)**: `0 4px 20px rgba(198, 40, 40, 0.35)`
- **Border Radius**:
  - Elements / Inputs / Buttons: `8px` (`--radius`)
  - Cards & Modal Containers: `14px` (`--radius-lg`)

---

## 3. Core Component Library

### 3.1 Navigation (`Navbar.js`)
- **Top Sticky Bar** (Height: `64px`, glassmorphic white blur `rgba(255, 255, 255, 0.95)`).
- Left: Brand icon (`🗺️`) with bold condensed title and live city status badge.
- Center: Quick links (`Map`, `Heatmap`, `Leaderboard`, `Report Issue`).
- Right:
  - **Authenticated Citizen**: XP Pill (`Level X • Y XP`), user avatar, and dropdown menu.
  - **Admin User**: Direct access badge to the Admin Gate / Dashboard.
  - **Guest**: Prominent `Log In` and `Report Issue` CTA.

### 3.2 Interactive Civic Maps (`SubmitComplaint.js`, `HeatmapPage.js`)
- **Map Engine**: Leaflet with OpenStreetMap tiles.
- **Location Pinning**: Animated dropping marker with reverse-geocoding coordinate display.
- **Dynamic Heatmap Layer**:
  - High severity issues: Red intensity (radius: 25px, blur: 15px, weight: 1.0).
  - Medium severity: Amber/Orange intensity (weight: 0.6).
  - Low severity: Green/Yellow intensity (weight: 0.3).
- **Filter Controls**: Floating pill filter bar (Type: All / Garbage / Crowd, Time range, Status).

### 3.3 Gamification & Progression Elements
- **Level & XP Progress Bars**: Smooth animated gradient bars displaying current XP progress toward the next level milestone.
- **Badge Showcase**: Visual grid of earned vs. locked badges with tooltip criteria (e.g., *First Report*, *Cleanliness Champion*, *City Hero*).
- **Leaderboard Podium**: Top 3 ranked citizen cards with gold, silver, and bronze laurel wreaths, followed by ranked tables.

### 3.4 Report Submission Form
- **Step 1: Location**: Auto-detects GPS via `navigator.geolocation` or click-to-pin.
- **Step 2: Evidence**: Camera capture or file upload preview with instant client-side thumbnail.
- **Step 3: Details**: Issue category pills (Garbage vs. Crowd Management), severity selector (Low / Medium / High), and description text area.
- **Step 4: Submission**: Confetti celebration and instant XP award popup (+10 XP).

### 3.5 Floating AI Civic Assistant (`ChatbotWidget.js`)
- Fixed bottom-right circular button with pulsing civic indicator.
- Expandable dialog modal with chat history, contextual FAQs, and AI guidance for reporting civic violations.

---

## 4. User Journeys & UX Flows

### 4.1 The 60-Second Citizen Report Flow
```
[ Open App ] ──► [ Click "Report Issue" ]
                        │
                        ▼
           [ Auto-Detect or Pin GPS ]
                        │
                        ▼
           [ Snap / Upload Photo ]
                        │
                        ▼
       [ Select Category & Severity ]
                        │
                        ▼
       [ Submit ] ──► [ +10 XP Awarded & Live on Feed ]
```

### 4.2 Verification & Admin Moderation Flow
```
[ Citizen Report ] ──► [ Pending Queue in Admin Dashboard ]
                                  │
             ┌────────────────────┴────────────────────┐
             ▼                                         ▼
      [ Click Approve ]                         [ Click Reject ]
             │                                         │
    [ Status = Approved ]                     [ Status = Rejected ]
             │                                 [ Notification sent ]
    [ +50 XP to Citizen ]
             │
   [ Trigger Badge Check ]
             │
   [ Heatmap Point Added ]
```

---

## 5. Responsive Design & Breakpoints

- **Mobile (< 768px)**:
  - Collapsible drawer navigation.
  - Stacked form inputs with full-width primary CTA buttons.
  - Touch-friendly map controls with pinch-to-zoom and GPS locate button.
- **Tablet (768px – 1024px)**:
  - Two-column dashboard metrics.
  - Side-by-side complaint preview and map layout.
- **Desktop (> 1024px)**:
  - High-density analytical charts (Recharts).
  - Admin sidebar layout with persistent filters and real-time data tables.
