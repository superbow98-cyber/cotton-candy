'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LangProvider'
import LangToggle from '@/components/ui/LangToggle'
import { PLANS, type Plan } from '@/types'

const SITE_URL = 'https://cottoncandy-s.com'

// Shopee affiliate link — opened on Copy/Share (monetizes the sharer's own
// click). This is separate from `checkoutUrl()` below, which stays the
// Cotton Candy checkout link — that's the URL sent to whoever the code is
// shared WITH, so they can actually redeem it. Same split as Memoir.
const AFFILIATE_URL = 'https://s.shopee.com.my/8V7xUBGCLF'

type Tier = 10 | 30

// Only the packages (pakej) that have share codes. Day Pass is excluded —
// same rule the ambassador program uses (too cheap to discount meaningfully).
const SHAREABLE_PLANS: Plan[] = ['student_pro', 'month', 'year']
const TIERS: Tier[] = [10, 30]

const PLAN_BADGES: Record<string, { label: { en: string; bm: string }; gradient: string }> = {
  student_pro: { label: { en: 'For Students', bm: 'Untuk Pelajar' }, gradient: 'linear-gradient(135deg, #D4A94B, #E8B347)' },
  month: { label: { en: 'Most Popular', bm: 'Paling Popular' }, gradient: 'linear-gradient(135deg, #F8B4D9, #C8A8E9)' },
  year: { label: { en: 'Best Value', bm: 'Nilai Terbaik' }, gradient: 'linear-gradient(135deg, #34D399, #10B981)' },
}

type UnlockedCode = { code: string; discount_percent: number }
type CardKey = `${Plan}_${Tier}`
type QuotaStatus = { plan: Plan; tier: Tier; quota_used: number; quota_limit: number; exhausted: boolean }

const key = (plan: Plan, tier: Tier): CardKey => `${plan}_${tier}`

