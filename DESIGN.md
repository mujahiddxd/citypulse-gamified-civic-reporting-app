# 🎨 GarbageMaps & CityPulse — Design System & Versatile Multi-Theme Specification

## 1. Design Philosophy & Brand Identity

**GarbageMaps (CityPulse)** is a next-generation civic reporting platform designed to transform municipal waste and crowd management into an engaging, gamified civic experience. 

The application features a **versatile dynamic theme engine** where citizens can personalize their entire visual interface based on their achievements, preferences, and unlocked rewards.

### Core Visual Principles
- **Dynamic Theming & Personalization**: The entire application transforms its look and feel via reactive CSS variables, ranging from high-urgency civic red to neon cyberpunk and calming nature tones.
- **Civic Urgency Meets Gamified Delight**: Crisp visual feedback, level-up celebration overlays, equippable animated titles, and podium rankings motivate sustained public participation.
- **Clarity in Geospatial Density**: High-contrast surfaces and custom map markers keep complex geospatial heatmaps clean, legible, and easy to interpret.
- **Accessibility & Field-Readiness**: High-contrast typography, dark/light mode parity, and touch-optimized controls (>44px touch targets) make reporting effortless in all lighting conditions.

---

## 2. Dynamic Multi-Theme Engine (`ThemeContext`)

The UI is powered by a central **`ThemeContext`** that drives the entire application by binding `[data-theme]` and `[data-mode]` attributes to `document.documentElement`. 

Styles reactively adapt through scoped CSS custom properties without requiring full page reloads or UI flickers.

### 2.1 Theme Palette Showcase

| Theme | Key Motif | Background (`--bg`) | Border Accent (`--border`) | Primary Button | Visual Vibe |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Crimson** *(Default)* | Civic Urgency | `#F8FAFC` / `#181818` | `#C62828` (Civic Red) | Red `#C62828` with glow | Authoritative, bold, official municipal action |
| **Cyberpunk 2077** | Neon Retro-Future | `#0D0020` (Dark Neon) | `#00FFFF` (Electric Cyan) | `#FF00FF` (Hot Magenta) | Futuristic, high-tech glow, neon sci-fi |
| **Deep Sea Ocean** | Oceanic Navy | `#002240` (Navy Deep) | `#1A7AB5` (Aqua Blue) | `#00C8FF` (Azure) | Professional, cool, calming aquatic palette |
| **Emerald Forest** | Eco & Sustainability | `#0F2010` (Forest Green)| `#2D8A2D` (Emerald) | `#44FF88` (Neon Mint) | Eco-warrior, nature, environmental pride |
| **Midnight Patrol** | Stealth Monochromatic| `#0F172A` (Midnight) | `#94A3B8` (Slate Silver) | `#CBD5E1` (Silver White) | Sleek, tactical, minimalist dark room aesthetic |
| **Sunset Smog** | Industrial Twilight | `#3D2A1A` (Warm Umber) | `#F59E0B` (Amber Gold) | `#F97316` (Vibrant Orange)| Sunset warmth, dusk urban skyline |

---

### 2.2 Dark & Light Mode Support (`[data-mode]`)

In addition to custom color themes, the platform supports seamless dark and light modes:
- **`[data-mode="dark"]`**: Deep blacks, elevated slate cards, glowing borders, reduced battery usage and eye strain in nighttime reporting.
- **`[data-mode="light"]`**: Clean white and light-slate surfaces optimized for high-visibility outdoor daylight use.
- **Instant Persistence**: Saved to `localStorage` for zero-flash page loads, and automatically synced to the citizen's cloud profile on login.

---

### 2.3 Equippable Cosmetic Effects & Identity Customization

Citizens can unlock and equip unique cosmetic assets through the **Civic Store & Inventory**:

1. **Equippable Profile Borders / Frames (`equipped_border`)**:
   - Custom avatar borders (e.g., Gold Champion Frame, Cyber Neon Ring, Emerald Leaf Border).
