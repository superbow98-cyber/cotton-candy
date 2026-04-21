-- ============================================================
-- Cotton Candy — Lecture Recorder SaaS
-- Full schema with RLS + realtime + auto profile trigger
-- Run this in Supabase SQL Editor (once)
-- ============================================================

-- extensions
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- profiles
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  plan text not null default 'free',
  plan_upgraded_at timestamptz,
  plan_expires_at timestamptz,
  lang text not null default 'en',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles self insert" on public.profiles;
create policy "profiles self insert" on public.profiles
  for insert with check (auth.uid() = id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- lectures (one class / one recording session)
-- ------------------------------------------------------------
create table if not exists public.lectures (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Untitled Lecture',
  subject text,
  lecturer text,
  location text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer default 0,
  transcript_md text default '',
  summary text,
  timeline jsonb default '[]'::jsonb,  -- [{t: "00:03:14", event: "topic change: mitosis"}]
  keywords text[] default '{}',
  word_count integer default 0,
  status text not null default 'draft',  -- draft | recording | finished | archived
  lang text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lectures enable row level security;

drop policy if exists "lectures owner all" on public.lectures;
create policy "lectures owner all" on public.lectures
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists lectures_user_idx on public.lectures(user_id, created_at desc);

-- ------------------------------------------------------------
-- notebooks (a grouped collection of lectures → exported as 1 PDF)
-- ------------------------------------------------------------
create table if not exists public.notebooks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Notebook',
  subject text,
  color text default '#FFB7C5',
  lecture_ids uuid[] default '{}',
  last_exported_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notebooks enable row level security;

drop policy if exists "notebooks owner all" on public.notebooks;
create policy "notebooks owner all" on public.notebooks
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- promo_codes (same pattern as Memoir / Karaoku)
-- ------------------------------------------------------------
create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  plan text not null,  -- which plan it unlocks
  discount_percent integer default 100,
  max_uses integer default 1,
  use_count integer default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.promo_codes enable row level security;

drop policy if exists "promo read anyone" on public.promo_codes;
create policy "promo read anyone" on public.promo_codes
  for select using (true);

create table if not exists public.promo_uses (
  id uuid primary key default gen_random_uuid(),
  promo_id uuid references public.promo_codes(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  used_at timestamptz not null default now()
);

alter table public.promo_uses enable row level security;

drop policy if exists "promo_uses self read" on public.promo_uses;
create policy "promo_uses self read" on public.promo_uses
  for select using (auth.uid() = user_id);

drop policy if exists "promo_uses self insert" on public.promo_uses;
create policy "promo_uses self insert" on public.promo_uses
  for insert with check (auth.uid() = user_id);

-- ------------------------------------------------------------
-- realtime publication
-- ------------------------------------------------------------
alter publication supabase_realtime add table public.lectures;
alter publication supabase_realtime add table public.notebooks;

-- ------------------------------------------------------------
-- Seed a default promo code (optional — remove if you want)
-- ------------------------------------------------------------
insert into public.promo_codes (code, plan, discount_percent, max_uses)
values ('COTTONLAUNCH', 'month', 100, 100)
on conflict (code) do nothing;
