'use client'
import React from 'react'
import { useTheme } from '@/lib/theme/ThemeProvider'

type Variant = 'primary' | 'ghost' | 'dark' | 'outline'
type Size = 'sm' | 'md' | 'lg'

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled,
  type = 'button',
  className = '',
  style = {},
}: {
  children: React.ReactNode
  variant?: Variant
  size?: Size
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
  style?: React.CSSProperties
}) {
  const { tokens: s } = useTheme()

  const base: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontWeight: 700,
    borderRadius: 999,
    border: '2px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'transform 0.06s ease, box-shadow 0.06s ease, background 0.15s ease',
    letterSpacing: 0.2,
    userSelect: 'none',
  }
  const sizes: Record<Size, React.CSSProperties> = {
    sm: { padding: '8px 16px', fontSize: 13 },
    md: { padding: '12px 22px', fontSize: 15 },
    lg: { padding: '16px 32px', fontSize: 17 },
  }
  const variants: Record<Variant, React.CSSProperties> = {
    primary: {
      background: s.primary,
      color: s.dark,
      borderColor: s.primaryDark,
      boxShadow: `0 6px 0 ${s.primaryDark}`,
    },
    ghost: {
      background: 'transparent',
      color: s.dark,
      borderColor: 'transparent',
    },
    dark: {
      background: s.dark,
      color: '#fff',
      borderColor: s.dark,
      boxShadow: `0 6px 0 #000`,
    },
    outline: {
      background: '#fff',
      color: s.dark,
      borderColor: s.primaryDark,
      boxShadow: `0 4px 0 ${s.primaryDark}`,
    },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseDown={(e) => { if (!disabled) (e.currentTarget.style.transform = 'translateY(2px)') }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {children}
    </button>
  )
}
