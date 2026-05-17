import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import RotatingText from './RotatingText';
import CardNav from './CardNav';

const Navbar = () => {
  const { user: authUser, logout } = useAuth();
  const { equippedBorder } = useTheme();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Check if logged in via standalone admin portal
  const adminToken = localStorage.getItem('citypulse_admin_token');
  
  // Synthetic user for master admin if no regular user is logged in
  const user = authUser || (adminToken ? { 
    username: 'SystemAdmin', 
    role: 'admin', 
    coins: 999999, 
    isMaster: true 
  } : null);

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
        { label: "🏢 Wards", path: "/wards" },
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

  // Add Admin/Officer menu if authorized (either via Supabase role or standalone admin token)
  const isMasterAdmin = localStorage.getItem('citypulse_admin_token');
  const isAuthorized = isMasterAdmin || (user && (user.role === 'admin' || user.role === 'officer'));

  if (isAuthorized) {
    const managementLinks = [];
    const role = user?.role?.toLowerCase();
    
    if (role === 'officer') {
      managementLinks.push({ label: "📋 Complaints", path: "/admin/complaints" });
      managementLinks.push({ label: "🏢 Wards", path: "/wards" });
    } else {
      managementLinks.push({ label: "⚙️ Admin Panel", path: "/admin" });
      managementLinks.push({ label: "📋 Complaints", path: "/admin/complaints" });
      managementLinks.push({ label: "🏢 Wards", path: "/wards" });
      managementLinks.push({ label: "📈 Analytics", path: "/admin/analytics" });
    }

    managementLinks.push({ label: "👤 My Profile", path: user?.username ? `/profile/${user.username}` : "/dashboard" });

    navItems.push({
      label: "Management",
      bgColor: "#C62828", // Red theme for admin
      textColor: "#ffffff",
      links: managementLinks
    });
  }

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
      <CardNav
        logo={logo}
        items={navItems}
        user={user}
        onLogout={handleLogout}
        onProfileMenuToggle={() => setShowProfileMenu(!showProfileMenu)}
        showProfileMenu={showProfileMenu}
        setShowProfileMenu={setShowProfileMenu}
        baseColor="#ffffff"
        menuColor="#111111"
        buttonBgColor="#ffffff"
        buttonTextColor="#111111"
        theme="light"
      />
  );
};

export default Navbar;
