import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const QUICK_REPLIES = [
  { label: '⭐ Earn XP', value: 'How do I earn XP?' },
  { label: '📅 Daily Rewards', value: 'Tell me about the daily login rewards' },
  { label: '♻️ Recycling Tips', value: 'Give me some recycling tips' },
  { label: '🌍 Fun Fact', value: 'Tell me an interesting environmental fact' },
  { label: '🛍️ Store Help', value: 'How do I use the Premium Market?' },
];

const ChatbotWidget = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I\'m the CityPulse assistant 🗺️ Ask me about submitting reports, XP, badges, or anything about our platform!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const { session } = useAuth();

  useEffect(() => {
    if (session?.access_token) localStorage.setItem('access_token', session.access_token);
  }, [session]);

  useEffect(() => {
    const timer = setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return () => clearTimeout(timer);
  }, [messages, loading]);

  const sendMessage = async (text = input) => {
    const messageToSend = text.trim();
    if (!messageToSend || loading) return;

    const userMsg = { role: 'user', content: messageToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const { data } = await api.post('/chatbot', { message: messageToSend, history });
      
      // Simulate slight delay for more natural feel
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        setLoading(false);
      }, 600);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t process that. Please try again!' }]);
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 2000 }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.9, transformOrigin: 'bottom right' }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.9 }}
            style={{
              width: '380px',
              height: '580px',
              background: 'var(--bg-card)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '24px',
              boxShadow: '0 25px 80px rgba(0,0,0,0.6), 0 0 40px rgba(239, 68, 68, 0.1)',
              display: 'flex',
              flexDirection: 'column',
              marginBottom: '1rem',
              overflow: 'hidden',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <div style={{ 
              background: 'linear-gradient(135deg, var(--red-700) 0%, var(--red-900) 100%)', 
              padding: '1.25rem 1.5rem', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', 
                  borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.25rem'
                }}>🤖</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#fff' }}>
                    CityPulse AI
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontWeight: '600' }}>
                    {loading ? 'Typing...' : 'Online • Eco-Expert'}
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setOpen(false)} 
                style={{ 
                  background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', 
                  cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem'
                }}
              >✕</button>
            </div>

            {/* Messages */}
            <div style={{ 
              flex: 1, overflowY: 'auto', padding: '1.25rem', 
              display: 'flex', flexDirection: 'column', gap: '1rem',
              background: 'linear-gradient(180deg, rgba(15,23,42,0.5) 0%, rgba(15,23,42,0.8) 100%)'
            }}>
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  }}>
                  <div style={{
                    maxWidth: '85%',
                    padding: '0.85rem 1.1rem',
                    borderRadius: msg.role === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                    background: msg.role === 'user' ? 'var(--red-700)' : 'rgba(255,255,255,0.05)',
                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    fontSize: '0.9rem',
                    lineHeight: '1.6',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                    boxShadow: msg.role === 'user' ? '0 4px 15px rgba(239,68,68,0.2)' : 'none',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                    {msg.role === 'user' ? 'You' : 'CityPulse AI'}
                  </div>
                </motion.div>
              ))}
              
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ 
                    padding: '0.85rem 1.25rem', background: 'rgba(255,255,255,0.05)', 
                    borderRadius: '18px 18px 18px 2px', border: '1px solid rgba(255,255,255,0.1)' 
                  }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%' }} />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%' }} />
                      <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} style={{ width: '6px', height: '6px', background: 'var(--text-muted)', borderRadius: '50%' }} />
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Quick Replies */}
            {!loading && messages.length < 10 && (
              <div style={{ 
                padding: '0.5rem 1rem', display: 'flex', gap: '8px', overflowX: 'auto', 
                background: 'rgba(15,23,42,0.8)', borderTop: '1px solid rgba(255,255,255,0.05)'
              }} className="no-scrollbar">
                {QUICK_REPLIES.map((reply, i) => (
                  <motion.button
                    key={i}
                    whileHover={{ scale: 1.05, background: 'rgba(255,255,255,0.1)' }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage(reply.value)}
                    style={{
                      padding: '0.4rem 0.85rem',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '999px',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                    }}
                  >
                    {reply.label}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Input */}
            <div style={{ 
              padding: '1rem', 
              borderTop: '1px solid rgba(255,255,255,0.1)', 
              display: 'flex', 
              gap: '0.75rem',
              background: 'var(--bg-card)'
            }}>
              <input
                className="form-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask our eco-expert anything..."
                style={{ 
                  flex: 1, 
                  padding: '0.75rem 1rem', 
                  fontSize: '0.9rem',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              />
              <button 
                className="btn btn-primary btn-sm" 
                onClick={() => sendMessage()} 
                disabled={loading || !input.trim()}
                style={{
                  width: '44px',
                  height: '44px',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '12px',
                  fontSize: '1.1rem'
                }}
              >
                ➤
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        onClick={() => setOpen(o => !o)}
        whileHover={{ scale: 1.1, rotate: 5 }}
        whileTap={{ scale: 0.9 }}
        style={{
          width: '64px', height: '64px',
          borderRadius: '20px',
          background: 'linear-gradient(135deg, var(--red-600) 0%, var(--red-800) 100%)',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.75rem',
          boxShadow: '0 8px 30px rgba(239, 68, 68, 0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white',
          position: 'relative'
        }}
      >
        {open ? '✕' : '🤖'}
        {!open && (
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
            style={{
              position: 'absolute', inset: '-4px', borderRadius: '24px',
              border: '2px solid var(--red-500)', pointerEvents: 'none'
            }}
          />
        )}
      </motion.button>
    </div>
  );
};

export default ChatbotWidget;

