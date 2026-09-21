import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// ── Data ─────────────────────────────────────────────────────────────────────

const PROBLEMS = [
    {
        icon: '🗑️',
        title: 'Garbage goes unreported',
        desc: 'Most citizens see overflowing bins, illegal dumping, or uncollected waste every day — but have no easy way to report it or know if it was ever addressed.',
    },
    {
        icon: '📢',
        title: 'No accountability loop',
        desc: 'Complaints filed through government portals vanish into black holes. There\'s no tracking, no community visibility, no status updates.',
    },
    {
        icon: '📉',
        title: 'Civic disengagement',
        desc: 'Without any reward or recognition, citizens lose motivation to participate. Cleaner cities need ongoing, sustained citizen involvement.',
    },
    {
        icon: '🗺️',
        title: 'No data on problem areas',
        desc: 'City officials lack real-time spatial data on where complaints cluster, making it hard to prioritize resources and allocate sanitation teams effectively.',
    },
];

const HOW_IT_WORKS = [
    { step: '01', icon: '📍', title: 'Spot & Report', desc: 'See a problem? Drop a pin, snap a photo, describe the issue. Takes under 60 seconds.' },
    { step: '02', icon: '🔥', title: 'Data goes Live', desc: 'Your report appears on the public heatmap instantly, visible to the whole community and city officials.' },
    { step: '03', icon: '🏆', title: 'Earn Rewards', desc: 'Every approved report earns XP and coins. Level up, climb the leaderboard, unlock badges and store items.' },
    { step: '04', icon: '✅', title: 'Issues get Resolved', desc: 'Admins review, assign, and update complaint status. Comments keep the community informed throughout.' },
];

const FAQS = [
    {
        q: 'Is CityPulse free to use?',
        a: 'Yes, 100% free. Creating an account, submitting reports, and viewing the heatmap costs nothing. The store uses coins you earn through participation, not real money.',
    },
    {
        q: 'Who reviews the reports I submit?',
        a: 'Reports are reviewed by verified admins and municipal officers on the platform. They can approve, mark in-progress, or resolve complaints, and post official status updates in the comments.',
    },
    {
        q: 'Can I report anonymously?',
        a: 'Yes! When submitting a complaint, you can toggle the "Submit anonymously" option. Your username will not be shown on the public feed for that report.',
    },
    {
        q: 'How does the XP and coins system work?',
        a: 'When your report gets approved by an admin, you earn XP (to level up) and coins (to spend in the store). Higher-severity reports that get resolved earn bonus XP.',
    },
    {
        q: 'What types of issues can I report?',
        a: 'Currently one category: Garbage (uncollected waste, illegal dumping, overflowing bins).',
    },
    {
        q: 'How is my location data used?',
        a: 'Coordinates are used only to place your report accurately on the heatmap. They are associated with the complaint, not your personal profile, and are never sold or shared.',
    },
    {
        q: 'Can I see what happened to past reports?',
        a: 'Yes — the Community Feed (/reports) shows all public reports with their current status. Clicking a card opens the full detail view including admin comments and resolution notes.',
    },
    {
        q: 'I\'m a city official. How do I get admin access?',
        a: 'Contact the platform team to get verified as an officer or admin. Officers can post official status updates on complaints; admins can approve, resolve, and manage all reports.',
    },
];

// ── FAQ Item ──────────────────────────────────────────────────────────────────
const FAQItem = ({ q, a, index }) => {
    const [open, setOpen] = useState(false);
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            style={{
                border: '2px solid #e2e8f0', borderRadius: '14px',
                overflow: 'hidden', background: '#fff',
                boxShadow: open ? '0 6px 24px rgba(0,0,0,0.07)' : '0 1px 4px rgba(0,0,0,0.04)',
                transition: 'box-shadow 0.2s',
            }}
        >
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    width: '100%', padding: '1.25rem 1.5rem',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'none', border: 'none', cursor: 'pointer',
                    textAlign: 'left', gap: '1rem',
                }}
            >
                <span style={{
                    fontFamily: 'var(--font-display)', fontSize: '1rem',
                    fontWeight: '800', color: '#0f172a', lineHeight: 1.4,
                }}>{q}</span>
                <motion.span
                    animate={{ rotate: open ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        flexShrink: 0, width: '28px', height: '28px',
                        background: open ? '#C62828' : '#f1f5f9',
                        color: open ? '#fff' : '#64748b',
                        borderRadius: '50%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '1.1rem', fontWeight: '900',
                    }}
                >+</motion.span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.22 }}
                        style={{ overflow: 'hidden' }}
                    >
                        <div style={{
                            padding: '0 1.5rem 1.25rem',
                            color: '#475569', fontSize: '0.95rem', lineHeight: 1.75,
                            borderTop: '1px solid #f1f5f9',
                            paddingTop: '1rem',
                        }}>{a}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ── Page ──────────────────────────────────────────────────────────────────────
