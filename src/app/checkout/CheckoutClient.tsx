'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LangProvider'
import { createClient } from '@/lib/supabase/client'
import { PLANS, type Plan } from '@/types'

// Plan-specific badge colors + tagline
const PLAN_BADGES: Record<string, { label: string; gradient: string }> = {
  day:         { label: 'Quick Access', gradient: 'linear-gradient(135deg, #6B7280, #9CA3AF)' },
  student_pro: { label: 'For Students', gradient: 'linear-gradient(135deg, #D4A94B, #E8B347)' },
  month:       { label: 'Most Popular', gradient: 'linear-gradient(135deg, #F8B4D9, #C8A8E9)' },
  year:        { label: 'Best Value',   gradient: 'linear-gradient(135deg, #34D399, #10B981)' },
}

export default function CheckoutClient() {
  const { lang } = useLang()
  const params = useSearchParams()
  const router = useRouter()
  const planKey = (params.get('plan') || 'month') as Plan
  const plan = PLANS[planKey] || PLANS.month
  const badge = PLAN_BADGES[planKey] || PLAN_BADGES.month

  const [email, setEmail] = useState<string | null>(null)
  const [promo, setPromo] = useState('')
  const [promoStatus, setPromoStatus] = useState<'idle' | 'ok' | 'bad'>('idle')
  const [promoMessage, setPromoMessage] = useState('')
  const [discount, setDiscount] = useState(0) // discount percent
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        // Preserve `promo` (e.g. from /promo-code share links) through the
        // login redirect so it isn't lost — login page must read it back
        // into the eventual redirect target for this to fully round-trip.
        const promoParam = params.get('promo')
        const next = promoParam
          ? `/checkout?plan=${planKey}&promo=${encodeURIComponent(promoParam)}`
          : `/checkout?plan=${planKey}`
        router.replace(`/login?next=${encodeURIComponent(next)}`)
        return
      }
      setEmail(user.email ?? null)
    })()
  }, [planKey, params, router])

  // Prefill promo code from a /promo-code share link (?promo=CODE) and
  // auto-validate it once, so a shared checkout link "just works" without
  // the visitor having to retype the code.
  useEffect(() => {
    const fromUrl = params.get('promo')
    if (fromUrl && !promo) {
      setPromo(fromUrl.toUpperCase())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params])

  useEffect(() => {
    if (promo && promoStatus === 'idle' && params.get('promo')) {
      tryPromo()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [promo, email])

  const tryPromo = async () => {
    const code = promo.trim().toUpperCase()
    if (!code) return
    setPromoStatus('idle')
    setPromoMessage('')

    try {
      const sb = createClient()
      const { data, error } = await sb
        .from('promo_codes')
        .select('*')
        .eq('code', code)
        .eq('active', true)
        .maybeSingle()

      if (error || !data) {
        setPromoStatus('bad')
        setPromoMessage(lang === 'bm' ? 'Kod tidak sah' : 'Invalid code')
        setDiscount(0)
        return
      }

      // Check applicable plans
      if (!Array.isArray(data.applicable_plans) || !data.applicable_plans.includes(planKey)) {
        setPromoStatus('bad')
        setPromoMessage(lang === 'bm' ? 'Kod tidak sah untuk pelan ini' : 'Code not valid for this plan')
        setDiscount(0)
        return
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoStatus('bad')
        setPromoMessage(lang === 'bm' ? 'Kod telah tamat tempoh' : 'Code has expired')
        setDiscount(0)
        return
      }

      // Check uses
      if (data.max_uses !== null && data.used_count >= data.max_uses) {
        setPromoStatus('bad')
        setPromoMessage(lang === 'bm' ? 'Kod telah habis digunakan' : 'Code fully redeemed')
        setDiscount(0)
        return
      }

      setPromoStatus('ok')
      setDiscount(data.discount_percent)
      setPromoMessage(`-${data.discount_percent}%`)
    } catch (e: any) {
      setPromoStatus('bad')
      setPromoMessage(lang === 'bm' ? 'Ralat. Cuba lagi.' : 'Error. Try again.')
      setDiscount(0)
    }
  }

  const subtotal = plan.priceRM
  const discountAmount = (subtotal * discount) / 100
  const total = Math.max(0, subtotal - discountAmount)

  const proceed = async () => {
    setLoading(true)
    setErr(null)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          plan: planKey,
          promo: promoStatus === 'ok' ? promo.trim().toUpperCase() : undefined,
        }),
      })
      const j = await res.json()
      if (!j.url) throw new Error(j.error || 'Checkout failed')
      window.location.href = j.url
    } catch (e: any) {
      setErr(e.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FAFAFA 0%, #F4F4F5 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 16px 20px',
    }}>
      {/* Top mini logo */}
      <Link href="/" style={{
        display: 'flex', alignItems: 'center', gap: 8,
        textDecoration: 'none', marginBottom: 24,
      }}>
        <img src="/cc-logo.png" alt="Cotton Candy" width={28} height={28} style={{ borderRadius: 7 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>Cotton Candy</span>
      </Link>

      <div style={{ width: '100%', maxWidth: 440 }}>
        {/* Checkout card */}
        <div style={{
          background: '#fff',
          borderRadius: 20,
          padding: '32px 28px',
          border: '1px solid #E5E5E7',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
        }}>
          {/* Plan badge */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <div style={{
              background: badge.gradient,
              color: '#fff',
              padding: '4px 14px',
              borderRadius: 100,
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>{badge.label}</div>
          </div>

          {/* Plan name + price */}
          <h1 style={{
            fontSize: 24, fontWeight: 500, color: '#1d1d1f',
            textAlign: 'center', letterSpacing: '-0.02em',
            margin: '0 0 4px',
          }}>{plan.name}</h1>
          <div style={{
            fontSize: 32, fontWeight: 600, color: '#1d1d1f',
            textAlign: 'center', letterSpacing: '-0.02em',
            margin: '0 0 4px',
          }}>RM {plan.priceRM}</div>
          <p style={{
            fontSize: 12, color: '#6B6B70',
            textAlign: 'center', margin: '0 0 22px',
          }}>
            {lang === 'bm' ? 'Bayaran sekali' : 'One-time'} ·{' '}
            {plan.durationHours ? `${Math.round(plan.durationHours / 24)} ${lang === 'bm' ? 'hari' : 'days'} ${lang === 'bm' ? 'akses' : 'access'}` : (lang === 'bm' ? 'Akses kekal' : 'Permanent access')}
          </p>

          {/* User email */}
          {email && (
            <div style={{
              background: '#FAFAFA',
              border: '1px solid #E5E5E7',
              borderRadius: 10,
              padding: '11px 14px',
              fontSize: 12.5,
              color: '#6B6B70',
              marginBottom: 18,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ opacity: 0.6 }}>✉</span>
              <span>{email}</span>
            </div>
          )}

          {/* What's included */}
          <div style={{
            fontSize: 11, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.05em', color: '#6B6B70', marginBottom: 10,
          }}>
            {lang === 'bm' ? 'Termasuk' : "What's included"}
          </div>
          <div style={{
            display: 'grid', gap: 8, marginBottom: 22,
            fontSize: 13, color: '#1d1d1f',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#34A853', fontWeight: 700 }}>✓</span>
              {plan.lectureLimit === 9999
                ? (lang === 'bm' ? 'Rakaman tak terhad' : 'Unlimited recordings')
                : `${plan.lectureLimit} ${lang === 'bm' ? 'rakaman' : 'recordings'} · ${plan.minutesPerLecture} ${lang === 'bm' ? 'min setiap satu' : 'min each'}`
              }
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#34A853', fontWeight: 700 }}>✓</span>
              {plan.maxAudioHours < 1
                ? `${Math.floor(plan.maxAudioHours * 60)} ${lang === 'bm' ? 'min audio total' : 'min total audio'}`
                : `${plan.maxAudioHours} ${lang === 'bm' ? 'jam audio total' : 'hours total audio'}`
              }
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ color: '#34A853', fontWeight: 700 }}>✓</span>
              {plan.notebookLimit} {lang === 'bm' ? 'notebook' : 'notebooks'}
            </div>
            {!plan.watermark && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#34A853', fontWeight: 700 }}>✓</span>
                {lang === 'bm' ? 'Tiada watermark' : 'No watermark'}
              </div>
            )}
            {plan.aiSummary && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#34A853', fontWeight: 700 }}>✓</span>
                {lang === 'bm' ? 'Ringkasan AI + eksport PDF' : 'AI summaries + PDF export'}
              </div>
            )}
          </div>

          {/* Promo code */}
          <div style={{
            fontSize: 12, fontWeight: 500, color: '#1d1d1f',
            marginBottom: 6,
          }}>
            {lang === 'bm' ? 'Kod promo' : 'Promo code'}{' '}
            <span style={{ color: '#A1A1A6', fontWeight: 400 }}>
              ({lang === 'bm' ? 'pilihan' : 'optional'})
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              type="text"
              value={promo}
              onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoStatus('idle'); setPromoMessage('') }}
              placeholder="STUDENT50"
              style={{
                flex: 1,
                padding: 11,
                border: `1px solid ${promoStatus === 'ok' ? '#34A853' : promoStatus === 'bad' ? '#E24B4A' : '#E5E5E7'}`,
                borderRadius: 10,
                fontSize: 13,
                textTransform: 'uppercase',
                boxSizing: 'border-box',
                color: '#1d1d1f',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />
            <button
              onClick={tryPromo}
              style={{
                padding: '11px 18px',
                background: '#fff',
                color: '#1d1d1f',
                border: '1px solid #E5E5E7',
                borderRadius: 10,
                fontSize: 13, fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {lang === 'bm' ? 'Guna' : 'Apply'}
            </button>
          </div>
          {promoStatus !== 'idle' && (
            <p style={{
              fontSize: 12,
              color: promoStatus === 'ok' ? '#34A853' : '#E24B4A',
              margin: '0 0 12px', fontWeight: 500,
            }}>
              {promoStatus === 'ok' ? '✓ ' : '⚠ '}{promoMessage}
            </p>
          )}

          {/* Total breakdown */}
          <div style={{
            background: '#FAFAFA',
            borderRadius: 10,
            padding: 14,
            margin: '20px 0',
            fontSize: 13,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, color: '#6B6B70' }}>
              <span>{lang === 'bm' ? 'Subtotal' : 'Subtotal'}</span>
              <span>RM {subtotal.toFixed(2)}</span>
            </div>
            {discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, color: '#34A853' }}>
                <span>{lang === 'bm' ? 'Diskaun' : 'Discount'} ({discount}%)</span>
                <span>-RM {discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, color: '#6B6B70' }}>
              <span>{lang === 'bm' ? 'Cukai' : 'Tax'}</span>
              <span>RM 0.00</span>
            </div>
            <div style={{ height: 1, background: '#E5E5E7', marginBottom: 10 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 15, color: '#1d1d1f' }}>
              <span>{lang === 'bm' ? 'Jumlah' : 'Total'}</span>
              <span>RM {total.toFixed(2)}</span>
            </div>
          </div>

          {/* Pay button */}
          <button
            onClick={proceed}
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              background: 'linear-gradient(135deg, #F8B4D9 0%, #C8A8E9 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '-0.01em',
              boxShadow: '0 2px 8px rgba(200, 168, 233, 0.25)',
              opacity: loading ? 0.6 : 1,
              fontFamily: 'inherit',
            }}
          >
            {loading
              ? (lang === 'bm' ? 'Memuatkan…' : 'Loading…')
              : (lang === 'bm' ? `Bayar RM ${total.toFixed(2)} →` : `Pay RM ${total.toFixed(2)} →`)
            }
          </button>

          {err && (
            <p style={{
              marginTop: 10, color: '#E24B4A', fontSize: 12, textAlign: 'center',
            }}>⚠ {err}</p>
          )}

          {/* Payment methods */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 10, marginTop: 18, fontSize: 11, color: '#6B6B70',
          }}>
            <span>💳 {lang === 'bm' ? 'Kad' : 'Card'}</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>FPX</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>GrabPay</span>
          </div>

          {/* Stripe trust line */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, marginTop: 14, fontSize: 11, color: '#A1A1A6',
          }}>
            <span>🔒</span>
            <span>{lang === 'bm' ? 'Dilindungi oleh Stripe' : 'Secured by Stripe'} · {lang === 'bm' ? 'Batal bila-bila' : 'Cancel anytime'}</span>
          </div>
        </div>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12 }}>
          <Link href="/#pricing" style={{ color: '#6B6B70', textDecoration: 'none' }}>
            ← {lang === 'bm' ? 'Kembali ke pelan' : 'Back to plans'}
          </Link>
        </div>
      </div>
    </div>
  )
}
