'use client'
// src/app/dashboard/ambassador/page.tsx
// PATCH: Redesigned generatePromoCard — dark professional style (teal→purple→pink gradient typography)

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'

interface Commission {
  id: string
  amount_paid_myr: number
  commission_myr: number
  created_at: string
}

interface LeaderboardEntry {
  user_id: string
  full_name: string | null
  promo_code: string
  referral_count: number
  commission_total: number
}

interface AmbassadorData {
  promo_code: string | null
  commission_total: number
  user_count: number
  is_ambassador: boolean
  has_active_plan: boolean
}

const MACBOOK_TARGET = 200

// ─── CSS keyframes injected once ─────────────────────────────────────────────
const AMBASSADOR_STYLES = `
@keyframes amb-fadeSlideUp {
  from { opacity:0; transform:translateY(10px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes amb-perkIn {
  from { opacity:0; transform:translateY(8px) scale(0.97); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}
@keyframes amb-btnShimmer {
  0%   { background-position:-200% center; }
  100% { background-position:200% center; }
}
@keyframes amb-perkShimmer {
  0%   { transform:translateX(-100%) skewX(-12deg); }
  100% { transform:translateX(300%) skewX(-12deg); }
}
@keyframes amb-shake {
  0%,100% { transform:translateX(0); }
  15%  { transform:translateX(-6px); }
  30%  { transform:translateX(6px); }
  45%  { transform:translateX(-4px); }
  60%  { transform:translateX(4px); }
  75%  { transform:translateX(-2px); }
  90%  { transform:translateX(2px); }
}
@keyframes amb-errorIn {
  from { opacity:0; transform:translateY(-6px) scale(0.97); max-height:0; }
  to   { opacity:1; transform:translateY(0) scale(1); max-height:120px; }
}
@keyframes amb-pulse {
  0%,100% { box-shadow:0 0 0 0 rgba(220,60,60,0); }
  50%      { box-shadow:0 0 0 4px rgba(220,60,60,0.18); }
}
@keyframes amb-shimmerSlide {
  0%   { transform:translateX(-100%); }
  100% { transform:translateX(200%); }
}

.amb-card { animation: amb-fadeSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }

.amb-perk-card {
  background:rgba(235,235,235,0.18);
  border:0.5px solid rgba(255,255,255,0.28);
  border-radius:12px; padding:16px 10px;
  opacity:0;
  animation: amb-perkIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
  position:relative; overflow:hidden;
}
.amb-perk-card::after {
  content:'';
  position:absolute; top:0; left:0;
  width:40%; height:100%;
  background:linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
  transform:translateX(-100%) skewX(-12deg);
}
.amb-perk-card:hover::after { animation: amb-perkShimmer 0.65s cubic-bezier(0.22,1,0.36,1) forwards; }
.amb-perk-card:hover { background:rgba(245,245,245,0.26); border-color:rgba(255,255,255,0.42); transform:translateY(-2px); }
.amb-perk-card:nth-child(1) { animation-delay:0.15s; }
.amb-perk-card:nth-child(2) { animation-delay:0.25s; }
.amb-perk-card:nth-child(3) { animation-delay:0.35s; }

.amb-elig-row {
  display:flex; align-items:center; gap:7px;
  margin-bottom:16px; justify-content:center;
  animation: amb-fadeSlideUp 0.5s 0.4s cubic-bezier(0.22,1,0.36,1) both;
}

.amb-cta-wrap {
  animation: amb-fadeSlideUp 0.5s 0.5s cubic-bezier(0.22,1,0.36,1) both;
  display:flex; flex-direction:column; align-items:center;
  width:100%;
}

.amb-cta-btn {
  display:inline-block; width:100%;
  padding:13px 32px; border-radius:12px;
  font-size:15px; font-weight:700; letter-spacing:-0.02em;
  border:none; cursor:pointer;
  font-family:-apple-system,'Helvetica Neue',sans-serif;
  position:relative; overflow:hidden;
  transition: transform 0.15s cubic-bezier(0.22,1,0.36,1), opacity 0.15s, background 0.3s, color 0.3s;
  background:#fff; color:#1d1d1f; white-space:nowrap;
}
.amb-cta-btn::after {
  content:'';
  position:absolute; inset:0;
  background:linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%);
  background-size:200% 100%; background-position:200% center;
}
.amb-cta-btn:hover::after  { animation: amb-btnShimmer 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
.amb-cta-btn:hover  { transform:scale(1.012); }
.amb-cta-btn:active { transform:scale(0.985); opacity:0.85; }
.amb-cta-btn.amb-btn-disabled {
  background:rgba(255,255,255,0.12); color:rgba(255,255,255,0.25); cursor:not-allowed;
}
.amb-cta-btn.amb-btn-disabled::after { display:none; }
.amb-cta-btn.amb-btn-error {
  background:rgba(210,50,50,0.9); color:#fff;
  animation: amb-shake 0.45s cubic-bezier(0.22,1,0.36,1), amb-pulse 0.6s 0.45s ease-out;
}
.amb-cta-btn.amb-btn-error::after { display:none; }
.amb-cta-btn.amb-btn-loading { opacity:0.6; cursor:not-allowed; pointer-events:none; }

.amb-error-banner {
  display:none; width:100%;
  background:rgba(180,30,30,0.18);
  border:0.5px solid rgba(220,80,80,0.45);
  border-radius:10px; padding:12px 14px; margin-top:10px; overflow:hidden;
  text-align:left;
}
.amb-error-banner.amb-show { display:block; animation: amb-errorIn 0.4s cubic-bezier(0.22,1,0.36,1) both; }

.amb-plans-link {
  display:inline-flex; align-items:center; gap:4px; margin-top:14px;
  font-size:13px; color:rgba(255,255,255,0.4); text-decoration:none;
  font-family:-apple-system,'Helvetica Neue',sans-serif; transition:color 0.2s;
}
.amb-plans-link:hover { color:rgba(255,255,255,0.7); }

.amb-sharekit-btn {
  display:inline-flex; align-items:center; gap:6px;
  padding:9px 16px; border-radius:9px;
  font-size:13px; font-weight:500; cursor:pointer;
  border:none; transition: all 0.18s ease;
  font-family:-apple-system,'Helvetica Neue',sans-serif;
}
.amb-sharekit-btn:hover { transform:translateY(-1px); }
.amb-sharekit-btn:active { transform:scale(0.97); }

.amb-step-row {
  display:flex; align-items:flex-start; gap:12px;
  padding:10px 0;
  border-bottom:0.5px solid rgba(0,0,0,0.05);
  animation: amb-fadeSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) both;
}
.amb-step-row:last-child { border-bottom:none; }

.amb-canvas-shimmer {
  position:relative; overflow:hidden;
}
.amb-canvas-shimmer::after {
  content:'';
  position:absolute; inset:0;
  background:linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%);
  transform:translateX(-100%);
  animation: amb-shimmerSlide 2s ease-in-out infinite;
}
`

