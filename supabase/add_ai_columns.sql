-- ============================================
-- Migration: Add AI Garbage Verification columns
-- Run this in your Supabase SQL Editor
-- ============================================
-- These columns store the AI verification result alongside each complaint
-- so admins can see the AI verdict when reviewing.

ALTER TABLE public.complaints
  ADD COLUMN IF NOT EXISTS ai_verified BOOLEAN,
  ADD COLUMN IF NOT EXISTS ai_confidence INTEGER,
  ADD COLUMN IF NOT EXISTS ai_severity TEXT,
  ADD COLUMN IF NOT EXISTS ai_user_override BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_mode TEXT;

-- Optional: Add a comment for clarity
COMMENT ON COLUMN public.complaints.ai_verified IS 'true = AI detected garbage, false = not detected, null = not analyzed';
COMMENT ON COLUMN public.complaints.ai_confidence IS '0-100 confidence percentage from AI model';
COMMENT ON COLUMN public.complaints.ai_severity IS 'AI-estimated severity: Low, Medium, or High';
COMMENT ON COLUMN public.complaints.ai_user_override IS 'true if user submitted despite AI not detecting garbage';
COMMENT ON COLUMN public.complaints.ai_mode IS 'ai_analyzed, admin_fallback, or model_loading';
