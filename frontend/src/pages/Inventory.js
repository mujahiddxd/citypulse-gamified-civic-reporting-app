import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Same item definitions as the store
const ALL_ITEMS = [
    { id: 'theme-cyberpunk', name: 'Cyberpunk 2077', type: 'theme', value: 'cyberpunk', price: 800, icon: '🌃', rarity: 'Legendary' },
    { id: 'theme-ocean', name: 'Deep Sea Ocean', type: 'theme', value: 'ocean', price: 350, icon: '🌊', rarity: 'Rare' },
    { id: 'theme-emerald', name: 'Emerald Forest', type: 'theme', value: 'emerald', price: 350, icon: '🌲', rarity: 'Rare' },
    { id: 'border-neon', name: 'Neon Red Aura', type: 'border', value: 'neon-aura', price: 150, icon: '🔥', rarity: 'Epic' },
    { id: 'title-champion', name: 'City Champion', type: 'title', value: 'champion-title', price: 500, icon: '👑', rarity: 'Legendary' },
    { id: 'badge-gold', name: 'Golden Shimmer', type: 'badge', value: 'golden-checkmark', price: 100, icon: '🌟', rarity: 'Uncommon' },
];

const RARITY_COLORS = {
    Legendary: '#f59e0b',
    Epic: '#8b5cf6',
    Rare: '#3b82f6',
    Uncommon: '#22c55e',
};

const Inventory = () => {
    const { user, setUser } = useAuth();
    const { theme, equippedBorder, equippedTitle, equipItem, unequipItem } = useTheme();
    const [feedback, setFeedback] = React.useState('');

    const inventory = user?.inventory || [];

    // Filter owned items (exclude internal tags)
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

    // Stats
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

                {/* Stats cards */}
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

            {/* Feedback toast */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="alert alert-success"
                        style={{ marginBottom: '1.5rem', fontWeight: '700', fontSize: '1rem' }}
                    >
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
                    {/* Equipped Section */}
                    {ownedItems.some(i => isEquipped(i)) && (
                        <>
                            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                Currently Equipped
                            </h2>
                            <div className="grid grid-3" style={{ marginBottom: '2rem' }}>
                                {ownedItems.filter(i => isEquipped(i)).map((item, idx) => (
                                    <InventoryCard key={item.id} item={item} equipped={true} onEquip={handleEquip} />
                                ))}
                            </div>
                        </>
                    )}

                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                        All Items
                    </h2>
                    <div className="grid grid-3">
                        {ownedItems.map((item, idx) => (
                            <InventoryCard key={item.id} item={item} equipped={isEquipped(item)} onEquip={handleEquip} index={idx} />
                        ))}
                    </div>
                </>
            )}

            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                <Link to="/store" className="btn btn-secondary">🛍 Browse Store for More</Link>
            </div>
        </div>
    );
};

const InventoryCard = ({ item, equipped, onEquip, index = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.06 }}
        className="card"
        style={{
            border: equipped ? '3px solid #22c55e' : undefined,
            boxShadow: equipped ? '0 0 0 2px #22c55e33, var(--shadow-card)' : undefined,
        }}
    >
        {equipped && (
            <div style={{
                position: 'absolute', top: '0.75rem', right: '0.75rem',
                background: '#22c55e', color: '#fff', borderRadius: '999px',
                fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.1em',
                padding: '0.2rem 0.6rem', textTransform: 'uppercase',
            }}>Equipped</div>
        )}

        <div style={{
            display: 'inline-block', padding: '0.3rem 0.75rem', borderRadius: '999px',
            background: RARITY_COLORS[item.rarity] || '#fff',
            color: ['Legendary', 'Epic', 'Rare'].includes(item.rarity) ? '#fff' : '#111',
            fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
            letterSpacing: '0.1em', marginBottom: '0.75rem',
        }}>{item.rarity}</div>

        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: '800', fontSize: '1rem', marginBottom: '0.25rem' }}>{item.name}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>{item.type}</div>

        <button
            onClick={() => onEquip(item)}
            className={`btn ${equipped ? 'btn-secondary' : 'btn-primary'}`}
            style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem' }}
        >
            {equipped ? 'Unequip' : '✨ Equip'}
        </button>
    </motion.div>
);

export default Inventory;
