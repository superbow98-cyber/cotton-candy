'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { THEMES, type Theme, type Profile, PLANS } from '@/types'
import { PROVIDER_ORDER, PROVIDER_META, DEFAULT_PROVIDER, type AIProvider } from '@/lib/ai-providers'
import { Icon } from '@/components/ui/Icon'

function AILogo({ provider, size = 14 }: { provider: AIProvider; size?: number }) {
  const meta = PROVIDER_META[provider]
  const bg: Record<string, string> = {
    'auto': 'linear-gradient(135deg, #FFB7C5, #D4537E)',
    'groq': 'linear-gradient(180deg, #FF5D3A, #E23A20)',
    'gemini': 'linear-gradient(135deg, #4285F4 0%, #9168C0 50%, #EA4335 100%)',
    'gemini-lite': 'linear-gradient(135deg, #4796E3, #34A853)',
    'gpt': '#000',
    'claude': '#DA7756',
    'deepseek': '#ECEEF8',
  }
  const wrapSize = size + 14
  const wrap: React.CSSProperties = {
    width: wrapSize, height: wrapSize, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    background: bg[meta.logoKey] || bg['auto'],
    boxShadow: 'inset 0 0.5px 0 rgba(255,255,255,0.3), 0 1px 2px rgba(0,0,0,0.08)',
  }
  if (meta.logoKey === 'deepseek') return (
    <div style={wrap}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 15C31 15 18 27 18 43C18 53 24 61 35 66C22 71 18 84 28 90C37 96 51 92 57 84C63 90 75 94 83 88C95 80 91 67 78 61C89 55 93 46 90 37C86 24 71 15 50 15Z" fill="#2840D5"/>
        <path d="M50 30C38 30 30 36 30 44C30 50 34 55 42 58C30 62 28 72 36 77C42 81 52 78 57 72C62 77 71 80 77 75C86 68 83 58 72 54C81 50 84 44 81 37C77 30 65 30 50 30Z" fill="#E8EAF6"/>
        <ellipse cx="42" cy="46" rx="11" ry="8" fill="white" transform="rotate(-15 42 46)"/>
        <circle cx="39" cy="43" r="4.5" fill="#2840D5"/>
        <circle cx="40" cy="42" r="2" fill="white"/>
      </svg>
    </div>
  )
  if (meta.logoKey === 'auto') return (
    <div style={wrap}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#4B1528" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </svg>
    </div>
  )
  if (meta.logoKey === 'groq') return (
    <div style={wrap}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="#fff">
        <path d="M16 3C8.8 3 3 8.8 3 16s5.8 13 13 13 13-5.8 13-13S23.2 3 16 3zm0 20c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7z" />
        <circle cx="16" cy="16" r="3.5" />
      </svg>
    </div>
  )
  if (meta.logoKey === 'gemini') return (
    <div style={wrap}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
        <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" />
      </svg>
    </div>
  )
  if (meta.logoKey === 'gpt') return (
    <div style={wrap}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
        <path d="M22.289 9.94a5.998 5.998 0 0 0-.515-4.926 6.065 6.065 0 0 0-6.525-2.908A5.998 5.998 0 0 0 10.724 0a6.064 6.064 0 0 0-5.781 4.202 5.998 5.998 0 0 0-4.002 2.91 6.065 6.065 0 0 0 .747 7.11 5.998 5.998 0 0 0 .515 4.926 6.065 6.065 0 0 0 6.525 2.908A5.997 5.997 0 0 0 13.276 24a6.064 6.064 0 0 0 5.782-4.202 5.998 5.998 0 0 0 4.001-2.91 6.065 6.065 0 0 0-.77-6.948zM13.276 22.4a4.49 4.49 0 0 1-2.882-1.041l.142-.08 4.783-2.762a.78.78 0 0 0 .396-.68v-6.747l2.023 1.168a.072.072 0 0 1 .04.057v5.585a4.505 4.505 0 0 1-4.502 4.5zm-9.684-4.131a4.49 4.49 0 0 1-.537-3.018l.142.085 4.783 2.762a.779.779 0 0 0 .785 0l5.843-3.373v2.335a.072.072 0 0 1-.029.063l-4.836 2.791a4.504 4.504 0 0 1-6.151-1.645zm-1.261-10.46a4.489 4.489 0 0 1 2.347-1.975V11.5a.769.769 0 0 0 .389.678l5.82 3.361-2.023 1.168a.073.073 0 0 1-.071 0L4.009 13.9a4.505 4.505 0 0 1-.678-6.091zm16.614 3.864l-5.843-3.375 2.023-1.167a.072.072 0 0 1 .071 0l4.783 2.762a4.502 4.502 0 0 1-.696 8.124V12.35a.77.77 0 0 0-.338-.677zm2.014-3.025l-.142-.085-4.783-2.762a.779.779 0 0 0-.785 0L9.406 9.974V7.639a.072.072 0 0 1 .029-.063l4.836-2.79a4.503 4.503 0 0 1 6.688 4.664zm-12.664 4.161L6.272 11.64a.072.072 0 0 1-.04-.057V5.999a4.503 4.503 0 0 1 7.384-3.458l-.142.08-4.783 2.762a.779.779 0 0 0-.396.68zm1.098-2.366l2.602-1.502 2.603 1.5v3l-2.603 1.5-2.602-1.5z"/>
      </svg>
    </div>
  )
  if (meta.logoKey === 'claude') return (
    <div style={wrap}>
      <svg width={size} height={size} viewBox="0 0 100 100">
        <line x1="50" y1="5" x2="50" y2="95" stroke="white" strokeWidth="12" strokeLinecap="round"/>
        <line x1="5" y1="50" x2="95" y2="50" stroke="white" strokeWidth="12" strokeLinecap="round"/>
        <line x1="15" y1="15" x2="85" y2="85" stroke="white" strokeWidth="12" strokeLinecap="round"/>
        <line x1="85" y1="15" x2="15" y2="85" stroke="white" strokeWidth="12" strokeLinecap="round"/>
      </svg>
    </div>
  )
  return (
    <div style={wrap}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
      </svg>
    </div>
  )
}

