import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { SkeletonStore } from '../components/ui/SkeletonLoader';
import '../styles/Store.css';

// ── Visual Previews and Item Catalog ──────────────────────────────────────────
const ITEM_PREVIEWS = {
    'theme-cyberpunk': { gradient: 'linear-gradient(135deg, #06b6d4, #ec4899, #1e1b4b)', emoji: '🌃' },
    'theme-ocean': { gradient: 'linear-gradient(135deg, #0077b6, #00b4d8, #90e0ef)', emoji: '🌊' },
    'theme-emerald': { gradient: 'linear-gradient(135deg, #065f46, #10b981, #6ee7b7)', emoji: '🌲' },
    'theme-sunset': { gradient: 'linear-gradient(135deg, #f59e0b, #ef4444, #7c3aed)', emoji: '🌅' },
    'theme-midnight': { gradient: 'linear-gradient(135deg, #1e1b4b, #4338ca, #a5b4fc)', emoji: '🌙' },
    'border-neon': { gradient: 'linear-gradient(135deg, #ef4444, #f97316, #fbbf24)', emoji: '🔥' },
    'border-eco-shield': { gradient: 'linear-gradient(135deg, #16a34a, #4ade80, #bbf7d0)', emoji: '🛡️' },
    'border-recycler': { gradient: 'linear-gradient(135deg, #22d3ee, #06b6d4, #0e7490)', emoji: '♻️' },
    'title-legend': { gradient: 'linear-gradient(135deg, #ec4899, #8b5cf6, #3b82f6)', emoji: '👑' },
    'title-champion': { gradient: 'linear-gradient(135deg, #f59e0b, #d97706, #fbbf24)', emoji: '🏆' },
    'title-waste-warrior': { gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6, #a78bfa)', emoji: '⚔️' },
    'title-green-guardian': { gradient: 'linear-gradient(135deg, #059669, #34d399, #6ee7b7)', emoji: '🌿' },
    'badge-gold': { gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)', emoji: '🌟' },
    'badge-cleanup-crew': { gradient: 'linear-gradient(135deg, #64748b, #94a3b8, #cbd5e1)', emoji: '🧹' },
    'badge-eco-star': { gradient: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)', emoji: '⭐' },
};

const RARITY_COLORS = {
    Legendary: '#ff9600',
    Epic: '#a855f7',
    Rare: '#1cb0f6',
    Uncommon: '#58cc02',
    Common: '#777777',
};

const TYPE_LABELS = {
    theme: '🎨 Theme',
    border: '🖼️ Border',
    title: '🏷️ Title',
    badge: '🏅 Badge',
};

const STORE_ITEMS = [
    { id: 'theme-cyberpunk', name: 'Cyberpunk', type: 'theme', value: 'cyberpunk', price: 400, icon: '🌃', description: 'High-contrast neon cyan and magenta with futuristic grid aesthetics.', rarity: 'Legendary' },
    { id: 'theme-ocean', name: 'Deep Sea Ocean', type: 'theme', value: 'ocean', price: 175, icon: '🌊', description: 'Calming nautical blues and soft white accents.', rarity: 'Rare' },
    { id: 'theme-emerald', name: 'Emerald Forest', type: 'theme', value: 'emerald', price: 175, icon: '🌲', description: 'Earthy greens and natural textures for the eco-conscious.', rarity: 'Rare' },
    { id: 'theme-sunset', name: 'Sunset Smog', type: 'theme', value: 'sunset', price: 250, icon: '🌅', description: 'Warm amber and smoky purple gradients inspired by urban dusk.', rarity: 'Epic' },
    { id: 'theme-midnight', name: 'Midnight Patrol', type: 'theme', value: 'midnight', price: 300, icon: '🌙', description: 'Deep indigo and silver tones for late-night city cleanup crews.', rarity: 'Epic' },
    { id: 'border-neon', name: 'Neon Red Aura', type: 'border', value: 'neon-aura', price: 75, icon: '🔥', description: 'A legendary glowing fire aura that surrounds your profile avatar.', rarity: 'Epic' },
    { id: 'border-eco-shield', name: 'Eco Shield', type: 'border', value: 'eco-shield', price: 125, icon: '🛡️', description: 'A glowing green protective ring, badge of a true environmentalist.', rarity: 'Rare' },
    { id: 'border-recycler', name: 'Recycler Ring', type: 'border', value: 'recycler-ring', price: 100, icon: '♻️', description: 'An animated recycling symbol border for dedicated waste reporters.', rarity: 'Uncommon' },
    { id: 'title-legend', name: 'Eco Legend', type: 'title', value: 'eco-legend', price: 500, icon: '👑', description: 'The ultimate title for top civic contributors in the city.', rarity: 'Legendary' },
    { id: 'title-champion', name: 'City Champion', type: 'title', value: 'champion-title', price: 250, icon: '🏆', description: 'An exclusive shimmering title for leaders of the leaderboard.', rarity: 'Legendary' },
    { id: 'title-waste-warrior', name: 'Waste Warrior', type: 'title', value: 'waste-warrior', price: 150, icon: '⚔️', description: 'For those who fight the war on waste, one report at a time.', rarity: 'Rare' },
    { id: 'title-green-guardian', name: 'Green Guardian', type: 'title', value: 'green-guardian', price: 200, icon: '🌿', description: 'Protector of public spaces, awarded to consistent reporters.', rarity: 'Epic' },
    { id: 'badge-gold', name: 'Golden Shimmer', type: 'badge', value: 'golden-checkmark', price: 50, icon: '🌟', description: 'A shimmering gold badge that stands out everywhere in the city.', rarity: 'Uncommon' },
    { id: 'badge-cleanup-crew', name: 'Cleanup Crew', type: 'badge', value: 'cleanup-crew', price: 35, icon: '🧹', description: 'Show everyone you are part of the active cleanup movement.', rarity: 'Common' },
    { id: 'badge-eco-star', name: 'Eco Star', type: 'badge', value: 'eco-star', price: 100, icon: '⭐', description: 'A verified eco-warrior star for approved garbage reports.', rarity: 'Rare' },
];

// ── Synthesized Sound Effects (Pure Web Audio, Zero Dependencies) ─────────────
const playPurchaseChime = () => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.08);
            gain.gain.setValueAtTime(0.15, ctx.currentTime + index * 0.08);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.08 + 0.35);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + index * 0.08);
            osc.stop(ctx.currentTime + index * 0.08 + 0.35);
        });
    } catch (e) {
        // Audio policy protection
    }
};

