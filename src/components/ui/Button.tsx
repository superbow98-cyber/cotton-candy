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
    gap: 6,
    fontWeight: 500,
    borderRadius: 9,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'all 0.15s ease',
    letterSpacing: '-0.01em',
    userSelect: 'none',
    fontFamily: 'inherit',
  }
  const sizes: Record<Size, React.CSSProperties> = {
    sm: { padding: '7px 13px', fontSize: 12.5 },
    md: { padding: '9px 16px', fontSize: 13 },
    lg: { padding: '12px 22px', fontSize: 14 },
  }
  const variants: Record<Variant, React.CSSProperties> = {
    primary: {
      background: '#1d1d1f',
      color: '#fff',
    },
    ghost: {
      background: 'transparent',
      color: '#1d1d1f',
    },
    dark: {
      background: '#1d1d1f',
      color: '#fff',
    },
    outline: {
      background: '#fff',
      color: '#1d1d1f',
      border: '0.5px solid rgba(0,0,0,0.08)',
    },
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={className}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseEnter={(e) => {
        if (disabled) return
        if (variant === 'primary' || variant === 'dark') e.currentTarget.style.background = '#000'
        else if (variant === 'outline') e.currentTarget.style.background = 'rgba(0,0,0,0.03)'
        else if (variant === 'ghost') e.currentTarget.style.background = 'rgba(0,0,0,0.04)'
      }}
      onMouseLeave={(e) => {
        if (disabled) return
        e.currentTarget.style.background = variants[variant].background as string
      }}
    >
      {children}
    </button>
  )
}
