import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DailyRewardModal = ({ data, onClaim, onClose }) => {
    const confettiRef = useRef(null);

    // Animate coins counting up
    const [displayCoins, setDisplayCoins] = React.useState(0);
    const [displayXP, setDisplayXP] = React.useState(0);
    const [claimed, setClaimed] = React.useState(false);

    const handleClaim = async () => {
        setClaimed(true);
        // Animate counters
        let coin = 0;
        let xp = 0;
        const coinTarget = data.coins_awarded;
        const xpTarget = data.xp_awarded;
        const steps = 30;
        const interval = setInterval(() => {
            coin = Math.min(coin + Math.ceil(coinTarget / steps), coinTarget);
            xp = Math.min(xp + Math.ceil(xpTarget / steps), xpTarget);
            setDisplayCoins(coin);
            setDisplayXP(xp);
            if (coin >= coinTarget && xp >= xpTarget) clearInterval(interval);
        }, 40);
        await onClaim();
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
        }} onClick={e => { if (e.target === e.currentTarget && claimed) onClose(); }}>
            <motion.div
                initial={{ scale: 0.7, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', damping: 18, stiffness: 280 }}
                style={{
                    background: '#fff',
                    borderRadius: '24px',
                    border: '3px solid #111',
                    boxShadow: '8px 8px 0px #111',
                    padding: '2.5rem',
                    maxWidth: '400px',
                    width: '100%',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Background shimmer */}
                <div style={{
                    position: 'absolute', inset: 0,
                    background: 'radial-gradient(ellipse at 50% 0%, #FFDC2B22 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                {/* Streak badge */}
                {data.streak > 1 && (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        style={{
                            position: 'absolute', top: '1rem', right: '1rem',
                            background: '#ff6b35', color: '#fff', borderRadius: '999px',
                            padding: '0.3rem 0.85rem', fontSize: '0.75rem',
                            fontWeight: '800', letterSpacing: '0.08em',
                        }}
                    >
                        🔥 {data.streak} DAY STREAK
                    </motion.div>
                )}

                {/* Icon */}
                <motion.div
                    animate={{ rotate: [0, -8, 8, -4, 4, 0], scale: [1, 1.1, 1] }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                    style={{ fontSize: '5rem', marginBottom: '0.5rem', display: 'block' }}
                >
                    🎁
                </motion.div>

                <h2 style={{
                    fontFamily: 'var(--font-display, "Space Grotesk", sans-serif)',
                    fontSize: '1.8rem', fontWeight: '900', textTransform: 'uppercase',
                    letterSpacing: '0.04em', marginBottom: '0.25rem',
                }}>
                    Daily Reward
                </h2>
                <p style={{ color: '#666', marginBottom: '1.75rem', fontSize: '0.9rem' }}>
                    Your daily login bonus is ready to claim!
                </p>

                {/* Reward amounts */}
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '1.5rem' }}>
                    <div style={{
                        flex: 1, background: '#fef3c7', border: '2px solid #f59e0b',
                        borderRadius: '16px', padding: '1rem',
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: '900', fontFamily: 'var(--font-display, sans-serif)', color: '#92400e' }}>
                            {claimed ? displayCoins : data.coins_awarded}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#78350f', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            🪙 EcoCoins
                        </div>
                    </div>
                    <div style={{
                        flex: 1, background: '#ede9fe', border: '2px solid #8b5cf6',
                        borderRadius: '16px', padding: '1rem',
                    }}>
                        <div style={{ fontSize: '2rem', fontWeight: '900', fontFamily: 'var(--font-display, sans-serif)', color: '#4c1d95' }}>
                            {claimed ? displayXP : data.xp_awarded}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#4c1d95', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                            ⚡ XP
                        </div>
                    </div>
                </div>

                {/* Streak bonus alert */}
                {data.streak_bonus && (
                    <div style={{
                        background: '#fef3c7', border: '2px solid #f59e0b',
                        borderRadius: '12px', padding: '0.65rem 1rem', marginBottom: '1.25rem',
                        fontSize: '0.85rem', fontWeight: '700', color: '#78350f',
                    }}>
                        🎉 7-Day Streak Bonus! Rewards doubled!
                    </div>
                )}

                {/* Streak progress bar */}
                {data.streak > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#666', marginBottom: '6px', fontWeight: '600' }}>
                            <span>Streak Progress</span>
                            <span>{data.streak}/7 days to bonus</span>
                        </div>
                        <div style={{ background: '#f1f5f9', borderRadius: '999px', height: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${((data.streak % 7) / 7) * 100}%` }}
                                transition={{ delay: 0.4, duration: 0.8 }}
                                style={{ height: '100%', background: '#ff6b35', borderRadius: '999px' }}
                            />
                        </div>
                    </div>
                )}

                {/* Button */}
                {!claimed ? (
                    <button
                        onClick={handleClaim}
                        className="btn btn-primary"
                        style={{
                            width: '100%', justifyContent: 'center',
                            padding: '0.95rem', fontSize: '1.05rem', fontWeight: '800',
                            background: '#FFDC2B', color: '#111', border: '3px solid #111',
                            boxShadow: '4px 4px 0px #111',
                        }}
                    >
                        🎁 Claim Reward
                    </button>
                ) : (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <div style={{ marginBottom: '1rem', fontSize: '1.3rem', fontWeight: '900', color: '#22c55e', fontFamily: 'var(--font-display, sans-serif)' }}>
                            🎉 Claimed Successfully!
                        </div>
                        <button onClick={onClose} className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
                            Let's Go!
                        </button>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};

export default DailyRewardModal;
