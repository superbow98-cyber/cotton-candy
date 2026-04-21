'use client'
import { useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'
import LangToggle from '@/components/ui/LangToggle'
import { useLang } from '@/lib/i18n/LangProvider'
import { createClient } from '@/lib/supabase/client'
import { s } from '@/types'

export default function LoginPage() {
  const { t } = useLang()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sent' | 'err'>('idle')

  const submit = async () => {
    if (!email) return
    setLoading(true)
    setStatus('idle')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
      setStatus('sent')
    } catch (e) {
      console.error(e)
      setStatus('err')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: s.cream,
      display: 'flex', flexDirection: 'column',
    }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px clamp(16px, 5vw, 48px)',
      }}>
        <Link href="/"><Logo /></Link>
        <LangToggle compact />
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{
          background: '#fff', borderRadius: 28, padding: 36,
          maxWidth: 420, width: '100%',
          border: `1px solid ${s.border}`,
          boxShadow: '0 20px 50px rgba(255,143,168,0.15)',
        }}>
          <h1 style={{
            fontFamily: 'Georgia, serif', fontSize: 28,
            margin: '0 0 8px', color: s.dark,
          }}>{t('loginTitle')}</h1>
          <p style={{ margin: '0 0 26px', color: s.gray, fontSize: 14 }}>{t('loginSub')}</p>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('loginPlaceholder')}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            style={{
              width: '100%', padding: '14px 16px',
              borderRadius: 14, border: `1.5px solid ${s.border}`,
              fontSize: 15, outline: 'none',
              background: s.soft, marginBottom: 14,
            }}
            onFocus={(e) => (e.target.style.borderColor = s.primaryDark)}
            onBlur={(e) => (e.target.style.borderColor = s.border)}
          />

          <Button
            onClick={submit}
            disabled={loading || !email}
            size="lg"
            className="w-full"
            style={{ width: '100%' }}
          >
            {loading ? t('loginSending') : t('loginSend')}
          </Button>

          {status === 'sent' && (
            <p style={{
              marginTop: 16, padding: 12, background: '#E8F5EA',
              color: '#3B7B48', borderRadius: 12, fontSize: 13,
            }}>✓ {t('loginSent')}</p>
          )}
          {status === 'err' && (
            <p style={{
              marginTop: 16, padding: 12, background: '#FDE8E8',
              color: '#B94141', borderRadius: 12, fontSize: 13,
            }}>{t('loginErr')}</p>
          )}
        </div>
      </div>
    </div>
  )
}
