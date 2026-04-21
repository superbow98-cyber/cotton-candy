'use client'
import React from 'react'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { useLang } from '@/lib/i18n/LangProvider'
import { THEMES, type Theme } from '@/types'

export default function ThemePicker({ force = false }: { force?: boolean }) {
  const { theme, setTheme, showPicker, setShowPicker } = useTheme()
  const { lang } = useLang()
  const open = force || showPicker
  if (!open) return null

  const title = lang === 'bm' ? 'Pilih tema anda' : 'Pick your vibe'
  const sub   = lang === 'bm'
    ? 'Boleh tukar bila-bila masa dalam Tetapan.'
    : 'Change anytime in Settings.'

  const choose = (t: Theme) => {
    setTheme(t)
    setShowPicker(false)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        background: 'var(--cream, #FFF6F8)',
        borderRadius: 24,
        padding: 28,
        maxWidth: 440, width: '100%',
        boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
        animation: 'fade-in 0.25s ease-out',
      }}>
        <h2 style={{
          fontFamily: 'Georgia, serif',
          fontSize: 22,
          margin: '0 0 4px',
          color: 'var(--dark, #2B1B24)',
          textAlign: 'center',
          fontWeight: 500,
        }}>{title}</h2>
        <p style={{
          fontSize: 13,
          color: 'var(--gray, #6B5560)',
          margin: '0 0 20px',
          textAlign: 'center',
        }}>{sub}</p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 10,
        }}>
          {(Object.keys(THEMES) as Theme[]).map((key) => {
            const tk = THEMES[key]
            const active = theme === key
            return (
              <button
                key={key}
                onClick={() => choose(key)}
                style={{
                  background: tk.cream,
                  border: `2px solid ${active ? tk.primaryDark : tk.border}`,
                  borderRadius: 16,
                  padding: 16,
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'transform 0.08s',
                  outline: 'none',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: tk.primary, border: `2px solid ${tk.primaryDark}`,
                  margin: '0 auto 8px',
                }} />
                <div style={{ fontWeight: 500, fontSize: 14, color: tk.dark }}>
                  {tk.emoji} {tk.label}
                </div>
                <div style={{ fontSize: 11, color: tk.gray, marginTop: 2 }}>
                  {tk.sub}
                </div>
              </button>
            )
          })}
        </div>

        {force && (
          <button
            onClick={() => setShowPicker(false)}
            style={{
              marginTop: 18, width: '100%',
              padding: 10, border: 'none', background: 'transparent',
              color: 'var(--gray, #6B5560)', fontSize: 13, cursor: 'pointer',
            }}
          >{lang === 'bm' ? 'Tutup' : 'Close'}</button>
        )}
      </div>
    </div>
  )
}