export default function SettingsPage() {
  const { t, lang, setLang } = useLang()
  const router = useRouter()
  const { theme, setTheme, tokens: s } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (data) setProfile(data as Profile)
    })()
  }, [])

  const signOut = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    router.replace('/')
  }

  const setAiProvider = async (p: AIProvider) => {
    if (!profile) return
    const sb = createClient()
    await sb.from('profiles').update({ ai_provider: p }).eq('id', profile.id)
    setProfile({ ...profile, ai_provider: p })
  }

  const plan = profile?.plan ? PLANS[profile.plan] : PLANS.free
  const expires = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null
  const aiProvider = ((profile?.ai_provider as AIProvider) || DEFAULT_PROVIDER)

  const planLabels: Record<string, string> = {
    free: lang === 'bm' ? 'Percuma' : 'Free',
    day: 'Day Pass',
    month: lang === 'bm' ? 'Bulanan' : 'Monthly',
    year: lang === 'bm' ? 'Tahunan' : 'Yearly',
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 600,
          letterSpacing: '-0.025em', color: '#1d1d1f',
        }}>
          {lang === 'bm' ? 'Tetapan' : 'Settings'}
        </h1>
        <div style={{ fontSize: 12.5, color: 'rgba(29,29,31,0.55)', marginTop: 2 }}>
          {lang === 'bm'
            ? 'Akaun, AI, penampilan, dan keutamaan.'
            : 'Account, AI model, appearance, and preferences.'}
        </div>
      </div>

      {/* ACCOUNT CARD */}
      <SettingsCard title={lang === 'bm' ? 'Akaun' : 'Account'}>
        <Row label="Email" value={profile?.email || '—'} />
        <Row
          label={lang === 'bm' ? 'Didaftar' : 'Joined'}
          value={profile ? new Date(profile.created_at).toLocaleDateString(
            lang === 'bm' ? 'ms-MY' : 'en-GB',
            { day: 'numeric', month: 'long', year: 'numeric' },
          ) : '—'}
        />
        <Row
          label={lang === 'bm' ? 'Pelan' : 'Plan'}
          value={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{planLabels[profile?.plan || 'free']}</span>
              {expires && (
                <span style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)' }}>
                  · {lang === 'bm' ? 'tamat' : 'expires'} {expires.toLocaleDateString()}
                </span>
              )}
              <Link href="/#pricing" style={{
                display: 'inline-flex', alignItems: 'center', gap: 3,
                fontSize: 12.5, fontWeight: 500,
                color: '#5A8FF5', textDecoration: 'none', marginLeft: 'auto',
              }}>
                {profile?.plan === 'free'
                  ? (lang === 'bm' ? 'Upgrade' : 'Upgrade')
                  : (lang === 'bm' ? 'Urus' : 'Manage')}
                <Icon.ChevronRight size={11} />
              </Link>
            </div>
          }
        />
      </SettingsCard>

      {/* AI MODEL CARD */}
      <SettingsCard title={lang === 'bm' ? 'Model AI' : 'AI model'}>
        <div style={{ padding: '0 0 4px' }}>
          <div style={{ padding: '10px 18px 6px', fontSize: 11.5, color: 'rgba(29,29,31,0.5)', lineHeight: 1.5 }}>
            {lang === 'bm'
              ? 'AI yang digunakan untuk susun nota secara default.'
              : 'The AI used to organize your notes by default.'}
          </div>
          {PROVIDER_ORDER.map((p, i) => {
            const meta = PROVIDER_META[p]
            const selected = aiProvider === p
            return (
              <div key={p}
                onClick={() => setAiProvider(p)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 18px',
                  cursor: 'pointer',
                  borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.04)',
                  background: selected ? 'rgba(29,29,31,0.02)' : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'rgba(0,0,0,0.02)' }}
                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent' }}
              >
                <AILogo provider={p} size={14} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13.5, fontWeight: 500,
                    letterSpacing: '-0.01em', color: '#1d1d1f', marginBottom: 1,
                  }}>
                    {meta.label}
                    {p === DEFAULT_PROVIDER && (
                      <span style={{
                        display: 'inline-block', marginLeft: 8,
                        fontSize: 10, fontWeight: 600,
                        padding: '1px 7px', borderRadius: 100,
                        background: 'rgba(255, 110, 170, 0.12)',
                        color: '#D4537E', letterSpacing: '0.3px',
                        verticalAlign: 'middle',
                      }}>DEFAULT</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.55)', lineHeight: 1.4 }}>
                    {lang === 'bm' ? meta.descBm : meta.descEn}
                  </div>
                </div>
                {selected && (
                  <Icon.Check size={16} style={{ color: '#1d1d1f', flexShrink: 0 }} />
                )}
              </div>
            )
          })}
        </div>
      </SettingsCard>

      {/* THEME ACCENT CARD */}
      <SettingsCard title={lang === 'bm' ? 'Warna aksen' : 'Theme accent'}>
        <div style={{ padding: '10px 18px 6px', fontSize: 11.5, color: 'rgba(29,29,31,0.5)', lineHeight: 1.5 }}>
          {lang === 'bm'
            ? 'Warna logo dan aksen PDF. Antara muka kekal neutral.'
            : 'Logo color and PDF accent. The interface stays neutral.'}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 8, padding: '6px 18px 16px',
        }}>
          {(Object.keys(THEMES) as Theme[]).map((key) => {
            const tk = THEMES[key]
            const active = theme === key
            const label: Record<Theme, string> = {
              pink: lang === 'bm' ? 'Pink' : 'Pink',
              blue: lang === 'bm' ? 'Biru' : 'Blue',
              green: lang === 'bm' ? 'Hijau' : 'Green',
              yellow: lang === 'bm' ? 'Kuning' : 'Yellow',
            }
            return (
              <button key={key} onClick={() => setTheme(key)} style={{
                aspectRatio: '1',
                background: `linear-gradient(135deg, ${tk.soft}, ${tk.primary})`,
                border: active ? '1.5px solid #1d1d1f' : '1.5px solid transparent',
                borderRadius: 10, cursor: 'pointer',
                position: 'relative',
                display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                paddingBottom: 6,
                fontSize: 10.5, fontWeight: 500,
                color: 'rgba(29,29,31,0.75)',
                fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}>
                {active && (
                  <span style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 16, height: 16, borderRadius: '50%',
                    background: '#1d1d1f', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon.Check size={9} />
                  </span>
                )}
                {label[key]}
              </button>
            )
          })}
        </div>
      </SettingsCard>

      {/* LANGUAGE CARD */}
      <SettingsCard title={lang === 'bm' ? 'Bahasa' : 'Language'}>
        <div style={{
          padding: '12px 18px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 13.5,
        }}>
          <span style={{ color: 'rgba(29,29,31,0.55)', fontWeight: 500 }}>
            {lang === 'bm' ? 'Bahasa antara muka' : 'Interface language'}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => setLang('en')} style={langPillStyle(lang === 'en')}>EN</button>
            <button onClick={() => setLang('bm')} style={langPillStyle(lang === 'bm')}>BM</button>
          </div>
        </div>
      </SettingsCard>

      {/* MIC ENHANCEMENT */}
      <SettingsCard title={lang === 'bm' ? 'Penambahbaikan Mikrofon' : 'Mic Enhancement'}>
        <MicEnhancementSettings lang={lang} />
      </SettingsCard>

      {/* RECORDING EXPERIENCE (v56) */}
      <SettingsCard title={lang === 'bm' ? 'Pengalaman Rakaman' : 'Recording Experience'}>
        <RecordingExperienceSettings lang={lang} />
      </SettingsCard>

      {/* ADMIN SECTION (Parcello only) */}
      {profile?.is_admin && (
        <SettingsCard title={lang === 'bm' ? '🔐 Admin · Parcello' : '🔐 Admin · Parcello'}>
          <div style={{
            padding: '12px 18px',
            borderBottom: '0.5px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 500,
              color: 'rgba(29,29,31,0.55)',
              marginBottom: 8,
            }}>
              {lang === 'bm'
                ? 'Anda adalah admin. Akses kepada alat pengurusan promo dan analitik.'
                : 'You are an admin. Access promo management & analytics tools.'}
            </div>
          </div>

          <Link
            href="/dashboard/admin/promo-codes"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              textDecoration: 'none',
              color: '#1d1d1f',
              borderBottom: '0.5px solid rgba(0,0,0,0.06)',
            }}
          >
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                🎟 {lang === 'bm' ? 'Kod Promo' : 'Promo Codes'}
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.5)', marginTop: 2 }}>
                {lang === 'bm' ? 'Cipta & urus kod diskaun' : 'Create & manage discount codes'}
              </div>
            </div>
            <span style={{ color: 'rgba(29,29,31,0.4)', fontSize: 14 }}>→</span>
          </Link>

          <Link
            href="/dashboard/admin/analytics"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              textDecoration: 'none',
              color: '#1d1d1f',
            }}
          >
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>
                📊 {lang === 'bm' ? 'Analitik' : 'Analytics'}
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.5)', marginTop: 2 }}>
                {lang === 'bm' ? 'Penggunaan & pendapatan (akan datang)' : 'Usage & revenue (coming soon)'}
              </div>
            </div>
            <span style={{ color: 'rgba(29,29,31,0.4)', fontSize: 14 }}>→</span>
          </Link>
        </SettingsCard>
      )}

      {/* ACCOUNT ACTIONS */}
      <SettingsCard title={lang === 'bm' ? 'Tindakan akaun' : 'Account actions'}>
        <button onClick={signOut} style={{
          width: '100%',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px',
          background: 'transparent', border: 'none',
          fontSize: 13.5, fontWeight: 500,
          color: 'rgba(29,29,31,0.8)',
          cursor: 'pointer', fontFamily: 'inherit',
          letterSpacing: '-0.005em',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Icon.Logout size={14} style={{ color: 'rgba(29,29,31,0.5)' }} />
            {lang === 'bm' ? 'Log keluar' : 'Sign out'}
          </span>
          <Icon.ChevronRight size={12} style={{ color: 'rgba(29,29,31,0.4)' }} />
        </button>
      </SettingsCard>
    </div>
  )
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid rgba(0,0,0,0.06)',
      borderRadius: 14,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600,
        color: 'rgba(29,29,31,0.5)',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        padding: '14px 18px 6px',
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 18px',
      fontSize: 13.5,
      borderTop: '0.5px solid rgba(0,0,0,0.04)',
      letterSpacing: '-0.005em',
    }}>
      <span style={{ color: 'rgba(29,29,31,0.55)', fontWeight: 500 }}>{label}</span>
      <span style={{ fontWeight: 500, color: '#1d1d1f', flex: 1, textAlign: 'right' }}>
        {typeof value === 'string' ? value : <>{value}</>}
      </span>
    </div>
  )
}

