-- ============================================
-- GARBAGEMAPS - ADD OFFICER ROLE
-- ============================================

-- Drop the old constraint that only allowed 'user' or 'admin'
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add the new constraint allowing 'officer' as well
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin', 'officer'));
