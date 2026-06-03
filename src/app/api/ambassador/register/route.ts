// src/app/api/ambassador/register/route.ts
// POST — register current user as ambassador, generate promo code
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/server'
export const runtime = 'nodejs'
function generatePromoCode(fullName: string | null): string {
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
  // Check active paid plan
  const now = new Date().toISOString()
  const { data: profile } = await admin
    .from('profiles')
    .select('plan, boost_expires_at, full_name, ambassador_promo_code')
    .eq('id', user.id)
    .maybeSingle()
  const eligiblePlans = ['student_pro', 'month', 'year']
  const hasActivePlan =
    eligiblePlans.includes(profile?.plan) &&
    profile?.boost_expires_at &&
    profile.boost_expires_at > now
  if (!hasActivePlan) {
    return NextResponse.json({ error: 'active_plan_required' }, { status: 403 })
  }
  // Check if already an ambassador
  const { data: existing } = await admin
    .from('ambassadors')
    .select('id, promo_code')
    .eq('user_id', user.id)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ promo_code: existing.promo_code, already_registered: true })
  }
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
  const { error: profileErr } = await admin.from('profiles').update({
    ambassador_promo_code: promoCode,
  }).eq('id', user.id)
  if (profileErr) {
    console.error('[ambassador/register] profiles update failed:', profileErr)
    return NextResponse.json({ error: 'Profile update failed' }, { status: 500 })
  }
  // Register promo code in promo_codes table
  const { data: existingCode } = await admin
    .from('promo_codes')
    .select('code')
    .eq('code', promoCode)
    .maybeSingle()
  if (!existingCode) {
    const { error: promoErr } = await admin.from('promo_codes').insert({
      code: promoCode,
      discount_percent: 50,
      max_uses: 9999,
      applicable_plans: ['student_pro', 'month', 'year'],
      active: true,
    })
    if (promoErr) {
      console.error('[ambassador/register] promo_codes insert failed:', promoErr)
    }
  }
  console.log(`[ambassador/register] user=${user.id} code=${promoCode}`)
  return NextResponse.json({ promo_code: promoCode })
}
