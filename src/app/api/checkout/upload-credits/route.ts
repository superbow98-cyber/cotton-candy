// src/app/api/checkout/upload-credits/route.ts
// v61: Stripe one-time payment for audio upload credits
// RM5 = 1 credit, paid users only

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PRICE_PER_CREDIT_MYR = 5.00
const STRIPE_PRICE_ID_UPLOAD_CREDIT = process.env.STRIPE_PRICE_ID_UPLOAD_CREDIT  // create in Stripe dashboard

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const quantity = Math.max(1, Math.min(50, Number(body.quantity) || 1))

    // Verify paid user (free tier blocked)
    const { data: profile } = await sb.from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', user.id)
      .maybeSingle()

    const isFree = !profile || profile.plan === 'free' ||
      (profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date())

    if (isFree) {
      return NextResponse.json({
        error: 'Upload credits available for paid plans only. Please upgrade your plan first.',
        requiresUpgrade: true,
      }, { status: 402 })
    }

    if (!STRIPE_PRICE_ID_UPLOAD_CREDIT) {
      return NextResponse.json({
        error: 'Upload credit pricing not configured. Set STRIPE_PRICE_ID_UPLOAD_CREDIT env var.',
      }, { status: 500 })
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
      success_url: `${origin}/dashboard?upload_credits_purchased=${quantity}`,
      cancel_url: `${origin}/dashboard`,
      metadata: {
        userId: user.id,
        purchase_type: 'upload_credits',
        quantity: String(quantity),
      },
    })

    console.log(`[checkout-credits] user=${user.id} qty=${quantity}`)
    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[checkout-credits] error:', e)
    return NextResponse.json({ error: e.message || 'Checkout failed' }, { status: 500 })
  }
}
