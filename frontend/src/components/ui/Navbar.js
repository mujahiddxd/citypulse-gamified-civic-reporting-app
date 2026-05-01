import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import RotatingText from './RotatingText';
import CardNav from './CardNav';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { equippedBorder } = useTheme();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowProfileMenu(false);
    navigate('/');
  };

  const navItems = [
    {
      label: "Discover",
      bgColor: "#111111",
      textColor: "#ffffff",
      links: [
        { label: "📍 Heatmap", path: "/heatmap" },
        { label: "🏆 Leaderboard", path: "/leaderboard" },
        { label: "📰 Public Feed", path: "/reports" }
      ]
    },
    {
      label: "Rewards", 
      bgColor: "#111111",
      textColor: "#ffffff",
      links: [
        { label: "🎁 Daily Rewards", path: "/rewards" },
        { label: "🛍️ Item Store", path: "/store" },
        { label: "🎒 Inventory", path: "/inventory" }
      ]
    },
    {
      label: "Action",
      bgColor: "#111111", 
      textColor: "#ffffff",
      links: [
        { label: "📢 Submit Report", path: "/submit" },
        { label: "🏢 About Us", path: "/about" }
      ]
    }
  ];

  const logo = (
    <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', textDecoration: 'none' }}>
      <span style={{
        fontFamily: 'var(--font-display)',
        fontSize: '1.6rem',
        fontWeight: '900',
        letterSpacing: '0.02em',
        display: 'flex',
        alignItems: 'center'
      }}>
        <span style={{ color: '#C62828' }}>
          <RotatingText texts={['City']} mainClassName="overflow-hidden justify-center" staggerFrom="last" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "-120%" }} staggerDuration={0.025} splitLevelClassName="overflow-hidden" transition={{ type: "spring", damping: 30, stiffness: 400 }} auto={false} loop={false} />
        </span>
        <span style={{ color: '#ffffff' }}>
          <RotatingText texts={['Pulse']} mainClassName="overflow-hidden justify-center" staggerFrom="last" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "-120%" }} staggerDuration={0.025} splitLevelClassName="overflow-hidden" transition={{ type: "spring", damping: 30, stiffness: 400 }} auto={false} loop={false} />
        </span>
      </span>
    </Link>
  );

  return (
    <div style={{ position: 'relative' }}>
      <CardNav
        logo={logo}
        items={navItems}
        user={user}
        onLogout={handleLogout}
        onProfileMenuToggle={() => setShowProfileMenu(!showProfileMenu)}
        baseColor="#ffffff"
        menuColor="#111111"
        buttonBgColor="#ffffff"
        buttonTextColor="#111111"
        theme="light"
      />

      {/* Profile Menu Dropdown Overlay */}
      <AnimatePresence>
        {user && showProfileMenu && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            style={{
              position: 'fixed', top: '80px', right: '5%',
              width: '220px', display: 'flex', flexDirection: 'column',
              background: 'var(--bg-elevated)',
              backdropFilter: 'var(--glass-blur)',
              border: '2px solid #111',
              borderRadius: '16px', padding: '0.5rem',
              boxShadow: '4px 4px 0px #111', zIndex: 1100
            }}
          >
            <Link to={`/profile/${user.username}`} onClick={() => setShowProfileMenu(false)} className="btn-ghost" style={{ textDecoration: 'none', color: 'var(--text-primary)', width: '100%', display: 'flex', alignItems: 'center', padding: '0.75rem', gap: '0.5rem', fontWeight: 'bold' }}>
              <span>👤</span> <span>View Profile</span>
            </Link>
            <Link to="/dashboard" onClick={() => setShowProfileMenu(false)} className="btn-ghost" style={{ textDecoration: 'none', color: 'var(--text-primary)', width: '100%', display: 'flex', alignItems: 'center', padding: '0.75rem', gap: '0.5rem', fontWeight: 'bold' }}>
              <span>📊</span> <span>Dashboard</span>
            </Link>
            <div style={{ height: '2px', background: '#111', margin: '0.5rem 0' }} />
            <button onClick={handleLogout} className="btn-ghost" style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', width: '100%', display: 'flex', alignItems: 'center', color: 'var(--danger)', padding: '0.75rem', gap: '0.5rem', fontWeight: 'bold' }}>
              <span>🚪</span> <span>Logout</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Navbar;
