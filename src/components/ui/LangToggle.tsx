'use client'
import React from 'react'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'

export default function LangToggle({ compact = false }: { compact?: boolean }) {
  const { lang, setLang } = useLang()
  const { tokens: s } = useTheme()
  const pill = (code: 'en' | 'bm', label: string) => (
    <button
      onClick={() => setLang(code)}
      style={{
        padding: compact ? '4px 10px' : '6px 14px',
        borderRadius: 999,
        border: 'none',
        background: lang === code ? s.primary : 'transparent',
        color: lang === code ? s.dark : s.gray,
        fontWeight: 700,
        fontSize: compact ? 11 : 12,
        cursor: 'pointer',
        transition: 'background 0.2s',
      }}
    >
      {label}
    </button>
  )
  return (
    <div style={{
      display: 'inline-flex',
      background: s.soft,
      borderRadius: 999,
      padding: 3,
      border: `1px solid ${s.border}`,
    }}>
      {pill('en', 'EN')}
      {pill('bm', 'BM')}
    </div>
  )
}
