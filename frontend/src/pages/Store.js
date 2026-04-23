import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import { SkeletonStore } from '../components/ui/SkeletonLoader';
import '../styles/Store.css';

// Preview gradients for each item (visual representation)
const ITEM_PREVIEWS = {
    'theme-cyberpunk': { gradient: 'linear-gradient(135deg, #0ff, #f0f, #000)', emoji: '🌃' },
    'theme-ocean': { gradient: 'linear-gradient(135deg, #0077b6, #00b4d8, #90e0ef)', emoji: '🌊' },
    'theme-emerald': { gradient: 'linear-gradient(135deg, #065f46, #10b981, #6ee7b7)', emoji: '🌲' },
    'theme-sunset': { gradient: 'linear-gradient(135deg, #f59e0b, #ef4444, #7c3aed)', emoji: '🌅' },
    'theme-midnight': { gradient: 'linear-gradient(135deg, #1e1b4b, #4338ca, #a5b4fc)', emoji: '🌙' },
    'border-neon': { gradient: 'linear-gradient(135deg, #ef4444, #f97316, #fbbf24)', emoji: '🔥' },
    'border-eco-shield': { gradient: 'linear-gradient(135deg, #16a34a, #4ade80, #bbf7d0)', emoji: '🛡️' },
    'border-recycler': { gradient: 'linear-gradient(135deg, #22d3ee, #06b6d4, #0e7490)', emoji: '♻️' },
    'title-champion': { gradient: 'linear-gradient(135deg, #f59e0b, #d97706, #fbbf24)', emoji: '👑' },
    'title-waste-warrior': { gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)', emoji: '⚔️' },
    'title-green-guardian': { gradient: 'linear-gradient(135deg, #059669, #34d399, #6ee7b7)', emoji: '🌿' },
    'badge-gold': { gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)', emoji: '🌟' },
    'badge-cleanup-crew': { gradient: 'linear-gradient(135deg, #64748b, #94a3b8, #cbd5e1)', emoji: '🧹' },
    'badge-eco-star': { gradient: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)', emoji: '⭐' },
};

const RARITY_COLORS = {
    Legendary: '#f59e0b',
    Epic: '#8b5cf6',
    Rare: '#3b82f6',
    Uncommon: '#22c55e',
    Common: '#94a3b8',
};

const RARITY_GLOW = {
    Legendary: '0 0 20px rgba(245,158,11,0.4)',
    Epic: '0 0 16px rgba(139,92,246,0.3)',
    Rare: '0 0 12px rgba(59,130,246,0.2)',
    Uncommon: 'none',
    Common: 'none',
};

const TYPE_LABELS = {
    theme: '🎨 Theme',
    border: '🖼️ Border',
    title: '🏷️ Title',
    badge: '🏅 Badge',
};

