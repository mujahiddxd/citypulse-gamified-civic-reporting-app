/**
 * routes/statistics.js — Public Platform Statistics
 * --------------------------------------------------
 * Returns aggregated, publicly visible statistics about the platform.
 * Unlike analytics.js (admin-only), this endpoint is open to all visitors
 * and displayed on the /statistics page and homepage.
 *
 * Route: GET /api/statistics
 *
 * Returns:
 *   totalComplaints      — all complaints ever submitted
 *   resolvedComplaints   — sum of 'Approved' + 'resolved' status complaints
 *   inProgressComplaints — complaints with status 'in_progress'
 *   pendingComplaints    — awaiting admin review
 *   activeUsers          — total registered users
 *   highSeverityCount    — complaints marked High severity
 *   uniqueAreas          — number of distinct area names with complaints
 *   resolutionRate       — % of all complaints that have been resolved (string, 1 decimal)
 */
const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');

router.get('/', async (req, res) => {
    try {
        // Total complaints across all statuses
        const { count: totalComplaints } = await supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true }); // head:true means don't return rows, just count

        // Count "resolved" complaints — the app uses 'Approved' as the primary approved status,
        // but some older records may use lowercase 'resolved'. Sum both to be safe.
        const { count: approvedCount } = await supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Approved');

        const { count: resolvedCount } = await supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'resolved');

        const resolvedComplaints = (approvedCount || 0) + (resolvedCount || 0);

        // In-progress: started but not yet resolved
        const { count: inProgressComplaints } = await supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'in_progress');

        // Pending: submitted but not yet reviewed by admin
        const { count: pendingComplaints } = await supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'Pending');

        // Active users = all registered accounts (not just recently active)
        const { count: activeUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        // High-severity reports are tracked separately as a key metric
        const { count: highSeverityCount } = await supabase
            .from('complaints')
            .select('*', { count: 'exact', head: true })
            .eq('severity', 'High');

        // Count unique area names by fetching all non-null area_name values,
        // then deduplicating using a JavaScript Set
        const { data: areaData } = await supabase
            .from('complaints')
            .select('area_name')
            .not('area_name', 'is', null); // Exclude rows where area_name is NULL

        // Set automatically removes duplicate area names
        const uniqueAreas = new Set((areaData || []).map(r => r.area_name).filter(Boolean));

        // Resolution rate as a percentage: (resolved ÷ total) × 100
        const total = totalComplaints || 0;
        const resolutionRate = total > 0
            ? ((resolvedComplaints / total) * 100).toFixed(1) // e.g. "67.3"
            : '0';

        res.json({
            totalComplaints: total,
            resolvedComplaints,
            inProgressComplaints: inProgressComplaints || 0,
            pendingComplaints: pendingComplaints || 0,
            activeUsers: activeUsers || 0,
            highSeverityCount: highSeverityCount || 0,
            uniqueAreas: uniqueAreas.size, // Count of distinct area names
            resolutionRate,
        });
    } catch (err) {
        console.error('Statistics error:', err);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

module.exports = router;
