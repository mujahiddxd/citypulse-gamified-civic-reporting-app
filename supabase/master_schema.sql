-- ============================================
-- GarbageMaps - MASTER SQL SETUP (FRESH RESET)
-- WARNING: Running this drops existing data in these tables.
-- ============================================

-- 1. DROP EXISTING TABLES TO RESET
DROP TABLE IF EXISTS public.area_scores CASCADE;
DROP TABLE IF EXISTS public.chat_history CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.xp_logs CASCADE;
DROP TABLE IF EXISTS public.user_badges CASCADE;
DROP TABLE IF EXISTS public.badges CASCADE;
DROP TABLE IF EXISTS public.complaints CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'officer')),
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  coins INTEGER DEFAULT 0,
  inventory TEXT[] DEFAULT '{}',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPLAINTS TABLE
-- ============================================
CREATE TABLE public.complaints (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('Garbage', 'Crowd Management')),
  description TEXT NOT NULL,
  image_url TEXT,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  area_name TEXT,
  severity TEXT DEFAULT 'Medium' CHECK (severity IN ('Low', 'Medium', 'High')),
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
  additional_info TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_time INTEGER -- in minutes
);

-- ============================================
-- BADGES TABLE
-- ============================================
CREATE TABLE public.badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  xp_required INTEGER DEFAULT 0,
  icon TEXT,
  condition_type TEXT, 
  condition_value INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER BADGES (Junction Table)
-- ============================================
CREATE TABLE public.user_badges (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

-- ============================================
-- XP LOGS TABLE
-- ============================================
CREATE TABLE public.xp_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL,
  reason TEXT,
  complaint_id UUID REFERENCES public.complaints(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- FEEDBACK TABLE
-- ============================================
CREATE TABLE public.feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT DEFAULT 'Other' CHECK (category IN ('Bug', 'Suggestion', 'Other')),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AREA SCORES TABLE
-- ============================================
CREATE TABLE public.area_scores (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  area_name TEXT UNIQUE NOT NULL,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  score DOUBLE PRECISION DEFAULT 100,
  complaint_count INTEGER DEFAULT 0,
  approved_count INTEGER DEFAULT 0,
  avg_resolution_time DOUBLE PRECISION,
  trend TEXT DEFAULT 'stable' CHECK (trend IN ('improving', 'declining', 'stable')),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_complaints_latitude ON public.complaints(latitude);
CREATE INDEX idx_complaints_longitude ON public.complaints(longitude);
CREATE INDEX idx_complaints_created_at ON public.complaints(created_at);
CREATE INDEX idx_complaints_status ON public.complaints(status);
CREATE INDEX idx_complaints_user_id ON public.complaints(user_id);
CREATE INDEX idx_complaints_type ON public.complaints(type);
CREATE INDEX idx_xp_logs_user_id ON public.xp_logs(user_id);
CREATE INDEX idx_user_badges_user_id ON public.user_badges(user_id);


-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.area_scores ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Public profiles viewable by all" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Allow insert during registration" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Complaints policies
CREATE POLICY "Complaints viewable by all" ON public.complaints FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create complaints" ON public.complaints FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own complaints" ON public.complaints FOR UPDATE USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'officer')));

-- Badges policies
CREATE POLICY "Badges viewable by all" ON public.badges FOR SELECT USING (true);
CREATE POLICY "User badges viewable by all" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "User badges insertable by system" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- XP logs policies
CREATE POLICY "Users can view own XP logs" ON public.xp_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "XP logs insertable by system" ON public.xp_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Feedback policies
CREATE POLICY "Anyone can submit feedback" ON public.feedback FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view all feedback" ON public.feedback FOR SELECT USING (EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND (role = 'admin' OR role = 'officer')));

