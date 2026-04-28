'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { Icon } from '@/components/ui/Icon'

type NavItem = {
  href: string
  key: 'dashHome' | 'dashLectures' | 'dashNotebooks' | 'dashSettings'
  icon: keyof typeof Icon
}

const NAV: NavItem[] = [
  { href: '/dashboard',            key: 'dashHome',      icon: 'Home' },
  { href: '/dashboard/lectures',   key: 'dashLectures',  icon: 'Mic' },
  { href: '/dashboard/notebooks',  key: 'dashNotebooks', icon: 'Notebook' },
  { href: '/dashboard/settings',   key: 'dashSettings',  icon: 'Settings' },
]

const HIDE_UPGRADE_ON = ['/pricing', '/checkout']

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t, lang } = useLang()
  const { tokens: s } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const [drawer, setDrawer] = useState(false)
  const [plan, setPlan] = useState<string | null>(null)
  const [planLoaded, setPlanLoaded] = useState(false)
  const [fullName, setFullName] = useState<string>('')
  const [email, setEmail] = useState<string>('')

  useEffect(() => {
    (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setPlanLoaded(true); return }
        setEmail(user.email || '')
        const { data } = await sb.from('profiles')
          .select('plan, plan_expires_at, full_name')
          .eq('id', user.id).maybeSingle()
        if (data) {
          setFullName(data.full_name || '')
          const isExpired = data.plan_expires_at && new Date(data.plan_expires_at) < new Date()
          setPlan((data.plan === 'free' || isExpired) ? 'free' : data.plan)
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

  const hideUpgrade = !!pathname && HIDE_UPGRADE_ON.some((p) => pathname.startsWith(p))
  const showUpgrade = planLoaded && plan !== 'year' && !hideUpgrade

  const initials = (fullName || email || 'U')
    .split(/\s+/).map(s => s[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()

  const planLabels: Record<string, string> = {
    free: lang === 'bm' ? 'Percuma' : 'Free',
    day: lang === 'bm' ? 'Day Pass' : 'Day Pass',
    month: lang === 'bm' ? 'Bulanan' : 'Monthly',
    year: lang === 'bm' ? 'Tahunan' : 'Yearly',
  }

  const NavLink = ({ item, onClick }: { item: NavItem; onClick?: () => void }) => {
    const active = isActive(item.href)
    const IconComp = Icon[item.icon]
    return (
      <Link
        href={item.href}
        onClick={onClick}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px',
          borderRadius: 8,
          fontSize: 13, fontWeight: 500,
          letterSpacing: '-0.005em',
          color: active ? '#1d1d1f' : 'rgba(29,29,31,0.7)',
          background: active ? 'rgba(0,0,0,0.055)' : 'transparent',
          textDecoration: 'none',
          transition: 'background 0.15s',
        }}
      >
        <span style={{
          color: active ? '#1d1d1f' : 'rgba(29,29,31,0.55)',
          display: 'inline-flex',
        }}>
          <IconComp size={16} />
        </span>
        {t(item.key)}
      </Link>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#fafafb' }}>
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex" style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 220,
        background: 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRight: '0.5px solid rgba(0,0,0,0.06)',
        flexDirection: 'column',
        padding: '20px 14px',
        zIndex: 20,
        gap: 1,
      }}>
        {/* Logo */}
        <Link href="/dashboard" style={{
          display: 'flex', alignItems: 'center', gap: 9,
          padding: '4px 10px 20px',
          fontWeight: 600, fontSize: 15,
          letterSpacing: '-0.02em', color: '#1d1d1f',
          textDecoration: 'none',
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%',
            background: `radial-gradient(circle at 30% 28%, ${s.primary} 0%, ${s.primaryDark} 55%, ${s.dark} 100%)`,
            flexShrink: 0,
          }} />
          Cotton Candy
        </Link>

        {/* Nav */}
        {NAV.map((n) => <NavLink key={n.href} item={n} />)}

        <div style={{ flex: 1 }} />

        {/* Upgrade card */}
        {showUpgrade && (
          <div style={{
            margin: '8px 0 10px',
            padding: 12,
            background: '#1d1d1f',
            borderRadius: 12,
            color: '#fff',
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '-0.015em', marginBottom: 2 }}>
              {lang === 'bm' ? 'Nota tanpa had' : 'Unlimited notes'}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.4, marginBottom: 10 }}>
              {lang === 'bm' ? 'Monthly RM19 · bayaran sekali' : 'Monthly RM19 · one-time payment'}
            </div>
            <Link href="/#pricing" style={{
              display: 'block', textAlign: 'center',
              padding: '7px 10px',
              background: '#fff', color: '#1d1d1f',
              borderRadius: 100, textDecoration: 'none',
              fontSize: 11.5, fontWeight: 500, letterSpacing: '-0.01em',
            }}>
              {lang === 'bm' ? 'Upgrade sekarang' : 'Upgrade now'}
            </Link>
          </div>
        )}

        {/* Account footer */}
        <button onClick={signOut} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: 10, borderRadius: 8,
          border: 'none', background: 'transparent',
          cursor: 'pointer', width: '100%',
          borderTop: '0.5px solid rgba(0,0,0,0.06)',
          marginTop: 6, paddingTop: 12,
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: '#1d1d1f', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 600, letterSpacing: '-0.02em',
            flexShrink: 0,
          }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#1d1d1f', lineHeight: 1.2 }}>
              {fullName || (lang === 'bm' ? 'Pengguna' : 'You')}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.5)' }}>
              {planLabels[plan || 'free']} {lang === 'bm' ? '· log keluar' : '· sign out'}
            </div>
          </div>
        </button>
      </aside>

      {/* MOBILE TOP HEADER */}
      <header className="flex md:hidden" style={{
        position: 'sticky', top: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '0.5px solid rgba(0,0,0,0.06)',
        gap: 8,
      }}>
        <Link href="/dashboard" style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em',
          color: '#1d1d1f', textDecoration: 'none',
        }}>
          <span style={{
            width: 20, height: 20, borderRadius: '50%',
            background: `radial-gradient(circle at 30% 28%, ${s.primary} 0%, ${s.primaryDark} 55%, ${s.dark} 100%)`,
          }} />
          Cotton Candy
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {showUpgrade && (
            <Link href="/#pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '6px 12px',
              borderRadius: 100,
              background: '#1d1d1f', color: '#fff',
              fontSize: 12, fontWeight: 500,
              letterSpacing: '-0.01em', textDecoration: 'none',
            }}>
              {lang === 'bm' ? 'Upgrade' : 'Upgrade'}
            </Link>
          )}
          <button onClick={() => setDrawer(true)} style={{
            width: 34, height: 34, borderRadius: 8,
            border: '0.5px solid rgba(0,0,0,0.08)',
            background: '#fff', cursor: 'pointer', padding: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(29,29,31,0.7)',
          }}>
            <Icon.Hamburger size={16} />
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER */}
      {drawer && (
        <>
          <div onClick={() => setDrawer(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 40,
          }} />
          <aside style={{
            position: 'fixed', right: 0, top: 0, bottom: 0, width: 280, zIndex: 50,
            background: '#fff', padding: '20px 14px',
            display: 'flex', flexDirection: 'column',
            animation: 'cc-slide-in 0.25s ease-out',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '0 10px' }}>
              <div style={{ fontWeight: 600, fontSize: 15, letterSpacing: '-0.02em' }}>Cotton Candy</div>
              <button onClick={() => setDrawer(false)} style={{
                width: 30, height: 30, borderRadius: 8,
                border: 'none', background: 'transparent',
                cursor: 'pointer', color: 'rgba(29,29,31,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon.X size={16} />
              </button>
            </div>
            {NAV.map((n) => <NavLink key={n.href} item={n} onClick={() => setDrawer(false)} />)}

            <div style={{ flex: 1 }} />

            {showUpgrade && (
              <div style={{
                margin: '8px 0', padding: 14,
                background: '#1d1d1f', borderRadius: 12,
                color: '#fff', textAlign: 'center',
              }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                  {lang === 'bm' ? 'Nota tanpa had' : 'Unlimited notes'}
                </div>
                <div style={{ fontSize: 11, opacity: 0.6, marginBottom: 10 }}>
                  {lang === 'bm' ? 'Dari RM19 · bayaran sekali' : 'From RM19 · one-time payment'}
                </div>
                <Link href="/#pricing" onClick={() => setDrawer(false)} style={{
                  display: 'block', padding: '8px 12px',
                  background: '#fff', color: '#1d1d1f',
                  borderRadius: 100, textDecoration: 'none',
                  fontSize: 12, fontWeight: 500,
                }}>
                  {lang === 'bm' ? 'Upgrade sekarang' : 'Upgrade now'}
                </Link>
              </div>
            )}

            <button onClick={signOut} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: 10, borderRadius: 8,
              border: 'none', background: 'transparent',
              cursor: 'pointer', width: '100%',
              borderTop: '0.5px solid rgba(0,0,0,0.06)', paddingTop: 12,
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: '#1d1d1f', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 600,
              }}>{initials}</div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#1d1d1f' }}>
                  {fullName || 'You'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.5)' }}>
                  {planLabels[plan || 'free']} · {lang === 'bm' ? 'log keluar' : 'sign out'}
                </div>
              </div>
            </button>
          </aside>
        </>
      )}

      {/* MAIN */}
      <main className="md:ml-[220px]" style={{
        minHeight: '100vh',
        padding: 'clamp(16px, 3vw, 32px)',
        paddingBottom: 100,
      }}>
        {children}
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="flex md:hidden" style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 25,
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '0.5px solid rgba(0,0,0,0.06)',
        padding: '6px 4px 10px',
        display: 'flex', justifyContent: 'space-around',
      }}>
        {NAV.map((n) => {
          const active = isActive(n.href)
          const IconComp = Icon[n.icon]
          return (
            <Link key={n.href} href={n.href} style={{
              flex: 1, textAlign: 'center', padding: '6px 0',
              color: active ? '#1d1d1f' : 'rgba(29,29,31,0.55)',
              fontWeight: active ? 600 : 500, fontSize: 10.5,
              letterSpacing: '-0.005em',
              textDecoration: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
            }}>
              <IconComp size={18} />
              {t(n.key)}
            </Link>
          )
        })}
      </nav>

      <style jsx>{`
        @keyframes cc-slide-in {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  )
}
