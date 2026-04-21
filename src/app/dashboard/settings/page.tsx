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

type AIProviderKey = 'auto' | 'groq' | 'gemini-flash' | 'gemini-flash-lite'

const AI_PROVIDER_OPTIONS: Array<{
  key: AIProviderKey
  label: string
  icon: string
  descEn: string
  descBm: string
}> = [
  {
    key: 'auto',
    label: 'Auto fallback',
    icon: '🔄',
    descEn: 'Recommended — tries Groq first, falls back to Gemini if busy',
    descBm: 'Disyorkan — cuba Groq dulu, Gemini jika sibuk',
  },
  {
    key: 'groq',
    label: 'Groq Llama 3.3 70B',
    icon: '🚀',
    descEn: 'Fastest speed · 1,000/day limit · Best overall quality',
    descBm: 'Pantas · had 1,000/hari · kualiti terbaik',
  },
  {
    key: 'gemini-flash',
    label: 'Gemini 2.5 Flash',
    icon: '💎',
    descEn: 'Excellent quality · 250/day · 1M token context',
    descBm: 'Kualiti hebat · 250/hari · konteks 1M token',
  },
  {
    key: 'gemini-flash-lite',
    label: 'Gemini 2.5 Flash-Lite',
    icon: '⚡',
    descEn: 'High volume · 1,000/day · Good for simple tasks',
    descBm: 'Volume tinggi · 1,000/hari · tugas ringkas',
  },
]

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

  const setAiProvider = async (p: AIProviderKey) => {
    if (!profile) return
    setSavingAi(true)
    try {
      const sb = createClient()
      await sb.from('profiles').update({ ai_provider: p }).eq('id', profile.id)
      setProfile({ ...profile, ai_provider: p })
    } catch (e) {
      console.error(e)
    } finally {
      setSavingAi(false)
    }
  }

  const plan = profile?.plan ? PLANS[profile.plan] : PLANS.free
  const expires = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null
  const aiProvider = (profile?.ai_provider || 'auto') as AIProviderKey

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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: 10,
        }}>
          {(Object.keys(THEMES) as Theme[]).map((key) => {
            const tk = THEMES[key]
            const active = theme === key
            return (
              <button
                key={key}
                onClick={() => setTheme(key)}
                style={{
                  background: tk.cream,
                  border: `2px solid ${active ? tk.primaryDark : tk.border}`,
                  borderRadius: 14,
                  padding: 14,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'transform 0.08s',
                  outline: 'none',
                  position: 'relative',
                }}
              >
                {active && (
                  <span style={{
                    position: 'absolute', top: 6, right: 8,
                    fontSize: 12, color: tk.primaryDark,
                  }}>✓</span>
                )}
                <div style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: tk.primary, border: `2px solid ${tk.primaryDark}`,
                  margin: '0 auto 6px',
                }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: tk.dark }}>
                  {tk.emoji} {tk.label}
                </div>
                <div style={{ fontSize: 10, color: tk.gray, marginTop: 1 }}>
                  {tk.sub}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      <Card title={lang === 'bm' ? '🤖 AI Provider' : '🤖 AI Provider'} tokens={s}>
        <p style={{ fontSize: 12, color: s.gray, margin: '0 0 14px' }}>
          {lang === 'bm'
            ? 'Pilih AI mana yang susun nota anda. Semua percuma.'
            : 'Pick which AI organizes your notes. All free tier.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {AI_PROVIDER_OPTIONS.map((opt) => {
            const active = aiProvider === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => setAiProvider(opt.key)}
                disabled={savingAi}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: 14,
                  background: active ? s.soft : '#fff',
                  border: `2px solid ${active ? s.primaryDark : s.border}`,
                  borderRadius: 14,
                  cursor: savingAi ? 'wait' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                  opacity: savingAi ? 0.6 : 1,
                }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  border: `2px solid ${active ? s.primaryDark : s.border}`,
                  background: active ? s.primaryDark : '#fff',
                  flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginTop: 2,
                }}>
                  {active && (
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', background: '#fff',
                    }} />
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: s.dark, marginBottom: 2 }}>
                    {opt.icon} {opt.label}
                    {opt.key === 'auto' && (
                      <span style={{
                        background: s.primary, color: s.dark,
                        padding: '1px 8px', borderRadius: 999,
                        fontSize: 10, fontWeight: 700, marginLeft: 8,
                      }}>{lang === 'bm' ? 'DEFAULT' : 'DEFAULT'}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: s.gray, lineHeight: 1.5 }}>
                    {lang === 'bm' ? opt.descBm : opt.descEn}
                  </div>
                </div>
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
            {expires && (
              <div style={{ fontSize: 12, color: s.gray }}>
                Expires: {expires.toLocaleDateString()}
              </div>
            )}
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

function Card({ title, children, tokens: s }: {
  title: string
  children: React.ReactNode
  tokens: any
}) {
  return (
    <section style={{
      background: '#fff', borderRadius: 18, padding: 20,
      border: `1px solid ${s.border}`, marginBottom: 14,
    }}>
      <h2 style={{
        fontSize: 14, color: s.gray, margin: '0 0 12px',
        fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase',
      }}>
        {title}
      </h2>
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
