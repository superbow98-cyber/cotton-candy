import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { PLANS, type Plan } from '@/types'

// Map plan key → env var with Price ID
const PRICE_ID_MAP: Record<Exclude<Plan, 'free'>, string | undefined> = {
  day:         process.env.STRIPE_PRICE_DAY,
  student_pro: process.env.STRIPE_PRICE_STUDENT_PRO,
  month:       process.env.STRIPE_PRICE_MONTH,
  year:        process.env.STRIPE_PRICE_YEAR,
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as { plan: Plan; promo?: string | null }
    const { plan, promo } = body

    if (!plan || !PLANS[plan] || plan === 'free') {
      return NextResponse.json({ error: 'invalid plan' }, { status: 400 })
    }
    const priceId = PRICE_ID_MAP[plan]
    if (!priceId) {
      return NextResponse.json(
        { error: `price ID not configured for plan "${plan}"` },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

    // v50: Server-side promo code re-validation
    let stripeCouponId: string | null = null
    let validatedPromoCode: string | null = null

    if (promo && typeof promo === 'string' && promo.trim()) {
      const code = promo.trim().toUpperCase()
      const { data: promoData, error: promoErr } = await supabase
        .from('promo_codes')
        .select('*')
        .eq('code', code)
        .maybeSingle()

      if (promoErr || !promoData) {
        return NextResponse.json({ error: 'Invalid promo code' }, { status: 400 })
      }
      if (!promoData.active) {
        return NextResponse.json({ error: 'Promo code disabled' }, { status: 400 })
      }
      if (promoData.expires_at && new Date(promoData.expires_at) < new Date()) {
        return NextResponse.json({ error: 'Promo code expired' }, { status: 400 })
      }
      if (promoData.max_uses && promoData.used_count >= promoData.max_uses) {
        return NextResponse.json({ error: 'Promo code usage limit reached' }, { status: 400 })
      }
      if (!promoData.applicable_plans?.includes(plan)) {
        return NextResponse.json({ error: 'Promo code not valid for this plan' }, { status: 400 })
      }

      // Create Stripe Coupon dynamically (one-time, percent_off, expires after this session)
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
      try {
        const coupon = await stripe.coupons.create({
          percent_off: promoData.discount_percent,
          duration: 'once',
          name: `Cotton Candy ${code}`,
          metadata: { code, promo_id: promoData.id, user_id: user.id },
        })
        stripeCouponId = coupon.id
        validatedPromoCode = code
      } catch (couponErr: any) {
        console.error('[checkout] coupon creation failed:', couponErr.message)
        return NextResponse.json({ error: 'Failed to apply promo code' }, { status: 500 })
      }
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
    const p = PLANS[plan]
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
    const isSub = p.stripeMode === 'subscription'

    const session = await stripe.checkout.sessions.create({
      mode: isSub ? 'subscription' : 'payment',
      payment_method_types: isSub ? ['card'] : ['card', 'fpx', 'grabpay'],
      customer_email: user.email ?? undefined,
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      // v50: Apply discount if promo validated
      ...(stripeCouponId
        ? (isSub
            ? { discounts: [{ coupon: stripeCouponId }] }
            : { discounts: [{ coupon: stripeCouponId }] })
        : {}
      ),
      success_url: `${origin}/dashboard?welcome=1${validatedPromoCode ? `&promo=${validatedPromoCode}` : ''}`,
      cancel_url: `${origin}/#pricing`,
      metadata: {
        userId: user.id,
        plan,
        ...(validatedPromoCode ? { promo_code: validatedPromoCode } : {}),
      },
      ...(isSub ? {
        subscription_data: {
          metadata: {
            userId: user.id,
            plan,
            ...(validatedPromoCode ? { promo_code: validatedPromoCode } : {}),
          },
        },
      } : {}),
    })

    console.log(`[checkout] v50 created | plan: ${plan} | promo: ${validatedPromoCode || 'none'} | discount: ${stripeCouponId ? 'applied' : 'none'}`)

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('checkout err', e)
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 })
  }
}
