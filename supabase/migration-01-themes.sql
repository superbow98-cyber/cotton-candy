-- ============================================================
-- Cotton Candy — MIGRATION: add theme field
-- Run this ONCE in Supabase SQL Editor
-- Safe to re-run (uses IF NOT EXISTS / DO blocks)
-- ============================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'theme'
  ) then
    alter table public.profiles add column theme text;
  end if;
end $$;

-- Optional: keep a constraint so only valid themes can be stored
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_theme_check'
  ) then
    alter table public.profiles
      add constraint profiles_theme_check
      check (theme is null or theme in ('pink','blue','green','yellow'));
  end if;
end $$;

-- Done. New users start with theme = NULL (picker appears on first login).
-- Existing users keep NULL until they open the app — picker will show once.
