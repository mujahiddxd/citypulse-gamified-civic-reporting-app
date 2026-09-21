-- ============================================
-- Migration: Add missing columns to complaints table
-- Adds: municipality, AI verification columns
-- Safe to run multiple times (IF NOT EXISTS)
-- ============================================

-- Municipality column (detected from reverse geocoding)
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS municipality TEXT;

-- AI verification metadata columns
ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN,
  ADD COLUMN IF NOT EXISTS ai_confidence DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS ai_severity TEXT,
  ADD COLUMN IF NOT EXISTS ai_user_override BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_mode TEXT;
