-- ============================================================
-- Cotton Candy migration-07 — Student PRO tier + Free downgrade
-- ============================================================

-- 1. Add 'student_pro' to plan enum (skip if plan column is TEXT, not enum)
-- Cotton Candy's profiles.plan is likely TEXT with CHECK constraint.
-- If it's a CHECK constraint, update it:

DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Find existing plan check constraint
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND conname LIKE '%plan%check%';

  IF FOUND THEN
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT ' || quote_ident(constraint_name);
  END IF;

  -- Add new check constraint that includes student_pro
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_plan_check
    CHECK (plan IN ('free', 'day', 'student_pro', 'month', 'year'));
END $$;

-- 2. Downgrade existing free users from 3 sessions to 1 session/month
-- Reset their audio usage so the new cap applies
UPDATE public.profiles
SET audio_seconds_used = 0,
    audio_reset_at = NOW()
WHERE plan = 'free';

-- 3. Verify migration
SELECT
  plan,
  COUNT(*) as user_count
FROM public.profiles
GROUP BY plan
ORDER BY plan;

-- Expected output (example):
-- plan          | user_count
-- --------------|------------
-- free          | X (reset to 0 audio)
-- day           | Y
-- month         | Z
-- year          | W
-- student_pro   | 0 (no users yet)
