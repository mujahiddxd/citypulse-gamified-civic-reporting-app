/**
 * routes/store.js — In-App Cosmetic Store
 * ----------------------------------------
 * Manages the virtual economy: purchasing cosmetic items with EcoCoins,
 * equipping/unequipping them, and claiming daily login rewards.
 *
 * HOW THE INVENTORY SYSTEM WORKS:
 * ─────────────────────────────────
 * The `inventory` column in the `users` table is a TEXT[] (array of strings).
 * Each string in the array is either:
 *
 *   "ItemName"                    → an owned item (theme, border, title)
 *   "EQUIPPED_THEME:forest"       → currently equipped theme
 *   "EQUIPPED_BORDER:gold-frame"  → currently equipped border
 *   "EQUIPPED_TITLE:Eco Hero"     → currently equipped title tag
 *   "DAILY_CLAIMED:1711234567890" → timestamp of last daily reward claim
 *   "DAILY_STREAK:7"              → current consecutive daily login streak
 *
 * This tag-based approach uses no extra DB tables — everything is
 * stored as specially prefixed strings inside the single inventory array.
 *
 * Routes (under /api/store):
 *   POST /buy          → Purchase an item with EcoCoins
 *   POST /equip        → Equip an owned item (sets EQUIPPED_ tag)
 *   POST /unequip      → Remove an equipped item (removes EQUIPPED_ tag)
 *   POST /daily-reward → Claim the 24-hour daily XP + coin reward
 */
const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');
const router = express.Router();