function langPillStyle(active: boolean): React.CSSProperties {
  return {
    padding: '5px 11px',
    background: active ? '#1d1d1f' : '#f5f5f7',
    color: active ? '#fff' : 'rgba(29,29,31,0.7)',
    border: 'none', borderRadius: 7,
    fontSize: 12, fontWeight: 500,
    cursor: 'pointer', fontFamily: 'inherit',
    letterSpacing: '-0.005em',
  }
}

function MicEnhancementSettings({ lang }: { lang: 'en' | 'bm' }) {
  const [enhanceOn, setEnhanceOn] = useState(true)
  const [gain, setGain] = useState(1.5)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cc-mic-enhance')
      setEnhanceOn(saved !== 'off')
      const g = parseFloat(localStorage.getItem('cc-mic-gain') || '1.5')
      setGain(Math.max(0.5, Math.min(3.0, g)))
    } catch {}
    setMounted(true)
  }, [])

  const toggleEnhance = (next: boolean) => {
    setEnhanceOn(next)
    try { localStorage.setItem('cc-mic-enhance', next ? 'on' : 'off') } catch {}
  }

  const setGainValue = (next: number) => {
    setGain(next)
    try { localStorage.setItem('cc-mic-gain', String(next)) } catch {}
  }

  if (!mounted) return null

  const gainDb = (20 * Math.log10(gain)).toFixed(1)

  return (
    <>
      <div style={{
        padding: '12px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        fontSize: 13.5,
        borderBottom: '0.5px solid rgba(0,0,0,0.06)',
      }}>
        <div>
          <div style={{ color: '#1d1d1f', fontWeight: 500 }}>
            {lang === 'bm' ? 'Audio diperbaiki sebelum transkrip' : 'Auto-enhance audio'}
          </div>
          <div style={{ color: 'rgba(29,29,31,0.5)', fontSize: 11.5, marginTop: 2 }}>
            {lang === 'bm'
              ? 'Buang bunyi bising, tingkatkan suara perlahan'
              : 'Reduce noise, boost quiet voices'}
          </div>
        </div>
        <button
          onClick={() => toggleEnhance(!enhanceOn)}
          style={{
            width: 44, height: 26, borderRadius: 100,
            background: enhanceOn ? '#34A853' : 'rgba(0,0,0,0.15)',
            border: 'none', position: 'relative', cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          aria-label="Toggle mic enhancement"
        >
          <span style={{
            position: 'absolute',
            top: 2, left: enhanceOn ? 20 : 2,
            width: 22, height: 22,
            background: '#fff', borderRadius: '50%',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            transition: 'left 0.15s',
          }} />
        </button>
      </div>

      <div style={{
        padding: '12px 18px',
        opacity: enhanceOn ? 1 : 0.4,
        pointerEvents: enhanceOn ? 'auto' : 'none',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 8, fontSize: 13.5,
        }}>
          <span style={{ color: '#1d1d1f', fontWeight: 500 }}>
            {lang === 'bm' ? 'Tingkat suara' : 'Voice boost'}
          </span>
          <span style={{ color: 'rgba(29,29,31,0.55)', fontSize: 12, fontFamily: 'SF Mono, Monaco, monospace' }}>
            {gain >= 1 ? '+' : ''}{gainDb} dB
          </span>
        </div>
        <input
          type="range"
          min="0.5"
          max="3.0"
          step="0.1"
          value={gain}
          onChange={(e) => setGainValue(parseFloat(e.target.value))}
          style={{
            width: '100%', accentColor: '#1d1d1f',
            cursor: 'pointer',
          }}
        />
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 10, color: 'rgba(29,29,31,0.45)',
          marginTop: 4,
        }}>
          <span>{lang === 'bm' ? 'Perlahan' : 'Soft'}</span>
          <span>{lang === 'bm' ? 'Biasa' : 'Normal'} (1.5×)</span>
          <span>{lang === 'bm' ? 'Kuat' : 'Loud'}</span>
        </div>
      </div>

      <div style={{
        padding: '8px 18px 14px',
        fontSize: 11,
        color: 'rgba(29,29,31,0.5)',
        lineHeight: 1.5,
      }}>
        {lang === 'bm'
          ? '💡 Tetapan ini akan diguna pada rakaman seterusnya. Jika sistem mikrofon gagal, sistem akan automatik guna audio asal.'
          : '💡 Applies to next recording. If mic enhancement fails, system auto-falls back to raw audio.'}
      </div>
    </>
  )
}

