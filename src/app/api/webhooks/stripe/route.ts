import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { adminClient } from '@/lib/supabase/server'
import { PLANS, type Plan } from '@/types'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' as any })
  const sig = req.headers.get('stripe-signature')!
  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (e: any) {
    return new NextResponse(`Webhook Error: ${e.message}`, { status: 400 })
  }

  const admin = adminClient()

  const grant = async (userId: string, plan: Plan) => {
    const p = PLANS[plan]
    const expires = p.durationHours
      ? new Date(Date.now() + p.durationHours * 3600 * 1000).toISOString()
      : null
    await admin.from('profiles').update({
      plan,
      plan_upgraded_at: new Date().toISOString(),
      plan_expires_at: expires,
    }).eq('id', userId)
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const sess = event.data.object as Stripe.Checkout.Session
      const userId = sess.metadata?.userId
      const plan = sess.metadata?.plan as Plan | undefined
      if (userId && plan) await grant(userId, plan)
    }
    if (event.type === 'invoice.paid') {
      const inv = event.data.object as Stripe.Invoice
      const subId = (inv as any).subscription as string | null
      if (subId) {
        const sub = await stripe.subscriptions.retrieve(subId)
        const userId = sub.metadata?.userId
        const plan = sub.metadata?.plan as Plan | undefined
        if (userId && plan) await grant(userId, plan)
      }
    }
    if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object as Stripe.Subscription
      const userId = sub.metadata?.userId
      if (userId) {
        await admin.from('profiles').update({
          plan: 'free', plan_expires_at: new Date().toISOString(),
        }).eq('id', userId)
      }
    }
  } catch (e) {
    console.error('webhook handler err', e)
  }
  return NextResponse.json({ received: true })
}
