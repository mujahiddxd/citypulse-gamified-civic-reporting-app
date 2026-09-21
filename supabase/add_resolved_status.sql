-- ============================================================
-- Migration: Add 'resolved' and 'In Progress' to status CHECK
-- Run this once in your Supabase SQL Editor
-- ============================================================

-- Step 1: Drop the old restrictive CHECK constraint
ALTER TABLE public.complaints
  DROP CONSTRAINT IF EXISTS complaints_status_check;

-- Step 2: Add the updated CHECK constraint that includes 'resolved' and 'In Progress'
ALTER TABLE public.complaints
  ADD CONSTRAINT complaints_status_check
  CHECK (status IN ('Pending', 'Approved', 'Rejected', 'resolved', 'In Progress'));

-- Step 3: Make sure the resolved_at column exists
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Verify
SELECT conname, consrc
FROM pg_constraint
WHERE conrelid = 'public.complaints'::regclass
  AND contype = 'c';