// ── POST /api/store/buy ───────────────────────────────────────────────────────
// Purchases an item from the store by deducting EcoCoins and adding the
// item name to the user's inventory.
//
// Body: { itemId: string, itemPrice: number, itemName: string }
router.post('/buy', authenticate, async (req, res) => {
    const { itemId, itemPrice, itemName } = req.body;
    const userId = req.user.id;

    if (!itemId || !itemPrice || !itemName) {
        return res.status(400).json({ error: 'Missing item details' });
    }

    try {
        // Step 1: Fetch current coins and inventory for the user
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('coins, inventory')
            .eq('id', userId)
            .single();

        if (fetchError || !user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const inventory = user.inventory || [];

        // Step 2: Check if they already own this item (prevent duplicate purchases)
        if (inventory.includes(itemName)) {
            return res.status(400).json({ error: 'You already own this item' });
        }

        // Step 3: Check if they have enough EcoCoins
        if (user.coins < itemPrice) {
            return res.status(400).json({ error: 'Not enough EcoCoins' });
        }

        // Step 4: Deduct coins and add item name to inventory array
        const newCoins = user.coins - itemPrice;
        inventory.push(itemName); // Add item name as a plain string

        const { error: updateError } = await supabase
            .from('users')
            .update({ coins: newCoins, inventory: inventory })
            .eq('id', userId);

        if (updateError) {
            console.error(updateError);
            return res.status(500).json({ error: 'Failed to process purchase' });
        }

        res.json({ success: true, message: `Successfully purchased ${itemName}`, coins: newCoins, inventory });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during purchase' });
    }
});

// ── POST /api/store/equip ─────────────────────────────────────────────────────
// Equips an owned item by adding an "EQUIPPED_<TYPE>:<value>" tag to inventory.
// Removes any previously equipped item of the same type first (one at a time).
//
// Body: { type: 'theme' | 'border' | 'title', value: string }
//
// Example: equip theme "forest" → removes "EQUIPPED_THEME:*", adds "EQUIPPED_THEME:forest"
router.post('/equip', authenticate, async (req, res) => {
    const { type, value } = req.body;
    const userId = req.user.id;

    try {
        const { data: user, error: fetchError } = await supabase
            .from('users').select('inventory').eq('id', userId).single();

        if (fetchError || !user) return res.status(404).json({ error: 'User not found' });

        // Build the prefix string for this equip type (e.g. "EQUIPPED_THEME:")
        const prefix = `EQUIPPED_${type.toUpperCase()}:`;

        // Remove any existing equipped item of this type (so only one is active at a time)
        const cleanInventory = (user.inventory || []).filter(i => !i.startsWith(prefix));

        // Add the new equipped tag at the end
        const newInventory = [...cleanInventory, `${prefix}${value}`];

        const { error: updateError } = await supabase
            .from('users').update({ inventory: newInventory }).eq('id', userId);

        if (updateError) throw updateError;
        res.json({ success: true, inventory: newInventory });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during equip' });
    }
});

// ── POST /api/store/unequip ───────────────────────────────────────────────────
// Removes the equipped tag for a given type from inventory.
// Does NOT remove the owned item — just the EQUIPPED_ tag.
//
// Body: { type: 'theme' | 'border' | 'title' }
router.post('/unequip', authenticate, async (req, res) => {
    const { type } = req.body;
    const userId = req.user.id;

    try {
        const { data: user, error: fetchError } = await supabase
            .from('users').select('inventory').eq('id', userId).single();

        if (fetchError || !user) return res.status(404).json({ error: 'User not found' });

        const prefix = `EQUIPPED_${type.toUpperCase()}:`;

        // Filter out all entries that start with this prefix (effectively un-equipping)
        const newInventory = (user.inventory || []).filter(i => !i.startsWith(prefix));

        const { error: updateError } = await supabase
            .from('users').update({ inventory: newInventory }).eq('id', userId);

        if (updateError) throw updateError;
        res.json({ success: true, inventory: newInventory });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error during unequip' });
    }
});

// ── POST /api/store/daily-reward ─────────────────────────────────────────────
// Awards a daily login reward with escalating amounts based on streak day.
// Each day of the 30-day cycle gives different coins/XP.
// Milestones at Days 7, 14, 21, and 30 give special bonus items.
//
// 30-DAY REWARD SCHEDULE:
//   - Days 1-6: Normal escalating (25-75 coins)
//   - Day 7: Milestone (150 coins + 'Midnight Patrol')
//   - Days 8-13: Escalating (40-90 coins)
//   - Day 14: Milestone (200 coins + 'Cyberpunk')
//   - Days 15-20: Escalating (60-120 coins)
//   - Day 21: Milestone (300 coins + 'Golden Shimmer')
//   - Days 22-29: High stakes (80-180 coins)
//   - Day 30: Grand Jackpot (500 coins + 'Eco Legend' Title)

const MONTHLY_REWARDS = [
    { coins: 25,  xp: 15  }, // Day 1
    { coins: 35,  xp: 20  }, // Day 2
    { coins: 50,  xp: 25  }, // Day 3
    { coins: 40,  xp: 20  }, // Day 4
    { coins: 60,  xp: 30  }, // Day 5
    { coins: 75,  xp: 35  }, // Day 6
    { coins: 150, xp: 100, bonus: 'Midnight Patrol' }, // Day 7
    { coins: 40,  xp: 25  }, // Day 8
    { coins: 55,  xp: 30  }, // Day 9
    { coins: 70,  xp: 40  }, // Day 10
    { coins: 65,  xp: 35  }, // Day 11
    { coins: 80,  xp: 45  }, // Day 12
    { coins: 95,  xp: 50  }, // Day 13
    { coins: 200, xp: 150, bonus: 'Cyberpunk' }, // Day 14
    { coins: 60,  xp: 40  }, // Day 15
    { coins: 75,  xp: 50  }, // Day 16
    { coins: 90,  xp: 60  }, // Day 17
    { coins: 85,  xp: 55  }, // Day 18
    { coins: 110, xp: 70  }, // Day 19
    { coins: 130, xp: 80  }, // Day 20
    { coins: 300, xp: 200, bonus: 'Golden Shimmer' }, // Day 21
    { coins: 80,  xp: 60  }, // Day 22
    { coins: 100, xp: 75  }, // Day 23
    { coins: 120, xp: 90  }, // Day 24
    { coins: 140, xp: 105 }, // Day 25
    { coins: 160, xp: 120 }, // Day 26
    { coins: 180, xp: 135 }, // Day 27
    { coins: 150, xp: 110 }, // Day 28
    { coins: 200, xp: 150 }, // Day 29
    { coins: 500, xp: 300, bonus: 'Eco Legend' }, // Day 30
];

router.post('/daily-reward', authenticate, async (req, res) => {
    const userId = req.user.id;
    const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    try {
        const { data: user, error: fetchError } = await supabase
            .from('users')
            .select('coins, xp, inventory')
            .eq('id', userId)
            .single();

        if (fetchError || !user) return res.status(404).json({ error: 'User not found' });

        const inventory = user.inventory || [];

        // Extract the last claim timestamp and current streak from inventory tags
        const claimEntry = inventory.find(i => i.startsWith('DAILY_CLAIMED:'));
        const streakEntry = inventory.find(i => i.startsWith('DAILY_STREAK:'));

        const lastClaimed = claimEntry ? parseInt(claimEntry.split(':')[1]) : 0;
        const currentStreak = streakEntry ? parseInt(streakEntry.split(':')[1]) : 0;
        const now = Date.now();

        // Check if 24 hours have passed since the last claim
        if (now - lastClaimed < COOLDOWN_MS) {
            const nextClaimAt = lastClaimed + COOLDOWN_MS;
            return res.json({
                granted: false,
                message: 'Already claimed today',
                next_claim_at: nextClaimAt,
                streak: currentStreak,
                day_in_cycle: currentStreak > 0 ? ((currentStreak - 1) % 30) + 1 : 0,
                coins_awarded: 0,
                xp_awarded: 0,
            });
        }

        // Determine if the streak continues or resets
        const withinStreak = now - lastClaimed < 2 * COOLDOWN_MS; // 48-hour grace window
        const newStreak = (lastClaimed > 0 && withinStreak) ? currentStreak + 1 : 1;

        // Calculate the day within the 30-day cycle (1-30)
        const dayIdx = ((newStreak - 1) % 30);
        const dayReward = MONTHLY_REWARDS[dayIdx];
        const totalCoins = dayReward.coins;
        const totalXP = dayReward.xp;

        // Replace old DAILY_CLAIMED and DAILY_STREAK tags with updated values
        const cleanInventory = inventory.filter(
            i => !i.startsWith('DAILY_CLAIMED:') && !i.startsWith('DAILY_STREAK:')
        );
        cleanInventory.push(`DAILY_CLAIMED:${now}`, `DAILY_STREAK:${newStreak}`);

        // Add bonus item if it's a milestone day
        let bonusItem = null;
        if (dayReward.bonus) {
            if (!cleanInventory.includes(dayReward.bonus)) {
                cleanInventory.push(dayReward.bonus);
                bonusItem = dayReward.bonus;
            } else {
                bonusItem = dayReward.bonus; // Already owned
            }
        }

        // Update user: add rewards + update inventory tags in one DB write
        const { error: updateError } = await supabase
            .from('users')
            .update({
                coins: (user.coins || 0) + totalCoins,
                xp: (user.xp || 0) + totalXP,
                inventory: cleanInventory,
            })
            .eq('id', userId);

        if (updateError) throw updateError;

        res.json({
            granted: true,
            coins_awarded: totalCoins,
            xp_awarded: totalXP,
            streak: newStreak,
            day_in_cycle: dayIdx + 1,
            next_claim_at: now + COOLDOWN_MS,
            bonus_item: bonusItem,
            new_coins: (user.coins || 0) + totalCoins,
            new_xp: (user.xp || 0) + totalXP,
            inventory: cleanInventory
        });
    } catch (err) {
        console.error('[Daily Reward]', err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
