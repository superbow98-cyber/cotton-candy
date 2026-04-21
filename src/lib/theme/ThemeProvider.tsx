'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Theme, ThemeTokens } from '@/types'
import { THEMES, getTheme } from '@/types'
import { createClient } from '@/lib/supabase/client'

type Ctx = {
  theme: Theme
  tokens: ThemeTokens
  setTheme: (t: Theme) => void
  showPicker: boolean
  setShowPicker: (v: boolean) => void
}
const ThemeCtx = createContext<Ctx>({
  theme: 'pink',
  tokens: THEMES.pink,
  setTheme: () => {},
  showPicker: false,
  setShowPicker: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('pink')
  const [showPicker, setShowPicker] = useState(false)
  const [ready, setReady] = useState(false)

  // Load saved theme — first from localStorage (instant), then from DB (authoritative)
  useEffect(() => {
    try {
      const local = localStorage.getItem('cc:theme') as Theme | null
      if (local && THEMES[local]) setThemeState(local)
    } catch {}

    ;(async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) {
        const { data } = await sb.from('profiles').select('theme').eq('id', user.id).maybeSingle()
        if (data?.theme && THEMES[data.theme as Theme]) {
          setThemeState(data.theme as Theme)
          try { localStorage.setItem('cc:theme', data.theme) } catch {}
        } else {
          // new user — show picker on first login
          setShowPicker(true)
        }
      }
      setReady(true)
    })()
  }, [])

  // Inject CSS variables on :root whenever theme changes
  useEffect(() => {
    const tk = getTheme(theme)
    const root = document.documentElement
    root.style.setProperty('--primary', tk.primary)
    root.style.setProperty('--primary-dark', tk.primaryDark)
    root.style.setProperty('--accent', tk.accent)
    root.style.setProperty('--cream', tk.cream)
    root.style.setProperty('--soft', tk.soft)
    root.style.setProperty('--dark', tk.dark)
    root.style.setProperty('--gray', tk.gray)
    root.style.setProperty('--border', tk.border)
    document.body.style.background = tk.cream
    document.body.style.color = tk.dark
  }, [theme])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    try { localStorage.setItem('cc:theme', t) } catch {}
    ;(async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user) await sb.from('profiles').update({ theme: t }).eq('id', user.id)
    })()
  }

  return (
    <ThemeCtx.Provider value={{ theme, tokens: getTheme(theme), setTheme, showPicker, setShowPicker }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeCtx)
}
