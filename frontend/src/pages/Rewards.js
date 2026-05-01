import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

import ProfileCard from '../components/ui/ProfileCard';

// ── Configuration ────────────────────────────────────────────────────────────

const RARITY = {
    COMMON: { color: '#8e8e8e', bg: 'linear-gradient(180deg, #d3d3d3, #a9a9a9)', glow: 'rgba(142, 142, 142, 0.2)' },
    RARE: { color: '#4b96ff', bg: 'linear-gradient(180deg, #7fb5ff, #4b96ff)', glow: 'rgba(75, 150, 255, 0.3)' },
    EPIC: { color: '#a35dff', bg: 'linear-gradient(180deg, #c08cff, #a35dff)', glow: 'rgba(163, 93, 255, 0.3)' },
    LEGENDARY: { color: '#ffb13b', bg: 'linear-gradient(180deg, #ffd18c, #ffb13b)', glow: 'rgba(255, 177, 59, 0.4)' },
};

// Generate 30 days of rewards
const MONTHLY_REWARDS = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1;
    if (day === 30) return { day, name: 'Eco Legend', qty: 1, icon: '👑', rarity: 'LEGENDARY', isItem: true };
    if (day % 7 === 0) return { day, name: 'Special Item', qty: 1, icon: '🎁', rarity: 'EPIC', isItem: true };
    if (day % 5 === 0) return { day, name: 'Eco Crystal', qty: 100, icon: '💠', rarity: 'RARE' };
    if (day % 2 === 0) return { day, name: 'XP Manual', qty: 50, icon: '📔', rarity: 'COMMON' };
    return { day, name: 'Eco Shard', qty: 25, icon: '💎', rarity: 'COMMON' };
});