const playInsufficientBoop = () => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const notes = [329.63, 246.94]; // E4, B3 descending
        notes.forEach((freq, index) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + index * 0.1);
            gain.gain.setValueAtTime(0.12, ctx.currentTime + index * 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + index * 0.1 + 0.25);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(ctx.currentTime + index * 0.1);
            osc.stop(ctx.currentTime + index * 0.1 + 0.25);
        });
    } catch (e) {
        // Audio policy protection
    }
};

// ── Duolingo Confetti Burst ───────────────────────────────────────────────────
const triggerDuolingoConfetti = () => {
    try {
        confetti({
            particleCount: 80,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#58cc02', '#a5ed6e', '#1cb0f6', '#ffc800', '#ff9600', '#a855f7'],
            disableForReducedMotion: true,
        });

        setTimeout(() => {
            confetti({
                particleCount: 45,
                angle: 60,
                spread: 60,
                origin: { x: 0, y: 0.7 },
                colors: ['#58cc02', '#1cb0f6', '#ffc800'],
                disableForReducedMotion: true,
            });
        }, 150);

        setTimeout(() => {
            confetti({
                particleCount: 45,
                angle: 120,
                spread: 60,
                origin: { x: 1, y: 0.7 },
                colors: ['#58cc02', '#1cb0f6', '#ffc800'],
                disableForReducedMotion: true,
            });
        }, 300);
    } catch (e) {
        // Confetti fallback
    }
};

