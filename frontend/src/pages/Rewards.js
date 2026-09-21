import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import '../styles/Rewards.css';

// ── Item Definitions & 30-Day Calendar Catalog ──────────────────────────────
const RARITY = {
    COMMON: { bg: 'linear-gradient(135deg, #f1f5f9, #e2e8f0)', border: '#cbd5e1' },
    RARE: { bg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)', border: '#38bdf8' },
    EPIC: { bg: 'linear-gradient(135deg, #f3e8ff, #e9d5ff)', border: '#c084fc' },
    LEGENDARY: { bg: 'linear-gradient(135deg, #fef3c7, #fde68a)', border: '#f59e0b' },
};

// Generate 30 days of rewards
const MONTHLY_REWARDS = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    if (day === 30) return { day, name: 'Eco Legend', qty: 3, icon: '👑', rarity: 'LEGENDARY', isItem: true };
    if (day % 7 === 0) return { day, name: 'Special Item', qty: 3, icon: '🎁', rarity: 'EPIC', isItem: true };
    if (day % 5 === 0) return { day, name: 'Eco Crystal', qty: 300, icon: '💠', rarity: 'RARE' };
    if (day % 2 === 0) return { day, name: 'XP Manual', qty: 150, icon: '📔', rarity: 'COMMON' };
    return { day, name: 'Eco Shard', qty: 75, icon: '💎', rarity: 'COMMON' };
});

