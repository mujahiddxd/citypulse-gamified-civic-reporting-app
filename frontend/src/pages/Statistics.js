import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import api from '../utils/api';
import { SkeletonStatistics } from '../components/ui/SkeletonLoader';

const StatCard = ({ icon, label, value, suffix = '', color, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay, duration: 0.5, ease: 'easeOut' }}
        style={{
            background: '#fff',
            border: '3px solid #111',
            borderRadius: '20px',
            padding: '2rem 1.75rem',
            boxShadow: '6px 6px 0px #111',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            position: 'relative',
            overflow: 'hidden',
        }}
    >
        <div style={{
            position: 'absolute', top: 0, right: 0, width: '80px', height: '80px',
            background: color, opacity: 0.1, borderRadius: '0 20px 0 100%'
        }} />
        <div style={{ fontSize: '2.5rem' }}>{icon}</div>
        <div style={{
            fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: '900', color, lineHeight: 1, marginTop: '0.5rem'
        }}>
            {value}<span style={{ fontSize: '1.5rem', color: '#94a3b8' }}>{suffix}</span>
        </div>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.95rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {label}
        </div>
    </motion.div>
);

const Statistics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            const start = Date.now();
            try {
                const { data } = await api.get('/statistics');
                setStats(data);
            } catch (err) {
                console.error(err);
            } finally {
                const elapsed = Date.now() - start;
                if (elapsed < 2000) await new Promise(r => setTimeout(r, 2000 - elapsed));
                setLoading(false);
            }
        };
        fetch();
    }, []);

    if (loading) return <SkeletonStatistics />;

    if (!stats) return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '1rem' }}>
            <span style={{ fontSize: '3rem' }}>⚠️</span>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: '700', color: '#ef4444' }}>Could not load statistics</div>
            <p style={{ color: '#64748b' }}>Make sure the backend server is running and try refreshing.</p>
            <a href="/statistics" style={{ color: '#6366f1', fontWeight: '700' }}>Retry</a>
        </div>
    );

    return (
        <div className="page" style={{ minHeight: '100vh', background: '#F8FAFC' }}>
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem' }}>

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                        <span style={{ fontSize: '2.5rem' }}>📈</span>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: '900', color: '#0f172a', margin: 0 }}>
                            City<span style={{ color: 'var(--accent)' }}>Pulse</span> Statistics
                        </h1>
                    </div>
                    <p style={{ color: '#64748b', fontSize: '1.1rem', fontWeight: '500', margin: 0 }}>
                        Real-time impact metrics of our civic community's collective action.
                    </p>
                </motion.div>

                {/* Main Metric Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
                    <StatCard icon="📋" label="Total Reports Filed" value={stats.totalComplaints.toLocaleString()} color="#6366f1" delay={0} />
                    <StatCard icon="✅" label="Reports Resolved" value={stats.resolvedComplaints.toLocaleString()} color="#22c55e" delay={0.1} />
                    <StatCard icon="🔄" label="Under Review" value={stats.inProgressComplaints.toLocaleString()} color="#f59e0b" delay={0.2} />
                    <StatCard icon="👥" label="Active Citizens" value={stats.activeUsers.toLocaleString()} color="#3b82f6" delay={0.3} />
                    <StatCard icon="🔴" label="High Risk Reports" value={stats.highSeverityCount.toLocaleString()} color="#ef4444" delay={0.4} />
                    <StatCard icon="🗺️" label="Areas Covered" value={stats.uniqueAreas.toLocaleString()} color="#8b5cf6" delay={0.5} />
                </div>

                {/* Resolution Rate Banner */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    style={{
                        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                        border: '3px solid #111', borderRadius: '20px',
                        padding: '2.5rem', boxShadow: '6px 6px 0px #111',
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem'
                    }}
                >
                    <div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                            Platform Resolution Rate
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '5rem', fontWeight: '900', color: '#FFDC2B', lineHeight: 1 }}>
                            {stats.resolutionRate}<span style={{ fontSize: '2.5rem', color: '#64748b' }}>%</span>
                        </div>
                        <div style={{ color: '#64748b', marginTop: '0.5rem', fontWeight: '600' }}>
                            of all submitted reports have been actioned
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ background: '#1e293b', borderRadius: '999px', height: '24px', border: '2px solid #334155', overflow: 'hidden' }}>
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(parseFloat(stats.resolutionRate), 100)}%` }}
                                transition={{ delay: 0.8, duration: 1.2, ease: 'easeOut' }}
                                style={{
                                    height: '100%',
                                    background: 'linear-gradient(90deg, #22c55e, #4ade80)',
                                    borderRadius: '999px',
                                    boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', color: '#475569', fontSize: '0.85rem', fontWeight: '600' }}>
                            <span>0%</span>
                            <span>100%</span>
                        </div>
                    </div>
                </motion.div>

                {/* Breakdown*/}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    style={{ marginTop: '2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}
                >
                    {[
                        { label: 'Pending Reports', count: stats.pendingComplaints, color: '#e2e8f0', textColor: '#111' },
                        { label: 'Resolved Reports', count: stats.resolvedComplaints, color: '#dcfce7', textColor: '#16a34a' },
                    ].map((item, idx) => (
                        <div key={idx} style={{
                            background: item.color, border: '2px solid #111', borderRadius: '16px',
                            padding: '1.5rem', boxShadow: '4px 4px 0px #111'
                        }}>
                            <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                {item.label}
                            </div>
                            <div style={{ fontSize: '2.5rem', fontWeight: '900', color: item.textColor, fontFamily: 'var(--font-display)', marginTop: '0.25rem' }}>
                                {item.count}
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
};

export default Statistics;
