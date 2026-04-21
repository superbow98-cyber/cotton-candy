'use client'
import React, { useState } from 'react'
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

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const { t } = useLang()
  const { tokens: s } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const [drawer, setDrawer] = useState(false)

  const signOut = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    router.replace('/')
  }

  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname?.startsWith(href)

  return (
    <div style={{ minHeight: '100vh', background: s.cream }}>
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

      <header className="flex md:hidden" style={{
        position: 'sticky', top: 0, zIndex: 30,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', background: '#fff',
        borderBottom: `1px solid ${s.border}`,
      }}>
        <Logo size={26} />
        <button onClick={() => setDrawer(true)} style={{
          border: 'none', background: 'transparent', fontSize: 24, cursor: 'pointer',
        }}>☰</button>
      </header>

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
      }}>
        {children}
      </main>

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
    </div>
  )
}