const Store = () => {
    const { user, setUser, loading: authLoading } = useAuth();
    const { theme, equippedBorder, equippedTitle, equipItem, unequipItem } = useTheme();
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState({ type: '', msg: '' });
    const [selectedItem, setSelectedItem] = useState(null);
    const [purchasedItem, setPurchasedItem] = useState(null);
    const [insufficientItem, setInsufficientItem] = useState(null);
    const [loginPrompt, setLoginPrompt] = useState(false);
    const [initLoading, setInitLoading] = useState(true);
    const shouldReduceMotion = useReducedMotion();

    React.useEffect(() => {
        const timer = setTimeout(() => setInitLoading(false), 200);
        return () => clearTimeout(timer);
    }, []);

    const isEquipped = (item) => {
        if (!item) return false;
        if (item.type === 'theme') return theme === item.value;
        if (item.type === 'border') return equippedBorder === item.value;
        if (item.type === 'title') return equippedTitle === item.value;
        return false;
    };

    const handleAction = async (item) => {
        const isOwned = user?.inventory?.includes(item.name);

        if (!isOwned) {
            // Check if guest
            if (!user) {
                playInsufficientBoop();
                setLoginPrompt(true);
                return;
            }

            // Check if insufficient balance -> Show Duolingo Insufficient Coins Popup
            if ((user.coins || 0) < item.price) {
                playInsufficientBoop();
                setInsufficientItem(item);
                return;
            }

            setLoading(true);
            try {
                const { data } = await api.post('/store/buy', {
                    itemId: item.id,
                    itemPrice: item.price,
                    itemName: item.name
                });

                // Update user state with new coins and inventory
                setUser(prev => ({ ...prev, coins: data.coins, inventory: data.inventory }));

                // Close detail modal if open
                setSelectedItem(null);

                // Open celebratory Duolingo Purchase Animation Modal
                setPurchasedItem(item);
                triggerDuolingoConfetti();
                playPurchaseChime();
            } catch (err) {
                setFeedback({ type: 'error', msg: err.response?.data?.error || 'Purchase failed.' });
                setTimeout(() => setFeedback({ type: '', msg: '' }), 3500);
            } finally {
                setLoading(false);
            }
        } else {
            // Already owned -> Equip / Unequip
            if (isEquipped(item)) {
                await unequipItem(item.type);
                setFeedback({ type: 'info', msg: `Unequipped ${item.name}` });
            } else {
                await equipItem(item.type, item.value);
                setFeedback({ type: 'success', msg: `Equipped ${item.name}!` });
            }
            setTimeout(() => setFeedback({ type: '', msg: '' }), 3000);
        }
    };

    if (authLoading || initLoading) return <SkeletonStore />;

    const userCoins = user?.coins || 0;

    return (
        <div className="store-page-wrapper">
            <div className="store-page-inner">
                {/* ── Store Header (Original Placement: Left Title, Right Wealth Card) ── */}
                <div className="store-header">
                    <div className="store-header-text">
                        <h1 className="store-title">
                            Duolingo <span className="store-title-accent">Market</span>
                        </h1>
                        <p className="store-subtitle">
                            Exchange your impact for style. Customize your identity with exclusive themes and effects.
                        </p>
                    </div>

                    {/* Wealth Card (Anchored on top right) */}
                    <div className="store-wealth-card">
                        <div className="store-wealth-label">Your Wealth</div>
                        <div className="store-wealth-value">
                            <span className="store-wealth-coin" aria-hidden="true">🪙</span>
                            <span>{userCoins.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* ── Feedback Notification ── */}
                <AnimatePresence>
                    {feedback.msg && (
                        <motion.div
                            initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            className={`store-alert store-alert-${feedback.type}`}
                        >
                            {feedback.msg}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Original 3-Column Grid of Store Cards ── */}
                <div className="grid grid-3 store-grid">
                    {STORE_ITEMS.map((item, i) => {
                        const isOwned = user?.inventory?.includes(item.name);
                        const equipped = isEquipped(item);
                        const preview = ITEM_PREVIEWS[item.id];
                        const rarityColor = RARITY_COLORS[item.rarity] || '#777777';

                        return (
                            <motion.div
                                key={item.id}
                                initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25, delay: i * 0.03 }}
                                onClick={() => setSelectedItem(item)}
                                className={`store-item-card ${equipped ? 'store-item-equipped' : ''}`}
                            >
                                {/* Preview Banner */}
                                <div
                                    className="store-item-preview"
                                    style={{ background: preview?.gradient || '#e2e8f0' }}
                                >
                                    <span className="store-item-emoji" aria-hidden="true">
                                        {preview?.emoji || item.icon}
                                    </span>
                                    {equipped && (
                                        <div className="store-equipped-badge">
                                            Equipped
                                        </div>
                                    )}
                                </div>

                                {/* Rarity + Type Badges */}
                                <div className="store-badge-row">
                                    <span
                                        className="store-rarity-pill"
                                        style={{ background: rarityColor }}
                                    >
                                        {item.rarity}
                                    </span>
                                    <span className="store-type-pill">
                                        {TYPE_LABELS[item.type] || item.type}
                                    </span>
                                </div>

                                <h3 className="store-item-name">{item.name}</h3>
                                <p className="store-item-desc">{item.description}</p>

                                {/* Price Bar */}
                                <div className="store-item-price-bar">
                                    <span className="store-price-label">Price</span>
                                    <span className={`store-item-price ${isOwned ? 'is-owned' : ''}`}>
                                        {isOwned ? 'OWNED' : `🪙 ${item.price}`}
                                    </span>
                                </div>

                                {/* Duolingo 3D Button */}
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAction(item);
                                    }}
                                    disabled={loading}
                                    className={`duo-btn ${
                                        equipped
                                            ? 'duo-btn-muted'
                                            : isOwned
                                            ? 'duo-btn-accent'
                                            : 'duo-btn-primary'
                                    }`}
                                >
                                    {equipped ? 'UNEQUIP' : isOwned ? 'EQUIP NOW' : 'PURCHASE'}
                                </button>
                            </motion.div>
                        );
                    })}
                </div>

                {/* ── Detail Modal (Original Try-On Dialog) ── */}
                <AnimatePresence>
                    {selectedItem && (() => {
                        const item = selectedItem;
                        const isOwned = user?.inventory?.includes(item.name);
                        const equipped = isEquipped(item);
                        const preview = ITEM_PREVIEWS[item.id];
                        const rarityColor = RARITY_COLORS[item.rarity] || '#777777';

                        return (
                            <div
                                onClick={() => setSelectedItem(null)}
                                className="store-modal-overlay"
                            >
                                <motion.div
                                    initial={shouldReduceMotion ? false : { scale: 0.94, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.94, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="store-modal-box"
                                >
                                    {/* Preview Banner */}
                                    <div
                                        className="store-modal-banner"
                                        style={{ background: preview?.gradient || '#e2e8f0' }}
                                    >
                                        <span className="store-modal-emoji" aria-hidden="true">
                                            {preview?.emoji || item.icon}
                                        </span>
                                        <button
                                            onClick={() => setSelectedItem(null)}
                                            className="store-modal-close"
                                            aria-label="Close dialog"
                                        >✕</button>
                                    </div>

                                    {/* Modal Content */}
                                    <div className="store-modal-body">
                                        <div className="store-badge-row">
                                            <span
                                                className="store-rarity-pill"
                                                style={{ background: rarityColor }}
                                            >
                                                {item.rarity}
                                            </span>
                                            <span className="store-type-pill">
                                                {TYPE_LABELS[item.type] || item.type}
                                            </span>
                                        </div>

                                        <h2 className="store-modal-title">{item.name}</h2>
                                        <p className="store-modal-desc">{item.description}</p>

                                        {/* What It Does Section */}
                                        <div className="store-modal-info-box">
                                            <div className="store-modal-info-label">What It Does</div>
                                            <p className="store-modal-info-text">
                                                {item.type === 'theme' ? 'Changes the color palette of your CityPulse interface and all interactive components.' :
                                                 item.type === 'border' ? 'Adds a special visual border ring effect around your profile avatar.' :
                                                 item.type === 'title' ? 'Displays a prestigious title tag below your username across public views.' :
                                                 'Displays an eco-star badge on your profile card and municipal leaderboard.'}
                                            </p>
                                        </div>

                                        {/* Price & Balance */}
                                        <div className="store-modal-price-row">
                                            <div>
                                                <div className="store-modal-info-label">Price</div>
                                                <div className={`store-modal-price ${isOwned ? 'is-owned' : ''}`}>
                                                    {isOwned ? 'OWNED' : `🪙 ${item.price}`}
                                                </div>
                                            </div>
                                            {user && !isOwned && (
                                                <div className={`store-balance-hint ${userCoins >= item.price ? 'sufficient' : 'insufficient'}`}>
                                                    {userCoins >= item.price
                                                        ? `You have 🪙 ${userCoins.toLocaleString()}`
                                                        : `Need 🪙 ${(item.price - userCoins).toLocaleString()} more`}
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Button */}
                                        <button
                                            onClick={() => handleAction(item)}
                                            disabled={loading}
                                            className={`duo-btn ${
                                                equipped
                                                    ? 'duo-btn-muted'
                                                    : isOwned
                                                    ? 'duo-btn-accent'
                                                    : 'duo-btn-primary'
                                            }`}
                                            style={{ width: '100%' }}
                                        >
                                            {equipped
                                                ? 'UNEQUIP'
                                                : isOwned
                                                ? 'EQUIP NOW'
                                                : `PURCHASE FOR 🪙 ${item.price}`}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })()}
                </AnimatePresence>

                {/* ── 1. DUOLINGO PURCHASE CELEBRATION ANIMATION MODAL ── */}
                <AnimatePresence>
                    {purchasedItem && (() => {
                        const item = purchasedItem;
                        const preview = ITEM_PREVIEWS[item.id];
                        const rarityColor = RARITY_COLORS[item.rarity] || '#58cc02';

                        return (
                            <div
                                onClick={() => setPurchasedItem(null)}
                                className="duo-celebrate-overlay"
                            >
                                <motion.div
                                    initial={shouldReduceMotion ? false : { scale: 0.4, opacity: 0, y: 50 }}
                                    animate={{ scale: [0.4, 1.1, 1], opacity: 1, y: 0 }}
                                    exit={{ scale: 0.8, opacity: 0 }}
                                    transition={{ duration: 0.45, ease: 'easeOut' }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="duo-celebrate-modal"
                                >
                                    {/* Rotating Sunburst Halo */}
                                    <div className="duo-sunburst-halo" aria-hidden="true" />

                                    {/* Animated Item Hero Container */}
                                    <motion.div
                                        animate={shouldReduceMotion ? {} : {
                                            y: [-4, 4, -4],
                                            rotate: [-2, 2, -2]
                                        }}
                                        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
                                        className="duo-celebrate-hero"
                                        style={{ background: preview?.gradient || '#e2e8f0' }}
                                    >
                                        <span className="duo-celebrate-emoji" aria-hidden="true">
                                            {preview?.emoji || item.icon}
                                        </span>

                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            transition={{ delay: 0.25, type: 'spring', stiffness: 500 }}
                                            className="duo-celebrate-check"
                                        >
                                            ✓
                                        </motion.div>
                                    </motion.div>

                                    {/* Cost deduction badge */}
                                    <div className="duo-deduction-chip">
                                        <span>-🪙 {item.price} EcoCoins</span>
                                    </div>

                                    <h2 className="duo-celebrate-title">ITEM UNLOCKED!</h2>
                                    <h3 className="duo-celebrate-name">{item.name}</h3>

                                    <span
                                        className="store-rarity-pill"
                                        style={{ background: rarityColor, display: 'inline-block', marginBottom: '12px' }}
                                    >
                                        {item.rarity} {TYPE_LABELS[item.type] || item.type}
                                    </span>

                                    <p className="duo-celebrate-desc">
                                        Congratulations! <strong>{item.name}</strong> has been added to your inventory.
                                    </p>

                                    {/* Duolingo 3D CTAs */}
                                    <div className="duo-celebrate-actions">
                                        <button
                                            onClick={async () => {
                                                await equipItem(item.type, item.value);
                                                setPurchasedItem(null);
                                                setFeedback({ type: 'success', msg: `Equipped ${item.name}!` });
                                                setTimeout(() => setFeedback({ type: '', msg: '' }), 3000);
                                            }}
                                            className="duo-btn duo-btn-accent"
                                        >
                                            ✨ EQUIP NOW
                                        </button>
                                        <button
                                            onClick={() => setPurchasedItem(null)}
                                            className="duo-btn duo-btn-primary"
                                        >
                                            CONTINUE SHOPPING
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })()}
                </AnimatePresence>

                {/* ── 2. DUOLINGO INSUFFICIENT BALANCE POPUP ── */}
                <AnimatePresence>
                    {insufficientItem && (() => {
                        const item = insufficientItem;
                        const diff = item.price - userCoins;
                        const progressPercent = Math.min(100, Math.max(8, Math.round((userCoins / item.price) * 100)));

                        return (
                            <div
                                onClick={() => setInsufficientItem(null)}
                                className="duo-insufficient-overlay"
                            >
                                <motion.div
                                    initial={shouldReduceMotion ? false : { scale: 0.85, opacity: 0, y: 20 }}
                                    animate={{ scale: 1, opacity: 1, y: 0 }}
                                    exit={{ scale: 0.85, opacity: 0, y: 20 }}
                                    transition={{ duration: 0.25, ease: 'easeOut' }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="duo-insufficient-modal"
                                >
                                    <button
                                        onClick={() => setInsufficientItem(null)}
                                        className="store-modal-close"
                                        aria-label="Close alert"
                                    >✕</button>

                                    {/* Animated Coin Icon with Wiggle */}
                                    <motion.div
                                        animate={shouldReduceMotion ? {} : {
                                            rotate: [-6, 6, -4, 4, 0],
                                            scale: [1, 1.06, 1]
                                        }}
                                        transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 1.5 }}
                                        className="duo-insufficient-icon-wrap"
                                    >
                                        <span className="duo-insufficient-coin-symbol">🪙</span>
                                        <span className="duo-insufficient-cross-badge">!</span>
                                    </motion.div>

                                    <h2 className="duo-insufficient-title">Need More EcoCoins!</h2>
                                    <p className="duo-insufficient-subtitle">
                                        You need <strong>🪙 {diff.toLocaleString()} more</strong> to purchase <strong>{item.name}</strong>.
                                    </p>

                                    {/* Duolingo Progress Bar */}
                                    <div className="duo-progress-container">
                                        <div className="duo-progress-labels">
                                            <span>Your Balance: 🪙 {userCoins.toLocaleString()}</span>
                                            <span>Goal: 🪙 {item.price.toLocaleString()}</span>
                                        </div>
                                        <div className="duo-progress-track">
                                            <div
                                                className="duo-progress-fill"
                                                style={{ width: `${progressPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Civic Tip Box */}
                                    <div className="duo-civic-tip">
                                        <span className="duo-tip-icon">🌱</span>
                                        <p className="duo-tip-text">
                                            <strong>Pro Tip:</strong> Report nearby garbage spots, verify civic cleanups, or maintain streaks to quickly earn EcoCoins!
                                        </p>
                                    </div>

                                    {/* Buttons */}
                                    <div className="duo-insufficient-actions">
                                        <Link
                                            to="/rewards"
                                            onClick={() => setInsufficientItem(null)}
                                            className="duo-btn duo-btn-primary duo-link-btn"
                                        >
                                            EARN ECOCOINS
                                        </Link>
                                        <button
                                            onClick={() => setInsufficientItem(null)}
                                            className="duo-btn duo-btn-muted"
                                        >
                                            MAYBE LATER
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })()}
                </AnimatePresence>

                {/* ── 3. DUOLINGO GUEST / LOGIN PROMPT POPUP ── */}
                <AnimatePresence>
                    {loginPrompt && (
                        <div
                            onClick={() => setLoginPrompt(false)}
                            className="duo-insufficient-overlay"
                        >
                            <motion.div
                                initial={shouldReduceMotion ? false : { scale: 0.88, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.88, opacity: 0, y: 20 }}
                                transition={{ duration: 0.25, ease: 'easeOut' }}
                                onClick={(e) => e.stopPropagation()}
                                className="duo-insufficient-modal"
                            >
                                <button
                                    onClick={() => setLoginPrompt(false)}
                                    className="store-modal-close"
                                    aria-label="Close alert"
                                >✕</button>

                                <div className="duo-insufficient-icon-wrap" style={{ background: '#dcfce7', borderColor: '#86efac' }}>
                                    <span style={{ fontSize: '2.5rem' }}>🌱</span>
                                </div>

                                <h2 className="duo-insufficient-title">Log In to Purchase</h2>
                                <p className="duo-insufficient-subtitle">
                                    Join the civic cleanup force to start earning EcoCoins, unlock store themes, and showcase your profile badge.
                                </p>

                                <div className="duo-insufficient-actions" style={{ marginTop: '20px' }}>
                                    <Link
                                        to="/login"
                                        onClick={() => setLoginPrompt(false)}
                                        className="duo-btn duo-btn-primary duo-link-btn"
                                    >
                                        LOG IN / SIGN UP
                                    </Link>
                                    <button
                                        onClick={() => setLoginPrompt(false)}
                                        className="duo-btn duo-btn-muted"
                                    >
                                        CONTINUE BROWSING
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* ── Original Footer with Perks ── */}
                <div className="store-footer">
                    <p className="store-footer-text">Cosmetics are shared across your account. Changes apply globally instantly.</p>
                    <div className="store-footer-perks">
                        <span className="store-perk-pill">✓ Global Persistence</span>
                        <span className="store-perk-pill">✓ No Hidden Fees</span>
                        <span className="store-perk-pill">✓ Eco-Verified</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Store;
