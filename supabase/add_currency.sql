-- ============================================
-- GARBAGEMAPS - STORE & CURRENCY UPDATE
-- ============================================
-- 1. Add coins and inventory to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS inventory TEXT[] DEFAULT '{}';

-- 2. Update award_xp to also award coins
CREATE OR REPLACE FUNCTION public.award_xp(
  p_user_id UUID,
  p_xp INTEGER,
  p_coins INTEGER DEFAULT 0, -- NEW parameter for coins
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
  SET 
    xp = xp + p_xp,
    coins = coins + COALESCE(p_coins, 0)
  WHERE id = p_user_id
  RETURNING xp INTO v_new_xp;

  -- Calculate new level
  v_new_level := public.calculate_level(v_new_xp);
  UPDATE public.users SET level = v_new_level WHERE id = p_user_id;

  -- Log XP
  INSERT INTO public.xp_logs (user_id, xp, reason, complaint_id)
  VALUES (p_user_id, p_xp, p_reason, p_complaint_id);

  -- Check badge unlocks
  SELECT COUNT(*) INTO v_approved_count
  FROM public.complaints
  WHERE user_id = p_user_id AND status = 'Approved';

  FOR v_badge IN SELECT * FROM public.badges LOOP
    -- Skip if already earned
    IF EXISTS (SELECT 1 FROM public.user_badges WHERE user_id = p_user_id AND badge_id = v_badge.id) THEN
      CONTINUE;
    END IF;

    -- Check XP-based badges
    IF v_badge.condition_type = 'xp' AND v_new_xp >= v_badge.condition_value THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id);
    END IF;

    -- Check approved count badges
    IF v_badge.condition_type = 'approved_count' AND v_approved_count >= v_badge.condition_value THEN
      INSERT INTO public.user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
