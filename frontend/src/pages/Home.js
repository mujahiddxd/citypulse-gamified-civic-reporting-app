import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const FEATURES = [
  { icon: '📍', title: 'Report Issues', desc: 'Drop a pin, snap a photo, describe the problem. Takes 60 seconds.' },
  { icon: '🏆', title: 'Earn XP & Levels', desc: 'Get rewarded for making your city better. Climb the leaderboard.' },
  { icon: '🔥', title: 'Live Heatmaps', desc: 'See real-time density maps of complaints across the city.' },
  { icon: '📊', title: 'Analytics', desc: 'Track cleanliness scores by area and monitor improvement trends.' },
  { icon: '🎖️', title: 'Earn Badges', desc: 'Unlock exclusive badges as you contribute to urban improvement.' },
  { icon: '🤖', title: 'AI Assistant', desc: 'Our chatbot guides you through reporting and answers questions 24/7.' },
];

const Home = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalComplaints: 0, approved: 0, totalUsers: 0, pending: 0 });

  useEffect(() => {
    // Fetch real stats from the public leaderboard + complaints
    Promise.all([
      api.get('/leaderboard'),
      api.get('/complaints?limit=1000'),
    ]).then(([lb, complaints]) => {
      const total = complaints.data?.length || 0;
      const approved = complaints.data?.filter(c => c.status === 'Approved').length || 0;
      setStats({
        totalComplaints: total,
        approved,
        totalUsers: lb.data?.length || 0,
        resolutionRate: total > 0 ? Math.round((approved / total) * 100) : 0,
      });
    }).catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Hero */}
      <section style={{
        minHeight: '88vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '4rem 2rem',
        position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #fff 0%, #fef2f2 50%, #fff 100%)',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(198,40,40,0.08) 1px, transparent 0)',
          backgroundSize: '40px 40px',
          pointerEvents: 'none',
        }} />

        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          style={{ position: 'relative', maxWidth: '860px' }}>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.4rem 1rem', background: '#FEF2F2', border: '1px solid #FECACA',
              borderRadius: '999px', fontFamily: 'var(--font-display)', fontSize: '0.78rem',
              fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase',
              color: '#991B1B', marginBottom: '2rem',
            }}>
            🌆 Smart Civic Reporting Platform
          </motion.div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3.5rem, 9vw, 7.5rem)',
            fontWeight: '900', lineHeight: '0.88',
            letterSpacing: '-0.02em', textTransform: 'uppercase',
            color: '#111827', marginBottom: '1.75rem',
          }}>
            Report.<br />
            <span style={{ color: '#C62828', WebkitTextStroke: '2px #C62828' }}>Earn.</span><br />
            Improve.
          </h1>

          <p style={{
            fontSize: '1.15rem', color: '#4B5563',
            maxWidth: '520px', margin: '0 auto 2.5rem', lineHeight: '1.75',
          }}>
            Turn civic frustration into action. Report garbage and crowd issues, earn XP, and make your city cleaner.
          </p>

          <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to={user ? '/submit' : '/register'}
              style={{
                padding: '0.875rem 2rem', background: '#C62828', color: 'white',
                borderRadius: '10px', fontFamily: 'var(--font-display)', fontSize: '1rem',
                fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em',
                boxShadow: '0 4px 16px rgba(198,40,40,0.35)', transition: 'all 0.2s',
                textDecoration: 'none',
              }}>
              📍 Start Reporting
            </Link>
            <Link to="/heatmap"
              style={{
                padding: '0.875rem 2rem', background: 'white', color: '#374151',
                border: '2px solid #e5e7eb', borderRadius: '10px',
                fontFamily: 'var(--font-display)', fontSize: '1rem',
                fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em',
                transition: 'all 0.2s', textDecoration: 'none',
              }}>
              🔥 View Heatmap
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Live Stats Bar */}
      <section style={{ background: '#C62828', padding: '1.25rem 2rem' }}>
        <div style={{
          maxWidth: '900px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '1rem', textAlign: 'center',
        }}>
          {[
            { value: stats.totalComplaints, label: 'Reports Filed' },
            { value: stats.approved, label: 'Issues Resolved' },
            { value: stats.totalUsers > 0 ? `Top ${stats.totalUsers}` : '—', label: 'Active Users' },
            { value: stats.resolutionRate > 0 ? `${stats.resolutionRate}%` : '—', label: 'Resolution Rate' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: '900', color: 'white' }}>{s.value}</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)' }}>{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '6rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '800', textTransform: 'uppercase', color: '#111827' }}>
            Built for civic <span style={{ color: '#C62828' }}>impact</span>
          </h2>
          <p style={{ color: '#6B7280', marginTop: '0.75rem', maxWidth: '460px', margin: '0.75rem auto 0', fontSize: '1rem' }}>
            Every feature is designed to maximize citizen engagement and city responsiveness.
          </p>
        </div>
        <div className="grid grid-3" style={{ gap: '1.25rem' }}>
          {FEATURES.map((f, i) => (
            <motion.div key={f.title}
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }} transition={{ delay: i * 0.08 }}
              style={{
                background: 'white', border: '1px solid #e5e7eb', borderRadius: '14px',
                padding: '2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
              whileHover={{ boxShadow: '0 8px 30px rgba(0,0,0,0.1)', y: -2 }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{f.icon}</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', fontWeight: '800', textTransform: 'uppercase', color: '#111827', marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: '1.65' }}>{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section style={{
          background: '#111827', padding: '5rem 2rem', textAlign: 'center',
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: '900', textTransform: 'uppercase', color: 'white', marginBottom: '1rem' }}>
            Your city needs <span style={{ color: '#EF4444' }}>you</span>
          </h2>
          <p style={{ color: '#9CA3AF', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem', fontSize: '1rem' }}>
            Join citizens already making their neighborhoods better.
          </p>
          <Link to="/register"
            style={{
              padding: '1rem 2.5rem', background: '#C62828', color: 'white',
              borderRadius: '10px', fontFamily: 'var(--font-display)', fontSize: '1.1rem',
              fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em',
              boxShadow: '0 4px 20px rgba(198,40,40,0.4)', textDecoration: 'none',
            }}>
            🚀 Join for Free
          </Link>
        </section>
      )}
    </div>
  );
};

export default Home;