// ─── Generate dark-professional promo card ────────────────────────────────────
function generatePromoCard(promoCode: string): Promise<string> {
  return new Promise((resolve) => {
    const W = 1080
    const H = 1080
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')!

    // ── Background: deep dark ──────────────────────────────────────────────
    ctx.fillStyle = '#0A0A10'
    ctx.fillRect(0, 0, W, H)

    // Scanline texture
    for (let y = 0; y < H; y += 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.012)'
      ctx.fillRect(0, y, W, 1)
    }

    // Radial glow top-right (teal)
    const glowTeal = ctx.createRadialGradient(900, 140, 0, 900, 140, 420)
    glowTeal.addColorStop(0, 'rgba(0,210,160,0.13)')
    glowTeal.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glowTeal
    ctx.fillRect(0, 0, W, H)

    // Radial glow bottom-left (purple)
    const glowPurple = ctx.createRadialGradient(120, 900, 0, 120, 900, 380)
    glowPurple.addColorStop(0, 'rgba(168,85,247,0.14)')
    glowPurple.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = glowPurple
    ctx.fillRect(0, 0, W, H)

    // Fine grid overlay
    ctx.strokeStyle = 'rgba(255,255,255,0.025)'
    ctx.lineWidth = 0.5
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }

    // ── Top bar ────────────────────────────────────────────────────────────
    // Logo pill
    const pillBg = ctx.createLinearGradient(72, 60, 72 + 220, 60)
    pillBg.addColorStop(0, 'rgba(255,255,255,0.07)')
    pillBg.addColorStop(1, 'rgba(255,255,255,0.03)')
    ctx.fillStyle = pillBg
    roundRect(ctx, 72, 56, 220, 44, 12)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.10)'
    ctx.lineWidth = 0.75
    roundRect(ctx, 72, 56, 220, 44, 12)
    ctx.stroke()

    // Logo icon bg
    const logoBg = ctx.createLinearGradient(82, 62, 82 + 32, 62 + 32)
    logoBg.addColorStop(0, '#FF6B9D')
    logoBg.addColorStop(1, '#C471F5')
    ctx.fillStyle = logoBg
    roundRect(ctx, 82, 62, 32, 32, 8)
    ctx.fill()

    ctx.font = '18px serif'
    ctx.fillText('🍭', 84, 86)

    ctx.font = '500 18px -apple-system, Helvetica, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.88)'
    ctx.fillText('Cotton Candy', 124, 84)

    // Slide label top-right
    ctx.font = '400 13px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    ctx.textAlign = 'right'
    ctx.fillText('AMBASSADOR', W - 72, 84)
    ctx.textAlign = 'left'

    // ── Tag line ───────────────────────────────────────────────────────────
    ctx.font = '700 11px monospace'
    ctx.fillStyle = 'rgba(0,210,160,0.75)'
    ctx.fillText('// EXCLUSIVE OFFER', 72, 164)

    // Thin rule
    ctx.strokeStyle = 'rgba(0,210,160,0.2)'
    ctx.lineWidth = 0.75
    ctx.beginPath(); ctx.moveTo(72, 172); ctx.lineTo(340, 172); ctx.stroke()

    // ── Main headline (gradient text via workaround) ───────────────────────
    // "Get" — white
    ctx.font = '800 96px -apple-system, "SF Pro Display", Helvetica, sans-serif'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText('Get', 72, 280)

    // "50% OFF" — gradient teal→purple
    const grad1 = ctx.createLinearGradient(72, 260, 72 + 520, 260)
    grad1.addColorStop(0, '#00D2A0')
    grad1.addColorStop(0.5, '#A855F7')
    grad1.addColorStop(1, '#F472B6')
    ctx.font = '800 96px -apple-system, "SF Pro Display", Helvetica, sans-serif'
    ctx.fillStyle = grad1
    ctx.fillText('50% OFF', 72, 380)

    // "any paid plan." — white, slightly smaller
    ctx.font = '700 72px -apple-system, "SF Pro Display", Helvetica, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.90)'
    ctx.fillText('any paid plan.', 72, 472)

    // Sub — monospace muted
    ctx.font = '400 18px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillText('AI Lecture Recorder  ·  Malaysian Students', 72, 520)

    // ── Stats card ─────────────────────────────────────────────────────────
    const cardX = 72, cardY = 556, cardW = W - 144, cardH = 164
    ctx.fillStyle = 'rgba(255,255,255,0.045)'
    roundRect(ctx, cardX, cardY, cardW, cardH, 16)
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.09)'
    ctx.lineWidth = 0.75
    roundRect(ctx, cardX, cardY, cardW, cardH, 16)
    ctx.stroke()

    // Stats card label
    ctx.font = '600 11px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.32)'
    ctx.fillText('SPEECH-TO-TEXT ENGINE', cardX + 28, cardY + 36)

    // Divider under label
    ctx.strokeStyle = 'rgba(255,255,255,0.07)'
    ctx.lineWidth = 0.5
    ctx.beginPath(); ctx.moveTo(cardX + 28, cardY + 48); ctx.lineTo(cardX + cardW - 28, cardY + 48); ctx.stroke()

    // Three stats
    const stats = [
      { val: '99+', sub: 'LANGUAGES' },
      { val: '~10×', sub: 'FASTER REALTIME' },
      { val: 'SOTA', sub: 'WORD ACCURACY' },
    ]
    const colW = cardW / 3
    stats.forEach((stat, i) => {
      const cx = cardX + i * colW + colW / 2

      // Gradient value
      const statGrad = ctx.createLinearGradient(cx - 60, 0, cx + 60, 0)
      statGrad.addColorStop(0, '#00D2A0')
      statGrad.addColorStop(1, '#A855F7')
      ctx.font = '800 38px -apple-system, "SF Pro Display", Helvetica, sans-serif'
      ctx.fillStyle = statGrad
      ctx.textAlign = 'center'
      ctx.fillText(stat.val, cx, cardY + 108)

      // Sub label
      ctx.font = '600 10px monospace'
      ctx.fillStyle = 'rgba(255,255,255,0.32)'
      ctx.fillText(stat.sub, cx, cardY + 134)

      // Vertical divider
      if (i < 2) {
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(cardX + (i + 1) * colW, cardY + 56)
        ctx.lineTo(cardX + (i + 1) * colW, cardY + cardH - 16)
        ctx.stroke()
      }
    })
    ctx.textAlign = 'left'

    // ── Promo code pill ────────────────────────────────────────────────────
    const codeX = 72, codeY = 756, codeH = 80
    // Measure code width
    ctx.font = '700 32px monospace'
    const codeTextW = ctx.measureText(promoCode).width
    const labelW = 120
    const codeW = labelW + codeTextW + 60

    ctx.fillStyle = 'rgba(168,85,247,0.12)'
    roundRect(ctx, codeX, codeY, codeW, codeH, 12)
    ctx.fill()
    ctx.strokeStyle = 'rgba(168,85,247,0.38)'
    ctx.lineWidth = 0.75
    roundRect(ctx, codeX, codeY, codeW, codeH, 12)
    ctx.stroke()

    ctx.font = '600 11px monospace'
    ctx.fillStyle = 'rgba(168,85,247,0.7)'
    ctx.fillText('USE CODE', codeX + 24, codeY + 34)

    ctx.font = '700 32px monospace'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(promoCode, codeX + 24, codeY + 62)

    // ── Bottom row ─────────────────────────────────────────────────────────
    // Left: URL
    ctx.font = '400 16px monospace'
    ctx.fillStyle = 'rgba(255,255,255,0.30)'
    ctx.fillText('cottoncandy-s.com', 72, H - 56)

    // Right: tagline gradient
    const tagGrad = ctx.createLinearGradient(W - 520, 0, W - 72, 0)
    tagGrad.addColorStop(0, '#00D2A0')
    tagGrad.addColorStop(1, '#F472B6')
    ctx.font = '600 14px monospace'
    ctx.fillStyle = tagGrad
    ctx.textAlign = 'right'
    ctx.fillText('Record  ·  Transcribe  ·  Summarise', W - 72, H - 56)
    ctx.textAlign = 'left'

    // Thin bottom rule
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 0.75
    ctx.beginPath(); ctx.moveTo(72, H - 72); ctx.lineTo(W - 72, H - 72); ctx.stroke()

    resolve(canvas.toDataURL('image/png'))
  })
}

