// src/app/api/promo-code/status/route.ts
// GET — public, read-only. Returns current-month quota status for all 6
// plan+tier promo codes on /promo-code, WITHOUT consuming a slot (unlike
// POST /api/promo-code/unlock). Used to render "X/10 left" and disable
// exhausted cards on page load, before the visitor clicks anything.
//
// Rows that don't exist yet (fresh DB, nobody has unlocked this plan+tier
// this month) are reported as 0/10 used — the row gets lazily created on
// the first real unlock, same as unlock/route.ts.
import { NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/server'
import type { Plan } from '@/types'
import type { Tier } from '../unlock/route'

export const runtime = 'nodejs'

const CODES: { plan: Plan; tier: Tier; code: string }[] = [
  { plan: 'student_pro', tier: 10, code: 'CCPRO10' },
  { plan: 'student_pro', tier: 30, code: 'CCPRO30' },
  { plan: 'month', tier: 10, code: 'CCMONTH10' },
  { plan: 'month', tier: 30, code: 'CCMONTH30' },
  { plan: 'year', tier: 10, code: 'CCYEAR10' },
  { plan: 'year', tier: 30, code: 'CCYEAR30' },
]

const QUOTA_LIMIT = 10

function currentMonthKey() {
  const d = new Date()
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export async function GET() {
  try {
    const admin = adminClient()
    const month = currentMonthKey()

    const { data: rows, error } = await admin
      .from('promo_codes')
      .select('code, quota_limit, quota_used, quota_month')
      .in('code', CODES.map((c) => c.code))

    if (error) {
      console.error('[promo-code/status] query failed:', error)
      return NextResponse.json({ error: 'status_failed' }, { status: 500 })
    }

    type QuotaRow = { code: string; quota_limit: number | null; quota_used: number | null; quota_month: string | null }
    const byCode = new Map<string, QuotaRow>((rows || []).map((r: QuotaRow) => [r.code, r]))

    const status = CODES.map(({ plan, tier, code }) => {
      const row = byCode.get(code)
      const limit = row?.quota_limit ?? QUOTA_LIMIT
      // Same lazy-reset logic as unlock/route.ts: a stale quota_month means
      // this plan+tier hasn't been touched yet this month, so it reads as
      // fresh (0 used) even though the DB row hasn't been reset yet — the
      // actual reset happens on the next real unlock POST.
      const usedThisMonth = row && row.quota_month === month ? (row.quota_used ?? 0) : 0
      return {
        plan,
        tier,
        quota_used: usedThisMonth,
        quota_limit: limit,
        exhausted: usedThisMonth >= limit,
      }
    })

    return NextResponse.json({ month, status })
  } catch (e: any) {
    console.error('[promo-code/status] error:', e)
    return NextResponse.json({ error: e.message || 'status_failed' }, { status: 500 })
  }
}
