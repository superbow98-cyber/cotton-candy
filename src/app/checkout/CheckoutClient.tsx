'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'
import LangToggle from '@/components/ui/LangToggle'
import { useLang } from '@/lib/i18n/LangProvider'
import { createClient } from '@/lib/supabase/client'
import { s, PLANS, type Plan } from '@/types'

export default function CheckoutClient() {
  const { t } = useLang()
  const params = useSearchParams()
  const router = useRouter()
  const planKey = (params.get('plan') || 'month') as Plan
  const plan = PLANS[planKey] || PLANS.month

  const [email, setEmail] = useState<string | null>(null)
  const [promo, setPromo] = useState('')
  const [promoStatus, setPromoStatus] = useState<'idle' | 'ok' | 'bad'>('idle')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace(`/login?next=/checkout?plan=${planKey}`); return }
      setEmail(user.email ?? null)
    })()
  }, [planKey, router])

  const tryPromo = async () => {
    if (!promo.trim()) return
    const sb = createClient()
    const { data } = await sb.from('promo_codes').select('*').eq('code', promo.trim().toUpperCase()).maybeSingle()
    if (!data || data.use_count >= data.max_uses) { setPromoStatus('bad'); return }
    if (data.plan !== planKey) { setPromoStatus('bad'); return }
    setPromoStatus('ok')
  }

  const proceed = async () => {
    if (promoStatus === 'ok') {
      setLoading(true)
      try {
        const res = await fetch('/api/checkout/promo', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ code: promo.trim().toUpperCase(), plan: planKey }),
        })
        const j = await res.json()
        if (!j.ok) throw new Error(j.error || 'promo failed')
        router.replace('/dashboard?welcome=1')
      } catch (e: any) {
        setErr(e.message)
      } finally { setLoading(false) }
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: planKey }),
      })
      const j = await res.json()
      if (!j.url) throw new Error(j.error || 'checkout failed')
      window.location.href = j.url
    } catch (e: any) {
      setErr(e.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: s.cream }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px clamp(16px, 5vw, 48px)', maxWidth: 1200, margin: '0 auto',
      }}>
        <Link href="/"><Logo /></Link>
        <LangToggle compact />
      </nav>

      <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
        <div style={{
          background: '#fff', borderRadius: 26, padding: 32,
          maxWidth: 480, width: '100%',
          border: `1px solid ${s.border}`,
          boxShadow: '0 20px 50px rgba(255,143,168,0.15)',
        }}>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, margin: '0 0 6px' }}>
            {plan.name}
          </h1>
          <p style={{ color: s.gray, margin: '0 0 22px', fontSize: 14 }}>
            {email}
          </p>

          <div style={{
            background: s.soft, padding: 18, borderRadius: 14,
            marginBottom: 22, border: `1px solid ${s.border}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: s.gray }}>Plan</span>
              <strong>{plan.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: s.gray }}>Lectures</span>
              <strong>{plan.lectureLimit === 9999 ? '∞' : plan.lectureLimit}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: s.gray }}>Minutes / lecture</span>
              <strong>{plan.minutesPerLecture}</strong>
            </div>
            <div style={{ height: 1, background: s.border, margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 700 }}>
              <span>Total</span>
              <span>RM{promoStatus === 'ok' ? 0 : plan.priceRM}</span>
            </div>
          </div>

          <label style={{ fontSize: 13, color: s.gray, display: 'block', marginBottom: 6 }}>Promo code (optional)</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <input
              value={promo}
              onChange={(e) => { setPromo(e.target.value); setPromoStatus('idle') }}
              placeholder="COTTONLAUNCH"
              style={{
                flex: 1, padding: '12px 14px', borderRadius: 12,
                border: `1.5px solid ${promoStatus === 'ok' ? s.success : promoStatus === 'bad' ? '#d66' : s.border}`,
                background: s.soft, fontSize: 14, outline: 'none',
                textTransform: 'uppercase',
              }}
            />
            <Button onClick={tryPromo} variant="outline" size="sm">Apply</Button>
          </div>
          {promoStatus === 'ok' && <p style={{ color: s.success, fontSize: 13, margin: '0 0 14px' }}>✓ Promo applied — RM0 total</p>}
          {promoStatus === 'bad' && <p style={{ color: '#d66', fontSize: 13, margin: '0 0 14px' }}>Invalid or expired code</p>}

          <Button onClick={proceed} disabled={loading} size="lg" style={{ width: '100%' }}>
            {loading ? 'Loading…' : promoStatus === 'ok' ? 'Redeem free' : `Pay RM${plan.priceRM}`}
          </Button>
          {err && <p style={{ color: '#d66', marginTop: 10, fontSize: 13 }}>{err}</p>}

          <p style={{ textAlign: 'center', fontSize: 12, color: s.gray, marginTop: 18 }}>
            Cancel anytime · Card, FPX, GrabPay supported
          </p>
        </div>
      </div>
    </div>
  )
}
