import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import { SkeletonStore } from '../components/ui/SkeletonLoader';
import '../styles/Store.css';

const STORE_ITEMS = [
    {
        id: 'theme-cyberpunk',
        name: 'Cyberpunk 2077',
        type: 'theme',
        value: 'cyberpunk',
        price: 800,
        icon: '🌃',
        description: 'High-contrast neon cyan and magenta with grid aesthetics.',
        rarity: 'Legendary'
    },
    {
        id: 'theme-ocean',
        name: 'Deep Sea Ocean',
        type: 'theme',
        value: 'ocean',
        price: 350,
        icon: '🌊',
        description: 'Calming nautical blues and soft white accents.',
        rarity: 'Rare'
    },
    {
        id: 'theme-emerald',
        name: 'Emerald Forest',
        type: 'theme',
        value: 'emerald',
        price: 350,
        icon: '🌲',
        description: 'Earthy greens and natural textures for the eco-conscious.',
        rarity: 'Rare'
    },
    {
        id: 'theme-sunset',
        name: 'Sunset Smog',
        type: 'theme',
        value: 'sunset',
        price: 500,
        icon: '🌅',
        description: 'Warm amber and smoky purple gradients inspired by urban dusk.',
        rarity: 'Epic'
    },
    {
        id: 'theme-midnight',
        name: 'Midnight Patrol',
        type: 'theme',
        value: 'midnight',
        price: 600,
        icon: '🌙',
        description: 'Deep indigo and silver tones for late-night city cleanup crews.',
        rarity: 'Epic'
    },
    {
        id: 'border-neon',
        name: 'Neon Red Aura',
        type: 'border',
        value: 'neon-aura',
        price: 150,
        icon: '🔥',
        description: 'A legendary glowing fire aura that surrounds your profile.',
        rarity: 'Epic'
    },
    {
        id: 'border-eco-shield',
        name: 'Eco Shield',
        type: 'border',
        value: 'eco-shield',
        price: 250,
        icon: '🛡️',
        description: 'A glowing green protective ring — badge of a true environmentalist.',
        rarity: 'Rare'
    },
    {
        id: 'border-recycler',
        name: 'Recycler Ring',
        type: 'border',
        value: 'recycler-ring',
        price: 200,
        icon: '♻️',
        description: 'An animated recycling symbol border for dedicated waste reporters.',
        rarity: 'Uncommon'
    },
    {
        id: 'title-champion',
        name: 'City Champion',
        type: 'title',
        value: 'champion-title',
        price: 500,
        icon: '👑',
        description: 'An exclusive shimmering title for the top contributors.',
        rarity: 'Legendary'
    },
    {
        id: 'title-waste-warrior',
        name: 'Waste Warrior',
        type: 'title',
        value: 'waste-warrior',
        price: 300,
        icon: '⚔️',
        description: 'For those who fight the war on waste, one report at a time.',
        rarity: 'Rare'
    },
    {
        id: 'title-green-guardian',
        name: 'Green Guardian',
        type: 'title',
        value: 'green-guardian',
        price: 400,
        icon: '🌿',
        description: 'Protector of public spaces — awarded to consistent reporters.',
        rarity: 'Epic'
    },
    {
        id: 'badge-gold',
        name: 'Golden Shimmer',
        type: 'badge',
        value: 'golden-checkmark',
        price: 100,
        icon: '🌟',
        description: 'A shimmering gold badge that stands out everywhere.',
        rarity: 'Uncommon'
    },
    {
        id: 'badge-cleanup-crew',
        name: 'Cleanup Crew',
        type: 'badge',
        value: 'cleanup-crew',
        price: 75,
        icon: '🧹',
        description: 'Show everyone you are part of the active cleanup movement.',
        rarity: 'Common'
    },
    {
        id: 'badge-eco-star',
        name: 'Eco Star',
        type: 'badge',
        value: 'eco-star',
        price: 200,
        icon: '⭐',
        description: 'A verified eco-warrior star for 10+ approved garbage reports.',
        rarity: 'Rare'
    },
];

const Store = () => {
    const { user, setUser, loading: authLoading } = useAuth();
    const { theme, equippedBorder, equippedTitle, equipItem, unequipItem } = useTheme();
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', msg: '' });
    const [previewItem, setPreviewItem] = useState(null);
    const [initLoading, setInitLoading] = useState(true);

    React.useEffect(() => {
        const timer = setTimeout(() => setInitLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleAction = async (item) => {
        const isOwned = user?.inventory?.includes(item.name);

        if (!isOwned) {
            // BUY LOGIC
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
            // EQUIP LOGIC
            const isEquipped = item.type === 'theme' ? theme === item.value :
                item.type === 'border' ? equippedBorder === item.value :
                    equippedTitle === item.value;

            if (isEquipped) {
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
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="card store-wealth-card"
                    >
                        <div className="stat-label">Your Wealth</div>
                        <div className="stat-value store-wealth-value">
                            🪙 {user.coins?.toLocaleString() || 0}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Notification Area */}
            <AnimatePresence>
                {feedback.msg && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className={`alert alert-${feedback.type}`}
                        style={{ marginBottom: '2rem', textAlign: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: '700' }}
                    >
                        {feedback.msg}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Market Grid */}
            <div className="grid grid-3">
                {STORE_ITEMS.map((item, i) => {
                    const isOwned = user?.inventory?.includes(item.name);
                    const isEquipped = item.type === 'theme' ? theme === item.value :
                        item.type === 'border' ? equippedBorder === item.value :
                            equippedTitle === item.value;

                    return (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className={`card store-item-card ${isEquipped ? 'store-item-equipped' : ''}`}
                            onHoverStart={() => setPreviewItem(item)}
                            onHoverEnd={() => setPreviewItem(null)}
                        >
                            {/* Rarity Tag */}
                            <div className="store-item-rarity" style={{ background: item.rarity === 'Legendary' ? '#f59e0b' : item.rarity === 'Epic' ? '#8b5cf6' : '#ffffff', color: item.rarity === 'Legendary' || item.rarity === 'Epic' ? 'white' : '#111' }}>
                                {item.rarity}
                            </div>

                            <div className="store-item-icon">
                                {item.icon}
                            </div>

                            <h3 className="store-item-name">
                                {item.name}
                            </h3>

                            <p className="store-item-desc">
                                {item.description}
                            </p>

                            <div className="store-item-price-bar">
                                <span className="store-item-price" style={{ color: isOwned ? 'var(--text-muted)' : '#111' }}>
                                    {isOwned ? 'OWNED' : `🪙 ${item.price}`}
                                </span>
                                <span className="store-item-type">
                                    {item.type.replace('_', ' ')}
                                </span>
                            </div>

                            <button
                                onClick={() => handleAction(item)}
                                disabled={loading || (!user && !isOwned)}
                                className={`btn ${isEquipped ? 'btn-secondary' : 'btn-primary'}`}
                                style={{ width: '100%', justifyContent: 'center' }}
                            >
                                {isOwned ? (isEquipped ? 'Unequip' : 'Equip Now') : 'Purchase'}
                            </button>
                        </motion.div>
                    );
                })}
            </div>

            {/* Footer / Info */}
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
