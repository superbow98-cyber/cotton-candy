-- ============================================================
-- Cotton Candy — MIGRATION 02 (rev2)
-- Adds ai_provider to BOTH profiles and lectures
-- Default = 'gemini-flash' (was 'auto')
-- Safe to re-run
-- ============================================================

-- 1. Ensure column exists on profiles
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='ai_provider'
  ) then
    alter table public.profiles add column ai_provider text default 'gemini-flash';
  end if;
end $$;

-- 2. Update default for future inserts (even if column existed before)
alter table public.profiles alter column ai_provider set default 'gemini-flash';

-- 3. Any existing profiles that are still on 'auto' (the old default) → move to 'gemini-flash'
update public.profiles set ai_provider = 'gemini-flash' where ai_provider = 'auto';

-- 4. Ensure constraint exists (drop old, re-add to be safe)
alter table public.profiles drop constraint if exists profiles_ai_provider_check;
alter table public.profiles add constraint profiles_ai_provider_check
  check (ai_provider is null or ai_provider in ('auto', 'groq', 'gemini-flash', 'gemini-flash-lite'));

-- 5. Add ai_provider to lectures (for per-lecture override)
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='lectures' and column_name='ai_provider'
  ) then
    alter table public.lectures add column ai_provider text;
  end if;
end $$;

alter table public.lectures drop constraint if exists lectures_ai_provider_check;
alter table public.lectures add constraint lectures_ai_provider_check
  check (ai_provider is null or ai_provider in ('auto', 'groq', 'gemini-flash', 'gemini-flash-lite'));

-- Done.
-- Existing users now default to gemini-flash.
-- New users also default to gemini-flash.
-- Lectures inherit from profile unless user overrides per-lecture.
