import { NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'
import { PLANS, type Plan } from '@/types'

export async function POST(req: Request) {
  try {
    const { code, plan } = await req.json() as { code: string; plan: Plan }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ ok: false, error: 'not authenticated' }, { status: 401 })

    const admin = adminClient()
    const { data: promo } = await admin.from('promo_codes').select('*').eq('code', code).maybeSingle()
    if (!promo) return NextResponse.json({ ok: false, error: 'invalid code' }, { status: 400 })
    if (promo.plan !== plan) return NextResponse.json({ ok: false, error: 'wrong plan' }, { status: 400 })
    if (promo.use_count >= promo.max_uses) return NextResponse.json({ ok: false, error: 'expired' }, { status: 400 })

    const p = PLANS[plan]
    const expires = p.durationHours
      ? new Date(Date.now() + p.durationHours * 3600 * 1000).toISOString()
      : null

    await admin.from('profiles').update({
      plan,
      plan_upgraded_at: new Date().toISOString(),
      plan_expires_at: expires,
    }).eq('id', user.id)

    await admin.from('promo_codes').update({ use_count: promo.use_count + 1 }).eq('id', promo.id)
    await admin.from('promo_uses').insert({ promo_id: promo.id, user_id: user.id })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 })
  }
}
