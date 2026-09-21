/**
 * SkeletonLoader.js
 * ------------------
 * A collection of reusable skeleton primitives for every page in CityPulse.
 * Each exported component mirrors the real layout so the UI doesn't jump.
 *
 * Usage:
 *   import { SkeletonBlock, SkeletonDashboard, SkeletonLeaderboard, ... } from '../components/ui/SkeletonLoader';
 */
import React from 'react';

/* ─── Base pulse keyframe is injected once ─── */
const STYLE_ID = 'citypulse-skeleton-style';
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement('style');
  s.id = STYLE_ID;
  s.textContent = `
    @keyframes sk-pulse {
      0%   { opacity: 1; }
      50%  { opacity: 0.4; }
      100% { opacity: 1; }
    }
    .sk {
      background: linear-gradient(90deg, #2D2B3F 25%, #3B3852 50%, #2D2B3F 75%);
      background-size: 200% 100%;
      animation: sk-shimmer 1.4s ease-in-out infinite;
      border-radius: 8px;
    }
    @keyframes sk-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    /* Dark-theme variant matches standard dark purple theme now */
    [data-theme="cyberpunk"] .sk,
    [data-theme="ocean"] .sk,
    [data-theme="emerald"] .sk {
      background: linear-gradient(90deg, #2D2B3F 25%, #3B3852 50%, #2D2B3F 75%);
      background-size: 200% 100%;
      animation: sk-shimmer 1.4s ease-in-out infinite;
    }
  `;
  document.head.appendChild(s);
}

const BG_COLOR = '#1A1829';
const BORDER_COLOR = '#2D2B3F';
const SHADOW_COLOR = '#2D2B3F';

/* ─── Generic block ─── */
export const SkeletonBlock = ({ w = '100%', h = '1rem', r = '8px', style = {} }) => (
  <div className="sk" style={{ width: w, height: h, borderRadius: r, flexShrink: 0, ...style }} />
);

/* ─── Stat card skeleton ─── */
export const SkeletonStatCard = () => (
  <div style={{
    padding: '1.5rem', borderRadius: '24px',
    border: `3px solid ${BORDER_COLOR}`, background: BG_COLOR,
    boxShadow: `4px 4px 0px ${SHADOW_COLOR}`,
    display: 'flex', flexDirection: 'column', gap: '0.75rem',
  }}>
    <SkeletonBlock w="2rem" h="2rem" r="50%" />
    <SkeletonBlock w="60%" h="2.5rem" />
    <SkeletonBlock w="80%" h="0.75rem" />
  </div>
);

/* ─── Card wrapper ─── */
export const SkeletonCard = ({ children, style = {} }) => (
  <div style={{
    background: BG_COLOR, border: `3px solid ${BORDER_COLOR}`,
    borderRadius: '24px', padding: '1.5rem',
    boxShadow: `4px 4px 0px ${SHADOW_COLOR}`, ...style,
  }}>
    {children}
  </div>
);

/* ══════════════════════════════════════════
   PAGE-LEVEL SKELETONS
══════════════════════════════════════════ */

/* ─── Dashboard ─── */
export const SkeletonDashboard = () => (
  <div className="page">
    {/* Header */}
    <div style={{ marginBottom: '2rem' }}>
      <SkeletonBlock w="55%" h="2.5rem" style={{ marginBottom: '0.75rem' }} />
      <SkeletonBlock w="30%" h="1rem" />
    </div>

    {/* 4-column stat row */}
    <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
      {[0,1,2,3].map(i => <SkeletonStatCard key={i} />)}
    </div>

    {/* Level progress card */}
    <SkeletonCard style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <SkeletonBlock w="35%" h="1rem" />
        <SkeletonBlock w="15%" h="1rem" />
      </div>
      <SkeletonBlock w="100%" h="1.25rem" r="999px" style={{ marginBottom: '0.5rem' }} />
      <SkeletonBlock w="25%" h="0.75rem" />
    </SkeletonCard>

    {/* 2-col badges + XP */}
    <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
      <SkeletonCard>
        <SkeletonBlock w="40%" h="1.25rem" style={{ marginBottom: '1rem' }} />
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[0,1,2,3].map(i => <SkeletonBlock key={i} w="90px" h="2rem" r="999px" />)}
        </div>
      </SkeletonCard>
      <SkeletonCard>
        <SkeletonBlock w="35%" h="1.25rem" style={{ marginBottom: '1rem' }} />
        {[0,1,2,3].map(i => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: `1px solid ${BORDER_COLOR}` }}>
            <SkeletonBlock w="50%" h="0.875rem" />
            <SkeletonBlock w="20%" h="0.875rem" />
          </div>
        ))}
      </SkeletonCard>
    </div>

    {/* League card */}
    <SkeletonCard style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <SkeletonBlock w="3rem" h="3rem" r="50%" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <SkeletonBlock w="40%" h="1.25rem" />
          <SkeletonBlock w="70%" h="0.875rem" />
        </div>
        <SkeletonBlock w="120px" h="2.5rem" r="10px" />
      </div>
    </SkeletonCard>

    {/* Reports table */}
    <SkeletonCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <SkeletonBlock w="30%" h="1.5rem" />
        <SkeletonBlock w="110px" h="2rem" r="999px" />
      </div>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.85rem 0', borderBottom: `1px solid ${BORDER_COLOR}` }}>
          <SkeletonBlock w="20%" h="0.875rem" />
          <SkeletonBlock w="25%" h="0.875rem" />
          <SkeletonBlock w="15%" h="0.875rem" />
          <SkeletonBlock w="15%" h="1.5rem" r="999px" />
          <SkeletonBlock w="15%" h="0.875rem" />
        </div>
      ))}
    </SkeletonCard>
  </div>
);