const Rewards = () => {
    const [activeTab, setActiveTab] = useState('daily');
    const [rewardData, setRewardData] = useState(null);
    const [taskData, setTaskData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [claiming, setClaiming] = useState(null);
    const [timeLeft, setTimeLeft] = useState('');
    const { user, setUser } = useAuth();
    const navigate = useNavigate();

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
        const timer = setInterval(() => {
            if (rewardData?.next_claim_at) {
                const diff = rewardData.next_claim_at - Date.now();
                if (diff <= 0) setTimeLeft('Ready!');
                else {
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
        if (rewardData?.granted === false) return;
        setClaiming('daily');
        try {
            const { data } = await api.post('/store/daily-reward', {});
            setRewardData(data);
            if (data.granted && setUser) {
                setUser(prev => ({ 
                    ...prev, 
                    coins: data.new_coins, 
                    xp: data.new_xp,
                    inventory: data.inventory || prev.inventory
                }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setClaiming(null);
        }
    };

    const handleClaimTask = async (taskId) => {
        setClaiming(taskId);
        try {
            const { data } = await api.post(`/rewards/claim-task/${taskId}`);
            if (data.success) {
                setTaskData(prev => prev.map(t => t.id === taskId ? { ...t, completed: true } : t));
                if (setUser) setUser(prev => ({ ...prev, coins: data.new_coins, xp: data.new_xp }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setClaiming(null);
        }
    };

    if (loading && !rewardData) return <div className="loader-container"><div className="loader"></div></div>;

    const currentDay = rewardData?.day_in_cycle || 0;
    const isTodayClaimed = !rewardData?.granted && rewardData?.message === 'Already claimed today';

    // Animation variants
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1, 
            transition: { 
                staggerChildren: 0.05 
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
    };

    return (
        <div className="rewards-page" style={{
            minHeight: '100vh',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
            fontFamily: '"Space Grotesk", sans-serif',
            color: '#fff'
        }}>
            <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel"
                style={{
                    width: '1200px',
                    height: '800px',
                    borderRadius: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    position: 'relative'
                }}
            >
                {/* Header */}
                <div style={{
                    height: '70px',
                    background: 'rgba(61, 68, 81, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 2rem',
                    gap: '2.5rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ color: '#d3bc8e', fontWeight: '900', fontSize: '1.4rem', letterSpacing: '1px' }}>EVENT CENTER</div>
                    {['daily', 'tasks'].map(tab => (
                        <div 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.5)',
                                cursor: 'pointer',
                                height: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                padding: '0 1.5rem',
                                borderBottom: activeTab === tab ? '4px solid #d3bc8e' : 'none',
                                fontWeight: 'bold',
                                textTransform: 'uppercase',
                                fontSize: '0.9rem',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            {tab === 'daily' ? 'Check-in Rewards' : 'Daily Commissions'}
                        </div>
                    ))}
                    <div style={{ marginLeft: 'auto', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '1.5rem' }} onClick={() => navigate('/dashboard')}>✖</div>
                </div>

                <div style={{ flex: 1, display: 'flex' }}>
                    {/* Sidebar */}
                    <div style={{ width: '350px', padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ transform: 'scale(0.85)', transformOrigin: 'top center', marginBottom: '-2rem' }}>
                            <ProfileCard
                                name={user?.username}
                                title={`Lv. ${user?.level || 1} • ${user?.xp?.toLocaleString() || 0} XP`}
                                handle={user?.email?.split('@')[0]}
                                status="Online"
                                avatarUrl={`https://ui-avatars.com/api/?name=${user?.username || 'U'}&background=0D8ABC&color=fff&size=150`}
                                miniAvatarUrl={`https://ui-avatars.com/api/?name=${user?.username || 'U'}&background=0D8ABC&color=fff&size=50`}
                                enableTilt={true}
                            />
                        </div>
                        <div style={{ textAlign: 'center', marginTop: 'auto' }}>
                            <h3 style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>Login Streak</h3>
                            <div style={{ fontSize: '4.5rem', fontWeight: '900', color: '#d3bc8e', lineHeight: 1 }}>{rewardData?.streak || 0}</div>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontStyle: 'italic', marginTop: '1rem' }}>"May the city stay clean under your watch!"</p>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="reward-content-scroll" style={{ flex: 1, padding: '2.5rem', overflowY: 'auto' }}>
                        <AnimatePresence mode="wait">
                            {activeTab === 'daily' ? (
                                <motion.div key="daily" variants={containerVariants} initial="hidden" animate="visible" exit="hidden" style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
                                    {MONTHLY_REWARDS.map((item, idx) => {
                                        const r = RARITY[item.rarity];
                                        const isClaimed = idx + 1 < currentDay || (idx + 1 === currentDay && isTodayClaimed);
                                        const isToday = idx + 1 === currentDay && !isTodayClaimed;
                                        return (
                                            <motion.div
                                                key={item.day}
                                                variants={itemVariants}
                                                onClick={() => isToday && handleClaimDaily()}
                                                className={`reward-card-premium ${isToday ? 'is-today' : ''}`}
                                                style={{
                                                    background: isClaimed ? 'rgba(0,0,0,0.3)' : 'rgba(255, 255, 255, 0.05)',
                                                    borderRadius: '8px',
                                                    padding: '0.75rem',
                                                    textAlign: 'center',
                                                    border: isToday ? '2px solid #d3bc8e' : '1px solid rgba(255,255,255,0.05)',
                                                    cursor: isToday ? 'pointer' : 'default',
                                                    opacity: idx + 1 > currentDay + 1 ? 0.6 : 1
                                                }}
                                            >
                                                <div style={{ height: '80px', background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', borderRadius: '4px', marginBottom: '0.5rem', position: 'relative' }}>
                                                    {item.icon}
                                                    {isClaimed && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px' }}>✅</div>}
                                                </div>
                                                <div style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>x{item.qty}</div>
                                                <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>Day {item.day}</div>
                                            </motion.div>
                                        );
                                    })}
                                </motion.div>
                            ) : (
                                <motion.div key="tasks" variants={containerVariants} initial="hidden" animate="visible" exit="hidden" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    {taskData.map((task) => (
                                        <motion.div key={task.id} variants={itemVariants} className="commission-item" style={{
                                            background: 'rgba(255,255,255,0.04)',
                                            padding: '1.25rem',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1.5rem',
                                            borderRadius: '12px',
                                            border: '1px solid rgba(255,255,255,0.05)'
                                        }}>
                                            <div style={{ fontSize: '2.5rem', minWidth: '60px', textAlign: 'center' }}>
                                                {task.id === 'view_heatmap' ? '🗺️' : task.id === 'upvote_reports' ? '👍' : task.id === 'submit_report' ? '🚨' : '💬'}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{task.label}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>{task.desc}</div>
                                                <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                    <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                                                        <div style={{ width: `${(task.current_progress / (task.goal || 1)) * 100}%`, height: '100%', background: task.completed ? '#22c55e' : '#4b96ff', borderRadius: '3px' }} />
                                                    </div>
                                                    <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{task.current_progress}/{task.goal || 1}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', paddingLeft: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                                                <div style={{ textAlign: 'right', minWidth: '80px' }}>
                                                    <div style={{ color: '#ffb13b', fontWeight: 'bold' }}>🪙 {task.reward_coins}</div>
                                                    <div style={{ color: '#4b96ff', fontWeight: 'bold' }}>⚡ {task.reward_xp}</div>
                                                </div>
                                                {task.completed ? (
                                                    <button disabled style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.2)', border: 'none', padding: '0.6rem 2rem', borderRadius: '6px', fontSize: '0.8rem' }}>Claimed</button>
                                                ) : task.can_claim ? (
                                                    <button onClick={() => handleClaimTask(task.id)} disabled={claiming === task.id} style={{ background: '#d3bc8e', color: '#1a1a1a', border: 'none', padding: '0.6rem 2rem', borderRadius: '6px', fontWeight: '900', cursor: 'pointer', boxShadow: '0 0 15px rgba(211, 188, 142, 0.3)', fontSize: '0.8rem' }}>Claim</button>
                                                ) : (
                                                    <button onClick={() => navigate(task.id === 'view_heatmap' ? '/heatmap' : '/reports')} style={{ background: 'transparent', color: '#4b96ff', border: '1.5px solid #4b96ff', padding: '0.5rem 2rem', borderRadius: '6px', fontWeight: '900', cursor: 'pointer', fontSize: '0.8rem' }}>Go</button>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                    {taskData.length === 0 && (
                                        <div style={{ textAlign: 'center', padding: '3rem', opacity: 0.5 }}>
                                            <h3>Updating commissions...</h3>
                                            <button onClick={fetchData} style={{ background: '#d3bc8e', color: '#1a1a1a', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', marginTop: '1rem', cursor: 'pointer' }}>Manual Refresh</button>
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Footer */}
                <div style={{ height: '40px', background: 'rgba(61, 68, 81, 0.4)', display: 'flex', alignItems: 'center', padding: '0 2rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>NEXT REWARD IN: <span style={{ color: '#fff', fontWeight: 'bold' }}>{timeLeft || 'READY'}</span></span>
                    <span style={{ marginLeft: 'auto' }}>Adventurer Rank: {user?.level || 1}</span>
                </div>
            </motion.div>
        </div>
    );
};

export default Rewards;
