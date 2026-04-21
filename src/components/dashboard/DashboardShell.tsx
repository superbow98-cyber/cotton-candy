'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Logo from '@/components/ui/Logo'
import LangToggle from '@/components/ui/LangToggle'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/dashboard',            key: 'dashHome',      icon: '🏠' },
  { href: '/dashboard/lectures',   key: 'dashLectures',  icon: '🎙️' },
  { href: '/dashboard/notebooks',  key: 'dashNotebooks', icon: '📘' },
  { href: '/dashboard/settings',   key: 'dashSettings',  icon: '⚙️' },
] as const

// Hide upgrade UI on these pages to avoid annoying repetition on pricing flow
const HIDE_UPGRADE_ON = ['/pricing', '/checkout']

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t, lang } = useLang()
  const { tokens: s } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const [drawer, setDrawer] = useState(false)

  // Track user plan to decide whether to show upgrade UI
  const [plan, setPlan] = useState<string | null>(null)
  const [planLoaded, setPlanLoaded] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setPlanLoaded(true); return }
        const { data } = await sb.from('profiles')
          .select('plan, plan_expires_at')
          .eq('id', user.id)
          .maybeSingle()
        if (data) {
          // Consider expired paid plans as 'free'
          const isExpired = data.plan_expires_at && new Date(data.plan_expires_at) < new Date()
          const effectivePlan = (data.plan === 'free' || isExpired) ? 'free' : data.plan
          setPlan(effectivePlan)
        } else {
          setPlan('free')
        }
      } catch {
        setPlan('free')
      } finally {
        setPlanLoaded(true)
      }
    })()
  }, [pathname])

  const signOut = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    router.replace('/')
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(href)

  // Show upgrade UI only when: user plan is known AND is 'free' AND not on pricing/checkout
  const hideUpgrade = !!pathname && HIDE_UPGRADE_ON.some((p) => pathname.startsWith(p))
  const showUpgrade = planLoaded && plan === 'free' && !hideUpgrade

  return (
    <div style={{ minHeight: '100vh', background: s.cream }}>
      {/* =========== DESKTOP SIDEBAR =========== */}
      <aside className="hidden md:flex" style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 240,
        background: '#fff', borderRight: `1px solid ${s.border}`,
        flexDirection: 'column', padding: '22px 18px', zIndex: 20,
      }}>
        <div style={{ marginBottom: 30 }}><Logo size={28} /></div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 12,
              background: isActive(n.href) ? s.primary : 'transparent',
              color: isActive(n.href) ? s.dark : s.gray,
              fontWeight: isActive(n.href) ? 700 : 500, fontSize: 14,
              transition: 'background 0.15s',
            }}>
              <span style={{ fontSize: 18 }}>{n.icon}</span>
              {t(n.key as any)}
            </Link>
          ))}
        </nav>

        {/* OPTION C — Sidebar upgrade card (desktop only, free plan only) */}
        {showUpgrade && (
          <div className="fade-in" style={{
            marginBottom: 12,
            padding: 14,
            background: `linear-gradient(135deg, ${s.primary}, ${s.primaryDark})`,
            borderRadius: 14,
            color: '#fff',
            textAlign: 'center',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 4px 14px rgba(212,83,126,0.25)',
          }}>
            <div style={{
              fontSize: 15, fontWeight: 700, marginBottom: 3,
              letterSpacing: -0.3, color: '#fff',
            }}>
              {lang === 'bm' ? 'Nota tanpa had' : 'Unlimited notes'}
            </div>
            <div style={{
              fontSize: 11, opacity: 0.95, marginBottom: 10,
              lineHeight: 1.4, letterSpacing: -0.05, color: '#fff',
            }}>
              {lang === 'bm'
                ? 'Langgan Monthly RM19 untuk nota tanpa had.'
                : 'Go Monthly RM19 — no 3-lecture limit.'}
            </div>
            <Link href="/pricing" style={{
              display: 'block',
              padding: '7px 12px',
              background: '#fff',
              color: s.primaryDark,
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              letterSpacing: -0.1,
            }}>
              {lang === 'bm' ? 'Upgrade sekarang' : 'Upgrade now'}
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <LangToggle compact />
          <button onClick={signOut} style={{
            padding: '10px 14px', borderRadius: 12,
            background: s.soft, color: s.dark, border: 'none',
            fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'left',
          }}>
            ← {t('dashSignOut')}
          </button>
        </div>
      </aside>

      {/* =========== MOBILE TOP HEADER =========== */}
      <header className="flex md:hidden" style={{
        position: 'sticky', top: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: '#fff',
        borderBottom: `1px solid ${s.border}`, gap: 8,
      }}>
        <Logo size={26} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* OPTION A — Topbar upgrade pill (mobile, free only) */}
          {showUpgrade && (
            <Link href="/pricing" className="fade-in" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px 6px 10px',
              borderRadius: 999,
              background: `linear-gradient(135deg, ${s.primary}, ${s.primaryDark})`,
              color: '#fff',
              fontSize: 12, fontWeight: 700,
              letterSpacing: -0.1,
              textDecoration: 'none',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.35), 0 2px 8px rgba(212,83,126,0.25)',
            }}>
              <StarIcon size={11} />
              {lang === 'bm' ? 'Upgrade' : 'Upgrade'}
            </Link>
          )}
          <button onClick={() => setDrawer(true)} style={{
            border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer',
          }}>☰</button>
        </div>
      </header>

      {/* =========== MOBILE DRAWER =========== */}
      {drawer && (
        <>
          <div onClick={() => setDrawer(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40,
          }} />
          <aside className="fade-in" style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: 270, zIndex: 50,
            background: '#fff', padding: '22px 18px',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <Logo size={26} />
              <button onClick={() => setDrawer(false)} style={{
                border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer',
              }}>✕</button>
            </div>
            <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} onClick={() => setDrawer(false)} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', borderRadius: 12,
                  background: isActive(n.href) ? s.primary : 'transparent',
                  color: isActive(n.href) ? s.dark : s.gray,
                  fontWeight: isActive(n.href) ? 700 : 500, fontSize: 14,
                }}>
                  <span style={{ fontSize: 18 }}>{n.icon}</span>
                  {t(n.key as any)}
                </Link>
              ))}
            </nav>

            {/* Drawer upgrade card (mobile drawer, free only) */}
            {showUpgrade && (
              <div style={{
                marginBottom: 12, padding: 14,
                background: `linear-gradient(135deg, ${s.primary}, ${s.primaryDark})`,
                borderRadius: 14, color: '#fff', textAlign: 'center',
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)',
              }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>
                  {lang === 'bm' ? 'Nota tanpa had' : 'Unlimited notes'}
                </div>
                <div style={{ fontSize: 11, opacity: 0.95, marginBottom: 10 }}>
                  {lang === 'bm' ? 'Monthly RM19' : 'From RM19/mo'}
                </div>
                <Link href="/pricing" onClick={() => setDrawer(false)} style={{
                  display: 'block',
                  padding: '7px 12px', background: '#fff',
                  color: s.primaryDark, borderRadius: 999,
                  fontSize: 12, fontWeight: 700, textDecoration: 'none',
                }}>
                  {lang === 'bm' ? 'Upgrade sekarang' : 'Upgrade now'}
                </Link>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <LangToggle compact />
              <button onClick={signOut} style={{
                padding: '10px 14px', borderRadius: 12,
                background: s.soft, color: s.dark, border: 'none',
                fontWeight: 600, fontSize: 13, cursor: 'pointer', textAlign: 'left',
              }}>
                ← {t('dashSignOut')}
              </button>
            </div>
          </aside>
        </>
      )}

      <main className="md:ml-[240px]" style={{
        minHeight: '100vh',
        padding: 'clamp(16px, 4vw, 36px)',
        paddingBottom: 100,
        position: 'relative',
      }}>
        {children}
      </main>

      {/* =========== MOBILE BOTTOM NAV =========== */}
      <nav className="flex md:hidden" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 25,
        background: '#fff', borderTop: `1px solid ${s.border}`,
        padding: '6px 4px 8px', display: 'flex', justifyContent: 'space-around',
      }}>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} style={{
            flex: 1, textAlign: 'center', padding: '6px 0',
            color: isActive(n.href) ? s.primaryDark : s.gray,
            fontWeight: isActive(n.href) ? 700 : 500,
            fontSize: 11,
          }}>
            <div style={{ fontSize: 20 }}>{n.icon}</div>
            {t(n.key as any)}
          </Link>
        ))}
      </nav>

      {/* OPTION B — Floating FAB (both mobile and desktop, free only) */}
      {showUpgrade && <FloatingUpgradeFAB lang={lang} tokens={s} />}
    </div>
  )
}

