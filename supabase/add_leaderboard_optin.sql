-- Migration: Add leaderboard_opt_in column to users table
-- Run this in Supabase SQL Editor

ALTER TABLE users ADD COLUMN IF NOT EXISTS leaderboard_opt_in BOOLEAN DEFAULT FALSE;

-- Optional: automatically opt-in existing users with XP > 0 who may have already been active
-- UPDATE users SET leaderboard_opt_in = TRUE WHERE xp > 0;
