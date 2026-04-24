import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Reward schedule: each day of the 7-day streak gets unique amounts
const WEEKLY_REWARDS = [
    { day: 1, coins: 25,  xp: 15,  label: 'Mon',  emoji: '🌱' },
    { day: 2, coins: 35,  xp: 20,  label: 'Tue',  emoji: '🌿' },
    { day: 3, coins: 50,  xp: 25,  label: 'Wed',  emoji: '🌳' },
    { day: 4, coins: 40,  xp: 20,  label: 'Thu',  emoji: '💧' },
    { day: 5, coins: 60,  xp: 30,  label: 'Fri',  emoji: '🔥' },
    { day: 6, coins: 75,  xp: 35,  label: 'Sat',  emoji: '⚡' },
    { day: 7, coins: 150, xp: 75,  label: 'Sun',  emoji: '👑', bonus: true, bonusItem: 'Midnight Patrol' },
];

const DailyRewardModal = ({ data, onClaim, onClose }) => {
    const [displayCoins, setDisplayCoins] = React.useState(0);
    const [displayXP, setDisplayXP] = React.useState(0);
    const [claimed, setClaimed] = React.useState(false);

    // Determine current streak day within the week (1-7)
    const streakDayInWeek = data.streak > 0 ? ((data.streak - 1) % 7) + 1 : 1;
    const currentDayReward = WEEKLY_REWARDS[streakDayInWeek - 1];
    const isDay7 = streakDayInWeek === 7;

    const handleClaim = async () => {
        setClaimed(true);
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

    // Calculate the max coins in the week for the chart bar scaling
    const maxCoins = Math.max(...WEEKLY_REWARDS.map(r => r.coins));

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
        }} onClick={e => { if (e.target === e.currentTarget && claimed) onClose(); }}>
            <motion.div
                initial={{ scale: 0.7, opacity: 0, y: 50 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                style={{
                    background: 'linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)',
                    borderRadius: '24px',
                    border: '1px solid rgba(99,102,241,0.3)',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.5), 0 0 60px rgba(99,102,241,0.15)',
                    padding: '0',
                    maxWidth: '460px',
                    width: '100%',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                    maxHeight: '90vh',
                    overflowY: 'auto',
                }}
            >
                {/* Top glow */}
                <div style={{
                    position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)',
                    width: '300px', height: '120px',
                    background: 'radial-gradient(ellipse, rgba(255,220,43,0.25) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <div style={{ padding: '2rem 2rem 1.5rem' }}>
                    {/* Streak badge */}
                    {data.streak > 0 && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: 'spring' }}
                            style={{
                                display: 'inline-flex', alignItems: 'center', gap: '6px',
                                background: 'linear-gradient(135deg, #f97316, #ef4444)',
                                color: '#fff', borderRadius: '999px',
                                padding: '0.35rem 1rem', fontSize: '0.72rem',
                                fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase',
                                marginBottom: '1rem',
                                boxShadow: '0 4px 15px rgba(249,115,22,0.4)',
                            }}
                        >
                            🔥 {data.streak} Day Streak
                        </motion.div>
                    )}

                    {/* Icon */}
                    <motion.div
                        animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.15, 1] }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                        style={{ fontSize: '4rem', marginBottom: '0.5rem', display: 'block', filter: 'drop-shadow(0 4px 12px rgba(255,220,43,0.3))' }}
                    >
                        {isDay7 ? '👑' : '🎁'}
                    </motion.div>

                    <h2 style={{
                        fontFamily: 'var(--font-display, "Space Grotesk", sans-serif)',
                        fontSize: '1.6rem', fontWeight: '900', textTransform: 'uppercase',
                        letterSpacing: '0.06em', marginBottom: '0.15rem', color: '#fff',
                    }}>
                        {isDay7 ? 'Weekly Jackpot!' : 'Daily Reward'}
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '1.5rem', fontSize: '0.85rem' }}>
                        Day {streakDayInWeek} of 7 — {isDay7 ? 'Bonus day with exclusive rewards!' : 'Keep your streak alive!'}
                    </p>

                    {/* ───── Weekly Chart ───── */}
                    <div style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '16px', padding: '1rem 1rem 0.75rem',
                        marginBottom: '1.25rem',
                    }}>
                        <div style={{
                            fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase',
                            letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)',
                            marginBottom: '0.75rem', textAlign: 'left',
                        }}>
                            Weekly Rewards Chart
                        </div>
                        <div style={{
                            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
                            gap: '6px', height: '100px',
                        }}>
                            {WEEKLY_REWARDS.map((reward, i) => {
                                const dayNum = i + 1;
                                const isToday = dayNum === streakDayInWeek;
                                const isPast = dayNum < streakDayInWeek;
                                const isFuture = dayNum > streakDayInWeek;
                                const barHeight = (reward.coins / maxCoins) * 80 + 20;

                                return (
                                    <div key={dayNum} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        {/* Coin label above bar */}
                                        <motion.div
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 0.3 + i * 0.05 }}
                                            style={{
                                                fontSize: '0.6rem', fontWeight: '800',
                                                color: isToday ? '#FFDC2B' : isPast ? 'rgba(34,197,94,0.8)' : 'rgba(255,255,255,0.25)',
                                            }}
                                        >
                                            {reward.coins}
                                        </motion.div>

                                        {/* Bar */}
                                        <motion.div
                                            initial={{ height: 0 }}
                                            animate={{ height: `${barHeight}%` }}
                                            transition={{ delay: 0.4 + i * 0.06, duration: 0.5, ease: 'easeOut' }}
                                            style={{
                                                width: '100%',
                                                borderRadius: '6px 6px 3px 3px',
                                                background: isToday
                                                    ? 'linear-gradient(180deg, #FFDC2B, #f59e0b)'
                                                    : isPast
                                                        ? 'linear-gradient(180deg, #22c55e, #16a34a)'
                                                        : 'rgba(255,255,255,0.08)',
                                                position: 'relative',
                                                boxShadow: isToday ? '0 0 12px rgba(255,220,43,0.4)' : 'none',
                                                minHeight: '8px',
                                            }}
                                        >
                                            {isPast && (
                                                <div style={{
                                                    position: 'absolute', top: '3px', left: '50%', transform: 'translateX(-50%)',
                                                    fontSize: '0.6rem',
                                                }}>✓</div>
                                            )}
                                            {reward.bonus && (
                                                <div style={{
                                                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                                                    fontSize: '0.7rem',
                                                }}>🎁</div>
                                            )}
                                        </motion.div>

                                        {/* Day label */}
                                        <div style={{
                                            fontSize: '0.6rem', fontWeight: isToday ? '900' : '600',
                                            color: isToday ? '#FFDC2B' : isPast ? 'rgba(34,197,94,0.7)' : 'rgba(255,255,255,0.3)',
                                            textTransform: 'uppercase', letterSpacing: '0.05em',
                                        }}>
                                            {reward.label}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Reward amounts */}
                    <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginBottom: '1rem' }}>
                        <div style={{
                            flex: 1, background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.25)',
                            borderRadius: '14px', padding: '0.85rem 0.5rem',
                        }}>
                            <div style={{
                                fontSize: '1.8rem', fontWeight: '900',
                                fontFamily: 'var(--font-display, sans-serif)', color: '#fbbf24',
                                textShadow: '0 0 20px rgba(251,191,36,0.3)',
                            }}>
                                {claimed ? displayCoins : data.coins_awarded}
                            </div>
                            <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'rgba(251,191,36,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                🪙 EcoCoins
                            </div>
                        </div>
                        <div style={{
                            flex: 1, background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
                            borderRadius: '14px', padding: '0.85rem 0.5rem',
                        }}>
                            <div style={{
                                fontSize: '1.8rem', fontWeight: '900',
                                fontFamily: 'var(--font-display, sans-serif)', color: '#a78bfa',
                                textShadow: '0 0 20px rgba(139,92,246,0.3)',
                            }}>
                                {claimed ? displayXP : data.xp_awarded}
                            </div>
                            <div style={{ fontSize: '0.65rem', fontWeight: '700', color: 'rgba(139,92,246,0.6)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                ⚡ XP
                            </div>
                        </div>
                    </div>

                    {/* Day 7 Bonus Item */}
                    {isDay7 && data.bonus_item && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.5 }}
                            style={{
                                background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.15))',
                                border: '1px solid rgba(139,92,246,0.3)',
                                borderRadius: '14px', padding: '1rem',
                                marginBottom: '1rem',
                            }}
                        >
                            <div style={{
                                fontSize: '0.6rem', fontWeight: '800', textTransform: 'uppercase',
                                letterSpacing: '0.12em', color: '#a78bfa', marginBottom: '0.4rem',
                            }}>
                                🎁 Bonus Reward — Day 7 Exclusive
                            </div>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'center',
                            }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '12px',
                                    background: 'linear-gradient(135deg, #1e1b4b, #4338ca, #a5b4fc)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.5rem', boxShadow: '0 4px 15px rgba(99,102,241,0.3)',
                                }}>
                                    🌙
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: '900', fontSize: '1rem', color: '#fff' }}>
                                        {data.bonus_item}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)' }}>
                                        Epic Theme — Added to your inventory!
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Already collected today indicator */}
                    {!data.granted && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            style={{
                                background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)',
                                borderRadius: '12px', padding: '0.75rem 1rem', marginBottom: '1rem',
                                display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center',
                            }}
                        >
                            <span style={{ fontSize: '1.1rem' }}>✅</span>
                            <span style={{ color: '#4ade80', fontWeight: '700', fontSize: '0.85rem' }}>
                                Already collected today's reward!
                            </span>
                        </motion.div>
                    )}
                </div>

                {/* Action Button */}
                <div style={{ padding: '0 2rem 2rem' }}>
                    {data.granted && !claimed ? (
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleClaim}
                            style={{
                                width: '100%',
                                padding: '0.9rem', fontSize: '1rem', fontWeight: '800',
                                background: 'linear-gradient(135deg, #FFDC2B, #f59e0b)',
                                color: '#111', border: 'none', borderRadius: '14px',
                                fontFamily: 'var(--font-display, sans-serif)',
                                cursor: 'pointer',
                                boxShadow: '0 4px 20px rgba(255,220,43,0.3)',
                                textTransform: 'uppercase', letterSpacing: '0.06em',
                            }}
                        >
                            🎁 Claim Day {streakDayInWeek} Reward
                        </motion.button>
                    ) : claimed ? (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                            <div style={{
                                marginBottom: '0.75rem', fontSize: '1.2rem', fontWeight: '900',
                                color: '#4ade80', fontFamily: 'var(--font-display, sans-serif)',
                            }}>
                                🎉 Collected!
                            </div>
                            <button onClick={onClose}
                                style={{
                                    width: '100%', padding: '0.8rem',
                                    background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
                                    border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px',
                                    fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '0.9rem',
                                    cursor: 'pointer',
                                }}>
                                Continue →
                            </button>
                        </motion.div>
                    ) : (
                        <button onClick={onClose}
                            style={{
                                width: '100%', padding: '0.8rem',
                                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
                                border: '1px solid rgba(255,255,255,0.15)', borderRadius: '12px',
                                fontFamily: 'var(--font-display)', fontWeight: '700', fontSize: '0.9rem',
                                cursor: 'pointer',
                            }}>
                            Come Back Tomorrow →
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default DailyRewardModal;
