-- migration-09-promo-code-quota-tiers.sql
-- Adds monthly-reset "reveal quota" to the public /promo-code page and
-- splits each plan's single 20% code into two tiers: 10% and 30%.
--
-- IMPORTANT — this is a SEPARATE quota system from `max_uses`/`used_count`.
-- Those existing columns track actual checkout redemptions (Stripe coupon
-- usage) and are untouched by this migration. The new columns below track
-- how many times a code has been REVEALED via the "Unlock promo code"
-- button on /promo-code — a visitor clicking Unlock consumes 1 of 10 slots
-- for that specific plan+tier, regardless of whether they go on to
-- checkout. Quota resets automatically the first time someone unlocks in
-- a new calendar month (lazy reset — no cron job needed, see route.ts).

alter table public.promo_codes add column if not exists quota_limit integer;
alter table public.promo_codes add column if not exists quota_used integer default 0;
alter table public.promo_codes add column if not exists quota_month text; -- 'YYYY-MM', set on first unlock each month

-- Old evergreen 20% codes (CCPRO20 / CCMONTH20 / CCYEAR20) are left as-is —
-- still valid for anyone who already has them, just no longer offered on
-- the /promo-code page. Do NOT delete them.

insert into public.promo_codes (code, discount_percent, max_uses, applicable_plans, active, quota_limit, quota_used)
values
  ('CCPRO10',   10, 99999, array['student_pro'], true, 10, 0),
  ('CCPRO30',   30, 99999, array['student_pro'], true, 10, 0),
  ('CCMONTH10', 10, 99999, array['month'],       true, 10, 0),
  ('CCMONTH30', 30, 99999, array['month'],       true, 10, 0),
  ('CCYEAR10',  10, 99999, array['year'],        true, 10, 0),
  ('CCYEAR30',  30, 99999, array['year'],        true, 10, 0)
on conflict (code) do nothing;