-- Area scores policies
CREATE POLICY "Area scores viewable by all" ON public.area_scores FOR SELECT USING (true);
CREATE POLICY "Area scores manageable by admins" ON public.area_scores FOR ALL USING (EXISTS(SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- DEFAULT BADGES SEED DATA
-- ============================================
INSERT INTO public.badges (name, description, xp_required, icon, condition_type, condition_value) VALUES
  ('First Report', 'Submitted your first complaint', 0, '🌱', 'approved_count', 1),
  ('Civic Starter', 'Had 3 complaints approved', 0, '⭐', 'approved_count', 3),
  ('5 Reports', 'Had 5 complaints approved', 0, '🏅', 'approved_count', 5),
  ('10 Reports', 'Had 10 complaints approved', 0, '🥇', 'approved_count', 10),
  ('Cleanliness Champion', 'Earned 500 XP', 500, '🧹', 'xp', 500),
  ('Crowd Controller', 'Submitted 5 Crowd Management reports', 0, '👮', 'type_count', 5),
  ('Community Hero', 'Earned 1000 XP', 1000, '🦸', 'xp', 1000),
  ('Urban Guardian', 'Had 25 complaints approved', 0, '🛡️', 'approved_count', 25),
  ('City Champion', 'Earned 5000 XP', 5000, '🏆', 'xp', 5000);

-- ============================================
-- TRIGGER: Auto-create user profile on Auth signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- FUNCTION: Calculate level from XP
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_level(xp_amount INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN FLOOR(SQRT(xp_amount::NUMERIC / 100)) + 1;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- FUNCTION: Award XP and Coins
-- ============================================
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_xp INTEGER,
  p_coins INTEGER DEFAULT 0,
  p_reason TEXT DEFAULT NULL,
  p_complaint_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_new_xp INTEGER;
  v_new_level INTEGER;
  v_badge RECORD;
  v_approved_count INTEGER;
BEGIN
  -- Update user XP and Coins
  UPDATE public.users
  SET xp = xp + p_xp, coins = coins + COALESCE(p_coins, 0)
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;

  -- Calculate new level
  v_new_level := public.calculate_level(v_new_xp);
  UPDATE public.users SET level = v_new_level WHERE id = p_user_id;

  INSERT INTO public.xp_logs (user_id, xp, reason, complaint_id) VALUES (p_user_id, p_xp, p_reason, p_complaint_id);

  -- Check badge unlocks
  SELECT COUNT(*) INTO v_approved_count FROM public.complaints WHERE user_id = p_user_id AND status = 'Approved';

  FOR v_badge IN SELECT * FROM public.badges LOOP
    IF EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_id = v_badge.id) THEN CONTINUE; END IF;

    IF v_badge.condition_type = 'xp' AND v_new_xp >= v_badge.condition_value THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id);
    END IF;

    IF v_badge.condition_type = 'approved_count' AND v_approved_count >= v_badge.condition_value THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Update area scores
-- ============================================
CREATE OR REPLACE FUNCTION public.update_area_score(p_area_name TEXT)
RETURNS VOID AS $$
DECLARE
  v_count INTEGER;
  v_score DOUBLE PRECISION;
  v_high_count INTEGER;
  v_medium_count INTEGER;
  v_avg_resolution DOUBLE PRECISION;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.complaints WHERE area_name = p_area_name AND status = 'Approved';
  SELECT COUNT(*) INTO v_high_count FROM public.complaints WHERE area_name = p_area_name AND severity = 'High' AND status = 'Approved';
  SELECT COUNT(*) INTO v_medium_count FROM public.complaints WHERE area_name = p_area_name AND severity = 'Medium' AND status = 'Approved';
  SELECT AVG(resolution_time) INTO v_avg_resolution FROM public.complaints WHERE area_name = p_area_name AND resolution_time IS NOT NULL;

  v_score := 100 - (v_count * 2) - (v_high_count * 5) - (v_medium_count * 2);
  v_score := GREATEST(0, v_score);

  INSERT INTO public.area_scores (area_name, score, complaint_count, avg_resolution_time, updated_at)
  VALUES (p_area_name, v_score, v_count, v_avg_resolution, NOW())
  ON CONFLICT (area_name) DO UPDATE SET score = EXCLUDED.score, complaint_count = EXCLUDED.complaint_count, updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