// ── Web Audio Chime ─────────────────────────────────────────────────────────
const playClaimChime = () => {
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
            gain.gain.setValueAtTime(0.14, ctx.currentTime + index * 0.08);
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

// ── Confetti Burst ───────────────────────────────────────────────────────────
const triggerClaimConfetti = () => {
    try {
        confetti({
            particleCount: 75,
            spread: 90,
            origin: { y: 0.6 },
            colors: ['#58cc02', '#a5ed6e', '#1cb0f6', '#ffc800', '#ff9600', '#ec4899'],
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
        }, 120);
        setTimeout(() => {
            confetti({
                particleCount: 45,
                angle: 120,
                spread: 60,
                origin: { x: 1, y: 0.7 },
                colors: ['#58cc02', '#1cb0f6', '#ffc800'],
                disableForReducedMotion: true,
            });
        }, 240);
    } catch (e) {
        // Confetti fallback
    }
};

const Rewards = () => {
    const [activeTab, setActiveTab] = useState('daily');
    const [rewardData, setRewardData] = useState(null);
    const [taskData, setTaskData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const [celebrationData, setCelebrationData] = useState(null);
    const { user, setUser } = useAuth();
    const navigate = useNavigate();
    const shouldReduceMotion = useReducedMotion();

    const fetchData = async () => {
        try {
            setLoading(true);
            const [rewardRes, taskRes] = await Promise.all([
                api.post('/store/daily-reward', {}),
                api.get('/rewards/daily-tasks')
            ]);

            setRewardData(rewardRes.data);
            setTaskData(taskRes.data.tasks || []);
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            if (rewardData?.next_claim_at) {
                const diff = rewardData.next_claim_at - Date.now();
                if (diff <= 0) {
                    setTimeLeft('Ready!');
                } else {
                    const h = Math.floor(diff / (1000 * 60 * 60));
                    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const s = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeft(`${h}h ${m}m ${s}s`);
                }
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [rewardData?.next_claim_at]);

    const handleClaimDaily = async () => {
        if (rewardData?.granted === false && rewardData?.message === 'Already claimed today') return;
        setClaiming('daily');
        try {
            const { data } = await api.post('/store/daily-reward', {});
            setRewardData(data);
            if (data.granted) {
                if (setUser) {
                    setUser(prev => ({
                        ...prev,
                        coins: data.new_coins,
                        xp: data.new_xp,
                        inventory: data.inventory || prev.inventory
                    }));
                }
                triggerClaimConfetti();
                playClaimChime();
                setCelebrationData({
                    title: 'STREAK EXTENDED!',
                    subtitle: `You claimed Day ${data.day_in_cycle || data.streak}! Keep the civic streak burning.`,
                    coins: data.coins_awarded || 75,
                    xp: data.xp_awarded || 50,
                    icon: '🔥',
                    streak: data.streak
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setClaiming(null);
        }
    };

    const handleClaimTask = async (task) => {
        setClaiming(task.id);
        try {
            const { data } = await api.post(`/rewards/claim-task/${task.id}`);
            if (data.success) {
                setTaskData(prev => prev.map(t => t.id === task.id ? { ...t, completed: true } : t));
                if (setUser) {
                    setUser(prev => ({ ...prev, coins: data.new_coins, xp: data.new_xp }));
                }
                triggerClaimConfetti();
                playClaimChime();
                setCelebrationData({
                    title: 'QUEST COMPLETED!',
                    subtitle: `Awesome work on "${task.label}"! Civic reward credited.`,
                    coins: task.reward_coins,
                    xp: task.reward_xp,
                    icon: '🎯'
                });
            }
        } catch (err) {
            console.error(err);
        } finally {
            setClaiming(null);
        }
    };

    const currentDay = rewardData?.day_in_cycle || (rewardData?.streak ? ((rewardData.streak - 1) % 30) + 1 : 1);
    const isTodayClaimed = !rewardData?.granted && rewardData?.message === 'Already claimed today';
    const streakCount = rewardData?.streak || 0;
    const userCoins = user?.coins || 0;

    return (
        <div className="rewards-page-wrapper">
            <div className="rewards-container">
                {/* ── Top Bar / Header Card ── */}
                <div className="rewards-header-card">
                    <div className="rewards-title-area">
                        <span className="rewards-title-icon" aria-hidden="true">🏆</span>
                        <div>
                            <h1 className="rewards-main-title">Civic Rewards</h1>
                            <p className="rewards-sub-title">Check in daily and finish civic quests to earn coins.</p>
                        </div>
                    </div>

                    {/* Duolingo Pill Tabs */}
                    <div className="rewards-tabs-group" role="tablist">
                        <button
                            role="tab"
                            aria-selected={activeTab === 'daily'}
                            onClick={() => setActiveTab('daily')}
                            className={`rewards-tab-btn ${activeTab === 'daily' ? 'active' : ''}`}
                        >
                            <span aria-hidden="true">📅</span>
                            <span>Check-in Rewards</span>
                        </button>
                        <button
                            role="tab"
                            aria-selected={activeTab === 'tasks'}
                            onClick={() => setActiveTab('tasks')}
                            className={`rewards-tab-btn ${activeTab === 'tasks' ? 'active' : ''}`}
                        >
                            <span aria-hidden="true">⚡</span>
                            <span>Daily Commissions</span>
                        </button>
                    </div>

                    {/* User Wealth Pill & Close */}
                    <div className="rewards-status-group">
                        <div className="rewards-balance-chip">
                            <span aria-hidden="true">🪙</span>
                            <span>{userCoins.toLocaleString()}</span>
                        </div>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="rewards-close-btn"
                            aria-label="Back to dashboard"
                        >✕</button>
                    </div>
                </div>

                {/* ── Duolingo Streak Hero Banner ── */}
                <div className="duo-streak-hero">
                    <div className="duo-streak-left">
                        <motion.div
                            animate={shouldReduceMotion ? {} : { scale: [1, 1.05, 1] }}
                            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                            className="duo-flame-circle"
                        >
                            <span className="duo-flame-icon" aria-hidden="true">🔥</span>
                            <span className="duo-flame-count">{streakCount}</span>
                        </motion.div>

                        <div className="duo-streak-details">
                            <span className="duo-streak-badge">LOGIN STREAK</span>
                            <h2 className="duo-streak-heading">
                                {streakCount === 1 ? '1 Day Streak!' : `${streakCount} Days Streak!`}
                            </h2>
                            <p className="duo-streak-message">
                                {isTodayClaimed
                                    ? 'Great job checking in today! Keep your streak burning tomorrow.'
                                    : 'Check in right now to claim your daily rewards and extend your streak!'}
                            </p>
                        </div>
                    </div>

                    <div className="duo-streak-right">
                        {isTodayClaimed ? (
                            <div className="duo-cooldown-pill">
                                <span aria-hidden="true">⏳</span>
                                <span>Next reward in: <strong className="duo-cooldown-time">{timeLeft || 'calculating...'}</strong></span>
                            </div>
                        ) : (
                            <button
                                onClick={handleClaimDaily}
                                disabled={claiming === 'daily'}
                                className="duo-btn duo-btn-primary"
                            >
                                {claiming === 'daily' ? 'CLAIMING...' : 'CLAIM TODAY REWARD'}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Tab 1: Focused Today's Reward (Simple Day-by-Day View) ── */}
                <AnimatePresence mode="wait">
                    {activeTab === 'daily' && (() => {
                        const todayReward = MONTHLY_REWARDS[Math.max(0, (currentDay - 1) % 30)] || MONTHLY_REWARDS[0];
                        const todayRarity = RARITY[todayReward.rarity] || RARITY.COMMON;
                        const cycleDay = ((currentDay - 1) % 7) + 1;

                        const WEEK_DAYS = [
                            { day: 1, label: 'Day 1', icon: '💎' },
                            { day: 2, label: 'Day 2', icon: '📔' },
                            { day: 3, label: 'Day 3', icon: '💎' },
                            { day: 4, label: 'Day 4', icon: '📔' },
                            { day: 5, label: 'Day 5', icon: '💠' },
                            { day: 6, label: 'Day 6', icon: '📔' },
                            { day: 7, label: 'Day 7', icon: '🎁', milestone: true },
                        ];

                        return (
                            <motion.div
                                key="daily"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                                className="duo-today-reward-container"
                            >
                                {/* Centerpiece: Today's Reward Card */}
                                <div className={`duo-today-card ${isTodayClaimed ? 'claimed' : 'unclaimed'}`}>
                                    <div className="duo-today-header-badge">
                                        <span>📅</span>
                                        <span>
                                            {isTodayClaimed ? `TODAY CLAIMED - DAY ${currentDay}` : `TODAY REWARD - DAY ${currentDay}`}
                                        </span>
                                    </div>

                                    {/* Reward Hero Box */}
                                    <motion.div
                                        animate={shouldReduceMotion || isTodayClaimed ? {} : {
                                            y: [-4, 4, -4],
                                            rotate: [-1.5, 1.5, -1.5]
                                        }}
                                        transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}
                                        className="duo-today-hero-box"
                                        style={{ background: todayRarity.bg, borderColor: todayRarity.border }}
                                    >
                                        <span className="duo-today-hero-emoji" aria-hidden="true">
                                            {todayReward.icon}
                                        </span>

                                        {isTodayClaimed && (
                                            <div className="duo-today-claimed-overlay" aria-label="Claimed">
                                                ✅
                                            </div>
                                        )}
                                    </motion.div>

                                    <h2 className="duo-today-name">{todayReward.name}</h2>
                                    <p className="duo-today-desc">
                                        {todayReward.isItem
                                            ? 'Special streak milestone bonus! Added straight to your inventory.'
                                            : 'Daily civic check-in bonus for keeping the city clean and green.'}
                                    </p>

                                    {/* Values Row */}
                                    <div className="duo-today-rewards-row">
                                        <div className="duo-today-val-chip coins">
                                            <span aria-hidden="true">🪙</span>
                                            <span>+{todayReward.qty} EcoCoins</span>
                                        </div>
                                        <div className="duo-today-val-chip xp">
                                            <span aria-hidden="true">⚡</span>
                                            <span>+50 XP</span>
                                        </div>
                                    </div>

                                    {/* Action State */}
                                    {isTodayClaimed ? (
                                        <div className="duo-today-claimed-box">
                                            <div className="duo-today-claimed-msg">
                                                <span>✓</span>
                                                <span>Claimed for Today!</span>
                                            </div>
                                            <div className="duo-today-next-timer">
                                                Next check-in unlocks in: <strong>{timeLeft || 'calculating...'}</strong>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={handleClaimDaily}
                                            disabled={claiming === 'daily'}
                                            className="duo-btn duo-btn-primary"
                                            style={{ width: '100%', maxWidth: '340px', margin: '0 auto', fontSize: '15px' }}
                                        >
                                            {claiming === 'daily' ? 'CLAIMING...' : 'CLAIM TODAY REWARD'}
                                        </button>
                                    )}
                                </div>

                                {/* Compact 7-Day Weekly Streak Track */}
                                <div className="duo-week-strip-card">
                                    <div className="duo-week-strip-header">
                                        <h3 className="duo-week-strip-title">7-Day Streak Goal</h3>
                                        <span className="duo-week-strip-hint">🎁 Day 7 Mystery Chest</span>
                                    </div>

                                    <div className="duo-week-nodes-row">
                                        {WEEK_DAYS.map((node) => {
                                            const isClaimed = node.day < cycleDay || (node.day === cycleDay && isTodayClaimed);
                                            const isToday = node.day === cycleDay;

                                            return (
                                                <div
                                                    key={node.day}
                                                    className={`duo-week-node ${isClaimed ? 'claimed' : ''} ${isToday ? 'today' : ''} ${node.milestone ? 'milestone' : ''}`}
                                                >
                                                    <div className="duo-week-node-circle">
                                                        {isClaimed ? '✓' : isToday ? '🔥' : node.icon}
                                                    </div>
                                                    <span className="duo-week-node-label">{node.label}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })()}

                    {/* ── Tab 2: Daily Commissions / Quests ── */}
                    {activeTab === 'tasks' && (
                        <motion.div
                            key="tasks"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.25 }}
                            className="duo-quests-list"
                        >
                            {taskData.map((task) => {
                                const progressPct = Math.min(100, Math.round(((task.current_progress || 0) / (task.goal || 1)) * 100));
                                const taskIcon =
                                    task.id === 'view_heatmap' ? '🗺️' :
                                    task.id === 'view_leaderboard' ? '🏆' :
                                    task.id === 'submit_report' ? '🚨' :
                                    task.id === 'view_profile' ? '👤' : '💬';

                                const destinationUrl =
                                    task.id === 'view_heatmap' ? '/heatmap' :
                                    task.id === 'view_leaderboard' ? '/leaderboard' :
                                    task.id === 'view_profile' ? `/profile/${user?.username || ''}` :
                                    '/reports';

                                return (
                                    <div
                                        key={task.id}
                                        className={`duo-quest-card ${task.completed ? 'completed' : ''}`}
                                    >
                                        <div className="duo-quest-icon-wrap" aria-hidden="true">
                                            {taskIcon}
                                        </div>

                                        <div className="duo-quest-info">
                                            <div className="duo-quest-title-row">
                                                <h3 className="duo-quest-title">{task.label}</h3>
                                            </div>
                                            <p className="duo-quest-desc">{task.desc}</p>

                                            {/* Progress Bar */}
                                            <div className="duo-quest-progress-row">
                                                <div className="duo-quest-progress-track">
                                                    <div
                                                        className="duo-quest-progress-fill"
                                                        style={{ width: `${progressPct}%` }}
                                                    />
                                                </div>
                                                <span className="duo-quest-progress-num">
                                                    {task.current_progress || 0} / {task.goal || 1}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Rewards & Actions */}
                                        <div className="duo-quest-actions-wrap">
                                            <div className="duo-quest-rewards">
                                                <span className="duo-quest-reward-coin">🪙 +{task.reward_coins}</span>
                                                <span className="duo-quest-reward-xp">⚡ +{task.reward_xp} XP</span>
                                            </div>

                                            {task.completed ? (
                                                <button disabled className="duo-btn duo-btn-muted">
                                                    CLAIMED ✓
                                                </button>
                                            ) : task.can_claim ? (
                                                <button
                                                    onClick={() => handleClaimTask(task)}
                                                    disabled={claiming === task.id}
                                                    className="duo-btn duo-btn-primary"
                                                >
                                                    {claiming === task.id ? 'CLAIMING...' : 'CLAIM'}
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => navigate(destinationUrl)}
                                                    className="duo-btn duo-btn-accent"
                                                >
                                                    GO →
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}

                            {taskData.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#fff', borderRadius: '16px', border: '2px solid #e5e5e5' }}>
                                    <span style={{ fontSize: '2.5rem' }}>⏳</span>
                                    <h3 style={{ margin: '10px 0 4px', color: 'var(--duo-text)' }}>Updating Daily Commissions</h3>
                                    <p style={{ color: 'var(--duo-text-muted)', fontSize: '13px' }}>Check back shortly for fresh civic assignments.</p>
                                    <button onClick={fetchData} className="duo-btn duo-btn-primary" style={{ marginTop: '12px' }}>
                                        REFRESH
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* ── Duolingo Claim Celebration Modal with Rich Spring Animations ── */}
                <AnimatePresence>
                    {celebrationData && (
                        <div
                            onClick={() => setCelebrationData(null)}
                            className="duo-reward-modal-overlay"
                        >
                            <motion.div
                                initial={shouldReduceMotion ? false : { scale: 0.3, y: 70, opacity: 0, rotate: -3 }}
                                animate={{ scale: [0.3, 1.15, 0.96, 1.03, 1], y: 0, opacity: 1, rotate: [-3, 2, -1, 0] }}
                                exit={{ scale: 0.8, opacity: 0, y: 20 }}
                                transition={{ type: 'spring', damping: 14, stiffness: 280 }}
                                onClick={(e) => e.stopPropagation()}
                                className="duo-reward-modal-box"
                            >
                                {/* Rotating Sunburst Rays Halo */}
                                <div className="duo-reward-halo" aria-hidden="true" />

                                {/* Floating Sparkle Particles */}
                                <motion.span
                                    className="duo-sparkle duo-sparkle-1"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0.8] }}
                                    transition={{ delay: 0.2, duration: 0.4 }}
                                >✨</motion.span>
                                <motion.span
                                    className="duo-sparkle duo-sparkle-2"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0.8] }}
                                    transition={{ delay: 0.3, duration: 0.4 }}
                                >⭐</motion.span>
                                <motion.span
                                    className="duo-sparkle duo-sparkle-3"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: [0, 1.3, 1], opacity: [0, 1, 0.8] }}
                                    transition={{ delay: 0.35, duration: 0.4 }}
                                >🌟</motion.span>

                                {/* Animated Hero Icon Container with Bouncy Overshoot and Floating Wobble */}
                                <motion.div
                                    initial={shouldReduceMotion ? false : { scale: 0, rotate: -25 }}
                                    animate={{
                                        scale: [0, 1.35, 0.92, 1.08, 1],
                                        rotate: [-25, 12, -4, 0],
                                        y: [-3, 3, -3]
                                    }}
                                    transition={{
                                        scale: { type: 'spring', damping: 12, stiffness: 350, delay: 0.1 },
                                        rotate: { type: 'spring', damping: 12, stiffness: 350, delay: 0.1 },
                                        y: { repeat: Infinity, duration: 2.4, ease: 'easeInOut', delay: 0.6 }
                                    }}
                                    className="duo-reward-hero-icon"
                                    aria-hidden="true"
                                >
                                    <span className="duo-reward-hero-emoji">
                                        {celebrationData.icon || '🎁'}
                                    </span>

                                    {/* Snap-in Checkmark Badge */}
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: [0, 1.4, 1] }}
                                        transition={{ delay: 0.35, type: 'spring', stiffness: 500 }}
                                        className="duo-reward-check-bubble"
                                    >
                                        ✓
                                    </motion.div>
                                </motion.div>

                                {/* Title with Duolingo Bold Spring Bounce */}
                                <motion.h2
                                    initial={{ scale: 0.7, y: 15, opacity: 0 }}
                                    animate={{ scale: [0.7, 1.12, 1], y: 0, opacity: 1 }}
                                    transition={{ delay: 0.25, type: 'spring', stiffness: 350 }}
                                    className="duo-reward-modal-title"
                                >
                                    {celebrationData.title}
                                </motion.h2>

                                {/* Subtitle with Fade & Slide */}
                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.32, duration: 0.25 }}
                                    className="duo-reward-modal-subtitle"
                                >
                                    {celebrationData.subtitle}
                                </motion.p>

                                {/* Staggered Pop-in for Reward Chips */}
                                <div className="duo-reward-chips-row">
                                    <motion.div
                                        initial={{ scale: 0, y: 25, opacity: 0 }}
                                        animate={{ scale: [0, 1.25, 0.95, 1], y: 0, opacity: 1 }}
                                        transition={{ delay: 0.38, type: 'spring', stiffness: 450, damping: 18 }}
                                        className="duo-reward-chip coins"
                                    >
                                        <span aria-hidden="true">🪙</span>
                                        <span>+{celebrationData.coins} EcoCoins</span>
                                    </motion.div>

                                    <motion.div
                                        initial={{ scale: 0, y: 25, opacity: 0 }}
                                        animate={{ scale: [0, 1.25, 0.95, 1], y: 0, opacity: 1 }}
                                        transition={{ delay: 0.48, type: 'spring', stiffness: 450, damping: 18 }}
                                        className="duo-reward-chip xp"
                                    >
                                        <span aria-hidden="true">⚡</span>
                                        <span>+{celebrationData.xp} XP</span>
                                    </motion.div>
                                </div>

                                {/* Animated 3D Button with Sheen Reflection */}
                                <motion.button
                                    initial={{ scale: 0.8, y: 20, opacity: 0 }}
                                    animate={{ scale: 1, y: 0, opacity: 1 }}
                                    transition={{ delay: 0.58, type: 'spring', stiffness: 350 }}
                                    onClick={() => setCelebrationData(null)}
                                    className="duo-btn duo-btn-primary duo-reward-confirm-btn"
                                    style={{ width: '100%' }}
                                >
                                    <span>AWESOME!</span>
                                    <div className="duo-btn-shine" aria-hidden="true" />
                                </motion.button>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Rewards;