2. **Equippable Animated Titles (`equipped_title`)**:
   - Dynamic titles rendered with custom CSS keyframe animations.
   - Example — **Eco Legend Title (`effect-eco-legend`)**:
     ```css
     .effect-eco-legend {
       background: linear-gradient(90deg, #22c55e, #3b82f6, #a855f7, #22c55e);
       background-size: 300% auto;
       -webkit-background-clip: text;
       background-clip: text;
       -webkit-text-fill-color: transparent;
       animation: eco-legend-glow 5s linear infinite;
     }
     ```
3. **Equippable Civic Badges (`equipped_badge`)**:
   - Distinctive icons displayed beside usernames on the public feed and leaderboard.

---

## 3. Typography System

The interface pairs an industrial condensed display typeface with a legible geometric body typeface:

- **Display & Headings**: `Barlow Condensed` (Weights: 600, 700, 800, 900)
  - Used for: Page titles, navigation links, stat figures, button labels, badge names.
  - Characteristics: Uppercase tracking (`letter-spacing: 0.05em–0.08em`), commanding civic authority.
- **Body & Data**: `Barlow` (Weights: 300, 400, 500, 600)
  - Used for: Descriptions, table contents, form inputs, dialog text.
  - Line Height: 1.6 for comfortable readability across mobile and desktop.

---

## 4. Core Component Library

### 4.1 Theme-Aware Navigation (`Navbar.js`)
- **Top Sticky Bar** (Height: `64px`, theme-aware glassmorphic blur).
- Left: Brand icon (`🗺️`) with bold condensed title and live city status badge.
- Center: Quick links (`Map`, `Heatmap`, `Leaderboard`, `Wards`, `Store`).
- Right:
  - **Theme & Mode Quick Toggle**: One-click dark/light mode toggle.
  - **XP & Level Pill**: Displays user progress with theme accent colors.
  - **Citizen Profile**: Avatar with equipped custom border and level indicator.

### 4.2 Interactive Geospatial Maps (`SubmitComplaint.js`, `HeatmapPage.js`)
- **Map Engine**: Leaflet with OpenStreetMap tiles.
- **Theme-Adaptive Map Overlays**: Heatmap gradients blend harmoniously with the chosen theme's background palette.
- **Severity-Weighted Points**:
  - Critical / High: Radiant Red (radius: 25px, weight: 1.0).
  - Moderate / Medium: Vivid Amber (weight: 0.6).
  - Low / Resolved: Eco Green (weight: 0.3).

### 4.3 Civic Store & Inventory UI (`Store.js`, `Inventory.js`)
- **Cosmetics Grid**: Cards showcasing equippable themes, borders, and animated titles.
- **Live Preview**: Citizens can preview how a theme looks across the entire UI before purchasing.
- **One-Click Equip**: Instant state transition powered by `equipItem(type, value)` in `ThemeContext`.

### 4.4 Floating AI Civic Assistant (`ChatbotWidget.js`)
- Fixed bottom-right circular widget styled in the user's active theme accent color.
- Expandable dialog modal with chat history, contextual FAQs, and AI guidance for reporting civic violations.

---

## 5. User Journeys & Gamified UX Flows

### 5.1 Gamified Reward & Theming Loop
```
[ Submit Verified Issue ] ──► [ Earn XP & Civic Currency ]
                                      │
                                      ▼
                        [ Visit the Civic Store ]
                                      │
                                      ▼
                   [ Purchase Theme / Border / Title ]
                                      │
                                      ▼
                      [ Equip from Inventory ]
                                      │
                                      ▼
                [ Entire Web App Transforms Appearance! ]
               (Persisted to DB & Synced Across Devices)
```

### 5.2 Responsive Breakpoints
- **Mobile (< 768px)**: Collapsible drawer, full-width touch cards, GPS auto-detect button.
- **Tablet (768px – 1024px)**: Two-column responsive metric grid and split-screen map preview.
- **Desktop (> 1024px)**: High-density interactive heatmaps, multi-column analytics, and full wardrobe customization studio.
