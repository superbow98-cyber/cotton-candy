'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import LangToggle from '@/components/ui/LangToggle'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { THEMES, type Theme, type Profile, PLANS } from '@/types'
import { PROVIDER_ORDER, PROVIDER_META, DEFAULT_PROVIDER, type AIProvider } from '@/lib/ai-providers'

function AILogo({ provider, size = 20 }: { provider: AIProvider; size?: number }) {
  const meta = PROVIDER_META[provider]
  const logoKey = meta.logoKey
  const wrap: React.CSSProperties = {
    width: size + 14, height: size + 14, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
  }
  if (logoKey === 'auto') return (
    <div style={{ ...wrap, background: 'linear-gradient(135deg, #FBEAF0, #FFB7C5)' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#4B1528" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" />
        <path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" />
      </svg>
    </div>
  )
  if (logoKey === 'groq') return (
    <div style={{ ...wrap, background: 'linear-gradient(180deg, #FF5D3A, #E23A20)' }}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="#fff">
        <path d="M16 3C8.8 3 3 8.8 3 16s5.8 13 13 13 13-5.8 13-13S23.2 3 16 3zm0 20c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7z" />
        <circle cx="16" cy="16" r="3.5" />
      </svg>
    </div>
  )
  if (logoKey === 'gemini') return (
    <div style={{ ...wrap, background: 'linear-gradient(135deg, #4285F4 0%, #9168C0 50%, #EA4335 100%)' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
        <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" />
      </svg>
    </div>
  )
  return (
    <div style={{ ...wrap, background: 'linear-gradient(135deg, #4796E3, #34A853)' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
      </svg>
    </div>
  )
}

export default function SettingsPage() {
  const { t, lang } = useLang()
  const router = useRouter()
  const { theme, setTheme, tokens: s } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [savingAi, setSavingAi] = useState(false)

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
    setSavingAi(true)
    try {
      const sb = createClient()
      await sb.from('profiles').update({ ai_provider: p }).eq('id', profile.id)
      setProfile({ ...profile, ai_provider: p })
    } catch (e) { console.error(e) }
    finally { setSavingAi(false) }
  }

  const plan = profile?.plan ? PLANS[profile.plan] : PLANS.free
  const expires = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null
  const aiProvider = ((profile?.ai_provider as AIProvider) || DEFAULT_PROVIDER)

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(24px, 4vw, 34px)', marginBottom: 24 }}>
        {t('setTitle')}
      </h1>

      <Card title="Account" tokens={s}>
        <Row label="Email" value={profile?.email || '—'} tokens={s} />
        <Row label="Joined" value={profile ? new Date(profile.created_at).toLocaleDateString() : '—'} tokens={s} />
      </Card>

      <Card title={lang === 'bm' ? 'Tema' : 'Theme'} tokens={s}>
        <p style={{ fontSize: 12, color: s.gray, margin: '0 0 12px' }}>
          {lang === 'bm' ? 'Pilih vibe anda — pink, biru, hijau, atau kuning.' : 'Pick your vibe — pink, blue, green or yellow.'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 10 }}>
          {(Object.keys(THEMES) as Theme[]).map((key) => {
            const tk = THEMES[key]
            const active = theme === key
            return (
              <button key={key} onClick={() => setTheme(key)}
                style={{
                  background: tk.cream,
                  border: `2px solid ${active ? tk.primaryDark : tk.border}`,
                  borderRadius: 14, padding: 14, cursor: 'pointer',
                  textAlign: 'center', transition: 'transform 0.08s',
                  position: 'relative',
                }}
              >
                {active && <span style={{ position: 'absolute', top: 6, right: 8, fontSize: 12, color: tk.primaryDark }}>✓</span>}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: tk.primary, border: `2px solid ${tk.primaryDark}`,
                  margin: '0 auto 6px',
                }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: tk.dark }}>{tk.emoji} {tk.label}</div>
                <div style={{ fontSize: 10, color: tk.gray, marginTop: 1 }}>{tk.sub}</div>
              </button>
            )
          })}
        </div>
      </Card>

      <Card title="🤖 AI Model" tokens={s}>
        <p style={{ fontSize: 12, color: s.gray, margin: '0 0 14px' }}>
          {lang === 'bm'
            ? 'Pilih AI mana yang susun nota anda secara lalai.'
            : 'Choose which AI organizes your notes by default.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {PROVIDER_ORDER.map((p) => {
            const m = PROVIDER_META[p]
            const active = aiProvider === p
            return (
              <button
                key={p}
                onClick={() => setAiProvider(p)}
                disabled={savingAi}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: 12,
                  background: active ? s.soft : '#fff',
                  border: `1.5px solid ${active ? s.primaryDark : s.border}`,
                  borderRadius: 14,
                  cursor: savingAi ? 'wait' : 'pointer',
                  textAlign: 'left', transition: 'all 0.15s',
                  opacity: savingAi ? 0.6 : 1,
                }}
              >
                <AILogo provider={p} size={18} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: s.dark, marginBottom: 2 }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 12, color: s.gray, lineHeight: 1.5 }}>
                    {lang === 'bm' ? m.descBm : m.descEn}
                  </div>
                </div>
                <span style={{
                  color: s.primaryDark, fontSize: 18, fontWeight: 700,
                  flexShrink: 0, opacity: active ? 1 : 0,
                }}>✓</span>
              </button>
            )
          })}
        </div>
      </Card>

      <Card title={t('setLang')} tokens={s}>
        <LangToggle />
      </Card>

      <Card title={t('setPlan')} tokens={s}>
        <div style={{
          background: s.soft, padding: 14, borderRadius: 14,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 8,
        }}>
          <div>
            <div style={{ fontWeight: 700 }}>{plan.name}</div>
            {expires && <div style={{ fontSize: 12, color: s.gray }}>Expires: {expires.toLocaleDateString()}</div>}
          </div>
          {profile?.plan !== 'year' && (
            <Link href="/pricing"><Button size="sm">{t('setUpgrade')}</Button></Link>
          )}
        </div>
      </Card>

      <Card title={t('setDanger')} tokens={s}>
        <Button variant="outline" onClick={signOut}>{t('setSignOut')}</Button>
      </Card>
    </div>
  )
}

function Card({ title, children, tokens: s }: { title: string; children: React.ReactNode; tokens: any }) {
  return (
    <section style={{
      background: '#fff', borderRadius: 18, padding: 20,
      border: `1px solid ${s.border}`, marginBottom: 14,
    }}>
      <h2 style={{
        fontSize: 14, color: s.gray, margin: '0 0 12px',
        fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase',
      }}>{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, value, tokens: s }: { label: string; value: string; tokens: any }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
      <span style={{ color: s.gray }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}
