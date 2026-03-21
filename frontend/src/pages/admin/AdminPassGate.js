import React from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const AdminPassGate = ({ children }) => {
  const { user, loading } = useAuth();

  // If auth is still loading, show a nice loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a0505 50%, #0f0f0f 100%)',
      }}>
        <motion.div
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ fontSize: '3rem', filter: 'drop-shadow(0 0 20px rgba(198,40,40,0.6))' }}
        >
          🗺️
        </motion.div>
      </div>
    );
  }

  // If no user or user is not an admin/officer, show access denied
  if (!user || (user.role !== 'admin' && user.role !== 'officer')) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a0505 50%, #0f0f0f 100%)',
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          style={{
            background: 'rgba(20, 20, 20, 0.95)',
            border: '1px solid rgba(198,40,40,0.3)',
            borderRadius: '20px',
            padding: '3rem',
            textAlign: 'center',
            boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 60px rgba(198,40,40,0.1)',
            backdropFilter: 'blur(20px)',
            maxWidth: '400px'
          }}
        >
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⛔</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', textTransform: 'uppercase', color: 'white' }}>
            Access Denied
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem', marginBottom: '2rem' }}>
            This area requires Administrator privileges.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '0.75rem 2rem',
              background: 'linear-gradient(135deg, var(--primary-700), var(--primary-500))',
              color: 'white',
              border: 'none',
              borderRadius: '999px',
              fontFamily: 'var(--font-display)',
              fontSize: '1rem', fontWeight: '800',
              textTransform: 'uppercase', letterSpacing: '0.1em',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(198,40,40,0.4)',
            }}
          >
            ← Back to Home
          </button>
        </motion.div>
      </div>
    );
  }

  // User is an admin
  return children;
};

export default AdminPassGate;
