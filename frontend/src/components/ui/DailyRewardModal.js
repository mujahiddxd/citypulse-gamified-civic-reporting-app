import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DailyRewardModal = ({ data, onClaim, onClose }) => {
    const [displayCoins, setDisplayCoins] = useState(0);
    const [displayXP, setDisplayXP] = useState(0);
    const [claimed, setClaimed] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');

    const dayInCycle = data.day_in_cycle || 0;
    const isAlreadyClaimed = !data.granted && data.message === 'Already claimed today';

    useEffect(() => {
        if (isAlreadyClaimed && data.next_claim_at) {
            const timer = setInterval(() => {
                const now = Date.now();
                const diff = data.next_claim_at - now;
                if (diff <= 0) {
                    setTimeLeft('Ready now! Refresh.');
                    clearInterval(timer);
                } else {
                    const hours = Math.floor(diff / (1000 * 60 * 60));
                    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const secs = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeft(`${hours}h ${mins}m ${secs}s`);
                }
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [isAlreadyClaimed, data.next_claim_at]);

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

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1.5rem',
        }} onClick={e => { if (e.target === e.currentTarget && (claimed || isAlreadyClaimed)) onClose(); }}>
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                style={{
                    background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
                    borderRadius: '32px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    boxShadow: '0 30px 100px rgba(0,0,0,0.6)',
                    padding: '3rem 2rem',
                    maxWidth: '440px',
                    width: '100%',
                    textAlign: 'center',
                    position: 'relative',
                }}
            >
                {/* Streak Badge */}
                <div style={{
                    position: 'absolute', top: '1.5rem', right: '1.5rem',
                    background: 'rgba(250, 204, 21, 0.1)', color: '#facc15',
                    padding: '0.4rem 0.8rem', borderRadius: '12px',
                    fontSize: '0.75rem', fontWeight: 'bold', border: '1px solid rgba(250, 204, 21, 0.2)'
                }}>
                    🔥 {data.streak} Day Streak
                </div>

                <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>
                    {dayInCycle % 7 === 0 ? '👑' : '🎁'}
                </div>

                <h2 style={{ fontSize: '2rem', color: '#fff', marginBottom: '0.5rem', fontWeight: '800' }}>
                    {data.granted ? 'Your Daily Reward!' : 'Collected!'}
                </h2>
                
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    Day {dayInCycle} of 30 Monthly Cycle
                </p>

                {/* Reward Cards */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ flex: 1, background: 'rgba(250, 204, 21, 0.05)', padding: '1.25rem', borderRadius: '20px', border: '1px solid rgba(250, 204, 21, 0.1)' }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#facc15' }}>
                            {claimed ? displayCoins : (data.coins_awarded || data.last_coins_awarded || 0)}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(250, 204, 21, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>EcoCoins</div>
                    </div>
                    <div style={{ flex: 1, background: 'rgba(99, 102, 241, 0.05)', padding: '1.25rem', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                        <div style={{ fontSize: '1.75rem', fontWeight: '900', color: '#6366f1' }}>
                            {claimed ? displayXP : (data.xp_awarded || data.last_xp_awarded || 0)}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'rgba(99, 102, 241, 0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>XP Points</div>
                    </div>
                </div>

                {isAlreadyClaimed && (
                    <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '16px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'rgba(34, 197, 94, 0.8)', marginBottom: '0.25rem', fontWeight: 'bold' }}>NEXT REWARD IN:</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#22c55e', fontFamily: 'monospace' }}>{timeLeft}</div>
                    </div>
                )}

                {data.bonus_item && (
                    <div style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '16px', border: '1px dashed #ef4444' }}>
                        <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 'bold' }}>🎁 BONUS UNLOCKED</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#fff' }}>{data.bonus_item} Theme</div>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {data.granted && !claimed ? (
                        <button className="btn btn-primary w-full" style={{ padding: '1rem', fontSize: '1.1rem' }} onClick={handleClaim}>
                            Claim Reward
                        </button>
                    ) : (
                        <button className="btn btn-secondary w-full" style={{ padding: '1rem', fontSize: '1.1rem' }} onClick={onClose}>
                            Awesome!
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default DailyRewardModal;