const STORE_ITEMS = [
    { id: 'theme-cyberpunk', name: 'Cyberpunk 2077', type: 'theme', value: 'cyberpunk', price: 800, icon: '🌃', description: 'High-contrast neon cyan and magenta with grid aesthetics.', rarity: 'Legendary' },
    { id: 'theme-ocean', name: 'Deep Sea Ocean', type: 'theme', value: 'ocean', price: 350, icon: '🌊', description: 'Calming nautical blues and soft white accents.', rarity: 'Rare' },
    { id: 'theme-emerald', name: 'Emerald Forest', type: 'theme', value: 'emerald', price: 350, icon: '🌲', description: 'Earthy greens and natural textures for the eco-conscious.', rarity: 'Rare' },
    { id: 'theme-sunset', name: 'Sunset Smog', type: 'theme', value: 'sunset', price: 500, icon: '🌅', description: 'Warm amber and smoky purple gradients inspired by urban dusk.', rarity: 'Epic' },
    { id: 'theme-midnight', name: 'Midnight Patrol', type: 'theme', value: 'midnight', price: 600, icon: '🌙', description: 'Deep indigo and silver tones for late-night city cleanup crews.', rarity: 'Epic' },
    { id: 'border-neon', name: 'Neon Red Aura', type: 'border', value: 'neon-aura', price: 150, icon: '🔥', description: 'A legendary glowing fire aura that surrounds your profile.', rarity: 'Epic' },
    { id: 'border-eco-shield', name: 'Eco Shield', type: 'border', value: 'eco-shield', price: 250, icon: '🛡️', description: 'A glowing green protective ring — badge of a true environmentalist.', rarity: 'Rare' },
    { id: 'border-recycler', name: 'Recycler Ring', type: 'border', value: 'recycler-ring', price: 200, icon: '♻️', description: 'An animated recycling symbol border for dedicated waste reporters.', rarity: 'Uncommon' },
    { id: 'title-champion', name: 'City Champion', type: 'title', value: 'champion-title', price: 500, icon: '👑', description: 'An exclusive shimmering title for the top contributors.', rarity: 'Legendary' },
    { id: 'title-waste-warrior', name: 'Waste Warrior', type: 'title', value: 'waste-warrior', price: 300, icon: '⚔️', description: 'For those who fight the war on waste, one report at a time.', rarity: 'Rare' },
    { id: 'title-green-guardian', name: 'Green Guardian', type: 'title', value: 'green-guardian', price: 400, icon: '🌿', description: 'Protector of public spaces — awarded to consistent reporters.', rarity: 'Epic' },
    { id: 'badge-gold', name: 'Golden Shimmer', type: 'badge', value: 'golden-checkmark', price: 100, icon: '🌟', description: 'A shimmering gold badge that stands out everywhere.', rarity: 'Uncommon' },
    { id: 'badge-cleanup-crew', name: 'Cleanup Crew', type: 'badge', value: 'cleanup-crew', price: 75, icon: '🧹', description: 'Show everyone you are part of the active cleanup movement.', rarity: 'Common' },
    { id: 'badge-eco-star', name: 'Eco Star', type: 'badge', value: 'eco-star', price: 200, icon: '⭐', description: 'A verified eco-warrior star for 10+ approved garbage reports.', rarity: 'Rare' },
];