/* ─── Leaderboard ─── */
export const SkeletonLeaderboard = () => (
  <div className="page" style={{ maxWidth: '800px', margin: '0 auto' }}>
    {/* Header */}
    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
      <SkeletonBlock w="70%" h="3.5rem" r="12px" style={{ margin: '0 auto 1rem' }} />
      <SkeletonBlock w="40%" h="2rem" r="999px" style={{ margin: '0 auto 0.75rem' }} />
      <SkeletonBlock w="50%" h="1rem" style={{ margin: '0 auto' }} />
    </div>
    {/* Rows */}
    {[0,1,2,3,4,5,6].map(i => (
      <div key={i} style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '1.25rem 1.5rem', marginBottom: '1rem',
        background: BG_COLOR, border: `2px solid ${BORDER_COLOR}`,
        borderRadius: '24px', boxShadow: `4px 4px 0px ${SHADOW_COLOR}`,
      }}>
        <SkeletonBlock w="2.5rem" h="2.5rem" r="50%" />
        <SkeletonBlock w="2.5rem" h="2.5rem" r="12px" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <SkeletonBlock w="35%" h="1rem" />
          <SkeletonBlock w="55%" h="0.75rem" />
        </div>
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.4rem', alignItems: 'flex-end' }}>
          <SkeletonBlock w="80px" h="1rem" />
          <SkeletonBlock w="120px" h="0.75rem" />
        </div>
      </div>
    ))}
  </div>
);

/* ─── Profile ─── */
export const SkeletonProfile = () => (
  <div className="page" style={{ maxWidth: '900px', margin: '0 auto' }}>
    {/* Hero */}
    <SkeletonCard style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
      <SkeletonBlock w="100%" h="80px" r="0" style={{ marginBottom: '1.5rem', marginLeft: '-1.5rem', marginTop: '-1.5rem', width: 'calc(100% + 3rem)' }} />
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-end' }}>
        <SkeletonBlock w="100px" h="100px" r="16px" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <SkeletonBlock w="45%" h="2rem" />
          <SkeletonBlock w="30%" h="0.875rem" />
        </div>
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        <SkeletonBlock w="100%" h="1rem" r="999px" />
      </div>
    </SkeletonCard>

    {/* Stats */}
    <div className="grid grid-4" style={{ marginBottom: '1.5rem' }}>
      {[0,1,2,3].map(i => <SkeletonStatCard key={i} />)}
    </div>

    {/* Badges */}
    <SkeletonCard>
      <SkeletonBlock w="35%" h="1.5rem" style={{ marginBottom: '1.25rem' }} />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem' }}>
        {[0,1,2,3,4].map(i => (
          <SkeletonBlock key={i} w="110px" h="80px" r="12px" />
        ))}
      </div>
    </SkeletonCard>
  </div>
);