export default function PromoCodeClient() {
  const { lang } = useLang()
  const [selected, setSelected] = useState<CardKey | null>(null)
  const [unlocking, setUnlocking] = useState<CardKey | null>(null)
  const [unlocked, setUnlocked] = useState<Partial<Record<CardKey, UnlockedCode>>>({})
  const [quota, setQuota] = useState<Partial<Record<CardKey, QuotaStatus>>>({})
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Load quota status on mount — read-only, doesn't consume a slot. Powers
  // the "X/10 left" badge and the disabled/exhausted state per card.
  useEffect(() => {
    fetch('/api/promo-code/status')
      .then((r) => r.json())
      .then((j) => {
        if (!j.status) return
        const map: Partial<Record<CardKey, QuotaStatus>> = {}
        for (const s of j.status as QuotaStatus[]) map[key(s.plan, s.tier)] = s
        setQuota(map)
      })
      .catch(() => {}) // status is a nice-to-have; unlock() still enforces quota server-side
  }, [])

  const selectedPlan = selected ? PLANS[selected.split('_')[0] as Plan] : null
  const selectedCode = selected ? unlocked[selected] : null
  const selectedQuota = selected ? quota[selected] : null

  async function unlock(plan: Plan, tier: Tier) {
    const k = key(plan, tier)
    setSelected(k)
    setErr(null)
    if (unlocked[k]) return // already unlocked, just show it
    if (quota[k]?.exhausted) return // client-side guard; server re-checks anyway
    setUnlocking(k)
    try {
      const res = await fetch('/api/promo-code/unlock', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan, tier }),
      })
      const j = await res.json()
      if (res.status === 429 || j.error === 'quota_exhausted') {
        setQuota((prev) => ({ ...prev, [k]: { plan, tier, quota_used: j.quota_used ?? 10, quota_limit: j.quota_limit ?? 10, exhausted: true } }))
        setErr(
          lang === 'bm'
            ? 'Kuota bulan ini dah habis (10/10). Cuba lagi bulan depan!'
            : 'This month\u2019s quota is full (10/10). Try again next month!'
        )
        return
      }
      if (!res.ok || !j.code) throw new Error(j.error || 'unlock_failed')
      setUnlocked((prev) => ({ ...prev, [k]: { code: j.code, discount_percent: j.discount_percent } }))
      setQuota((prev) => ({ ...prev, [k]: { plan, tier, quota_used: j.quota_used, quota_limit: j.quota_limit, exhausted: j.quota_used >= j.quota_limit } }))
    } catch (e: any) {
      setErr(lang === 'bm' ? 'Gagal jana kod. Cuba lagi.' : 'Could not generate code. Try again.')
    } finally {
      setUnlocking(null)
    }
  }

  function checkoutUrl(plan: Plan, code: string) {
    return `${SITE_URL}/checkout?plan=${plan}&promo=${encodeURIComponent(code)}`
  }

  function pitchText(plan: Plan, code: string, discountPercent: number) {
    const p = PLANS[plan]
    return lang === 'bm'
      ? `🎉 Kod promo ${discountPercent}% OFF untuk Cotton Candy (${p.name})!\n\n` +
        `🎙 Cotton Candy dengar kuliah anda live, tulis nota markdown terus, lepas tu jana notebook PDF automatik bila kelas habis.\n\n` +
        `🔑 Kod promo: ${code}\n\n` +
        `Guna sebelum slot habis:`
      : `🎉 ${discountPercent}% OFF promo code for Cotton Candy (${p.name})!\n\n` +
        `🎙 Cotton Candy listens to your lecture live, writes a clean markdown note, then auto-builds a PDF notebook when class ends.\n\n` +
        `🔑 Promo code: ${code}\n\n` +
        `Grab it before it's gone:`
  }

  // IMPORTANT: don't window.open() the checkout link before/alongside
  // navigator.share() — opening a new tab shifts browser focus away from
  // this page, which makes the native share sheet auto-dismiss almost
  // instantly on iOS/Chrome mobile. Let the share sheet finish first, THEN
  // open the checkout link.
  async function shareCode() {
    if (!selected || !selectedCode) return
    const plan = selected.split('_')[0] as Plan
    const { code, discount_percent } = selectedCode
    const shareText = pitchText(plan, code, discount_percent)
    const shareUrl = checkoutUrl(plan, code)

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Cotton Candy Promo Code', text: shareText, url: shareUrl })
      } catch {
        // user cancelled the native share sheet — no-op, still open affiliate below
      }
      window.open(AFFILIATE_URL, '_blank', 'noopener,noreferrer')
      return
    }

    // No native share support (most desktop browsers) — no share sheet to
    // interrupt, so it's safe to open the affiliate link right away.
    window.open(AFFILIATE_URL, '_blank', 'noopener,noreferrer')
    navigator.clipboard.writeText(`${shareText}\n${shareUrl}`).then(() => {
      setShared(true)
      setTimeout(() => setShared(false), 2000)
    })
  }

  // Same pattern as the "no share sheet" branch above: copy is instant, no
  // fragile UI to interrupt, so fire the affiliate tab on the same click.
  function copyCode() {
    if (!selected || !selectedCode) return
    window.open(AFFILIATE_URL, '_blank', 'noopener,noreferrer')
    navigator.clipboard.writeText(selectedCode.code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FAFAFA 0%, #F4F4F5 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 16px 60px',
    }}>
      {/* Top mini logo + lang toggle */}
      <div style={{ width: '100%', maxWidth: 640, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/cc-logo.png" alt="Cotton Candy" width={28} height={28} style={{ borderRadius: 7 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>Cotton Candy</span>
        </Link>
        <LangToggle />
      </div>

      <div style={{ width: '100%', maxWidth: 640 }}>
        <h1 style={{
          fontSize: 26, fontWeight: 600, color: '#1d1d1f',
          textAlign: 'center', letterSpacing: '-0.02em', margin: '0 0 8px',
        }}>
          {lang === 'bm' ? 'Kongsi, dapat diskaun' : 'Share to unlock a discount'}
        </h1>
        <p style={{ fontSize: 14, color: '#6B6B70', textAlign: 'center', margin: '0 0 8px' }}>
          {lang === 'bm'
            ? 'Pilih pakej dan diskaun, jana kod promo, dan kongsi dengan kawan-kawan.'
            : 'Pick a package and discount, generate a promo code, and share it with your friends.'}
        </p>
        <p style={{ fontSize: 12, color: '#9A9AA0', textAlign: 'center', margin: '0 0 28px' }}>
          {lang === 'bm'
            ? 'Setiap kod terhad kepada 10 slot sebulan — kuota reset automatik bulan depan.'
            : 'Each code is limited to 10 slots a month — quota resets automatically next month.'}
        </p>

        {/* Package + tier cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {SHAREABLE_PLANS.map((planKey) =>
            TIERS.map((tier) => {
              const plan = PLANS[planKey]
              const badge = PLAN_BADGES[planKey]
              const k = key(planKey, tier)
              const isSelected = selected === k
              const q = quota[k]
              const exhausted = !!q?.exhausted
              const remaining = q ? Math.max(0, q.quota_limit - q.quota_used) : null

              return (
                <button
                  key={k}
                  onClick={() => unlock(planKey, tier)}
                  disabled={exhausted}
                  style={{
                    background: '#fff',
                    borderRadius: 16,
                    padding: '18px 14px',
                    border: isSelected ? '2px solid #C8A8E9' : '1px solid #E5E5E7',
                    boxShadow: isSelected ? '0 4px 16px rgba(200,168,233,0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
                    cursor: exhausted ? 'not-allowed' : 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    opacity: exhausted ? 0.55 : 1,
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'inline-block', background: badge.gradient, color: '#fff',
                      padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 600,
                      textTransform: 'uppercase', letterSpacing: '0.04em',
                    }}>{badge.label[lang]}</div>
                    <div style={{
                      display: 'inline-block', background: tier === 30 ? '#1d1d1f' : '#F4F4F5',
                      color: tier === 30 ? '#F5C767' : '#1d1d1f',
                      padding: '3px 10px', borderRadius: 100, fontSize: 10, fontWeight: 700,
                    }}>{tier}% OFF</div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{plan.name}</div>
                  <div style={{ fontSize: 13, color: '#6B6B70' }}>RM {plan.priceRM}</div>

                  {exhausted ? (
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#E24B4A', marginTop: 6 }}>
                      {lang === 'bm' ? 'Kuota habis (10/10) · cuba bulan depan' : 'Sold out (10/10) · try next month'}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#34D399', marginTop: 6 }}>
                      {unlocking === k
                        ? (lang === 'bm' ? 'Menjana…' : 'Generating…')
                        : (lang === 'bm' ? 'Jana kod promo' : 'Unlock promo code')}
                    </div>
                  )}
                  {remaining !== null && !exhausted && (
                    <div style={{ fontSize: 11, color: '#9A9AA0', marginTop: 2 }}>
                      {q!.quota_used}/{q!.quota_limit} {lang === 'bm' ? 'digunakan bulan ini' : 'used this month'}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        {err && (
          <p style={{ fontSize: 13, color: '#E24B4A', textAlign: 'center', margin: '0 0 16px' }}>{err}</p>
        )}

        {/* Revealed code panel */}
        {selectedPlan && selectedCode && (
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: '28px 24px',
            border: '1px solid #E5E5E7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 13, color: '#6B6B70', textAlign: 'center', marginBottom: 6 }}>
              {selectedPlan.name} · {selectedCode.discount_percent}% OFF
            </div>
            <div style={{
              fontSize: 34, fontWeight: 800, letterSpacing: '0.04em', color: '#1d1d1f',
              textAlign: 'center', background: '#F4F4F5', borderRadius: 12,
              padding: '14px 0', marginBottom: 18,
            }}>
              {selectedCode.code}
            </div>
            {selectedQuota && (
              <div style={{ fontSize: 12, color: '#9A9AA0', textAlign: 'center', marginBottom: 14 }}>
                {selectedQuota.quota_used}/{selectedQuota.quota_limit} {lang === 'bm' ? 'slot digunakan bulan ini' : 'slots used this month'}
              </div>
            )}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={copyCode}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: '1px solid #E5E5E7',
                  background: '#fff', color: '#1d1d1f', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {copied ? (lang === 'bm' ? '✓ Disalin' : '✓ Copied') : (lang === 'bm' ? 'Salin Kod' : 'Copy Code')}
              </button>
              <button
                onClick={shareCode}
                style={{
                  flex: 1, padding: '12px 0', borderRadius: 12, border: 'none',
                  background: 'linear-gradient(135deg, #F8B4D9, #C8A8E9)', color: '#fff',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}
              >
                {shared ? (lang === 'bm' ? '✓ Disalin' : '✓ Copied') : (lang === 'bm' ? 'Kongsi Promo' : 'Share Promo')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
