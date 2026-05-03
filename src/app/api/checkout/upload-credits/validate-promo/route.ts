// src/app/api/checkout/upload-credits/validate-promo/route.ts
// v62: Pre-validate promo code for upload credits checkout (preview discount)

import { NextRequest, NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const code = String(body.code || '').trim().toUpperCase()
    if (!code) return NextResponse.json({ ok: false, error: 'Code required' }, { status: 400 })

    const admin = adminClient()
    const { data: promo, error } = await admin
      .from('promo_codes')
      .select('discount_percent, applicable_plans, active, expires_at, max_uses, used_count')
      .eq('code', code)
      .maybeSingle()

    if (error || !promo) {
      return NextResponse.json({ ok: false, error: 'Invalid promo code' }, { status: 400 })
    }
    if (!promo.active) {
      return NextResponse.json({ ok: false, error: 'Promo code disabled' }, { status: 400 })
    }
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return NextResponse.json({ ok: false, error: 'Promo code expired' }, { status: 400 })
    }
    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return NextResponse.json({ ok: false, error: 'Promo code usage limit reached' }, { status: 400 })
    }
    if (!promo.applicable_plans?.includes('upload_credits')) {
      return NextResponse.json({ ok: false, error: 'This promo code is not valid for upload credits' }, { status: 400 })
    }

    return NextResponse.json({
      ok: true,
      code,
      discountPercent: promo.discount_percent,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'Validation failed' }, { status: 500 })
  }
}
