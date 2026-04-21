-- ============================================================
-- Cotton Candy — MIGRATION 02: add ai_provider column
-- Run ONCE in Supabase SQL Editor
-- Safe to re-run
-- ============================================================

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'ai_provider'
  ) then
    alter table public.profiles add column ai_provider text default 'auto';
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_ai_provider_check'
  ) then
    alter table public.profiles
      add constraint profiles_ai_provider_check
      check (ai_provider is null or ai_provider in ('auto', 'groq', 'gemini-flash', 'gemini-flash-lite'));
  end if;
end $$;

-- Done. Existing users get 'auto' (tries Groq → Gemini Flash → Gemini Flash-Lite).
