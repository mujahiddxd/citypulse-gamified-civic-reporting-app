import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SkeletonInventory } from '../components/ui/SkeletonLoader';

const ALL_ITEMS = [
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
    Legendary: '#f59e0b', Epic: '#8b5cf6', Rare: '#3b82f6', Uncommon: '#22c55e', Common: '#94a3b8',
};

const TYPE_LABELS = { theme: '🎨 Theme', border: '🖼️ Border', title: '🏷️ Title', badge: '🏅 Badge' };

const Inventory = () => {
    const { user, setUser, loading: authLoading } = useAuth();
    const { theme, equippedBorder, equippedTitle, equipItem, unequipItem } = useTheme();
    const [feedback, setFeedback] = React.useState('');
    const [selectedItem, setSelectedItem] = React.useState(null);
    const [initLoading, setInitLoading] = React.useState(true);

    React.useEffect(() => {
        const timer = setTimeout(() => setInitLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    if (authLoading || initLoading) return <SkeletonInventory />;

    const inventory = user?.inventory || [];
    const ownedItems = ALL_ITEMS.filter(item => inventory.includes(item.name));

    const isEquipped = (item) => {
        if (item.type === 'theme') return theme === item.value;
        if (item.type === 'border') return equippedBorder === item.value;
        if (item.type === 'title') return equippedTitle === item.value;
        return false;
    };

    const handleEquip = async (item) => {
        if (isEquipped(item)) {
            await unequipItem(item.type);
            setFeedback(`Unequipped ${item.name}`);
        } else {
            await equipItem(item.type, item.value);
            setFeedback(`✅ Equipped ${item.name}!`);
        }
        setTimeout(() => setFeedback(''), 3000);
    };

    const streak = (() => {
        const s = inventory.find(i => i.startsWith('DAILY_STREAK:'));
        return s ? parseInt(s.split(':')[1]) : 0;
    })();

    const nextClaim = (() => {
        const c = inventory.find(i => i.startsWith('DAILY_CLAIMED:'));
        if (!c) return null;
        const ts = parseInt(c.split(':')[1]);
        const next = ts + 24 * 60 * 60 * 1000;
        return next > Date.now() ? new Date(next) : null;
    })();

    if (!user) {
        return (
            <div className="page" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎒</div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', marginBottom: '1rem' }}>Your Inventory</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Log in to view your items.</p>
                <Link to="/login" className="btn btn-primary">Log In</Link>
            </div>
        );
    }

    // Group items by type
    const categories = [
        { key: 'theme', label: '🎨 Themes', items: ownedItems.filter(i => i.type === 'theme') },
        { key: 'border', label: '🖼️ Borders', items: ownedItems.filter(i => i.type === 'border') },
        { key: 'title', label: '🏷️ Titles', items: ownedItems.filter(i => i.type === 'title') },
        { key: 'badge', label: '🏅 Badges', items: ownedItems.filter(i => i.type === 'badge') },
    ].filter(c => c.items.length > 0);

    return (
        <div className="page" style={{ maxWidth: '1200px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: '900', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        🎒 Inventory
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        {ownedItems.length} item{ownedItems.length !== 1 ? 's' : ''} owned
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="card" style={{ padding: '1rem 1.5rem', textAlign: 'center', minWidth: '120px' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: '900' }}>🪙 {user.coins?.toLocaleString() || 0}</div>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginTop: '4px' }}>EcoCoins</div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.5rem', textAlign: 'center', minWidth: '120px' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: '900' }}>⚡ {user.xp?.toLocaleString() || 0}</div>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginTop: '4px' }}>Total XP</div>
                    </div>
                    <div className="card" style={{ padding: '1rem 1.5rem', textAlign: 'center', minWidth: '120px' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', fontWeight: '900' }}>🔥 {streak}</div>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginTop: '4px' }}>Day Streak</div>
                    </div>
                </div>
            </div>

            {/* Feedback */}
            <AnimatePresence>
                {feedback && (
                    <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        className="alert alert-success" style={{ marginBottom: '1.5rem', fontWeight: '700', fontSize: '1rem' }}>
                        {feedback}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Next daily reward */}
            {nextClaim && (
                <div className="card" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>⏰</span>
                    <div>
                        <strong style={{ fontFamily: 'var(--font-display)' }}>Next Daily Reward</strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Available at {nextClaim.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · Streak: 🔥 {streak} days
                        </div>
                    </div>
                </div>
            )}

            {/* Empty state */}
            {ownedItems.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🛒</div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '0.75rem' }}>No items yet</h3>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Head to the store and spend your EcoCoins on themes, borders, and titles.</p>
                    <Link to="/store" className="btn btn-primary">🛍 Go to Store</Link>
                </div>
            ) : (
                <>
                    {/* Category sections */}
                    {categories.map(cat => (
                        <div key={cat.key} style={{ marginBottom: '2rem' }}>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                {cat.label}
                            </h2>
                            <div className="grid grid-3">
                                {cat.items.map((item, idx) => {
                                    const equipped = isEquipped(item);
                                    const preview = ITEM_PREVIEWS[item.id];
                                    return (
                                        <motion.div
                                            key={item.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.06 }}
                                            whileHover={{ y: -4 }}
                                            onClick={() => setSelectedItem(item)}
                                            className="card"
                                            style={{
                                                cursor: 'pointer',
                                                border: equipped ? '3px solid #22c55e' : undefined,
                                                boxShadow: equipped ? '0 0 0 2px #22c55e33, var(--shadow-card)' : undefined,
                                            }}
                                        >
                                            {/* Preview */}
                                            <div style={{
                                                height: '100px', borderRadius: '10px', marginBottom: '0.75rem',
                                                background: preview?.gradient || '#f1f5f9',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '2rem', position: 'relative',
                                            }}>
                                                <span style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>{preview?.emoji || item.icon}</span>
                                                {equipped && (
                                                    <div style={{
                                                        position: 'absolute', top: '6px', right: '6px',
                                                        background: '#22c55e', color: '#fff', fontSize: '0.55rem',
                                                        fontWeight: 800, padding: '2px 6px', borderRadius: '999px',
                                                        textTransform: 'uppercase',
                                                    }}>Equipped</div>
                                                )}
                                            </div>

                                            {/* Rarity */}
                                            <div style={{ display: 'inline-block', padding: '0.2rem 0.6rem', borderRadius: '999px', background: RARITY_COLORS[item.rarity] || '#fff', color: ['Legendary', 'Epic', 'Rare'].includes(item.rarity) ? '#fff' : '#111', fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>{item.rarity}</div>

                                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '1rem', marginBottom: '0.25rem' }}>{item.name}</div>
                                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>{TYPE_LABELS[item.type]}</div>

                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleEquip(item); }}
                                                className={`btn ${equipped ? 'btn-secondary' : 'btn-primary'}`}
                                                style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
                                            >
                                                {equipped ? '🔄 Unequip' : '✨ Equip'}
                                            </button>
                                        </motion.div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </>
            )}

            {/* Detail Modal */}
            <AnimatePresence>
                {selectedItem && (() => {
                    const item = selectedItem;
                    const equipped = isEquipped(item);
                    const preview = ITEM_PREVIEWS[item.id];
                    return (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setSelectedItem(null)}
                            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                            <motion.div initial={{ scale: 0.9, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 30 }}
                                onClick={e => e.stopPropagation()}
                                style={{ background: '#fff', borderRadius: '20px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflow: 'auto', boxShadow: '0 25px 60px rgba(0,0,0,0.3)' }}>

                                {/* Preview Banner */}
                                <div style={{ height: '180px', background: preview?.gradient || '#f1f5f9', borderRadius: '20px 20px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '4.5rem', position: 'relative' }}>
                                    <span style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.4))' }}>{preview?.emoji || item.icon}</span>
                                    <button onClick={() => setSelectedItem(null)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                                </div>

                                <div style={{ padding: '1.5rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                                        <span style={{ background: RARITY_COLORS[item.rarity], color: '#fff', fontSize: '0.7rem', fontWeight: 800, padding: '0.3rem 0.75rem', borderRadius: '999px', textTransform: 'uppercase' }}>{item.rarity}</span>
                                        <span style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.7rem', fontWeight: 700, padding: '0.3rem 0.75rem', borderRadius: '999px', textTransform: 'uppercase' }}>{TYPE_LABELS[item.type]}</span>
                                    </div>
                                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 900, color: '#111', margin: '0 0 0.5rem' }}>{item.name}</h2>
                                    <p style={{ color: '#475569', lineHeight: 1.6, fontSize: '0.9rem', margin: '0 0 1.25rem' }}>{item.description}</p>

                                    <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1rem', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>What it does</div>
                                        <p style={{ fontSize: '0.85rem', color: '#334155', lineHeight: 1.5, margin: 0 }}>
                                            {item.type === 'theme' ? 'Changes the entire color palette of your CityPulse dashboard.' :
                                             item.type === 'border' ? 'Adds a special visual border effect around your profile avatar.' :
                                             item.type === 'title' ? 'Displays a unique title tag below your username.' :
                                             'Displays a special badge icon on your profile.'}
                                        </p>
                                    </div>

                                    <button onClick={() => handleEquip(item)}
                                        style={{
                                            width: '100%', padding: '0.85rem',
                                            background: equipped ? '#64748b' : '#22c55e', color: '#fff',
                                            border: 'none', borderRadius: '12px',
                                            fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem',
                                            cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em',
                                        }}>
                                        {equipped ? '🔄 Unequip Item' : '✨ Equip Item'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <Link to="/store" className="btn btn-secondary">🛍 Browse Store for More</Link>
            </div>
        </div>
    );
};

export default Inventory;
