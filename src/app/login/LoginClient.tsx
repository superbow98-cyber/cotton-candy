'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import LangToggle from '@/components/ui/LangToggle'
import { useLang } from '@/lib/i18n/LangProvider'
import { createClient } from '@/lib/supabase/client'

export default function LoginClient() {
  const { t, lang } = useLang()
  const params = useSearchParams()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'sent' | 'err'>('idle')

  // `/login?next=...` was accepted here but never actually forwarded into
  // the Supabase redirect — /auth/callback DOES read `next` and redirect
  // there, so the only missing link was passing it through. This matters
  // for /promo-code share links: /checkout redirects unauthenticated
  // visitors to /login?next=/checkout?plan=X&promo=CODE, and without this
  // the promo code was silently dropped after login.
  const next = params.get('next')
  const callbackUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`

  const submit = async () => {
    if (!email) return
    setLoading(true)
    setStatus('idle')
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callbackUrl,
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
          redirectTo: callbackUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error
    } catch (e) {
      console.error(e)
      setStatus('err')
      setGoogleLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, #FAFAFA 0%, #F4F4F5 100%)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
    }}>
      {/* Top nav */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px clamp(16px, 5vw, 48px)',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <img src="/cc-logo.png" alt="Cotton Candy" width={32} height={32} style={{ borderRadius: 8 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.01em' }}>Cotton Candy</span>
        </Link>
        <LangToggle compact />
      </nav>

      {/* Main */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px 16px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>
          {/* Login card */}
          <div style={{
            background: '#fff',
            borderRadius: 20,
            padding: '36px 32px',
            border: '1px solid #E5E5E7',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.04)',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <img
                src="/cc-logo.png"
                alt="Cotton Candy"
                width={64}
                height={64}
                style={{
                  borderRadius: 16,
                  boxShadow: '0 4px 12px rgba(200, 168, 233, 0.3)',
                }}
              />
            </div>

            {/* Heading */}
            <h1 style={{
              fontSize: 24, fontWeight: 500, color: '#1d1d1f',
              textAlign: 'center', margin: '0 0 6px',
              letterSpacing: '-0.02em',
            }}>
              {lang === 'bm' ? 'Selamat datang ke Cotton Candy' : 'Welcome to Cotton Candy'}
            </h1>
            <p style={{
              fontSize: 13, color: '#6B6B70',
              textAlign: 'center', margin: '0 0 28px',
              lineHeight: 1.5,
            }}>
              {lang === 'bm'
                ? <>Transkripsi kuliah berkuasa AI<br />untuk pelajar Malaysia</>
                : <>AI-powered lecture transcription<br />for Malaysian students</>}
            </p>

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
                padding: 12,
                border: '1px solid #E5E5E7',
                borderRadius: 10,
                background: '#fff',
                fontSize: 14,
                fontWeight: 500,
                color: '#1d1d1f',
                cursor: (googleLoading || loading) ? 'not-allowed' : 'pointer',
                opacity: (googleLoading || loading) ? 0.6 : 1,
                marginBottom: 16,
                fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!googleLoading && !loading) e.currentTarget.style.background = '#F8F8F8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              {googleLoading
                ? (lang === 'bm' ? 'Menyambung…' : 'Connecting…')
                : (lang === 'bm' ? 'Teruskan dengan Google' : 'Continue with Google')}
            </button>

            {/* Divider */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              margin: '18px 0', color: '#A1A1A6', fontSize: 11,
            }}>
              <div style={{ flex: 1, height: 1, background: '#E5E5E7' }} />
              <span style={{ textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 500 }}>
                {lang === 'bm' ? 'atau dengan emel' : 'or with email'}
              </span>
              <div style={{ flex: 1, height: 1, background: '#E5E5E7' }} />
            </div>

            {/* Email field */}
            <label style={{
              display: 'block', fontSize: 12, fontWeight: 500,
              color: '#1d1d1f', marginBottom: 6,
            }}>
              {lang === 'bm' ? 'Alamat emel' : 'Email address'}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              disabled={googleLoading}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 10,
                border: '1px solid #E5E5E7',
                background: '#fff',
                fontSize: 13,
                marginBottom: 14,
                boxSizing: 'border-box',
                color: '#1d1d1f',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#C8A8E9')}
              onBlur={(e) => (e.target.style.borderColor = '#E5E5E7')}
            />

            {/* Magic link button */}
            <button
              onClick={submit}
              disabled={loading || googleLoading || !email}
              style={{
                width: '100%',
                padding: 12,
                background: 'linear-gradient(135deg, #F8B4D9 0%, #C8A8E9 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontSize: 14,
                fontWeight: 600,
                cursor: (loading || googleLoading || !email) ? 'not-allowed' : 'pointer',
                letterSpacing: '-0.01em',
                boxShadow: '0 2px 8px rgba(200, 168, 233, 0.25)',
                opacity: (loading || googleLoading || !email) ? 0.5 : 1,
                fontFamily: 'inherit',
                transition: 'opacity 0.15s',
              }}
            >
              {loading
                ? (lang === 'bm' ? 'Menghantar…' : 'Sending…')
                : (lang === 'bm' ? 'Hantar pautan ajaib' : 'Send magic link')}
            </button>

            {/* Status messages */}
            {status === 'sent' && (
              <div style={{
                marginTop: 14, padding: 10,
                background: '#E8F5EA', color: '#3B7B48',
                borderRadius: 10, fontSize: 12.5, textAlign: 'center',
              }}>
                ✓ {lang === 'bm' ? 'Pautan dihantar. Semak emel anda.' : 'Magic link sent. Check your email.'}
              </div>
            )}
            {status === 'err' && (
              <div style={{
                marginTop: 14, padding: 10,
                background: '#FDE8E8', color: '#B94141',
                borderRadius: 10, fontSize: 12.5, textAlign: 'center',
              }}>
                {lang === 'bm' ? 'Ralat. Cuba lagi.' : 'Error. Please try again.'}
              </div>
            )}

            {/* Footer */}
            <div style={{
              textAlign: 'center', marginTop: 22,
              fontSize: 11, color: '#A1A1A6', lineHeight: 1.6,
            }}>
              {lang === 'bm' ? 'Dengan meneruskan, anda bersetuju dengan' : 'By continuing you agree to our'}<br />
              <Link href="/terms" style={{ color: '#1d1d1f', textDecoration: 'none', fontWeight: 500 }}>
                {lang === 'bm' ? 'Terma Perkhidmatan' : 'Terms of Service'}
              </Link>
              {' & '}
              <Link href="/privacy" style={{ color: '#1d1d1f', textDecoration: 'none', fontWeight: 500 }}>
                {lang === 'bm' ? 'Dasar Privasi' : 'Privacy Policy'}
              </Link>
            </div>
          </div>

          {/* Trust signals */}
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 18,
            marginTop: 20, fontSize: 11, color: '#6B6B70',
            flexWrap: 'wrap',
          }}>
            <span>🔒 {lang === 'bm' ? 'Selamat' : 'Secure'}</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>🇲🇾 {lang === 'bm' ? 'Buatan Malaysia' : 'Made in Malaysia'}</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>⚡ {lang === 'bm' ? 'Cepat & mudah' : 'Fast setup'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
