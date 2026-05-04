// src/app/api/checkout/upload-credits/route.ts
// v61: Stripe one-time payment for audio upload credits
// v62: Promo code support
// RM5 = 1 credit, paid users only

import { NextRequest, NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRICE_PER_CREDIT_MYR = 5.00
const STRIPE_PRICE_ID_UPLOAD_CREDIT = process.env.STRIPE_PRICE_ID_UPLOAD_CREDIT

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const quantity = Math.max(1, Math.min(50, Number(body.quantity) || 1))
    const promoCodeRaw = (body.promoCode || '').toString().trim().toUpperCase()

    // Verify paid user (free tier blocked)
    const { data: profile } = await sb.from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', user.id)
      .maybeSingle()

    // v62.2: Free tier now allowed to buy upload credits standalone

    if (!STRIPE_PRICE_ID_UPLOAD_CREDIT) {
      return NextResponse.json({
        error: 'Upload credit pricing not configured. Set STRIPE_PRICE_ID_UPLOAD_CREDIT env var.',
      }, { status: 500 })
    }

    // v62: Server-side promo code validation
    let stripeCouponId: string | null = null
    let validatedPromoCode: string | null = null

    if (promoCodeRaw) {
      const admin = adminClient()
      const { data: promoData, error: promoErr } = await admin
        .from('promo_codes')
        .select('*')
        .eq('code', promoCodeRaw)
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
      if (!promoData.applicable_plans?.includes('upload_credits')) {
        return NextResponse.json({
          error: 'This promo code is not valid for upload credits',
        }, { status: 400 })
      }

      // Create Stripe Coupon dynamically
      const stripeForCoupon = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
      try {
        const coupon = await stripeForCoupon.coupons.create({
          percent_off: promoData.discount_percent,
          duration: 'once',
          name: `Cotton Candy ${promoCodeRaw}`,
          metadata: { code: promoCodeRaw, promo_id: promoData.id, user_id: user.id, purchase_type: 'upload_credits' },
        })
        stripeCouponId = coupon.id
        validatedPromoCode = promoCodeRaw
      } catch (couponErr: any) {
        console.error('[checkout-credits] coupon creation failed:', couponErr.message)
        return NextResponse.json({ error: 'Failed to apply promo code' }, { status: 500 })
      }
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'fpx', 'grabpay'],
      customer_email: user.email ?? undefined,
      line_items: [{
        price: STRIPE_PRICE_ID_UPLOAD_CREDIT,
        quantity,
      }],
      ...(stripeCouponId
        ? { discounts: [{ coupon: stripeCouponId }] }
        : {}
      ),
      success_url: `${origin}/dashboard?upload_credits_purchased=${quantity}${validatedPromoCode ? `&promo=${validatedPromoCode}` : ''}`,
      cancel_url: `${origin}/dashboard`,
      metadata: {
        userId: user.id,
        purchase_type: 'upload_credits',
        quantity: String(quantity),
        ...(validatedPromoCode ? { promo_code: validatedPromoCode } : {}),
      },
    })

    console.log(`[checkout-credits] user=${user.id} qty=${quantity} promo=${validatedPromoCode || 'none'}`)
    return NextResponse.json({
      url: session.url,
      ...(validatedPromoCode ? { promoApplied: validatedPromoCode, discountPercent: stripeCouponId ? body.discount_percent : null } : {}),
    })
  } catch (e: any) {
    console.error('[checkout-credits] error:', e)
    return NextResponse.json({ error: e.message || 'Checkout failed' }, { status: 500 })
  }
}
