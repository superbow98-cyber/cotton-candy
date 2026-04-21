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

export default function SettingsPage() {
  const { t, lang } = useLang()
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

  const plan = profile?.plan ? PLANS[profile.plan] : PLANS.free
  const expires = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(24px, 4vw, 34px)', marginBottom: 24 }}>
        {t('setTitle')}
      </h1>

      <Card title="Account">
        <Row label="Email" value={profile?.email || '—'} />
        <Row label="Joined" value={profile ? new Date(profile.created_at).toLocaleDateString() : '—'} />
      </Card>

      <Card title={lang === 'bm' ? 'Tema' : 'Theme'}>
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

      <Card title={t('setLang')}>
        <LangToggle />
      </Card>

      <Card title={t('setPlan')}>
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

      <Card title={t('setDanger')}>
        <Button variant="outline" onClick={signOut}>{t('setSignOut')}</Button>
      </Card>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  const { tokens: s } = useTheme()
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

function Row({ label, value }: { label: string; value: string }) {
  const { tokens: s } = useTheme()
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 14 }}>
      <span style={{ color: s.gray }}>{label}</span>
      <span style={{ fontWeight: 500 }}>{value}</span>
    </div>
  )
}
