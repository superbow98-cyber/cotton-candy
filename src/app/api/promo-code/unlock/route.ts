// src/app/api/promo-code/unlock/route.ts
// POST — public, no login required. Returns an evergreen "share this to unlock"
// promo code for one of Cotton Candy's paid packages (pakej), at one of two
// discount tiers: 10% or 30%.
//
// Unlike the ambassador flow (one unique NAMA50 code per registered ambassador,
// requires an active paid plan), this is the public growth page: anyone landing
// on /promo-code can pick a package + tier and instantly get a shareable code,
// no account needed. The codes are FIXED per plan+tier (not randomly generated
// per visitor) so they stay simple to track and can be reused across shares.
//
// QUOTA: each plan+tier code allows 10 "unlocks" (reveals) per calendar month.
// Every click of "Unlock promo code" consumes 1 slot — regardless of whether
// the visitor goes on to actually checkout. Quota resets automatically: the
// FIRST unlock request in a new month sees `quota_month` no longer matches
// the current month, resets `quota_used` to 0 and stamps the new month — no
// cron job needed. This is a lazy reset, same spirit as the check-before-insert
// pattern used elsewhere in this file.
//
// Same check-before-insert pattern as /api/ambassador/register/route.ts —
// Supabase insert on `promo_codes` fails silently if the row already exists
// with a conflicting unique `code`, so we look up first.
import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/server'
import { PLANS, type Plan } from '@/types'

export const runtime = 'nodejs'

export type Tier = 10 | 30

// Fixed evergreen codes per plan+tier. `day` is intentionally excluded —
// same rule as the ambassador program, Day Pass is too cheap to discount
// meaningfully.
const SHARE_CODES: Partial<Record<Plan, Record<Tier, string>>> = {
  student_pro: { 10: 'CCPRO10', 30: 'CCPRO30' },
  month: { 10: 'CCMONTH10', 30: 'CCMONTH30' },
  year: { 10: 'CCYEAR10', 30: 'CCYEAR30' },
}

const QUOTA_LIMIT = 10

function currentMonthKey() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function POST(req: Request) {
  try {
    const { plan, tier } = (await req.json()) as { plan: Plan; tier: Tier }
    const code = SHARE_CODES[plan]?.[tier]
    if (!code || !PLANS[plan]) {
      return NextResponse.json({ error: 'plan_not_shareable' }, { status: 400 })
    }

    const admin = adminClient()
    const month = currentMonthKey()

    const { data: existing } = await admin
      .from('promo_codes')
      .select('code, discount_percent, quota_limit, quota_used, quota_month')
      .eq('code', code)
      .maybeSingle()

    // Row doesn't exist yet (fresh DB / migration not run) — create it with
    // this unlock counting as the first use of the month.
    if (!existing) {
      const { error: insertErr } = await admin.from('promo_codes').insert({
        code,
        discount_percent: tier,
        max_uses: 99999,
        applicable_plans: [plan],
        active: true,
        quota_limit: QUOTA_LIMIT,
        quota_used: 1,
        quota_month: month,
      })
      if (insertErr) {
        // Race: another request just created it — fall through to normal
        // check+increment path below by re-fetching.
        const { data: raceCheck } = await admin
          .from('promo_codes')
          .select('code, discount_percent, quota_limit, quota_used, quota_month')
          .eq('code', code)
          .maybeSingle()
        if (!raceCheck) {
          console.error('[promo-code/unlock] insert failed:', insertErr)
          return NextResponse.json({ error: 'unlock_failed' }, { status: 500 })
        }
        return applyQuotaAndRespond(admin, raceCheck, plan, tier, month)
      }
      return NextResponse.json({ code, discount_percent: tier, plan, tier, quota_used: 1, quota_limit: QUOTA_LIMIT })
    }

    return applyQuotaAndRespond(admin, existing, plan, tier, month)
  } catch (e: any) {
    console.error('[promo-code/unlock] error:', e)
    return NextResponse.json({ error: e.message || 'unlock_failed' }, { status: 500 })
  }
}

async function applyQuotaAndRespond(
  admin: ReturnType<typeof adminClient>,
  row: { code: string; discount_percent: number; quota_limit: number | null; quota_used: number | null; quota_month: string | null },
  plan: Plan,
  tier: Tier,
  month: string,
) {
  const limit = row.quota_limit ?? QUOTA_LIMIT
  // Lazy monthly reset: if the stored month doesn't match the current
  // month, this request is the first unlock of the new month.
  const isNewMonth = row.quota_month !== month
  const usedBefore = isNewMonth ? 0 : (row.quota_used ?? 0)

  if (usedBefore >= limit) {
    return NextResponse.json(
      {
        error: 'quota_exhausted',
        quota_used: usedBefore,
        quota_limit: limit,
        quota_month: month,
      },
      { status: 429 },
    )
  }

  const usedAfter = usedBefore + 1
  const { error: updateErr } = await admin
    .from('promo_codes')
    .update({ quota_used: usedAfter, quota_month: month })
    .eq('code', row.code)

  if (updateErr) {
    console.error('[promo-code/unlock] quota update failed:', updateErr)
    return NextResponse.json({ error: 'unlock_failed' }, { status: 500 })
  }

  return NextResponse.json({
    code: row.code,
    discount_percent: row.discount_percent,
    plan,
    tier,
    quota_used: usedAfter,
    quota_limit: limit,
  })
}