import { SkeletonAbout } from '../components/ui/SkeletonLoader';

const About = () => {
    const [initLoading, setInitLoading] = useState(true);

    React.useEffect(() => {
        const timer = setTimeout(() => setInitLoading(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    if (initLoading) return <SkeletonAbout />;

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc' }}>

            {/* ── Hero ── */}
            <section style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 60%, #C62828 100%)',
                padding: '7rem 2rem 6rem', textAlign: 'center', position: 'relative', overflow: 'hidden',
            }}>
                {/* grid bg */}
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.05) 1px, transparent 0)',
                    backgroundSize: '36px 36px', pointerEvents: 'none',
                }} />
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
                    style={{ position: 'relative', maxWidth: '760px', margin: '0 auto' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        padding: '0.4rem 1.1rem', background: 'rgba(198,40,40,0.25)',
                        border: '1px solid rgba(198,40,40,0.5)', borderRadius: '999px',
                        fontFamily: 'var(--font-display)', fontSize: '0.75rem',
                        fontWeight: '800', letterSpacing: '0.12em', textTransform: 'uppercase',
                        color: '#fca5a5', marginBottom: '2rem',
                    }}>🌆 Our Mission</div>

                    <h1 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(3rem, 8vw, 6rem)',
                        fontWeight: '900', lineHeight: 0.9,
                        letterSpacing: '-0.02em', textTransform: 'uppercase',
                        color: '#fff', marginBottom: '2rem',
                    }}>
                        Cities don't<br />
                        <span style={{ color: '#FFDC2B' }}>clean themselves.</span>
                    </h1>

                    <p style={{
                        fontSize: '1.15rem', color: '#94a3b8',
                        maxWidth: '540px', margin: '0 auto 3rem', lineHeight: 1.75,
                    }}>
                        CityPulse is a civic tech platform that turns passive frustration into
                        active, rewarded, data-driven action — bridging citizens and city governments.
                    </p>

                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/register" style={{
                            padding: '0.875rem 2rem', background: '#C62828', color: 'white',
                            borderRadius: '10px', fontFamily: 'var(--font-display)', fontSize: '1rem',
                            fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em',
                            textDecoration: 'none', boxShadow: '0 4px 16px rgba(198,40,40,0.4)',
                        }}>🚀 Join Free</Link>
                        <Link to="/reports" style={{
                            padding: '0.875rem 2rem', background: 'rgba(255,255,255,0.08)',
                            color: '#fff', border: '2px solid rgba(255,255,255,0.2)',
                            borderRadius: '10px', fontFamily: 'var(--font-display)', fontSize: '1rem',
                            fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em',
                            textDecoration: 'none',
                        }}>📢 See Live Reports</Link>
                    </div>
                </motion.div>
            </section>

            {/* ── The Problem ── */}
            <section style={{ padding: '6rem 2rem', maxWidth: '1100px', margin: '0 auto' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                    <div style={{
                        display: 'inline-block', padding: '0.3rem 1rem',
                        background: '#fef2f2', border: '1px solid #fecaca',
                        borderRadius: '999px', fontFamily: 'var(--font-display)',
                        fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: '#C62828', marginBottom: '1rem',
                    }}>The Problem</div>
                    <h2 style={{
                        fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)',
                        fontWeight: '900', textTransform: 'uppercase', color: '#0f172a',
                    }}>
                        What we're <span style={{ color: '#C62828' }}>fixing</span>
                    </h2>
                    <p style={{ color: '#64748b', marginTop: '0.75rem', maxWidth: '480px', margin: '0.75rem auto 0', fontSize: '1rem' }}>
                        Urban cleanliness fails not because people don't care — but because the systems don't work.
                    </p>
                </motion.div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                    gap: '1.25rem',
                }}>
                    {PROBLEMS.map((p, i) => (
                        <motion.div key={p.title}
                            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                            style={{
                                background: '#fff', border: '2px solid #e2e8f0', borderRadius: '16px',
                                padding: '1.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                            }}
                        >
                            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>{p.icon}</div>
                            <h3 style={{
                                fontFamily: 'var(--font-display)', fontSize: '1rem',
                                fontWeight: '900', textTransform: 'uppercase', color: '#0f172a',
                                marginBottom: '0.6rem',
                            }}>{p.title}</h3>
                            <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>{p.desc}</p>
                        </motion.div>
                    ))}
                </div>
            </section>

            {/* ── How It Works ── */}
            <section style={{
                background: '#0f172a', padding: '6rem 2rem',
            }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                        style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
                        <div style={{
                            display: 'inline-block', padding: '0.3rem 1rem',
                            background: 'rgba(255,220,43,0.15)', border: '1px solid rgba(255,220,43,0.3)',
                            borderRadius: '999px', fontFamily: 'var(--font-display)',
                            fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.1em',
                            textTransform: 'uppercase', color: '#FFDC2B', marginBottom: '1rem',
                        }}>How It Works</div>
                        <h2 style={{
                            fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)',
                            fontWeight: '900', textTransform: 'uppercase', color: '#fff',
                        }}>
                            Simple. <span style={{ color: '#FFDC2B' }}>Rewarding. Impactful.</span>
                        </h2>
                    </motion.div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                        gap: '1.25rem',
                    }}>
                        {HOW_IT_WORKS.map((item, i) => (
                            <motion.div key={item.step}
                                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '16px', padding: '1.75rem',
                                }}
                            >
                                <div style={{
                                    fontFamily: 'var(--font-display)', fontSize: '0.7rem',
                                    fontWeight: '900', color: '#FFDC2B', letterSpacing: '0.12em',
                                    marginBottom: '0.75rem',
                                }}>STEP {item.step}</div>
                                <div style={{ fontSize: '2.2rem', marginBottom: '0.75rem' }}>{item.icon}</div>
                                <h3 style={{
                                    fontFamily: 'var(--font-display)', fontSize: '1rem',
                                    fontWeight: '900', color: '#fff', textTransform: 'uppercase', marginBottom: '0.5rem',
                                }}>{item.title}</h3>
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── Stats Banner ── */}
            <section style={{ background: '#C62828', padding: '3rem 2rem' }}>
                <div style={{
                    maxWidth: '900px', margin: '0 auto',
                    display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '2rem', textAlign: 'center',
                }}>
                    {[
                        { val: '60 sec', label: 'To file a report' },
                        { val: '100%', label: 'Free for citizens' },
                        { val: 'Real-time', label: 'Heatmap updates' },
                    ].map(s => (
                        <div key={s.label}>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: '900', color: '#fff' }}>{s.val}</div>
                            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.7rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.75)', marginTop: '4px' }}>{s.label}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── FAQ ── */}
            <section style={{ padding: '6rem 2rem', maxWidth: '780px', margin: '0 auto' }}>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                    style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <div style={{
                        display: 'inline-block', padding: '0.3rem 1rem',
                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                        borderRadius: '999px', fontFamily: 'var(--font-display)',
                        fontSize: '0.75rem', fontWeight: '800', letterSpacing: '0.1em',
                        textTransform: 'uppercase', color: '#15803d', marginBottom: '1rem',
                    }}>FAQ</div>
                    <h2 style={{
                        fontFamily: 'var(--font-display)', fontSize: 'clamp(2rem, 4vw, 3rem)',
                        fontWeight: '900', textTransform: 'uppercase', color: '#0f172a',
                    }}>
                        Got <span style={{ color: '#C62828' }}>questions?</span>
                    </h2>
                    <p style={{ color: '#64748b', marginTop: '0.75rem', fontSize: '1rem' }}>
                        Everything you need to know about CityPulse.
                    </p>
                </motion.div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {FAQS.map((faq, i) => (
                        <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
                    ))}
                </div>
            </section>

            {/* ── CTA Footer ── */}
            <section style={{
                background: '#0f172a', padding: '5rem 2rem', textAlign: 'center',
            }}>
                <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                    <h2 style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                        fontWeight: '900', textTransform: 'uppercase', color: '#fff', marginBottom: '1rem',
                    }}>
                        Ready to make your<br /><span style={{ color: '#FFDC2B' }}>city better?</span>
                    </h2>
                    <p style={{ color: '#94a3b8', marginBottom: '2.5rem', maxWidth: '400px', margin: '0 auto 2.5rem', fontSize: '1rem' }}>
                        Join thousands of citizens already making a difference — one report at a time.
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/register" style={{
                            padding: '1rem 2.5rem', background: '#C62828', color: 'white',
                            borderRadius: '10px', fontFamily: 'var(--font-display)', fontSize: '1.1rem',
                            fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em',
                            textDecoration: 'none', boxShadow: '0 4px 20px rgba(198,40,40,0.4)',
                        }}>🚀 Join for Free</Link>
                        <Link to="/heatmap" style={{
                            padding: '1rem 2.5rem', background: 'rgba(255,255,255,0.08)',
                            color: '#fff', border: '2px solid rgba(255,255,255,0.2)',
                            borderRadius: '10px', fontFamily: 'var(--font-display)', fontSize: '1.1rem',
                            fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em',
                            textDecoration: 'none',
                        }}>🔥 View Heatmap</Link>
                    </div>
                </motion.div>
            </section>

        </div>
    );
};

export default About;
