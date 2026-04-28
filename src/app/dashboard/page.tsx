'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { type Lecture, type Profile, PLANS } from '@/types'
import { getRecordingTypeMeta } from '@/lib/recording-types'
import { Icon } from '@/components/ui/Icon'

// AI logo resolver — small brand chip
function AILogo({ provider, size = 14 }: { provider: string; size?: number }) {
  const bg: Record<string, string> = {
    'gemini-flash': 'linear-gradient(135deg, #4285F4, #9168C0 50%, #EA4335)',
    'groq': 'linear-gradient(180deg, #FF5D3A, #E23A20)',
    'auto': 'linear-gradient(135deg, #FFB7C5, #D4537E)',
    'gemini-flash-lite': 'linear-gradient(135deg, #4796E3, #34A853)',
  }
  const icons: Record<string, JSX.Element> = {
    'gemini-flash': <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" fill="#fff"/>,
    'groq': <><circle cx="12" cy="12" r="9" fill="#fff"/><circle cx="12" cy="12" r="2.8" fill="#E23A20"/></>,
    'auto': <path d="M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3" stroke="#4B1528" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    'gemini-flash-lite': <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="#fff"/>,
  }
  const icSize = Math.round(size * 0.65)
  return (
    <span style={{
      width: size + 6, height: size + 6, borderRadius: Math.round(size / 3.5),
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

      // Fetch audio usage
      try {
        const res = await fetch('/api/usage')
        if (res.ok) {
          const { usage } = await res.json()
          if (usage) setAudioUsage(usage)
        }
      } catch {}
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
      </div>

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
                    'gemini-flash': 'Gemini',
                    'gemini-flash-lite': 'Flash-Lite',
                    'groq': 'Groq',
                    'auto': 'Auto',
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
      </div>
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
          color: 'rgba(29,29,31,0.75)',
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
