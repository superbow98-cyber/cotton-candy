// src/app/api/ambassador/register/route.ts
// POST — register current user as ambassador, generate promo code

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

function generatePromoCode(fullName: string | null): string {
  // Format: first name uppercase + "50", e.g. "AMIR50"
  // Fallback to random 4-char alphanum if no name
  const base = fullName
    ? fullName.trim().split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8)
    : Math.random().toString(36).substring(2, 6).toUpperCase()
  return `${base || 'USER'}50`
}

export async function POST() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = adminClient()

  // Check if already an ambassador
  const { data: existing } = await admin
    .from('ambassadors')
    .select('id, promo_code')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ promo_code: existing.promo_code, already_registered: true })
  }

  // Get profile for name
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, ambassador_promo_code')
    .eq('id', user.id)
    .maybeSingle()

  // Already has a promo code somehow
  if (profile?.ambassador_promo_code) {
    return NextResponse.json({ promo_code: profile.ambassador_promo_code, already_registered: true })
  }

  // Generate unique promo code — retry if collision
  let promoCode = generatePromoCode(profile?.full_name ?? null)
  let attempts = 0
  while (attempts < 5) {
    const { data: clash } = await admin
      .from('profiles')
      .select('id')
      .eq('ambassador_promo_code', promoCode)
      .maybeSingle()
    if (!clash) break
    // Collision — append random suffix
    promoCode = generatePromoCode(profile?.full_name ?? null) + Math.floor(Math.random() * 90 + 10)
    attempts++
  }

  // Insert ambassador row
  const { error: ambErr } = await admin.from('ambassadors').insert({
    user_id: user.id,
    promo_code: promoCode,
  })
  if (ambErr) {
    console.error('[ambassador/register] insert failed:', ambErr)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }

  // Stamp promo code on profile
  await admin.from('profiles').update({
    ambassador_promo_code: promoCode,
  }).eq('id', user.id)

  // Register promo code — ambassador codes only valid for student_pro, month, year
  await admin.from('promo_codes').insert({
    code: promoCode,
    plan: 'student_pro',
    discount_percent: 50,
    max_uses: 9999,
    applicable_plans: ['student_pro', 'month', 'year'],
    active: true,
  }).onConflict('code').ignore()

  console.log(`[ambassador/register] user=${user.id} code=${promoCode}`)
  return NextResponse.json({ promo_code: promoCode })
}
