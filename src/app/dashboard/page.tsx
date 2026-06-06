'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { type Lecture, type Profile, PLANS } from '@/types'
import { getRecordingTypeMeta } from '@/lib/recording-types'
import { Icon } from '@/components/ui/Icon'
import { BuyCreditsModal } from '@/components/lecture/BuyCreditsModal'

// AI logo resolver — small brand chip
function AILogo({ provider, size = 14 }: { provider: string; size?: number }) {
  const bg: Record<string, string> = {
    'deepseek': '#ECEEF8',
    'groq': 'linear-gradient(180deg, #FF5D3A, #E23A20)',
    'auto': 'linear-gradient(135deg, #FFB7C5, #D4537E)',
    'gemini-flash-lite': 'linear-gradient(135deg, #4796E3, #34A853)',
    'gpt-4o-mini': '#000000',
    'claude-haiku': '#DA7756',
  }
  const icSize = Math.round(size * 0.65)
  const wrapSize = size + 6
  const radius = Math.round(size / 3.5)

  if (provider === 'deepseek') return (
    <span style={{
      width: wrapSize, height: wrapSize, borderRadius: radius,
      background: bg['deepseek'],
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={icSize} height={icSize} viewBox="0 0 100 100" fill="none">
        <path d="M50 15C31 15 18 27 18 43C18 53 24 61 35 66C22 71 18 84 28 90C37 96 51 92 57 84C63 90 75 94 83 88C95 80 91 67 78 61C89 55 93 46 90 37C86 24 71 15 50 15Z" fill="#2840D5"/>
        <path d="M50 30C38 30 30 36 30 44C30 50 34 55 42 58C30 62 28 72 36 77C42 81 52 78 57 72C62 77 71 80 77 75C86 68 83 58 72 54C81 50 84 44 81 37C77 30 65 30 50 30Z" fill="#E8EAF6"/>
        <ellipse cx="42" cy="46" rx="11" ry="8" fill="white" transform="rotate(-15 42 46)"/>
        <circle cx="39" cy="43" r="4.5" fill="#2840D5"/>
        <circle cx="40" cy="42" r="2" fill="white"/>
      </svg>
    </span>
  )

  // GPT-4o mini
  if (provider === 'gpt-4o-mini') {
    return (
      <span style={{
        width: wrapSize, height: wrapSize, borderRadius: radius,
        background: bg['gpt-4o-mini'],
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width={icSize} height={icSize} viewBox="0 0 24 24" fill="#fff">
          <path d="M22.289 9.94a5.998 5.998 0 0 0-.515-4.926 6.065 6.065 0 0 0-6.525-2.908A5.998 5.998 0 0 0 10.724 0a6.064 6.064 0 0 0-5.781 4.202 5.998 5.998 0 0 0-4.002 2.91 6.065 6.065 0 0 0 .747 7.11 5.998 5.998 0 0 0 .515 4.926 6.065 6.065 0 0 0 6.525 2.908A5.997 5.997 0 0 0 13.276 24a6.064 6.064 0 0 0 5.782-4.202 5.998 5.998 0 0 0 4.001-2.91 6.065 6.065 0 0 0-.77-6.948zM13.276 22.4a4.49 4.49 0 0 1-2.882-1.041l.142-.08 4.783-2.762a.78.78 0 0 0 .396-.68v-6.747l2.023 1.168a.072.072 0 0 1 .04.057v5.585a4.505 4.505 0 0 1-4.502 4.5zm-9.684-4.131a4.49 4.49 0 0 1-.537-3.018l.142.085 4.783 2.762a.779.779 0 0 0 .785 0l5.843-3.373v2.335a.072.072 0 0 1-.029.063l-4.836 2.791a4.504 4.504 0 0 1-6.151-1.645zm-1.261-10.46a4.489 4.489 0 0 1 2.347-1.975V11.5a.769.769 0 0 0 .389.678l5.82 3.361-2.023 1.168a.073.073 0 0 1-.071 0L4.009 13.9a4.505 4.505 0 0 1-.678-6.091zm16.614 3.864l-5.843-3.375 2.023-1.167a.072.072 0 0 1 .071 0l4.783 2.762a4.502 4.502 0 0 1-.696 8.124V12.35a.77.77 0 0 0-.338-.677zm2.014-3.025l-.142-.085-4.783-2.762a.779.779 0 0 0-.785 0L9.406 9.974V7.639a.072.072 0 0 1 .029-.063l4.836-2.79a4.503 4.503 0 0 1 6.688 4.664zm-12.664 4.161L6.272 11.64a.072.072 0 0 1-.04-.057V5.999a4.503 4.503 0 0 1 7.384-3.458l-.142.08-4.783 2.762a.779.779 0 0 0-.396.68zm1.098-2.366l2.602-1.502 2.603 1.5v3l-2.603 1.5-2.602-1.5z"/>
        </svg>
      </span>
    )
  }

  // Claude Haiku
  if (provider === 'claude-haiku') {
    return (
      <span style={{
        width: wrapSize, height: wrapSize, borderRadius: radius,
        background: bg['claude-haiku'],
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <svg width={icSize} height={icSize} viewBox="0 0 100 100">
          <line x1="50" y1="5"  x2="50" y2="95" stroke="#fff" strokeWidth="16" strokeLinecap="round"/>
          <line x1="5"  y1="50" x2="95" y2="50" stroke="#fff" strokeWidth="16" strokeLinecap="round"/>
          <line x1="15" y1="15" x2="85" y2="85" stroke="#fff" strokeWidth="16" strokeLinecap="round"/>
          <line x1="85" y1="15" x2="15" y2="85" stroke="#fff" strokeWidth="16" strokeLinecap="round"/>
        </svg>
      </span>
    )
  }

  const icons: Record<string, JSX.Element> = {
    'groq': <><circle cx="12" cy="12" r="9" fill="#fff"/><circle cx="12" cy="12" r="2.8" fill="#E23A20"/></>,
    'auto': <path d="M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3" stroke="#4B1528" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    'gemini-flash-lite': <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="#fff"/>,
  }

  return (
    <span style={{
      width: wrapSize, height: wrapSize, borderRadius: radius,
      background: bg[provider] || bg['auto'],
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={icSize} height={icSize} viewBox="0 0 24 24">{icons[provider] || icons['auto']}</svg>
    </span>
  )
}

export default function DashboardHome() {
  const { t, lang } = useLang()
  const { tokens: s } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [stats, setStats] = useState({ count: 0, mins: 0, notebooks: 0 })
  const [audioUsage, setAudioUsage] = useState<{
    usedSeconds: number; capSeconds: number; percentUsed: number
  } | null>(null)
  const [buyModalOpen, setBuyModalOpen] = useState(false)

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (prof) setProfile(prof as Profile)
      const { data: lect } = await sb.from('lectures').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
      setLectures((lect || []) as Lecture[])
      const weekAgo = new Date(Date.now() - 7*24*3600*1000).toISOString()
      const { data: weekLect } = await sb.from('lectures').select('duration_seconds')
        .eq('user_id', user.id).gte('created_at', weekAgo)
      const { data: nbooks } = await sb.from('notebooks').select('id').eq('user_id', user.id)
      const mins = Math.round((weekLect || []).reduce((a: number, l: any) => a + (l.duration_seconds || 0), 0) / 60)
      setStats({ count: weekLect?.length || 0, mins, notebooks: nbooks?.length || 0 })

      try {
        const res = await fetch('/api/usage')
        if (res.ok) {
          const { usage } = await res.json()
          if (usage) setAudioUsage(usage)
        }
      } catch {}

      const params = new URLSearchParams(window.location.search)
      if (params.get('upload_credits_purchased')) {
        const qty = params.get('upload_credits_purchased')
        window.history.replaceState({}, '', '/dashboard')
        alert(`✓ ${qty} ${(prof?.lang === 'bm' || lang === 'bm') ? 'kredit muat naik berjaya dibeli!' : 'upload credits purchased successfully!'}`)
      }
    })()
  }, [])

  const plan = profile?.plan ? PLANS[profile.plan] : PLANS.free
  const firstName = profile?.full_name?.split(' ')[0] || ''
  const now = new Date()
  const hours = now.getHours()
  const greeting = hours < 12 ? (lang === 'bm' ? 'Selamat pagi' : 'Good morning')
    : hours < 18 ? (lang === 'bm' ? 'Selamat tengahari' : 'Good afternoon')
    : (lang === 'bm' ? 'Selamat petang' : 'Good evening')
  const dateStr = now.toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-GB', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const y = new Date(today); y.setDate(y.getDate() - 1)
    const dday = d.toDateString()
    if (dday === today.toDateString()) return lang === 'bm' ? 'Hari ini' : 'Today'
    if (dday === y.toDateString()) return lang === 'bm' ? 'Semalam' : 'Yesterday'
    return d.toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* TOP BAR */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        gap: 12, marginBottom: 28, flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 600,
            letterSpacing: '-0.025em', color: '#1d1d1f',
          }}>
            {greeting}{firstName ? `, ${firstName}` : ''}
          </h1>
          <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.55)', marginTop: 2 }}>
            {dateStr}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {profile && (
            <button
              onClick={() => setBuyModalOpen(true)}
              title={lang === 'bm' ? 'Kredit muat naik audio' : 'Audio upload credits'}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '7px 12px', borderRadius: 100,
                background: 'rgba(212, 83, 126, 0.08)',
                border: '0.5px solid rgba(212, 83, 126, 0.25)',
                color: '#993556', fontSize: 12, fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              🎙️ <span style={{ fontWeight: 600 }}>{profile.upload_credits || 0}</span>
            </button>
          )}
          <Link href="/dashboard/lectures/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 16px', borderRadius: 9,
            background: '#1d1d1f', color: '#fff',
            fontSize: 13, fontWeight: 500, letterSpacing: '-0.01em',
            textDecoration: 'none',
          }}>
            <Icon.Plus size={14} />
            {lang === 'bm' ? 'Kuliah baru' : 'New lecture'}
          </Link>
        </div>
      </div>

      {/* STATS */}
      <div style={{
        display: 'grid', gap: 10,
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        marginBottom: 20,
      }}>
        <StatCard
          label={lang === 'bm' ? 'Rakaman' : 'Recordings'}
          value={plan.lectureLimit === 9999 ? `${stats.count}` : `${stats.count} / ${plan.lectureLimit}`}
          sub={`${plan.lectureLimit === 9999 ? (lang === 'bm' ? 'Tak terhad' : 'Unlimited') : `${plan.minutesPerLecture} min/${lang === 'bm' ? 'sesi' : 'session'}`}`}
        />
        <StatCard
          label={lang === 'bm' ? 'Kuota audio' : 'Audio quota'}
          value={audioUsage
            ? (audioUsage.capSeconds < 3600
                ? `${Math.floor(audioUsage.usedSeconds / 60)} / ${Math.floor(audioUsage.capSeconds / 60)} ${lang === 'bm' ? 'min' : 'min'}`
                : `${(audioUsage.usedSeconds / 3600).toFixed(1)} / ${(audioUsage.capSeconds / 3600).toFixed(1)} ${lang === 'bm' ? 'jam' : 'h'}`)
            : '—'}
          sub={audioUsage
            ? `${audioUsage.percentUsed}% ${lang === 'bm' ? 'digunakan' : 'used'}`
            : (lang === 'bm' ? 'Memuatkan…' : 'Loading…')}
        />
        <StatCard
          label={lang === 'bm' ? 'Notebook' : 'Notebooks'}
          value={`${stats.notebooks} / ${plan.notebookLimit}`}
          sub={plan.name}
        />
        {profile && (
          <button
            onClick={() => setBuyModalOpen(true)}
            style={{
              background: '#fff',
              border: '0.5px solid rgba(212, 83, 126, 0.25)',
              borderRadius: 12, padding: '14px 16px',
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: 'inherit',
            }}
          >
            <div style={{
              fontSize: 11.5, fontWeight: 500,
              color: '#993556',
              letterSpacing: '-0.005em', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              🎙️ {lang === 'bm' ? 'Kredit muat naik' : 'Upload credits'}
            </div>
            <div style={{
              fontSize: 24, fontWeight: 600, color: '#1d1d1f',
              letterSpacing: '-0.025em', lineHeight: 1,
            }}>
              {profile.upload_credits || 0}
            </div>
            <div style={{ fontSize: 11, color: '#993556', marginTop: 4, fontWeight: 500 }}>
              {(profile.upload_credits || 0) === 0
                ? (lang === 'bm' ? '+ Beli kredit' : '+ Buy credits')
                : (lang === 'bm' ? '+ Tambah lagi' : '+ Add more')}
            </div>
          </button>
        )}
      </div>

      {/* Upload entry card */}
      {profile && (
        <Link
          href="/dashboard/upload"
          style={{
            display: 'flex', alignItems: 'center', gap: 12,
            background: '#FFFBFC',
            border: '0.5px dashed rgba(212, 83, 126, 0.4)',
            borderRadius: 12,
            padding: '14px 16px',
            marginBottom: 14,
            textDecoration: 'none',
            cursor: 'pointer',
          }}
        >
          <div style={{ fontSize: 22 }}>🎙️</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#993556' }}>
              {lang === 'bm' ? 'Muat naik rakaman lama' : 'Upload existing recording'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.6)', marginTop: 2 }}>
              {lang === 'bm'
                ? `Ada audio file lama? Buat nota daripadanya (1 kredit · max 90 min)`
                : `Got an old audio file? Get notes from it (1 credit · 90 min max)`}
            </div>
          </div>
          <div style={{
            fontSize: 11, color: '#993556', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span>{(profile.upload_credits || 0)} {lang === 'bm' ? 'kredit' : 'credits'}</span>
            <Icon.ChevronRight size={11} />
          </div>
        </Link>
      )}

      {/* RECENT LECTURES */}
      <div style={{
        background: '#fff',
        border: '0.5px solid rgba(0,0,0,0.06)',
        borderRadius: 14, padding: '18px 20px',
        marginBottom: 12,
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 14,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.55)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {lang === 'bm' ? 'Kuliah terkini' : 'Recent lectures'}
          </div>
          <Link href="/dashboard/lectures" style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11.5, fontWeight: 500,
            color: 'rgba(29,29,31,0.55)', textDecoration: 'none',
          }}>
            {lang === 'bm' ? 'Lihat semua' : 'View all'}
            <Icon.ChevronRight size={9} />
          </Link>
        </div>

        {lectures.length === 0 ? (
          <div style={{
            padding: '32px 16px', textAlign: 'center',
            color: 'rgba(29,29,31,0.5)', fontSize: 13,
          }}>
            {lang === 'bm'
              ? 'Belum ada kuliah. Klik "Kuliah baru" untuk mula.'
              : 'No lectures yet. Click "New lecture" to get started.'}
          </div>
        ) : (
          lectures.map((l, i) => {
            const typeMeta = getRecordingTypeMeta(l.recording_type)
            return (
            <Link key={l.id} href={`/dashboard/lectures/${l.id}`} style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto auto auto',
              alignItems: 'center', gap: 10,
              padding: '12px 0',
              borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.05)',
              textDecoration: 'none', color: 'inherit',
            }}>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 13.5, fontWeight: 500, color: '#1d1d1f',
                  letterSpacing: '-0.01em', marginBottom: 2,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {l.title}
                </div>
                <div style={{
                  fontSize: 11.5, color: 'rgba(29,29,31,0.5)',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  {Math.round((l.duration_seconds || 0) / 60)} min
                  {l.subject && <><span style={{ width: 2, height: 2, borderRadius: '50%', background: 'rgba(29,29,31,0.3)' }} />{l.subject}</>}
                </div>
              </div>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '2px 8px', borderRadius: 6,
                fontSize: 10.5, fontWeight: 500,
                background: typeMeta.bg, color: typeMeta.color,
                whiteSpace: 'nowrap',
              }}>
                {typeMeta.label[lang as 'en' | 'bm'] || typeMeta.label.en}
              </span>
              {l.ai_provider && (
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: '#fff',
                  border: '0.5px solid rgba(0,0,0,0.08)',
                  borderRadius: 6, padding: '2px 8px 2px 3px',
                  fontSize: 10.5, fontWeight: 500,
                  color: 'rgba(29,29,31,0.6)',
                }}>
                  <AILogo provider={l.ai_provider} size={12} />
                  {({
                    'deepseek': 'DeepSeek',
                    'gemini-flash-lite': 'Flash-Lite',
                    'groq': 'Groq',
                    'auto': 'Auto',
                    'gpt-4o-mini': 'GPT-4o',
                    'claude-haiku': 'Claude',
                  } as any)[l.ai_provider] || l.ai_provider}
                </div>
              )}
              <div style={{
                fontSize: 11.5, color: 'rgba(29,29,31,0.45)',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {fmtDate(l.created_at)}
              </div>
            </Link>
            )
          })
        )}
      </div>

      {/* QUICK ACTIONS */}
      <div style={{
        display: 'grid', gap: 10,
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
      }}>
        <QuickAction
          icon={<Icon.Mic size={14} />}
          title={lang === 'bm' ? 'Mula kuliah baru' : 'Start new lecture'}
          desc={lang === 'bm' ? 'Rakam dan dapat nota tersusun AI.' : 'Record and get AI-organized notes.'}
          href="/dashboard/lectures/new"
          accent={s.soft}
        />
        <QuickAction
          icon={<Icon.Notebook size={14} />}
          title={lang === 'bm' ? 'Notebook baru' : 'New notebook'}
          desc={lang === 'bm' ? 'Kumpul kuliah ikut subjek.' : 'Group lectures by subject.'}
          href="/dashboard/notebooks"
          accent="#f5f5f7"
        />
        <QuickAction
          icon={<span style={{ fontSize: 14 }}>🍬</span>}
          title={lang === 'bm' ? 'Program Ambassador' : 'Ambassador Program'}
          desc={lang === 'bm'
            ? 'Kongsi kod, dapat komisen. Boleh menang MacBook!'
            : 'Share your code, earn commissions. Win a MacBook!'}
          href="/dashboard/ambassador"
          accent="#FFF4D6"
        />
      </div>

      <BuyCreditsModal open={buyModalOpen} onClose={() => setBuyModalOpen(false)} />
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid rgba(0,0,0,0.06)',
      borderRadius: 12, padding: '14px 16px',
    }}>
      <div style={{
        fontSize: 11.5, fontWeight: 500,
        color: 'rgba(29,29,31,0.55)',
        letterSpacing: '-0.005em', marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 24, fontWeight: 600, color: '#1d1d1f',
        letterSpacing: '-0.025em', lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', marginTop: 4 }}>
        {sub}
      </div>
    </div>
  )
}

function QuickAction({ icon, title, desc, href, accent }: {
  icon: React.ReactNode; title: string; desc: string; href: string; accent: string;
}) {
  return (
    <Link href={href} style={{
      display: 'block',
      background: '#fff',
      border: '0.5px solid rgba(0,0,0,0.06)',
      borderRadius: 12, padding: '14px 16px',
      textDecoration: 'none', color: 'inherit',
      transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: accent,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'rgba(29,29,75)',
        }}>
          {icon}
        </div>
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#1d1d1f',
          letterSpacing: '-0.015em',
        }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.55)', lineHeight: 1.4 }}>
        {desc}
      </div>
    </Link>
  )
}
