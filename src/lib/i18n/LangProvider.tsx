'use client'
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Lang } from '@/types'
import { t as tr, type TKey } from './translations'

type Ctx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: TKey, vars?: Record<string, string | number>) => string
}
const LangCtx = createContext<Ctx>({
  lang: 'en',
  setLang: () => {},
  t: (k) => String(k),
})

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en')

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cc:lang') as Lang | null
      if (saved === 'en' || saved === 'bm') setLangState(saved)
    } catch {}
  }, [])

  const setLang = (l: Lang) => {
    setLangState(l)
    try { localStorage.setItem('cc:lang', l) } catch {}
  }

  const t = (key: TKey, vars?: Record<string, string | number>) => tr(lang, key, vars)

  return (
    <LangCtx.Provider value={{ lang, setLang, t }}>
      {children}
    </LangCtx.Provider>
  )
}

export function useLang() {
  return useContext(LangCtx)
}
