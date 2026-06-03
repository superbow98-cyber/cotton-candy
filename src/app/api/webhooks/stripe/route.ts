// src/app/api/webhooks/stripe/route.ts
// Added: ambassador commission tracking on checkout.session.completed

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

  // ── NEW: credit ambassador commission ─────────────────────
  const creditAmbassador = async (
    promoCode: string,
    referredUserId: string | undefined,
    amountPaidMyr: number,
    stripeSessionId: string,
  ) => {
    try {
      // Find ambassador by promo code
      const { data: ambProfile } = await admin
        .from('profiles')
        .select('id')
        .eq('ambassador_promo_code', promoCode)
        .maybeSingle()

      if (!ambProfile) {
        console.log(`[webhook] ambassador promo ${promoCode} — no matching ambassador found`)
        return
      }

      const ambassadorUserId = ambProfile.id
      const commissionMyr = parseFloat((amountPaidMyr * 0.01).toFixed(2)) // 1%

      // Log commission
      await admin.from('ambassador_commissions').insert({
        ambassador_user_id: ambassadorUserId,
        referred_user_id: referredUserId || null,
        stripe_session_id: stripeSessionId,
        amount_paid_myr: amountPaidMyr,
        commission_myr: commissionMyr,
        promo_code: promoCode,
      })

      // Increment totals on profiles
      const { data: current } = await admin
        .from('profiles')
        .select('ambassador_commission_total, ambassador_user_count')
        .eq('id', ambassadorUserId)
        .maybeSingle()

      await admin.from('profiles').update({
        ambassador_commission_total: ((current?.ambassador_commission_total || 0) + commissionMyr),
        ambassador_user_count: ((current?.ambassador_user_count || 0) + 1),
      }).eq('id', ambassadorUserId)

      console.log(`[webhook] ambassador commission: code=${promoCode} user=${ambassadorUserId} +RM${commissionMyr}`)
    } catch (e) {
      console.error('[webhook] creditAmbassador failed:', e)
    }
  }
  // ──────────────────────────────────────────────────────────

  try {
    if (event.type === 'checkout.session.completed') {
      const sess = event.data.object as Stripe.Checkout.Session
      const userId = sess.metadata?.userId
      const plan = sess.metadata?.plan as Plan | undefined
      const promoCode = sess.metadata?.promo_code
      const purchaseType = sess.metadata?.purchase_type
      const amountMyr = (sess.amount_total || 0) / 100

      // v61: Upload credit purchase
      if (userId && purchaseType === 'upload_credits') {
        const quantity = parseInt(sess.metadata?.quantity || '0', 10)

        try {
          const { data: prof } = await admin
            .from('profiles')
            .select('upload_credits, upload_credits_lifetime')
            .eq('id', userId)
            .maybeSingle()

          const currentBalance = prof?.upload_credits || 0
          const lifetime = prof?.upload_credits_lifetime || 0
          const newBalance = currentBalance + quantity
          const newLifetime = lifetime + quantity

          await admin.from('profiles').update({
            upload_credits: newBalance,
            upload_credits_lifetime: newLifetime,
          }).eq('id', userId)

          await admin.from('upload_credit_transactions').insert({
            user_id: userId,
            type: 'purchase',
            delta: quantity,
            balance_after: newBalance,
            amount_paid_myr: amountMyr,
            stripe_session_id: sess.id,
          })

          console.log(`[webhook] credits granted user=${userId} +${quantity} → ${newBalance}`)
        } catch (e) {
          console.error('[webhook] upload_credits grant failed:', e)
        }
      }

      // Existing plan upgrade
      if (userId && plan) await grant(userId, plan)

      // v50: Increment promo code usage
      if (promoCode) {
        try {
          const { data: pc } = await admin
            .from('promo_codes')
            .select('used_count')
            .eq('code', promoCode)
            .maybeSingle()
          if (pc) {
            await admin
              .from('promo_codes')
              .update({ used_count: (pc.used_count || 0) + 1 })
              .eq('code', promoCode)
            console.log(`[webhook] promo ${promoCode} used_count incremented`)
          }
        } catch (e) {
          console.error('[webhook] promo increment failed:', e)
        }

        // Only credit ambassador for eligible plans (not day pass)
        if (purchaseType !== 'upload_credits' && plan !== 'day' && amountMyr > 0) {
          await creditAmbassador(promoCode, userId, amountMyr, sess.id)
        }
        // ────────────────────────────────────────────────────────────────
      }
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
