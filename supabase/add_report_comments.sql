-- Migration: Add report_comments table for the CityPulse Community Feed
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS report_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) >= 1 AND char_length(content) <= 500),
  is_official_update BOOLEAN DEFAULT FALSE, -- TRUE for admin/officer updates
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast complaint lookup
CREATE INDEX IF NOT EXISTS idx_report_comments_complaint ON report_comments(complaint_id);

-- Enable Row Level Security
ALTER TABLE report_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "Anyone can read comments"
  ON report_comments FOR SELECT
  USING (true);

-- Authenticated users can post comments
CREATE POLICY "Users can insert their own comments"
  ON report_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete own comments"
  ON report_comments FOR DELETE
  USING (auth.uid() = user_id);
