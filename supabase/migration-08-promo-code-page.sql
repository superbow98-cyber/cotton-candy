-- migration-08-promo-code-page.sql
-- Seeds the evergreen "share to unlock" promo codes used by the public
-- /promo-code page (src/app/promo-code/). These are NOT ambassador codes —
-- they are static, plan-keyed codes anyone can unlock without an account.
--
-- NOTE: this repo's supabase/schema.sql still describes the OLD promo_codes
-- shape (`plan text not null`, `use_count`). The LIVE production table has
-- since been patched (see brain-cottoncandy.md MASALAH 7-11) to use
-- `applicable_plans text[]` and `active boolean` instead. This insert
-- targets the LIVE shape. If you're running this against a fresh DB built
-- from schema.sql, run that patch first:
--
--   alter table public.promo_codes add column if not exists applicable_plans text[];
--   alter table public.promo_codes add column if not exists active boolean default true;
--
-- The API route (src/app/api/promo-code/unlock/route.ts) also does a
-- check-before-insert at request time, so this seed is optional — it just
-- avoids the very first visitor paying the extra insert round-trip.

insert into public.promo_codes (code, discount_percent, max_uses, applicable_plans, active)
values
  ('CCPRO20',   20, 99999, array['student_pro'], true),
  ('CCMONTH20', 20, 99999, array['month'],       true),
  ('CCYEAR20',  20, 99999, array['year'],        true)
on conflict (code) do nothing;