// v56: Recording experience opt-in toggles
function RecordingExperienceSettings({ lang }: { lang: 'en' | 'bm' }) {
  const [showMicMeter, setShowMicMeter] = useState(false)
  const [showFactsLoader, setShowFactsLoader] = useState(true)
  const [showKnowledge, setShowKnowledge] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    try {
      setShowMicMeter(localStorage.getItem('cc-show-mic-meter') === 'on')
      setShowFactsLoader(localStorage.getItem('cc-show-facts-loader') !== 'off')
      setShowKnowledge(localStorage.getItem('cc-show-knowledge') !== 'off')
    } catch {}
    setMounted(true)
  }, [])

  const toggle = (key: 'mic' | 'facts' | 'knowledge', next: boolean) => {
    if (key === 'mic') {
      setShowMicMeter(next)
      try { localStorage.setItem('cc-show-mic-meter', next ? 'on' : 'off') } catch {}
    } else if (key === 'facts') {
      setShowFactsLoader(next)
      try { localStorage.setItem('cc-show-facts-loader', next ? 'on' : 'off') } catch {}
    } else {
      setShowKnowledge(next)
      try { localStorage.setItem('cc-show-knowledge', next ? 'on' : 'off') } catch {}
    }
  }

  if (!mounted) return null

  return (
    <>
      <ToggleRow
        label={lang === 'bm' ? 'Tunjuk meter mikrofon semasa rakam' : 'Show mic meter while recording'}
        sub={lang === 'bm'
          ? 'Bar audio langsung + bacaan dB untuk kepastian mic berfungsi'
          : 'Live audio bars + dB readout to confirm mic is working'}
        on={showMicMeter}
        onChange={(v) => toggle('mic', v)}
      />
      <ToggleRow
        label={lang === 'bm' ? 'Tunjuk fakta menarik semasa rakam' : 'Show interesting facts while recording'}
        sub={lang === 'bm'
          ? 'Fakta umum (sains, alam, sejarah) berputar setiap 8 saat'
          : 'Universal trivia (science, nature, history) rotates every 8s'}
        on={showKnowledge}
        onChange={(v) => toggle('knowledge', v)}
      />
      <ToggleRow
        label={lang === 'bm' ? 'Tunjuk tip semasa AI memproses' : 'Show study tips while AI processes'}
        sub={lang === 'bm'
          ? 'Foto + tip belajar berputar setiap 5 saat semasa menunggu'
          : 'Photo + rotating study tips every 5s while waiting'}
        on={showFactsLoader}
        onChange={(v) => toggle('facts', v)}
        last
      />
      <div style={{
        padding: '8px 18px 14px',
        fontSize: 11,
        color: 'rgba(29,29,31,0.5)',
        lineHeight: 1.5,
      }}>
        {lang === 'bm'
          ? '💡 Fakta menarik & tip belajar dihidupkan secara lalai. Meter mic adalah opsyen.'
          : '💡 Interesting facts & study tips are ON by default. Mic meter is optional.'}
      </div>
    </>
  )
}

function ToggleRow({
  label, sub, on, onChange, last,
}: {
  label: string; sub?: string; on: boolean
  onChange: (next: boolean) => void
  last?: boolean
}) {
  return (
    <div style={{
      padding: '12px 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      fontSize: 13.5,
      borderBottom: last ? 'none' : '0.5px solid rgba(0,0,0,0.06)',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: '#1d1d1f', fontWeight: 500 }}>{label}</div>
        {sub && (
          <div style={{ color: 'rgba(29,29,31,0.5)', fontSize: 11.5, marginTop: 2 }}>{sub}</div>
        )}
      </div>
      <button
        onClick={() => onChange(!on)}
        style={{
          width: 44, height: 26, borderRadius: 100,
          background: on ? '#34A853' : 'rgba(0,0,0,0.15)',
          border: 'none', position: 'relative', cursor: 'pointer',
          transition: 'background 0.15s', flexShrink: 0,
        }}
        aria-label="Toggle"
      >
        <span style={{
          position: 'absolute', top: 2, left: on ? 20 : 2,
          width: 22, height: 22, background: '#fff', borderRadius: '50%',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          transition: 'left 0.15s',
        }} />
      </button>
    </div>
  )
}
