'use client'
// src/app/dashboard/ambassador/page.tsx

import { useEffect, useState } from 'react'
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

export default function AmbassadorDashboard() {
  const { lang } = useLang()
  const { tokens: s } = useTheme()
  const [data, setData] = useState<AmbassadorData | null>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [copied, setCopied] = useState(false)
  const [planError, setPlanError] = useState(false)

  const bm = lang === 'bm'

  useEffect(() => {
    load()
  }, [])

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
    setPlanError(false)
    setRegistering(true)
    try {
      const res = await fetch('/api/ambassador/register', { method: 'POST' })
      if (res.status === 403) {
        setPlanError(true)
        return
      }
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

  // Not yet an ambassador
  if (!data?.is_ambassador) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 0' }}>
        <div style={{
          background: '#fff',
          border: '0.5px solid rgba(0,0,0,0.07)',
          borderRadius: 18, padding: '40px 32px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 42, marginBottom: 16 }}>🍬</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>
            {bm ? 'Jadi Ambassador CottonCandy' : 'Become a CottonCandy Ambassador'}
          </h2>
          <p style={{ color: 'rgba(29,29,31,0.6)', fontSize: 14, lineHeight: 1.6, margin: '0 0 28px' }}>
            {bm
              ? 'Kongsi kod promo unik kau. Dapat komisen 1% setiap kali kawan kau subscribe. Menang leaderboard + 200 users = MacBook.'
              : 'Share your unique promo code. Earn 1% commission every time someone subscribes using your code. Top leaderboard + 200 users = MacBook.'}
          </p>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 28,
          }}>
            {[
              { emoji: '🎁', label: bm ? 'Kod 50% off untuk kawan' : '50% off code for friends' },
              { emoji: '💰', label: bm ? '1% komisen setiap sale' : '1% commission per sale' },
              { emoji: '💻', label: bm ? 'MacBook kalau #1 + 200 users' : 'MacBook for #1 + 200 users' },
            ].map(p => (
              <div key={p.emoji} style={{
                background: s.cream, borderRadius: 12, padding: '14px 12px', textAlign: 'center',
              }}>
                <div style={{ fontSize: 22, marginBottom: 6 }}>{p.emoji}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.65)', lineHeight: 1.4 }}>{p.label}</div>
              </div>
            ))}
          </div>

          <div style={{
            background: data?.has_active_plan ? '#e6f4eb' : '#fff8e6',
            border: `0.5px solid ${data?.has_active_plan ? '#7AB883' : '#E5B947'}`,
            borderRadius: 10, padding: '12px 16px', marginBottom: 20,
            fontSize: 12.5, color: data?.has_active_plan ? '#2d6a40' : '#7a5a00', lineHeight: 1.5,
          }}>
            {data?.has_active_plan
              ? (bm ? '✓ Plan aktif — kau layak daftar sebagai ambassador.' : '✓ Active plan — you are eligible to register as ambassador.')
              : (bm ? '⚠ Perlu plan aktif (Student PRO / Monthly / Yearly) untuk jadi ambassador.' : '⚠ Requires an active plan (Student PRO / Monthly / Yearly) to become an ambassador.')}
          </div>

          {planError && (
            <div style={{
              background: '#fff0f0', border: '0.5px solid #E24B4A',
              borderRadius: 10, padding: '10px 14px', marginBottom: 16,
              fontSize: 12.5, color: '#c0392b',
            }}>
              {bm ? '⚠ Plan kau dah tamat atau tidak layak. Beli plan dahulu.' : '⚠ Your plan has expired or is not eligible. Please purchase a plan first.'}
            </div>
          )}

          <button
            onClick={registerAsAmbassador}
            disabled={registering || !data?.has_active_plan}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 11,
              background: data?.has_active_plan ? '#1d1d1f' : 'rgba(29,29,31,0.2)',
              color: '#fff',
              fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
              border: 'none',
              cursor: (registering || !data?.has_active_plan) ? 'not-allowed' : 'pointer',
              opacity: registering ? 0.6 : 1,
            }}
          >
            {registering
              ? (bm ? 'Mendaftar…' : 'Registering…')
              : (bm ? 'Daftar sebagai Ambassador' : 'Register as Ambassador')}
          </button>

          {!data?.has_active_plan && (
            <a href="/pricing" style={{
              display: 'block', marginTop: 12,
              fontSize: 12.5, color: s.primaryDark, textDecoration: 'none',
            }}>
              {bm ? 'Lihat plan →' : 'View plans →'}
            </a>
          )}
        </div>
      </div>
    )
  }

  // Ambassador dashboard
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

      <div style={{
        background: '#fff', border: `1.5px solid ${s.border}`,
        borderRadius: 14, padding: '20px 20px',
        marginBottom: 14, display: 'flex',
        alignItems: 'center', gap: 16, flexWrap: 'wrap',
      }}>
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
        <button
          onClick={copyCode}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 9,
            background: copied ? '#e6f4eb' : s.soft,
            border: `0.5px solid ${copied ? '#7AB883' : s.border}`,
            color: copied ? '#2d6a40' : '#1d1d1f',
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
          }}
        >
          {copied ? '✓' : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          )}
          {copied ? (bm ? 'Disalin!' : 'Copied!') : (bm ? 'Salin kod' : 'Copy code')}
        </button>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14,
      }}>
        <StatCard label={bm ? 'Pengguna bulan ini' : 'Users this month'} value={data.user_count} sub={`/ ${MACBOOK_TARGET} ${bm ? 'untuk MacBook' : 'for MacBook'}`} />
        <StatCard label={bm ? 'Jumlah komisen' : 'Total commission'} value={`RM ${data.commission_total.toFixed(2)}`} sub={bm ? 'terkumpul' : 'earned'} />
        <StatCard label={bm ? 'Ranking bulan ini' : 'This month rank'} value={myRank > 0 ? `#${myRank}` : '—'} sub={bm ? 'dalam leaderboard' : 'on leaderboard'} />
      </div>

      <div style={{
        background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)',
        borderRadius: 14, padding: '18px 20px', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 6 }}>
            💻 {bm ? 'Progress MacBook' : 'MacBook Progress'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)' }}>
            {data.user_count} / {MACBOOK_TARGET} {bm ? 'pengguna' : 'users'}
          </div>
        </div>
        <div style={{ height: 10, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 99,
            width: `${macbookProgress}%`,
            background: macbookProgress >= 100
              ? 'linear-gradient(90deg, #7AB883, #4E9964)'
              : `linear-gradient(90deg, ${s.primary}, ${s.primaryDark})`,
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.45)', marginTop: 8 }}>
          {data.user_count >= MACBOOK_TARGET
            ? (bm ? '✓ Layak! Kena kekal #1 leaderboard hujung bulan untuk menang.' : '✓ Qualified! Stay #1 on the leaderboard by end of month to win.')
            : (bm
                ? `Perlu ${MACBOOK_TARGET - data.user_count} user lagi untuk layak — lepas tu siapa paling tinggi bulan ni menang MacBook`
                : `Need ${MACBOOK_TARGET - data.user_count} more users to qualify — then whoever's #1 at month end wins the MacBook`)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            🏆 {bm ? 'Leaderboard bulan ini' : "This month's leaderboard"}
          </div>
          {leaderboard.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.4)', padding: '12px 0' }}>
              {bm ? 'Belum ada data.' : 'No data yet.'}
            </div>
          ) : leaderboard.map((entry, i) => {
            const isMe = entry.promo_code === data.promo_code
            return (
              <div key={entry.user_id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.05)',
                background: isMe ? s.soft : 'transparent',
                borderRadius: isMe ? 8 : 0,
                padding: isMe ? '9px 8px' : '9px 0',
                margin: isMe ? '2px -8px' : 0,
              }}>
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
            <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.4)', padding: '12px 0' }}>
              {bm ? 'Belum ada komisen. Kongsi kod kau!' : 'No commissions yet. Share your code!'}
            </div>
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
