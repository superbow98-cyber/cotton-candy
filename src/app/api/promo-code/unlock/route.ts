// src/app/api/promo-code/unlock/route.ts
// POST — public, no login required. Returns an evergreen "share this to unlock"
// promo code for one of Cotton Candy's paid packages (pakej).
//
// Unlike the ambassador flow (one unique NAMA50 code per registered ambassador,
// requires an active paid plan), this is the public growth page: anyone landing
// on /promo-code can pick a package and instantly get a shareable code, no
// account needed. The codes are FIXED per plan (not randomly generated per
// visitor) so they stay simple to track and can be reused across shares.
//
// Same check-before-insert pattern as /api/ambassador/register/route.ts —
// Supabase insert on `promo_codes` fails silently if the row already exists
// with a conflicting unique `code`, so we look up first.
import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/server'
import { PLANS, type Plan } from '@/types'

export const runtime = 'nodejs'

// Fixed evergreen codes + discount per shareable plan. `day` is intentionally
// excluded — same rule as the ambassador program (see brain doc MASALAH-adjacent
// note: "day plan promo code ambassador TAK VALID"), Day Pass is too cheap to
// discount meaningfully.
const SHARE_CODES: Partial<Record<Plan, { code: string; discountPercent: number }>> = {
  student_pro: { code: 'CCPRO20', discountPercent: 20 },
  month: { code: 'CCMONTH20', discountPercent: 20 },
  year: { code: 'CCYEAR20', discountPercent: 20 },
}

export async function POST(req: Request) {
  try {
    const { plan } = (await req.json()) as { plan: Plan }
    const share = SHARE_CODES[plan]
    if (!share || !PLANS[plan]) {
      return NextResponse.json({ error: 'plan_not_shareable' }, { status: 400 })
    }

    const admin = adminClient()

    const { data: existing } = await admin
      .from('promo_codes')
      .select('code, discount_percent')
      .eq('code', share.code)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({
        code: existing.code,
        discount_percent: existing.discount_percent,
        plan,
      })
    }

    const { error: insertErr } = await admin.from('promo_codes').insert({
      code: share.code,
      discount_percent: share.discountPercent,
      max_uses: 99999,
      applicable_plans: [plan],
      active: true,
    })

    if (insertErr) {
      // Check-before-insert can still race under concurrent first requests —
      // if insert failed because the row now exists, treat as success.
      const { data: raceCheck } = await admin
        .from('promo_codes')
        .select('code, discount_percent')
        .eq('code', share.code)
        .maybeSingle()
      if (raceCheck) {
        return NextResponse.json({
          code: raceCheck.code,
          discount_percent: raceCheck.discount_percent,
          plan,
        })
      }
      console.error('[promo-code/unlock] insert failed:', insertErr)
      return NextResponse.json({ error: 'unlock_failed' }, { status: 500 })
    }

    return NextResponse.json({
      code: share.code,
      discount_percent: share.discountPercent,
      plan,
    })
  } catch (e: any) {
    console.error('[promo-code/unlock] error:', e)
    return NextResponse.json({ error: e.message || 'unlock_failed' }, { status: 500 })
  }
}
