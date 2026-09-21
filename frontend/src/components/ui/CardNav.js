import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import RotatingText from './RotatingText';

const CardNav = ({
  logo,
  items,
  baseColor = "#fff",
  menuColor = "#000",
  buttonBgColor = "#111",
  buttonTextColor = "#fff",
  theme = "light",
  user,
  onLogout,
  onProfileMenuToggle,
  showProfileMenu
}) => {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname.startsWith(path) && path !== '/';

  return (
    <div style={{ position: 'sticky', top: 0, zIndex: 99999, padding: '0.75rem 1rem' }}>
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0.5rem 1.5rem',
        borderRadius: '9999px',
        background: 'var(--primary-blue)',
        border: '3px solid #111',
        boxShadow: '6px 6px 0px #111',
        position: 'relative'
      }}>
        {/* Logo Section */}
        <div style={{ display: 'flex', alignItems: 'center', zIndex: 10 }}>
          {logo}
        </div>

        {/* Desktop Links (CardNav Implementation) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', position: 'relative' }}>
          {items.map((item, index) => (
            <div
              key={index}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
              style={{ position: 'relative' }}
            >
              <button style={{
                background: 'transparent', border: 'none',
                color: '#fff', fontFamily: 'var(--font-display)',
                fontSize: '1rem', fontWeight: '800', cursor: 'pointer',
                padding: '0.5rem 1rem', textTransform: 'uppercase'
              }}>
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
                    initial={{ opacity: 0, y: 15, x: "-50%", scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }}
                    exit={{ opacity: 0, y: 10, x: "-50%", scale: 0.95 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{
                      position: 'absolute',
                      top: '120%',
                      left: '50%',
                      background: item.bgColor || menuColor,
                      padding: '1rem',
                      borderRadius: '16px',
                      border: '2px solid #111',
                      boxShadow: '4px 4px 0px #111',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.5rem',
                      minWidth: '180px',
                      zIndex: 100
                    }}
                  >
                    {/* Little arrow pointing up */}
                    <div style={{
                      position: 'absolute', top: '-6px', left: '50%',
                      transform: 'translateX(-50%) rotate(45deg)',
                      width: '12px', height: '12px',
                      background: item.bgColor || menuColor,
                      borderLeft: '2px solid #111',
                      borderTop: '2px solid #111',
                      zIndex: -1
                    }} />

                    {item.links.map((link, i) => (
                      <Link
                        key={i}
                        to={link.path}
                        style={{
                          color: item.textColor || '#fff',
                          textDecoration: 'none',
                          fontFamily: 'var(--font-body)',
                          fontSize: '0.95rem',
                          fontWeight: '700',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          transition: 'background 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: isActive(link.path) ? 'rgba(255,255,255,0.15)' : 'transparent'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = isActive(link.path) ? 'rgba(255,255,255,0.15)' : 'transparent'}
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

        {/* Right Side - Auth / Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
             <div style={{ position: 'relative' }}>
               <div
                 onClick={onProfileMenuToggle}
                 style={{
                   display: 'flex', alignItems: 'center', gap: '0.75rem',
                   cursor: 'pointer', padding: '0.3rem 0.6rem',
                   borderRadius: '9999px', background: buttonBgColor,
                   border: '2px solid #111111',
                   boxShadow: '2px 2px 0px #111111'
                 }}
               >
                 <div style={{
                   width: '32px', height: '32px', borderRadius: '50%',
                   background: 'var(--accent)', display: 'flex', alignItems: 'center',
                   justifyContent: 'center', fontWeight: '900', color: '#111',
                   fontSize: '0.9rem', border: '2px solid #111'
                 }}>
                   {user.username?.[0]?.toUpperCase() || 'U'}
                 </div>
                 <span style={{ fontSize: '0.9rem', fontWeight: '800', color: buttonTextColor, paddingRight: '0.5rem' }}>
                   {user.coins?.toLocaleString()} 🪙
                 </span>
               </div>

               {/* Profile Menu Dropdown */}
               <AnimatePresence>
                 {showProfileMenu && (
                   <motion.div
                     initial={{ opacity: 0, y: 15, scale: 0.95 }}
                     animate={{ opacity: 1, y: 0, scale: 1 }}
                     exit={{ opacity: 0, y: 10, scale: 0.95 }}
                     transition={{ type: "spring", stiffness: 400, damping: 30 }}
                     style={{
                       position: 'absolute', top: '120%', right: '0',
                       width: '220px', display: 'flex', flexDirection: 'column',
                       background: 'var(--bg-elevated)',
                       backdropFilter: 'var(--glass-blur)',
                       border: '2px solid #111',
                       borderRadius: '16px', padding: '0.5rem',
                       boxShadow: '4px 4px 0px #111', zIndex: 1100
                     }}
                   >
                     {/* Little arrow pointing up */}
                     <div style={{
                       position: 'absolute', top: '-6px', right: '30px',
                       width: '12px', height: '12px',
                       background: 'var(--bg-elevated)',
                       borderLeft: '2px solid #111',
                       borderTop: '2px solid #111',
                       transform: 'rotate(45deg)',
                       zIndex: -1
                     }} />

                     <Link to={user.username ? `/profile/${user.username}` : "/dashboard"} onClick={onProfileMenuToggle} className="btn-ghost" 
                       style={{ textDecoration: 'none', color: 'var(--text-primary)', width: '100%', display: 'flex', alignItems: 'center', padding: '0.75rem', gap: '0.5rem', fontWeight: 'bold', borderRadius: '8px', transition: 'background 0.2s' }}
                       onMouseEnter={e => e.currentTarget.style.background = 'rgba(128, 128, 128, 0.15)'}
                       onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                     >
                       <span>👤</span> <span>View Profile</span>
                     </Link>
                     
                     <Link to={(user.role === 'admin' || user.role === 'officer') ? "/admin" : "/dashboard"} onClick={onProfileMenuToggle} className="btn-ghost" 
                       style={{ textDecoration: 'none', color: 'var(--text-primary)', width: '100%', display: 'flex', alignItems: 'center', padding: '0.75rem', gap: '0.5rem', fontWeight: 'bold', borderRadius: '8px', transition: 'background 0.2s' }}
                       onMouseEnter={e => e.currentTarget.style.background = 'rgba(128, 128, 128, 0.15)'}
                       onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                     >
                       <span>📊</span> <span>{(user.role === 'admin' || user.role === 'officer') ? "Admin Panel" : "Dashboard"}</span>
                     </Link>
                     
                     <div style={{ height: '2px', background: '#111', margin: '0.5rem 0' }} />
                     
                     <button onClick={onLogout} className="btn-ghost" 
                       style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', fontSize: '1rem', width: '100%', display: 'flex', alignItems: 'center', color: 'var(--danger)', padding: '0.75rem', gap: '0.5rem', fontWeight: 'bold', borderRadius: '8px', transition: 'background 0.2s' }}
                       onMouseEnter={e => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
                       onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                     >
                       <span>🚪</span> <span>Logout</span>
                     </button>
                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Link to="/login" style={{ color: '#ffffff', fontWeight: '800', padding: '0 1rem', textDecoration: 'none', fontFamily: 'var(--font-display)' }}>Login</Link>
              <Link to="/register" style={{ background: buttonBgColor, color: buttonTextColor, padding: '0.5rem 1.25rem', borderRadius: '9999px', border: '2px solid #111', fontWeight: '800', fontFamily: 'var(--font-display)', textDecoration: 'none', boxShadow: '2px 2px 0px #111' }}>Sign up</Link>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default CardNav;