// --- Star icon (reused) ---
function StarIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" />
    </svg>
  )
}

// --- Floating Action Button (dismissable) ---
function FloatingUpgradeFAB({ lang, tokens: s }: { lang: string; tokens: any }) {
  const [dismissed, setDismissed] = useState(false)

  // Honor session-scoped dismissal (per tab)
  useEffect(() => {
    try {
      if (sessionStorage.getItem('cc:fab-dismissed') === '1') setDismissed(true)
    } catch {}
  }, [])

  if (dismissed) return null

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDismissed(true)
    try { sessionStorage.setItem('cc:fab-dismissed', '1') } catch {}
  }

  return (
    <div className="fade-in" style={{
      position: 'fixed',
      // Desktop: bottom-right. Mobile: sits above bottom nav (~70px) + safe-area.
      bottom: 'max(80px, calc(env(safe-area-inset-bottom, 0px) + 80px))',
      right: 16,
      zIndex: 35,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <Link href="/pricing" style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '11px 18px 11px 14px',
        borderRadius: 999,
        background: `linear-gradient(135deg, ${s.primary}, ${s.primaryDark})`,
        color: '#fff',
        fontSize: 13, fontWeight: 700,
        letterSpacing: -0.1,
        textDecoration: 'none',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4), 0 6px 18px rgba(212,83,126,0.4), 0 2px 6px rgba(212,83,126,0.3)',
      }}>
        <StarIcon size={13} />
        {lang === 'bm' ? 'Upgrade sekarang' : 'Upgrade now'}
      </Link>
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        title={lang === 'bm' ? 'Tutup' : 'Dismiss'}
        style={{
          width: 26, height: 26, borderRadius: '50%',
          background: '#fff', color: s.gray,
          border: `1px solid ${s.border}`,
          fontSize: 13, cursor: 'pointer', padding: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 2px 6px rgba(0,0,0,0.08)',
        }}
      >✕</button>
    </div>
  )
}