const Store = () => {
    const { user, setUser, loading: authLoading } = useAuth();
    const { theme, equippedBorder, equippedTitle, equipItem, unequipItem } = useTheme();
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', msg: '' });
    const [selectedItem, setSelectedItem] = useState(null);
    const [initLoading, setInitLoading] = useState(true);

    React.useEffect(() => {
        const timer = setTimeout(() => setInitLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const isEquipped = (item) => {
        if (item.type === 'theme') return theme === item.value;
        if (item.type === 'border') return equippedBorder === item.value;
        if (item.type === 'title') return equippedTitle === item.value;
        return false;
    };

    const handleAction = async (item) => {
        const isOwned = user?.inventory?.includes(item.name);

        if (!isOwned) {
            if (!user) return setFeedback({ type: 'error', msg: 'Please login to purchase.' });
            if (user.coins < item.price) return setFeedback({ type: 'error', msg: 'Insufficient EcoCoins!' });

            setLoading(true);
            try {
                const { data } = await api.post('/store/buy', { itemId: item.id, itemPrice: item.price, itemName: item.name });
                setFeedback({ type: 'success', msg: `Purchased: ${item.name}!` });
                setUser(prev => ({ ...prev, coins: data.coins, inventory: data.inventory }));
            } catch (err) {
                setFeedback({ type: 'error', msg: err.response?.data?.error || 'Purchase failed.' });
            } finally {
                setLoading(false);
            }
        } else {
            if (isEquipped(item)) {
                await unequipItem(item.type);
                setFeedback({ type: 'info', msg: `Unequipped ${item.name}` });
            } else {
                await equipItem(item.type, item.value);
                setFeedback({ type: 'success', msg: `Equipped ${item.name}!` });
            }
        }
        setTimeout(() => setFeedback({ type: '', msg: '' }), 3000);
    };

    if (authLoading || initLoading) return <SkeletonStore />;

    return (
        <div className="page" style={{ maxWidth: '1200px' }}>
            {/* Store Header */}
            <div className="store-header">
                <div style={{ flex: 1 }}>
                    <h1 className="section-title store-title">
                        Premium <span style={{ color: 'var(--accent)' }}>Market</span>
                    </h1>
                    <p className="store-subtitle">
                        Exchange your impact for style. Customize your identity with exclusive themes and effects.
                    </p>
                </div>
                {user && (
                    <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card store-wealth-card">
                        <div className="stat-label">Your Wealth</div>
                        <div className="stat-value store-wealth-value">🪙 {user.coins?.toLocaleString() || 0}</div>
                    </motion.div>
                )}
            </div>

            {/* Notification */}
            <AnimatePresence>
                {feedback.msg && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                        className={`alert alert-${feedback.type}`}
                        style={{ marginBottom: '2rem', textAlign: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '700' }}>
                        {feedback.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Market Grid */}
            <div className="grid grid-3">
                {STORE_ITEMS.map((item, i) => {
                    const isOwned = user?.inventory?.includes(item.name);
                    const equipped = isEquipped(item);
                    const preview = ITEM_PREVIEWS[item.id];

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            whileHover={{ y: -6, boxShadow: RARITY_GLOW[item.rarity] || 'none' }}
                            onClick={() => setSelectedItem(item)}
                            className={`card store-item-card ${equipped ? 'store-item-equipped' : ''}`}
                            style={{ cursor: 'pointer', borderColor: equipped ? '#22c55e' : undefined }}
                        >
                            {/* Preview Image */}
                            <div style={{
                                height: '120px', borderRadius: '12px', marginBottom: '0.75rem',
                                background: preview?.gradient || '#f1f5f9',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '2.5rem', position: 'relative', overflow: 'hidden',
                            }}>
                                <span style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}>{preview?.emoji || item.icon}</span>
                                {equipped && (
                                    <div style={{
                                        position: 'absolute', top: '8px', right: '8px',
                                        background: '#22c55e', color: '#fff', fontSize: '0.6rem', fontWeight: 800,
                                        padding: '2px 8px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em',
                                    }}>Equipped</div>
                                )}
                            </div>

                            {/* Rarity + Type */}
                            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                <span style={{
                                    background: RARITY_COLORS[item.rarity], color: '#fff',
                                    fontSize: '0.6rem', fontWeight: 800, padding: '2px 8px',
                                    borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em',
                                }}>{item.rarity}</span>
                                <span style={{
                                    background: '#f1f5f9', color: '#475569',
                                    fontSize: '0.6rem', fontWeight: 700, padding: '2px 8px',
                                    borderRadius: '999px', textTransform: 'uppercase',
                                }}>{TYPE_LABELS[item.type] || item.type}</span>
                            </div>

                            <h3 className="store-item-name">{item.name}</h3>
                            <p className="store-item-desc">{item.description}</p>

                            <div className="store-item-price-bar">
                                <span className="store-item-price" style={{ color: isOwned ? 'var(--text-muted)' : '#111' }}>
                                    {isOwned ? 'OWNED' : `🪙 ${item.price}`}
                                </span>
                            </div>

                            <button
                                onClick={(e) => { e.stopPropagation(); handleAction(item); }}
                                disabled={loading || (!user && !isOwned)}
                                className={`btn ${equipped ? 'btn-secondary' : 'btn-primary'}`}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                {isOwned ? (equipped ? 'Unequip' : '✨ Equip Now') : '🛒 Purchase'}
                            </button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedItem && (() => {
                    const item = selectedItem;
                    const isOwned = user?.inventory?.includes(item.name);
                    const equipped = isEquipped(item);
                    const preview = ITEM_PREVIEWS[item.id];

                    return (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedItem(null)}
                            style={{
                                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
                            }}>
                            <motion.div
                                initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
                                onClick={e => e.stopPropagation()}
                                style={{
                                    background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px',
                                    maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
                                }}>
                                {/* Preview Banner */}
                                <div style={{
                                    height: '200px', background: preview?.gradient || '#f1f5f9',
                                    borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', fontSize: '5rem', position: 'relative',
                                }}>
                                    <span style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}>{preview?.emoji || item.icon}</span>
                                    <button onClick={() => setSelectedItem(null)}
                                        style={{
                                            position: 'absolute', top: '12px', right: '12px',
                                            background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%',
                                            width: '36px', height: '36px', fontSize: '1.1rem', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>✕</button>
                                </div>

                                {/* Body */}
                                <div style={{ padding: '1.5rem' }}>
                                    {/* Badges */}
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                                        <span style={{
                                            background: RARITY_COLORS[item.rarity], color: '#fff',
                                            fontSize: '0.7rem', fontWeight: 800, padding: '0.3rem 0.75rem',
                                            borderRadius: '999px', textTransform: 'uppercase',
                                        }}>{item.rarity}</span>
                                        <span style={{
                                            background: '#f1f5f9', color: '#475569',
                                            fontSize: '0.7rem', fontWeight: 700, padding: '0.3rem 0.75rem',
                                            borderRadius: '999px', textTransform: 'uppercase',
                                        }}>{TYPE_LABELS[item.type]}</span>
                                    </div>

                                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: 900, color: '#111', margin: '0 0 0.5rem' }}>
                                        {item.name}
                                    </h2>
                                    <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.95rem', margin: '0 0 1.25rem' }}>
                                        {item.description}
                                    </p>

                                    {/* What it does */}
                                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>What it does</div>
                                        <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                                            {item.type === 'theme' ? 'Changes the entire color palette of your CityPulse dashboard and all pages.' :
                                             item.type === 'border' ? 'Adds a special visual border effect around your profile avatar.' :
                                             item.type === 'title' ? 'Displays a unique title tag below your username on your profile.' :
                                             'Displays a special badge icon on your profile and leaderboard entry.'}
                                        </p>
                                    </div>

                                    {/* Price & Action */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8' }}>Price</div>
                                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 900, color: isOwned ? '#22c55e' : '#111' }}>
                                                {isOwned ? '✅ Owned' : `🪙 ${item.price}`}
                                            </div>
                                        </div>
                                        {user && !isOwned && (
                                            <div style={{ fontSize: '0.8rem', color: user.coins >= item.price ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                                                {user.coins >= item.price ? `You have 🪙 ${user.coins}` : `Need 🪙 ${item.price - user.coins} more`}
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => handleAction(item)}
                                        disabled={loading || (!user && !isOwned)}
                                        style={{
                                            width: '100%', padding: '0.85rem',
                                            background: equipped ? '#64748b' : isOwned ? '#22c55e' : '#0f172a',
                                            color: equipped ? '#fff' : isOwned ? '#fff' : '#FFDC2B',
                                            border: 'none', borderRadius: '12px',
                                            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem',
                                            cursor: loading ? 'not-allowed' : 'pointer',
                                            textTransform: 'uppercase', letterSpacing: '0.05em',
                                        }}>
                                        {isOwned ? (equipped ? '🔄 Unequip' : '✨ Equip Now') : '🛒 Purchase Item'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            {/* Footer */}
            <div className="store-footer">
                <p>Cosmetics are shared across your account. Changes apply globally instantly.</p>
                <div className="store-footer-perks">
                    <span>✓ Global Persistence</span>
                    <span>✓ No Hidden Fees</span>
                    <span>✓ Eco-Verified</span>
                </div>
            </div>
        </div>
    );
};

export default Store;
