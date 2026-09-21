import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import RotatingText from './RotatingText';
import './CardNav.css';

const CardNav = ({
  logo,
  items = [],
  baseColor = "#ffffff",
  menuColor = "#111111",
  buttonBgColor = "#ffffff",
  buttonTextColor = "#111111",
  theme = "light",
  user,
  onLogout,
  onProfileMenuToggle,
  showProfileMenu,
  setShowProfileMenu
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path) && path !== '/';

  // Close mobile menu and profile dropdown whenever route changes
  useEffect(() => {
    setMobileOpen(false);
    if (setShowProfileMenu) setShowProfileMenu(false);
  }, [location.pathname]);

  return (
    <div className="cardnav-wrapper">
      <nav className="cardnav-nav">
        {/* Logo Section */}
        <div className="cardnav-logo-area">
          {logo}
        </div>

        {/* Desktop Links (Visible on screens >= 920px) */}
        <div className="cardnav-desktop-links">
          {items.map((item, index) => (
            <div
              key={index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ position: 'relative' }}
            >
              <button className="cardnav-link-btn" aria-expanded={hoveredIndex === index}>
                <RotatingText 
                  key={hoveredIndex === index ? 'hover' : 'idle'}
                  texts={[item.label]} 
                  mainClassName="overflow-hidden justify-center" 
                  staggerFrom="last" 
                  initial={{ y: hoveredIndex === index ? "100%" : 0 }} 
                  animate={{ y: 0 }} 
                  exit={{ y: "-120%" }} 
                  staggerDuration={0.02} 
                  splitLevelClassName="overflow-hidden" 
                  transition={{ type: "spring", damping: 30, stiffness: 400 }} 
                  auto={false} 
                  loop={false} 
                />
              </button>

              <AnimatePresence>
                {hoveredIndex === index && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, x: "-50%", scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                    exit={{ opacity: 0, y: 8, x: "-50%", scale: 0.96 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 320 }}
                    className="cardnav-hover-menu"
                    style={{ background: item.bgColor || menuColor }}
                  >
                    {/* Arrow pointer */}
                    <div 
                      className="cardnav-hover-arrow"
                      style={{ background: item.bgColor || menuColor }} 
                    />

                    {item.links.map((link, i) => (
                      <Link
                        key={i}
                        to={link.path}
                        className="cardnav-sublink"
                        style={{
                          color: item.textColor || '#ffffff',
                          background: isActive(link.path) ? 'rgba(255,255,255,0.18)' : 'transparent'
                        }}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Right Side - Auth, Profile & Mobile Hamburger */}
        <div className="cardnav-right-area">
          {user ? (
            <div style={{ position: 'relative' }}>
              <div
                onClick={onProfileMenuToggle}
                className="cardnav-user-pill"
                role="button"
                tabIndex={0}
                aria-label="User profile and coins"
              >
                <div className="cardnav-avatar-bubble">
                  {user.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="cardnav-coins-text">
                  {user.coins?.toLocaleString() || 0} 🪙
                </span>
              </div>

              {/* Profile Menu Dropdown (Desktop) */}
              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="cardnav-profile-dropdown"
                  >
                    <div className="cardnav-profile-dropdown-arrow" />

                    <Link 
                      to={user.username ? `/profile/${user.username}` : "/dashboard"} 
                      onClick={onProfileMenuToggle} 
                      className="cardnav-menu-item"
                    >
                      <span aria-hidden="true">👤</span>
                      <span>View Profile</span>
                    </Link>
                    
                    <Link 
                      to={(user.role === 'admin' || user.role === 'officer') ? "/admin" : "/dashboard"} 
                      onClick={onProfileMenuToggle} 
                      className="cardnav-menu-item"
                    >
                      <span aria-hidden="true">📊</span>
                      <span>{(user.role === 'admin' || user.role === 'officer') ? "Admin Panel" : "Dashboard"}</span>
                    </Link>
                    
                    <div className="cardnav-menu-divider" />
                    
                    <button 
                      onClick={onLogout} 
                      className="cardnav-menu-item danger"
                    >
                      <span aria-hidden="true">🚪</span>
                      <span>Logout</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <Link 
                to="/login" 
                style={{ 
                  color: '#ffffff', 
                  fontWeight: '800', 
                  padding: '0.35rem 0.75rem', 
                  textDecoration: 'none', 
                  fontFamily: 'var(--font-display, inherit)',
                  fontSize: '0.9rem'
                }}
              >
                Login
              </Link>
              <Link 
                to="/register" 
                style={{ 
                  background: buttonBgColor, 
                  color: buttonTextColor, 
                  padding: '0.4rem 1rem', 
                  borderRadius: '9999px', 
                  border: '2px solid #111111', 
                  fontWeight: '800', 
                  fontFamily: 'var(--font-display, inherit)', 
                  textDecoration: 'none', 
                  boxShadow: '2px 2px 0px #111111',
                  fontSize: '0.85rem'
                }}
              >
                Sign up
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="cardnav-hamburger-btn"
            aria-label={mobileOpen ? "Close menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* ── Mobile Navigation Drawer ── */}
        <AnimatePresence>
          {mobileOpen && (
            <>
              {/* Semi-transparent backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileOpen(false)}
                className="cardnav-mobile-overlay"
              />

              {/* Drawer Container */}
              <motion.div
                initial={{ opacity: 0, y: -15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="cardnav-mobile-drawer"
              >
                {/* Categorized Sections */}
                {items.map((cat, idx) => (
                  <div key={idx} className="cardnav-mobile-section">
                    <span className="cardnav-mobile-section-title">{cat.label}</span>
                    <div className="cardnav-mobile-grid">
                      {cat.links.map((lnk, linkIdx) => (
                        <Link
                          key={linkIdx}
                          to={lnk.path}
                          onClick={() => setMobileOpen(false)}
                          className={`cardnav-mobile-link ${isActive(lnk.path) ? 'active' : ''}`}
                        >
                          <span>{lnk.label}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Mobile User Actions Footer */}
                {user ? (
                  <div className="cardnav-mobile-user-bar">
                    <div className="cardnav-mobile-user-info">
                      <div className="cardnav-avatar-bubble" style={{ width: '26px', height: '26px', fontSize: '0.75rem' }}>
                        {user.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <span className="cardnav-mobile-username">
                        @{user.username || 'Citizen'}
                      </span>
                    </div>

                    <div className="cardnav-mobile-btn-group">
                      <Link
                        to={user.username ? `/profile/${user.username}` : "/dashboard"}
                        onClick={() => setMobileOpen(false)}
                        className="cardnav-mobile-action-btn"
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          setMobileOpen(false);
                          onLogout();
                        }}
                        className="cardnav-mobile-action-btn logout"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                    <Link
                      to="/login"
                      onClick={() => setMobileOpen(false)}
                      className="cardnav-mobile-action-btn"
                      style={{ flex: 1, textAlign: 'center', padding: '0.55rem' }}
                    >
                      Login
                    </Link>
                    <Link
                      to="/register"
                      onClick={() => setMobileOpen(false)}
                      className="cardnav-mobile-action-btn"
                      style={{ flex: 1, textAlign: 'center', padding: '0.55rem', background: '#58cc02', color: '#ffffff', borderColor: '#111111' }}
                    >
                      Sign Up
                    </Link>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </nav>
    </div>
  );
};

export default CardNav;
