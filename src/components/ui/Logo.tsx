'use client'
import React from 'react'
import { useTheme } from '@/lib/theme/ThemeProvider'

export default function Logo({ size = 32, withText = true }: { size?: number; withText?: boolean }) {
  const { tokens: s } = useTheme()
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <rect x="22.5" y="28" width="3" height="18" rx="1.5" fill={s.dark} />
        <circle cx="16" cy="20" r="10" fill={s.primary} />
        <circle cx="28" cy="16" r="11" fill={s.primaryDark} />
        <circle cx="34" cy="24" r="9" fill={s.primary} />
        <circle cx="22" cy="26" r="8" fill={s.primaryDark} />
        <circle cx="12" cy="14" r="1.2" fill="#fff" opacity="0.9" />
        <circle cx="31" cy="11" r="1" fill="#fff" opacity="0.9" />
      </svg>
      {withText && (
        <span style={{
          fontFamily: 'Georgia, serif',
          fontSize: size * 0.58,
          fontWeight: 700,
          color: s.dark,
          letterSpacing: -0.3,
        }}>
          Cotton Candy
        </span>
      )}
    </span>
  )
}
