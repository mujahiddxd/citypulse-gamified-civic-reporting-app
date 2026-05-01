const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

/**
 * Daily Tasks Configuration
 * These are refreshed every 24 hours.
 */
const DAILY_TASKS = [
    { id: 'view_heatmap', label: 'Aerial Surveyor', desc: 'Visit the city-wide heatmap.', reward_xp: 50, reward_coins: 20 },
    { id: 'upvote_reports', label: 'Vigilant Guardian', desc: 'Upvote 3 public reports.', reward_xp: 75, reward_coins: 30, goal: 3 },
    { id: 'submit_report', label: 'First Responder', desc: 'Submit a new garbage report.', reward_xp: 150, reward_coins: 50, goal: 1 },
    { id: 'comment_report', label: 'Civic Voice', desc: 'Leave a comment on a report.', reward_xp: 100, reward_coins: 40, goal: 1 },
];

// Get current daily tasks status for the user
router.get('/daily-tasks', authenticate, async (req, res) => {
    const userId = req.user.id;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Set to absolute start of day in UTC
    const startOfDay = new Date(today);
    startOfDay.setUTCHours(0,0,0,0);
    const startOfDayISO = startOfDay.toISOString();

    console.log(`[Rewards] Fetching tasks for user ${userId}, today: ${todayStr}`);

    try {
        // Fetch user data (inventory tags)
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('inventory')
            .eq('id', userId)
            .single();

        if (userError) {
            console.error('[Rewards] User fetch error:', userError);
            // Don't fail the whole request, just proceed with empty inventory
        }

        const inventory = (user && user.inventory) ? user.inventory : [];

        // Check real progress from DB with error handling for each
        let reportsCount = { count: 0 };
        let upvotesCount = { count: 0 };
        let commentsCount = { count: 0 };

        try {
            const results = await Promise.allSettled([
                supabase.from('complaints').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfDayISO),
                Promise.resolve({ count: inventory.filter(i => i.startsWith('UPVOTE:') && i.includes(todayStr)).length }),
                supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfDayISO)
            ]);

            if (results[0].status === 'fulfilled' && !results[0].value.error) reportsCount = results[0].value;
            if (results[1].status === 'fulfilled') upvotesCount = results[1];
            if (results[2].status === 'fulfilled' && !results[2].value.error) commentsCount = results[2].value;
        } catch (dbErr) {
            console.error('[Rewards] DB counts error:', dbErr);
        }

        const counts = {
            submit_report: reportsCount.count || 0,
            upvote_reports: upvotesCount.count || 0,
            comment_report: commentsCount.count || 0,
            view_heatmap: inventory.includes(`TASK_COMPLETED:view_heatmap:${todayStr}`) ? 1 : 0
        };

        const tasks = DAILY_TASKS.map(task => {
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
        // ABSOLUTE FALLBACK: Return tasks with 0 progress so UI isn't empty
        res.json({ 
            tasks: DAILY_TASKS.map(t => ({ ...t, completed: false, current_progress: 0, can_claim: false })) 
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

    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('coins, xp, inventory')
            .eq('id', userId)
            .single();

        if (error || !user) return res.status(404).json({ error: 'User not found' });

        const task = DAILY_TASKS.find(t => t.id === taskId);
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
        } else if (taskId === 'comment_report') {
            const { count: c } = await supabase.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', startOfDay);
            count = c || 0;
        } else if (taskId === 'upvote_reports') {
            count = inventory.filter(i => i.startsWith('UPVOTE:') && i.includes(todayStr)).length;
        } else if (taskId === 'view_heatmap') {
            // Heatmap is special, we'll assume the frontend pinged it
            // For now, if they are claiming it, we trust or assume it was marked.
            // Actually, view_heatmap should be marked by a separate endpoint when they visit.
            count = inventory.includes(`TASK_COMPLETED:view_heatmap:${todayStr}`) ? 1 : 0;
        }

        if (count < (task.goal || 1) && taskId !== 'view_heatmap') {
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
