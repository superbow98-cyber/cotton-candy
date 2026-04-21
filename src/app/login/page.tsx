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
  const { t, lang } = useLang()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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

  const googleSignIn = async () => {
    setGoogleLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error
      // OAuth redirects to Google, no need to handle success here
    } catch (e) {
      console.error(e)
      setStatus('err')
      setGoogleLoading(false)
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
          <p style={{ margin: '0 0 24px', color: s.gray, fontSize: 14 }}>{t('loginSub')}</p>

          {/* Google button */}
          <button
            onClick={googleSignIn}
            disabled={googleLoading || loading}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              padding: '13px 16px',
              border: `1.5px solid ${s.border}`,
              borderRadius: 14,
              background: '#fff',
              cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer',
              fontSize: 15,
              fontWeight: 500,
              color: s.dark,
              opacity: (googleLoading || loading) ? 0.6 : 1,
              transition: 'all 0.15s',
              marginBottom: 16,
            }}
            onMouseEnter={(e) => !googleLoading && !loading && (e.currentTarget.style.background = s.soft)}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
          >
            {/* Google G logo (SVG inline) */}
            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            {googleLoading
              ? (lang === 'bm' ? 'Menyambung…' : 'Connecting…')
              : (lang === 'bm' ? 'Teruskan dengan Google' : 'Continue with Google')}
          </button>

          {/* OR divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            margin: '14px 0',
            color: s.gray,
            fontSize: 12,
          }}>
            <div style={{ flex: 1, height: 1, background: s.border }} />
            <span>{lang === 'bm' ? 'atau' : 'or'}</span>
            <div style={{ flex: 1, height: 1, background: s.border }} />
          </div>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('loginPlaceholder')}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            disabled={googleLoading}
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
            disabled={loading || googleLoading || !email}
            size="lg"
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