// Helper: rounded rect path
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

export default function AmbassadorDashboard() {
  const { lang } = useLang()
  const { tokens: s } = useTheme()
  const [data, setData] = useState<AmbassadorData | null>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [copied, setCopied] = useState(false)
  const [btnError, setBtnError] = useState(false)
  const [showErrBanner, setShowErrBanner] = useState(false)
  const [showPlansLink, setShowPlansLink] = useState(false)
  const [promoCardUrl, setPromoCardUrl] = useState<string | null>(null)
  const [generatingCard, setGeneratingCard] = useState(false)
  const [shareKitOpen, setShareKitOpen] = useState(false)

  const errTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bm = lang === 'bm'

  useEffect(() => {
    const id = 'amb-reg-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id
      el.textContent = AMBASSADOR_STYLES
      document.head.appendChild(el)
    }
    return () => {
      if (errTimerRef.current) clearTimeout(errTimerRef.current)
    }
  }, [])

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const { data: prof } = await sb
        .from('profiles')
        .select('ambassador_promo_code, ambassador_commission_total, ambassador_user_count, plan, plan_expires_at')
        .eq('id', user.id)
        .maybeSingle()

      const eligiblePlans = ['student_pro', 'month', 'year']
      const now = new Date().toISOString()
      const hasActivePlan =
        eligiblePlans.includes(prof?.plan) &&
        prof?.plan_expires_at &&
        prof.plan_expires_at > now

      setData({
        promo_code: prof?.ambassador_promo_code || null,
        commission_total: prof?.ambassador_commission_total || 0,
        user_count: prof?.ambassador_user_count || 0,
        is_ambassador: !!(prof?.ambassador_promo_code),
        has_active_plan: !!hasActivePlan,
      })

      if (prof?.ambassador_promo_code) {
        const { data: comms } = await sb
          .from('ambassador_commissions')
          .select('id, amount_paid_myr, commission_myr, created_at')
          .eq('ambassador_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        setCommissions(comms || [])

        const { data: lb } = await sb
          .from('ambassador_leaderboard')
          .select('*')
          .limit(10)
        setLeaderboard(lb || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function registerAsAmbassador() {
    if (!data?.has_active_plan) {
      setBtnError(false)
      setShowErrBanner(false)
      setShowPlansLink(false)
      requestAnimationFrame(() => {
        setBtnError(true)
        setShowErrBanner(true)
        setShowPlansLink(true)
        if (errTimerRef.current) clearTimeout(errTimerRef.current)
        errTimerRef.current = setTimeout(() => setBtnError(false), 2200)
      })
      return
    }
    setRegistering(true)
    try {
      const res = await fetch('/api/ambassador/register', { method: 'POST' })
      if (res.ok) await load()
    } finally {
      setRegistering(false)
    }
  }

  function copyCode() {
    if (!data?.promo_code) return
    navigator.clipboard.writeText(data.promo_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleGenerateCard() {
    if (!data?.promo_code) return
    setGeneratingCard(true)
    try {
      const url = await generatePromoCard(data.promo_code)
      setPromoCardUrl(url)
    } finally {
      setGeneratingCard(false)
    }
  }

  function downloadCard() {
    if (!promoCardUrl || !data?.promo_code) return
    const a = document.createElement('a')
    a.href = promoCardUrl
    a.download = `cottoncandy-${data.promo_code.toLowerCase()}.png`
    a.click()
  }

  const macbookProgress = Math.min((data?.user_count || 0) / MACBOOK_TARGET * 100, 100)
  const myRank = leaderboard.findIndex(e => e.promo_code === data?.promo_code) + 1

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${s.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ─── REGISTRATION CARD ────────────────────────────────────────────────────
  if (!data?.is_ambassador) {
    const hasPlan = !!data?.has_active_plan
    const btnClass = [
      'amb-cta-btn',
      btnError ? 'amb-btn-error' : '',
      registering ? 'amb-btn-loading' : '',
    ].filter(Boolean).join(' ')

    const btnLabel = registering
      ? (bm ? 'Mendaftar…' : 'Registering…')
      : btnError
        ? (bm ? 'Plan aktif diperlukan' : 'Active plan required')
        : (bm ? 'Daftar sebagai ambassador' : 'Register as ambassador')

    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 0' }}>
        <div className="amb-card" style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', textAlign: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: "#111 url('/ambassador-reg-bg.jpg') center top / cover no-repeat", zIndex: 0 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.58)', zIndex: 1 }} />
          <div style={{ position: 'relative', zIndex: 2, padding: '44px 36px 36px' }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#E8873A', fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
              {bm ? 'Program Ambassador Kampus' : 'Campus ambassador program'}
            </p>
            <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.15, color: '#fff', fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
              {bm ? <>Jadi Ambassador<br />CottonCandy</> : <>Become a CottonCandy<br />ambassador</>}
            </h2>
            <p style={{ margin: '0 auto 32px', maxWidth: 380, fontSize: 14, fontWeight: 300, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
              {bm
                ? 'Kongsi kod promo unik kau. Dapat komisen 1% setiap kali kawan kau subscribe. Menang leaderboard + 200 users = MacBook.'
                : 'Share your unique promo code. Earn 1% commission every time someone subscribes. Top leaderboard at 200 users wins a MacBook.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
              <div className="amb-perk-card">
                <div style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l2 2 4-4" /><path d="M3 6h18M3 12h18M3 18h18" /><path d="M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z" /></svg>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', marginBottom: 3, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>50% off</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>{bm ? 'untuk setiap kawan' : 'for every friend'}</div>
              </div>
              <div className="amb-perk-card">
                <div style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M14.8 9A2 2 0 0 0 13 8h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2a2 2 0 0 1-1.8-1M12 7v1m0 8v1" /></svg>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', marginBottom: 3, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>{bm ? 'Komisen 1%' : '1% commission'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>{bm ? 'setiap sale' : 'per sale'}</div>
              </div>
              <div className="amb-perk-card">
                <div style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 20h8M12 18v2" /></svg>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', marginBottom: 3, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>MacBook</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>#1 + 200 users</div>
              </div>
            </div>
            <div className="amb-elig-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={hasPlan ? 'rgba(100,220,130,0.85)' : 'rgba(255,200,80,0.85)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {hasPlan ? (<><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></>) : (<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>)}
              </svg>
              <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
                {hasPlan
                  ? (bm ? 'Plan aktif — kau layak daftar sebagai ambassador.' : 'Active plan detected — you are eligible to register.')
                  : (bm ? 'Perlu plan aktif (Student PRO / Monthly / Yearly) untuk jadi ambassador.' : 'Requires an active plan — Student PRO, Monthly, or Yearly — to register.')}
              </p>
            </div>
            <div className="amb-cta-wrap">
              <button className={btnClass} onClick={registerAsAmbassador} disabled={registering}>{btnLabel}</button>
              <div className={`amb-error-banner${showErrBanner ? ' amb-show' : ''}`}>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'rgba(255,160,160,0.95)', fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>{bm ? 'Plan aktif diperlukan' : 'Active plan required'}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
                  {bm ? 'Program ambassador eksklusif untuk ahli berbayar. Upgrade plan kau untuk akses.' : 'Ambassador program is exclusive to paid members. Upgrade your plan to unlock access.'}
                </p>
              </div>
              {showPlansLink && (
                <a href="/pricing" className="amb-plans-link">
                  {bm ? 'Lihat plan' : 'View plans'}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ─── AMBASSADOR DASHBOARD ─────────────────────────────────────────────────
  const tutorialSteps = bm ? [
    { num: '01', title: 'Daftar akaun', desc: 'Pergi cottoncandy-s.com → klik "Mula percuma" → daftar dengan email atau Google.' },
    { num: '02', title: 'Pilih plan', desc: `Upgrade ke mana-mana plan berbayar. Guna kod ${data.promo_code} untuk 50% off semasa checkout.` },
    { num: '03', title: 'Buka kuliah baru', desc: 'Dashboard → "Rakam kuliah" → bagi nama kuliah → pilih AI (Gemini/GPT/Claude) → tekan rekod.' },
    { num: '04', title: 'Rakam & berhenti', desc: 'Bercakap je — live transcript akan keluar. Selesai → tekan "Habiskan kuliah".' },
    { num: '05', title: 'Nota AI siap', desc: 'Dalam beberapa saat — topik, key points, formula, ringkasan auto-disusun oleh AI.' },
    { num: '06', title: 'Export PDF', desc: 'Klik "Export PDF" dalam lecture view → pilih tema warna → download atau share terus.' },
  ] : [
    { num: '01', title: 'Create an account', desc: 'Go to cottoncandy-s.com → click "Start free" → sign up with email or Google.' },
    { num: '02', title: 'Pick a plan', desc: `Upgrade to any paid plan. Use code ${data.promo_code} for 50% off at checkout.` },
    { num: '03', title: 'Start a new lecture', desc: 'Dashboard → "Record lecture" → name your lecture → pick an AI (Gemini/GPT/Claude) → hit record.' },
    { num: '04', title: 'Record & finish', desc: 'Just speak — live transcript appears in real time. Done → tap "Finish lecture".' },
    { num: '05', title: 'AI notes ready', desc: 'Within seconds — topics, key points, formulas, summary auto-organized by AI.' },
    { num: '06', title: 'Export as PDF', desc: 'Click "Export PDF" inside the lecture view → choose a colour theme → download or share instantly.' },
  ]

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>
          🍬 {bm ? 'Dashboard Ambassador' : 'Ambassador Dashboard'}
        </h1>
        <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.5)' }}>
          {bm ? 'Jejak komisen dan prestasi kod promosi kau.' : 'Track your commissions and promo code performance.'}
        </div>
      </div>

      {/* Promo code card */}
      <div style={{ background: '#fff', border: `1.5px solid ${s.border}`, borderRadius: 14, padding: '20px 20px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            {bm ? 'Kod promosi kau' : 'Your promo code'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.04em', color: '#1d1d1f', fontFamily: 'monospace' }}>
            {data.promo_code}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)', marginTop: 4 }}>
            {bm ? 'Bagi kod ni — kawan dapat 50% off' : 'Share this — friends get 50% off'}
          </div>
        </div>
        <button onClick={copyCode} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 9, background: copied ? '#e6f4eb' : s.soft, border: `0.5px solid ${copied ? '#7AB883' : s.border}`, color: copied ? '#2d6a40' : '#1d1d1f', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          {copied ? '✓' : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          {copied ? (bm ? 'Disalin!' : 'Copied!') : (bm ? 'Salin kod' : 'Copy code')}
        </button>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
        <StatCard label={bm ? 'Pengguna bulan ini' : 'Users this month'} value={data.user_count} sub={`/ ${MACBOOK_TARGET} ${bm ? 'untuk MacBook' : 'for MacBook'}`} />
        <StatCard label={bm ? 'Jumlah komisen' : 'Total commission'} value={`RM ${data.commission_total.toFixed(2)}`} sub={bm ? 'terkumpul' : 'earned'} />
        <StatCard label={bm ? 'Ranking bulan ini' : 'This month rank'} value={myRank > 0 ? `#${myRank}` : '—'} sub={bm ? 'dalam leaderboard' : 'on leaderboard'} />

        {/* Share Kit card */}
        <div
          onClick={() => setShareKitOpen(o => !o)}
          style={{
            background: shareKitOpen ? 'linear-gradient(135deg, #fff5f8, #f5f0ff)' : '#fff',
            border: `0.5px solid ${shareKitOpen ? 'rgba(196,113,245,0.3)' : 'rgba(0,0,0,0.06)'}`,
            borderRadius: 12, padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(29,29,31,0.55)', marginBottom: 6 }}>
            {bm ? 'Alat Kongsi' : 'Share Kit'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.025em', lineHeight: 1 }}>
            {shareKitOpen ? '▲' : '▼'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', marginTop: 4 }}>
            {shareKitOpen ? (bm ? 'Tutup' : 'Close') : (bm ? 'Promo card + tutorial' : 'Promo card + tutorial')}
          </div>
        </div>
      </div>

      {/* Share Kit expanded */}
      {shareKitOpen && (
        <div style={{
          background: '#fff',
          border: '0.5px solid rgba(0,0,0,0.07)',
          borderRadius: 14,
          padding: '24px 24px',
          marginBottom: 14,
          animation: 'amb-fadeSlideUp 0.35s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 20 }}>
            🎨 {bm ? 'Alat Kongsi' : 'Share Kit'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* LEFT: Promo card generator */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 4, letterSpacing: '-0.01em' }}>
                📸 {bm ? 'Promo Card kau' : 'Your Promo Card'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)', marginBottom: 14, lineHeight: 1.5 }}>
                {bm
                  ? `Auto-generate gambar 1080×1080 dengan kod ${data.promo_code} kau. Share terus ke Instagram, WhatsApp, TikTok.`
                  : `Auto-generates a 1080×1080 image with your ${data.promo_code} code. Share directly to Instagram, WhatsApp, TikTok.`}
              </div>

              {promoCardUrl ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 12, aspectRatio: '1/1' }}>
                  <img src={promoCardUrl} alt="Promo card" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ) : (
                <div style={{
                  aspectRatio: '1/1',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(0,200,160,0.08), rgba(168,85,247,0.08), rgba(244,114,182,0.08))',
                  border: '1px dashed rgba(168,85,247,0.25)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 8, marginBottom: 12,
                  color: 'rgba(29,29,31,0.35)',
                  fontSize: 12,
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  {bm ? 'Preview akan muncul di sini' : 'Preview appears here'}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="amb-sharekit-btn"
                  onClick={handleGenerateCard}
                  disabled={generatingCard}
                  style={{
                    background: generatingCard ? 'rgba(0,0,0,0.05)' : 'linear-gradient(135deg, #0A0A10, #1a0a2e)',
                    color: generatingCard ? 'rgba(29,29,31,0.4)' : '#fff',
                    border: '0.5px solid rgba(168,85,247,0.4)',
                    flex: 1,
                  }}
                >
                  {generatingCard ? (
                    <><span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />{bm ? 'Menjana…' : 'Generating…'}</>
                  ) : (
                    <>{promoCardUrl ? (bm ? '↺ Jana semula' : '↺ Regenerate') : (bm ? '✦ Jana kad promo' : '✦ Generate promo card')}</>
                  )}
                </button>
                {promoCardUrl && (
                  <button
                    className="amb-sharekit-btn"
                    onClick={downloadCard}
                    style={{ background: '#f0f0f2', color: '#1d1d1f' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {bm ? 'Download PNG' : 'Download PNG'}
                  </button>
                )}
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>

            {/* RIGHT: Tutorial steps */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 4, letterSpacing: '-0.01em' }}>
                📋 {bm ? 'Cara guna Cotton Candy' : 'How to use Cotton Candy'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)', marginBottom: 14, lineHeight: 1.5 }}>
                {bm
                  ? 'Share steps ni kepada kawan-kawan supaya mereka tahu cara guna app ni.'
                  : 'Share these steps with friends so they know exactly how to use the app.'}
              </div>
              <div>
                {tutorialSteps.map((step, i) => (
                  <div key={step.num} className="amb-step-row" style={{ animationDelay: `${i * 0.06}s` }}>
                    <div style={{
                      flexShrink: 0, width: 28, height: 28, borderRadius: '50%',
                      background: 'linear-gradient(135deg, rgba(0,210,160,0.12), rgba(168,85,247,0.12))',
                      border: '0.5px solid rgba(168,85,247,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 700, color: '#A855F7', letterSpacing: '0.02em',
                    }}>
                      {step.num}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 2, letterSpacing: '-0.01em' }}>{step.title}</div>
                      <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.55)', lineHeight: 1.55 }}>{step.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MacBook progress */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 6 }}>
            💻 {bm ? 'Progress MacBook' : 'MacBook Progress'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)' }}>
            {data.user_count} / {MACBOOK_TARGET} {bm ? 'pengguna' : 'users'}
          </div>
        </div>
        <div style={{ height: 10, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${macbookProgress}%`, background: macbookProgress >= 100 ? 'linear-gradient(90deg, #7AB883, #4E9964)' : `linear-gradient(90deg, ${s.primary}, ${s.primaryDark})`, transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.45)', marginTop: 8 }}>
          {data.user_count >= MACBOOK_TARGET
            ? (bm ? '✓ Layak! Kena kekal #1 leaderboard hujung bulan untuk menang.' : '✓ Qualified! Stay #1 on the leaderboard by end of month to win.')
            : (bm
                ? `Perlu ${MACBOOK_TARGET - data.user_count} user lagi untuk layak — lepas tu siapa paling tinggi bulan ni menang MacBook`
                : `Need ${MACBOOK_TARGET - data.user_count} more users to qualify — then whoever's #1 at month end wins the MacBook`)}
        </div>
      </div>

      {/* Leaderboard + Commissions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            🏆 {bm ? 'Leaderboard bulan ini' : "This month's leaderboard"}
          </div>
          {leaderboard.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.4)', padding: '12px 0' }}>{bm ? 'Belum ada data.' : 'No data yet.'}</div>
          ) : leaderboard.map((entry, i) => {
            const isMe = entry.promo_code === data.promo_code
            return (
              <div key={entry.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.05)', background: isMe ? s.soft : 'transparent', borderRadius: isMe ? 8 : 0, padding: isMe ? '9px 8px' : '9px 0', margin: isMe ? '2px -8px' : 0 }}>
                <div style={{ width: 22, textAlign: 'center', fontSize: i === 0 ? 16 : 12, fontWeight: 700, color: i === 0 ? '#E5B947' : i === 1 ? '#9E9E9E' : i === 2 ? '#CD7F32' : 'rgba(29,29,31,0.4)' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isMe ? 600 : 500, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
                    {isMe ? (bm ? 'Kau' : 'You') : (entry.full_name?.split(' ')[0] || entry.promo_code)}
                    {isMe && <span style={{ fontSize: 10, marginLeft: 5, color: s.primaryDark }}>← you</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', fontFamily: 'monospace' }}>{entry.promo_code}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{entry.referral_count}</div>
                  <div style={{ fontSize: 10.5, color: 'rgba(29,29,31,0.4)' }}>{bm ? 'user' : 'users'}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            💰 {bm ? 'Komisen terkini' : 'Recent commissions'}
          </div>
          {commissions.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.4)', padding: '12px 0' }}>{bm ? 'Belum ada komisen. Kongsi kod kau!' : 'No commissions yet. Share your code!'}</div>
          ) : commissions.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.05)' }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1d1d1f' }}>RM {c.amount_paid_myr.toFixed(2)} {bm ? 'dibayar' : 'paid'}</div>
                <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)' }}>
                  {new Date(c.created_at).toLocaleDateString(bm ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2d6a40', background: '#e6f4eb', borderRadius: 7, padding: '3px 9px' }}>
                +RM {c.commission_myr.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(29,29,31,0.55)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.025em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}