/* ─── Statistics ─── */
export const SkeletonStatistics = () => (
  <div className="page" style={{ minHeight: '100vh' }}>
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '3rem' }}>
        <SkeletonBlock w="55%" h="3rem" style={{ marginBottom: '0.75rem' }} />
        <SkeletonBlock w="70%" h="1rem" />
      </div>
      {/* Metric grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{
            background: BG_COLOR, border: `3px solid ${BORDER_COLOR}`, borderRadius: '20px',
            padding: '2rem 1.75rem', boxShadow: `6px 6px 0px ${SHADOW_COLOR}`,
            display: 'flex', flexDirection: 'column', gap: '0.75rem',
          }}>
            <SkeletonBlock w="3rem" h="3rem" r="50%" />
            <SkeletonBlock w="55%" h="3rem" />
            <SkeletonBlock w="75%" h="0.875rem" />
          </div>
        ))}
      </div>
      {/* Resolution banner */}
      <div style={{ background: BG_COLOR, border: `3px solid ${BORDER_COLOR}`, borderRadius: '20px', padding: '2.5rem', boxShadow: `6px 6px 0px ${SHADOW_COLOR}`, display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <SkeletonBlock w="180px" h="0.875rem" />
          <SkeletonBlock w="120px" h="5rem" />
          <SkeletonBlock w="200px" h="0.875rem" />
        </div>
        <div style={{ flex: 1, minWidth: '250px', display: 'flex', flexDirection: 'column', gap: '0.75rem', justifyContent: 'center' }}>
          <SkeletonBlock w="100%" h="1.5rem" r="999px" />
        </div>
      </div>
      {/* Breakdown */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {[0,1].map(i => (
          <div key={i} style={{ background: BG_COLOR, border: `2px solid ${BORDER_COLOR}`, borderRadius: '16px', padding: '1.5rem', boxShadow: `4px 4px 0px ${SHADOW_COLOR}` }}>
            <SkeletonBlock w="50%" h="0.875rem" style={{ marginBottom: '0.75rem' }} />
            <SkeletonBlock w="40%" h="2.5rem" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Store ─── */
export const SkeletonStore = () => (
  <div className="page" style={{ maxWidth: '1200px' }}>
    {/* Header */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <SkeletonBlock w="45%" h="2.5rem" />
        <SkeletonBlock w="70%" h="1rem" />
      </div>
      <SkeletonCard style={{ minWidth: '150px' }}>
        <SkeletonBlock w="60%" h="0.875rem" style={{ marginBottom: '0.5rem' }} />
        <SkeletonBlock w="80%" h="2rem" />
      </SkeletonCard>
    </div>
    {/* Grid */}
    <div className="grid grid-3">
      {[0,1,2,3,4,5].map(i => (
        <SkeletonCard key={i}>
          <SkeletonBlock w="60px" h="1.5rem" r="999px" style={{ marginBottom: '1rem' }} />
          <SkeletonBlock w="4rem" h="4rem" r="16px" style={{ marginBottom: '1rem' }} />
          <SkeletonBlock w="70%" h="1.25rem" style={{ marginBottom: '0.5rem' }} />
          <SkeletonBlock w="100%" h="0.875rem" style={{ marginBottom: '0.25rem' }} />
          <SkeletonBlock w="80%" h="0.875rem" style={{ marginBottom: '1.25rem' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <SkeletonBlock w="40%" h="1rem" />
            <SkeletonBlock w="30%" h="1rem" />
          </div>
          <SkeletonBlock w="100%" h="2.5rem" r="999px" />
        </SkeletonCard>
      ))}
    </div>
  </div>
);

/* ─── Public Reports ─── */
export const SkeletonPublicReports = () => (
  <div className="page" style={{ minHeight: '100vh' }}>
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2.5rem' }}>
        <SkeletonBlock w="50%" h="3rem" style={{ marginBottom: '0.75rem' }} />
        <SkeletonBlock w="65%" h="1rem" />
      </div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {[0,1,2,3].map(i => <SkeletonBlock key={i} w="130px" h="2.25rem" r="999px" />)}
      </div>
      {/* Card grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {[0,1,2,3,4,5].map(i => (
          <div key={i} style={{ background: BG_COLOR, border: `2px solid ${BORDER_COLOR}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}>
            <SkeletonBlock w="100%" h="190px" r="0" />
            <div style={{ padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <SkeletonBlock w="70%" h="1.1rem" />
              <SkeletonBlock w="40%" h="0.875rem" />
              <SkeletonBlock w="100%" h="0.875rem" />
              <SkeletonBlock w="85%" h="0.875rem" />
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.5rem', borderTop: `1px solid ${BORDER_COLOR}` }}>
                <SkeletonBlock w="30%" h="0.75rem" />
                <SkeletonBlock w="30%" h="0.75rem" />
              </div>
              <SkeletonBlock w="100%" h="2.25rem" r="10px" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

/* ─── Inventory ─── */
export const SkeletonInventory = () => (
  <div className="page" style={{ maxWidth: '1100px' }}>
    <div style={{ marginBottom: '2rem' }}>
      <SkeletonBlock w="40%" h="2.5rem" style={{ marginBottom: '0.75rem' }} />
      <SkeletonBlock w="60%" h="1rem" />
    </div>
    <div className="grid grid-3">
      {[0,1,2,3,4,5].map(i => (
        <SkeletonCard key={i}>
          <SkeletonBlock w="3rem" h="3rem" r="50%" style={{ marginBottom: '1rem' }} />
          <SkeletonBlock w="60%" h="1.25rem" style={{ marginBottom: '0.5rem' }} />
          <SkeletonBlock w="80%" h="0.875rem" style={{ marginBottom: '1rem' }} />
          <SkeletonBlock w="100%" h="2.5rem" r="999px" />
        </SkeletonCard>
      ))}
    </div>
  </div>
);

/* ─── Admin Complaints (table) ─── */
export const SkeletonAdminTable = ({ rows = 8, cols = 7 }) => (
  <div>
    {/* Filter bar */}
    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
      {[0,1,2,3].map(i => <SkeletonBlock key={i} w="90px" h="2rem" r="999px" />)}
    </div>
    {/* Table rows */}
    {[...Array(rows)].map((_, i) => (
      <div key={i} style={{ display: 'flex', gap: '1rem', padding: '0.85rem 1rem', borderBottom: `1px solid ${BORDER_COLOR}`, alignItems: 'center' }}>
        {[...Array(cols)].map((__, j) => (
          <SkeletonBlock key={j} w={j === cols - 1 ? '100px' : `${Math.floor(80 + Math.random() * 60)}px`} h={j === 3 || j === 4 ? '1.5rem' : '0.875rem'} r={j === 3 || j === 4 ? '999px' : '6px'} />
        ))}
      </div>
    ))}
  </div>
);

/* ─── Admin Analytics ─── */
export const SkeletonAdminAnalytics = () => (
  <div>
    <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
      {[0,1,2,3].map(i => <SkeletonStatCard key={i} />)}
    </div>
    <SkeletonCard style={{ height: '320px', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-end', gap: '1rem', padding: '1.5rem' }}>
      {[40,70,55,90,65,80,45,95,60,75,50,85].map((h, i) => (
        <SkeletonBlock key={i} style={{ flex: 1, height: `${h}%`, borderRadius: '8px 8px 0 0' }} />
      ))}
    </SkeletonCard>
    <div className="grid grid-2">
      <SkeletonCard style={{ height: '200px' }} />
      <SkeletonCard style={{ height: '200px' }} />
    </div>
  </div>
);

/* ─── Admin Users ─── */
export const SkeletonAdminUsers = () => (
  <div>
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
      <SkeletonBlock w="250px" h="2.5rem" r="999px" />
      <SkeletonBlock w="120px" h="2.5rem" r="999px" />
    </div>
    <SkeletonAdminTable rows={10} cols={6} />
  </div>
);

/* ─── Heatmap page ─── */
export const SkeletonHeatmap = () => (
  <div className="page" style={{ padding: 0, overflow: 'hidden' }}>
    <div style={{ padding: '1.5rem', display: 'flex', gap: '1rem', background: BG_COLOR, borderBottom: `3px solid ${BORDER_COLOR}`, flexWrap: 'wrap' }}>
      <SkeletonBlock w="200px" h="2.5rem" r="12px" />
      <SkeletonBlock w="200px" h="2.5rem" r="12px" />
      <SkeletonBlock w="120px" h="2.5rem" r="12px" />
    </div>
    <SkeletonBlock w="100%" h="calc(100vh - 160px)" r="0" />
  </div>
);

/* ─── Feedback page ─── */
export const SkeletonFeedback = () => (
  <div className="page" style={{ maxWidth: '700px', margin: '0 auto' }}>
    <SkeletonBlock w="55%" h="2.5rem" style={{ marginBottom: '0.75rem' }} />
    <SkeletonBlock w="75%" h="1rem" style={{ marginBottom: '2rem' }} />
    <SkeletonCard>
      <SkeletonBlock w="40%" h="1rem" style={{ marginBottom: '0.5rem' }} />
      <SkeletonBlock w="100%" h="3rem" style={{ marginBottom: '1.25rem' }} r="12px" />
      <SkeletonBlock w="40%" h="1rem" style={{ marginBottom: '0.5rem' }} />
      <SkeletonBlock w="100%" h="120px" style={{ marginBottom: '1.25rem' }} r="12px" />
      <SkeletonBlock w="40%" h="1rem" style={{ marginBottom: '0.5rem' }} />
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[0,1,2,3,4].map(i => <SkeletonBlock key={i} w="48px" h="48px" r="50%" />)}
      </div>
      <SkeletonBlock w="100%" h="3rem" r="999px" />
    </SkeletonCard>
  </div>
);

/* ─── Submit Complaint ─── */
export const SkeletonSubmitComplaint = () => (
  <div className="page" style={{ maxWidth: '800px', margin: '0 auto' }}>
    <SkeletonBlock w="50%" h="2.5rem" style={{ marginBottom: '0.75rem' }} />
    <SkeletonBlock w="65%" h="1rem" style={{ marginBottom: '2rem' }} />
    <SkeletonCard>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{ marginBottom: '1.25rem' }}>
          <SkeletonBlock w="30%" h="0.875rem" style={{ marginBottom: '0.5rem' }} />
          <SkeletonBlock w="100%" h="3rem" r="12px" />
        </div>
      ))}
      <SkeletonBlock w="100%" h="120px" r="12px" style={{ marginBottom: '1.25rem' }} />
      <SkeletonBlock w="100%" h="3rem" r="999px" />
    </SkeletonCard>
  </div>
);

/* ─── About page ─── */
export const SkeletonAbout = () => (
  <div className="page">
    <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
      <SkeletonBlock w="50%" h="3.5rem" style={{ margin: '0 auto 1rem' }} />
      <SkeletonBlock w="65%" h="1rem" style={{ margin: '0 auto' }} />
    </div>
    <div className="grid grid-3" style={{ marginBottom: '3rem' }}>
      {[0,1,2].map(i => (
        <SkeletonCard key={i} style={{ textAlign: 'center' }}>
          <SkeletonBlock w="4rem" h="4rem" r="50%" style={{ margin: '0 auto 1rem' }} />
          <SkeletonBlock w="60%" h="1.25rem" style={{ margin: '0 auto 0.75rem' }} />
          <SkeletonBlock w="90%" h="0.875rem" style={{ margin: '0 auto 0.4rem' }} />
          <SkeletonBlock w="80%" h="0.875rem" style={{ margin: '0 auto' }} />
        </SkeletonCard>
      ))}
    </div>
    <SkeletonCard style={{ marginBottom: '2rem' }}>
      <SkeletonBlock w="40%" h="1.5rem" style={{ marginBottom: '1rem' }} />
      {[0,1,2,3].map(i => (
        <SkeletonBlock key={i} w={`${70 + i * 5}%`} h="0.875rem" style={{ marginBottom: '0.5rem' }} />
      ))}
    </SkeletonCard>
  </div>
);

/* ─── Home page ─── */
export const SkeletonHome = () => (
  <div className="page" style={{ padding: 0 }}>
    {/* Hero */}
    <div style={{ height: '88vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem' }}>
      <SkeletonBlock w="200px" h="1.5rem" r="999px" style={{ marginBottom: '2rem' }} />
      <SkeletonBlock w="60%" h="6rem" style={{ marginBottom: '2rem' }} />
      <SkeletonBlock w="40%" h="1.5rem" style={{ marginBottom: '2.5rem' }} />
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
        <SkeletonBlock w="160px" h="3rem" r="10px" />
        <SkeletonBlock w="160px" h="3rem" r="10px" />
      </div>
    </div>
    {/* Stats Bar */}
    <div style={{ padding: '1.25rem 2rem', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', background: BG_COLOR }}>
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <SkeletonBlock w="60px" h="2.5rem" style={{ marginBottom: '0.5rem' }} />
          <SkeletonBlock w="80px" h="0.875rem" />
        </div>
      ))}
    </div>
    {/* Features */}
    <div style={{ padding: '6rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <SkeletonBlock w="40%" h="2.5rem" style={{ margin: '0 auto 1rem' }} />
        <SkeletonBlock w="50%" h="1rem" style={{ margin: '0 auto' }} />
      </div>
      <div className="grid grid-3" style={{ gap: '1.25rem' }}>
        {[0, 1, 2, 3, 4, 5].map(i => (
          <SkeletonCard key={i}>
            <SkeletonBlock w="3rem" h="3rem" r="50%" style={{ marginBottom: '1rem' }} />
            <SkeletonBlock w="50%" h="1.5rem" style={{ marginBottom: '0.5rem' }} />
            <SkeletonBlock w="90%" h="1rem" style={{ marginBottom: '0.5rem' }} />
            <SkeletonBlock w="70%" h="1rem" />
          </SkeletonCard>
        ))}
      </div>
    </div>
  </div>
);

export default SkeletonBlock;
