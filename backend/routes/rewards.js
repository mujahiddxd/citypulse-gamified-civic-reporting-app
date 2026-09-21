const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

/**
 * Daily Tasks Configuration
 * These are refreshed every 24 hours.
 */
/**
 * Daily Task Sets Configuration
 * There are 5 different sets that cycle based on the day.
 * All rewards are already tripled (3x).
 */
const TASK_SETS = [
    [ // Set 1: Standard Explorer
        { id: 'view_heatmap', label: 'Aerial Surveyor', desc: 'Visit the city-wide heatmap.', reward_xp: 150, reward_coins: 60 },
        { id: 'view_leaderboard', label: 'Competitive Spirit', desc: 'Check the global leaderboard.', reward_xp: 90, reward_coins: 45, goal: 1 },
        { id: 'submit_report', label: 'First Responder', desc: 'Submit a new garbage report.', reward_xp: 450, reward_coins: 150, goal: 1 },
        { id: 'view_profile', label: 'Self Reflection', desc: 'View your civic profile stats.', reward_xp: 75, reward_coins: 30, goal: 1 },
    ],
    [ // Set 2: Social Citizen
        { id: 'view_leaderboard', label: 'Rising Star', desc: 'Monitor your rank on the leaderboard.', reward_xp: 120, reward_coins: 50, goal: 1 },
        { id: 'submit_report', label: 'Waste Warrior', desc: 'Help keep the streets clean.', reward_xp: 450, reward_coins: 150, goal: 1 },
        { id: 'view_heatmap', label: 'Crisis Mapper', desc: 'Identify hotspots on the heatmap.', reward_xp: 150, reward_coins: 60, goal: 1 },
        { id: 'view_reports', label: 'Public Eye', desc: 'Review recent public reports.', reward_xp: 100, reward_coins: 40, goal: 1 },
    ],
    [ // Set 3: Urban Scout
        { id: 'submit_report', label: 'Clean-Up Hero', desc: 'Record a garbage issue in your area.', reward_xp: 500, reward_coins: 180, goal: 1 },
        { id: 'view_profile', label: 'Stat Tracker', desc: 'Check your progress in the profile.', reward_xp: 90, reward_coins: 40, goal: 1 },
        { id: 'view_heatmap', label: 'Environment Watch', desc: 'Scan the city for clean zones.', reward_xp: 140, reward_coins: 55, goal: 1 },
        { id: 'view_leaderboard', label: 'League Inspect', desc: 'See who is leading the charge.', reward_xp: 80, reward_coins: 35, goal: 1 },
    ],
    [ // Set 4: Maintenance Specialist
        { id: 'view_heatmap', label: 'Grid Optimizer', desc: 'Analyze garbage distribution.', reward_xp: 160, reward_coins: 70, goal: 1 },
        { id: 'submit_report', label: 'Civic Duty', desc: 'Report any waste for processing.', reward_xp: 450, reward_coins: 150, goal: 1 },
        { id: 'view_profile', label: 'Identity Check', desc: 'Update or view your profile card.', reward_xp: 70, reward_coins: 30, goal: 1 },
        { id: 'view_reports', label: 'Incident Monitor', desc: 'Read through the public feed.', reward_xp: 110, reward_coins: 45, goal: 1 },
    ],
    [ // Set 5: Community Guardian
        { id: 'view_leaderboard', label: 'Glory Seeker', desc: 'Aim for the top of the leaderboard.', reward_xp: 100, reward_coins: 50, goal: 1 },
        { id: 'view_heatmap', label: 'Safe Passage', desc: 'Ensure your route is clear of waste.', reward_xp: 150, reward_coins: 60, goal: 1 },
        { id: 'submit_report', label: 'Rapid Response', desc: 'Instant reporting for a cleaner city.', reward_xp: 480, reward_coins: 160, goal: 1 },
        { id: 'view_reports', label: 'Feed Analyst', desc: 'Stay updated with live community reports.', reward_xp: 120, reward_coins: 55, goal: 1 },
    ]
];

const getCurrentSet = () => {
    const day = new Date().getUTCDate();
    return TASK_SETS[day % 5];
};

// Get current daily tasks status for the user
router.get('/daily-tasks', authenticate, async (req, res) => {
    const userId = req.user.id;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Set to absolute start of day in UTC
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(0,0,0,0);
    const startOfDayISO = startOfDay.toISOString();

    const currentTasks = getCurrentSet();

    console.log(`[Rewards] Fetching tasks for user ${userId}, today: ${todayStr}`);

    try {
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('inventory')
            .eq('id', userId)
            .single();

        const inventory = (user && user.inventory) ? user.inventory : [];

        // Check real progress from DB
        let reportsCount = { count: 0 };
        try {
            const { count: c } = await supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfDayISO);
            reportsCount.count = c || 0;
        } catch (dbErr) {
            console.error('[Rewards] DB counts error:', dbErr);
        }

        const counts = {
            submit_report: reportsCount.count || 0,
            view_leaderboard: 1, // Auto-verify
            view_profile: 1,     // Auto-verify
            view_heatmap: 1,     // Auto-verify
            view_reports: 1      // Auto-verify
        };

        const tasks = currentTasks.map(task => {
            const isCompleted = inventory.includes(`TASK_COMPLETED:${task.id}:${todayStr}`);
            const progress = counts[task.id] || 0;
            const canClaim = !isCompleted && progress >= (task.goal || 1);

            return {
                ...task,
                completed: isCompleted,
                current_progress: isCompleted ? (task.goal || 1) : progress,
                can_claim: canClaim
            };
        });

        res.json({ tasks });
    } catch (err) {
        console.error('[Rewards] Critical error:', err);
        res.json({ 
            tasks: currentTasks.map(t => ({ ...t, completed: false, current_progress: 0, can_claim: false })) 
        });
    }
});

// Claim a completed task
router.post('/claim-task/:taskId', authenticate, async (req, res) => {
    const { taskId } = req.params;
    const userId = req.user.id;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const startOfDay = new Date(today.setHours(0,0,0,0)).toISOString();

    const currentTasks = getCurrentSet();

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('coins, xp, inventory')
            .eq('id', userId)
            .single();

        if (error || !user) return res.status(404).json({ error: 'User not found' });

        const task = currentTasks.find(t => t.id === taskId);
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const inventory = user.inventory || [];
        const claimTag = `TASK_COMPLETED:${taskId}:${todayStr}`;

        if (inventory.includes(claimTag)) {
            return res.status(400).json({ error: 'Task already claimed today' });
        }

        // Verify progress
        let count = 0;
        if (taskId === 'submit_report') {
            const { count: c } = await supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfDay);
            count = c || 0;
        } else if (['view_heatmap', 'view_leaderboard', 'view_profile'].includes(taskId)) {
            count = 1; // Auto-verify simple tasks
        }

        if (count < (task.goal || 1)) {
            return res.status(400).json({ error: 'Task objective not met yet' });
        }

        const newInventory = [...inventory, claimTag];
        const newCoins = (user.coins || 0) + task.reward_coins;
        const newXP = (user.xp || 0) + task.reward_xp;

        const { error: updateError } = await supabase
            .from('users')
            .update({
                coins: newCoins,
                xp: newXP,
                inventory: newInventory
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        res.json({
            success: true,
            reward_coins: task.reward_coins,
            reward_xp: task.reward_xp,
            new_coins: newCoins,
            new_xp: newXP
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
