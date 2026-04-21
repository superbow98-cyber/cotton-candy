import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'
import { PLANS, type Plan } from '@/types'

export async function POST(req: Request) {
  try {
    const { plan } = await req.json() as { plan: Plan }
    if (!plan || !PLANS[plan] || plan === 'free') {
      return NextResponse.json({ error: 'invalid plan' }, { status: 400 })
    }
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
    const p = PLANS[plan]
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin
    const isSub = p.stripeMode === 'subscription'

    const session = await stripe.checkout.sessions.create({
      mode: isSub ? 'subscription' : 'payment',
      payment_method_types: isSub ? ['card'] : ['card', 'fpx', 'grabpay'],
      customer_email: user.email ?? undefined,
      line_items: [{
        price_data: {
          currency: 'myr',
          product_data: { name: `Cotton Candy — ${p.name}` },
          unit_amount: p.priceRM * 100,
          ...(isSub ? { recurring: { interval: plan === 'year' ? 'year' : 'month' } as any } : {}),
        },
        quantity: 1,
      }],
      success_url: `${origin}/dashboard?welcome=1`,
      cancel_url: `${origin}/pricing`,
      metadata: { userId: user.id, plan },
      ...(isSub ? { subscription_data: { metadata: { userId: user.id, plan } } } : {}),
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('checkout err', e)
    return NextResponse.json({ error: e.message || 'unknown' }, { status: 500 })
  }
}
