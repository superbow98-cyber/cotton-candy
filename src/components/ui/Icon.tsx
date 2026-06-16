'use client'
import React from 'react'

// Apple/Lucide-style stroke icons. All icons share same stroke width + linecap.
// Usage: <Icon.Home size={16} />

const STROKE = 1.8
const defaultProps = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: STROKE,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

type P = { size?: number; style?: React.CSSProperties; className?: string }

const wrap = (children: React.ReactNode) => (props: P) => (
  <svg
    width={props.size ?? 16}
    height={props.size ?? 16}
    viewBox="0 0 24 24"
    style={props.style}
    className={props.className}
    {...defaultProps}
  >
    {children}
  </svg>
)

export const Icon = {
  Home:       wrap(<><path d="M3 12l9-9 9 9" /><path d="M5 10v11h14V10" /></>),
  Mic:        wrap(<><rect x="9" y="2" width="6" height="11" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2" /><path d="M12 19v3" /></>),
  Notebook:   wrap(<path d="M4 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v16l-4-3-4 3-4-3-4 3z" />),
  Settings:   wrap(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>),
  Search:     wrap(<><circle cx="11" cy="11" r="7" /><path d="m20 20-4.35-4.35" /></>),
  Plus:       wrap(<path d="M12 5v14M5 12h14" />),
  Check:      wrap(<path d="M20 6L9 17l-5-5" />),
  ChevronDown: wrap(<path d="M6 9l6 6 6-6" />),
  ChevronRight: wrap(<path d="M9 18l6-6-6-6" />),
  ChevronLeft: wrap(<path d="M15 18l-6-6 6-6" />),
  Download:   wrap(<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></>),
  Export:     wrap(<><path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" /><path d="M16 6l-4-4-4 4" /><path d="M12 2v14" /></>),
  Logout:     wrap(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>),
  Doc:        wrap(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" /></>),
  Sparkle:    wrap(<><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></>),
  Tag:        wrap(<><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></>),
  Key:        wrap(<><circle cx="7.5" cy="15.5" r="5.5" /><path d="m21 2-9.6 9.6" /><path d="m15.5 7.5 3 3L22 7l-3-3" /></>),
  Question:   wrap(<><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></>),
  Formula:    wrap(<><path d="M18 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" /><path d="M8 10h8M8 14h5" /></>),
  Star:       wrap(<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />),
  Sidebar:    wrap(<><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /></>),
  Hamburger:  wrap(<><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>),
  X:          wrap(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>),
  Edit:       wrap(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>),
  Trash:      wrap(<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></>),
  Clock:      wrap(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>),
  Timer:      wrap(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /><path d="M9 2h6" /></>),
  Globe:      wrap(<><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>),
  Play:       wrap(<polygon points="5 3 19 12 5 21 5 3" />),
  Stop:       wrap(<rect x="6" y="6" width="12" height="12" rx="1" />),
  Crown:      wrap(<><path d="M3 17l2-9 5 4 2-6 2 6 5-4 2 9z" /><line x1="3" y1="20" x2="21" y2="20" /></>),
  Filter:     wrap(<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />),
}

export type IconName = keyof typeof Icon
