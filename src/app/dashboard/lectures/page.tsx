'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LangProvider'
import { createClient } from '@/lib/supabase/client'
import { type Lecture } from '@/types'
import { RECORDING_TYPES, getRecordingTypeMeta, type RecordingType } from '@/lib/recording-types'
import { Icon } from '@/components/ui/Icon'

function AILogo({ provider, size = 14 }: { provider: string; size?: number }) {
  const bg: Record<string, string> = {
    'gemini-flash': 'linear-gradient(135deg, #4285F4, #9168C0 50%, #EA4335)',
    'groq': 'linear-gradient(180deg, #FF5D3A, #E23A20)',
    'auto': 'linear-gradient(135deg, #FFB7C5, #D4537E)',
    'gemini-flash-lite': 'linear-gradient(135deg, #4796E3, #34A853)',
  }
  const icons: Record<string, JSX.Element> = {
    'gemini-flash': <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" fill="#fff"/>,
    'groq': <><circle cx="12" cy="12" r="9" fill="#fff"/><circle cx="12" cy="12" r="2.8" fill="#E23A20"/></>,
    'auto': <path d="M17 2l4 4-4 4M3 11v-1a4 4 0 0 1 4-4h14M7 22l-4-4 4-4M21 13v1a4 4 0 0 1-4 4H3" stroke="#4B1528" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>,
    'gemini-flash-lite': <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" fill="#fff"/>,
  }
  const icSize = Math.round(size * 0.65)
  return (
    <span style={{
      width: size + 6, height: size + 6, borderRadius: Math.round(size / 3.5),
      background: bg[provider] || bg['auto'],
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <svg width={icSize} height={icSize} viewBox="0 0 24 24">{icons[provider] || icons['auto']}</svg>
    </span>
  )
}

const aiShort: Record<string, string> = {
  'gemini-flash': 'Gemini',
  'gemini-flash-lite': 'Flash-Lite',
  'groq': 'Groq',
  'auto': 'Auto',
}

// Type tag component — colored pill matching recording-types config
function TypeTag({ type, lang }: { type: string | null; lang: string }) {
  const meta = getRecordingTypeMeta(type || 'lecture')
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 6,
      fontSize: 10.5, fontWeight: 500,
      letterSpacing: '-0.005em',
      background: meta.bg, color: meta.color,
    }}>
      {meta.label[lang as 'en' | 'bm'] || meta.label.en}
    </span>
  )
}

export default function LecturesList() {
  const { lang } = useLang()
  const [all, setAll] = useState<Lecture[]>([])
  const [q, setQ] = useState('')
  const [activeType, setActiveType] = useState<string>('__all__')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('lectures').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false })
      setAll((data || []) as Lecture[])
      setLoading(false)
    })()
  }, [])

  // Counts per type for filter pills
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    all.forEach((l) => {
      const t = l.recording_type || 'lecture'
      counts[t] = (counts[t] || 0) + 1
    })
    return counts
  }, [all])

  const filtered = useMemo(() => {
    let list = all
    if (activeType !== '__all__') {
      list = list.filter((l) => (l.recording_type || 'lecture') === activeType)
    }
    if (q) {
      const lc = q.toLowerCase()
      list = list.filter((l) =>
        (l.title || '').toLowerCase().includes(lc) ||
        (l.subject || '').toLowerCase().includes(lc) ||
        (l.lecturer || '').toLowerCase().includes(lc)
      )
    }
    return list
  }, [all, q, activeType])

  const fmtDate = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    const y = new Date(today); y.setDate(y.getDate() - 1)
    const dday = d.toDateString()
    if (dday === today.toDateString()) return lang === 'bm' ? 'Hari ini' : 'Today'
    if (dday === y.toDateString()) return lang === 'bm' ? 'Semalam' : 'Yesterday'
    return d.toLocaleDateString(lang === 'bm' ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'short' })
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: 12, marginBottom: 20, flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 600,
            letterSpacing: '-0.025em', color: '#1d1d1f',
          }}>
            {lang === 'bm' ? 'Kuliah' : 'Lectures'}
          </h1>
          <div style={{ fontSize: 12.5, color: 'rgba(29,29,31,0.55)', marginTop: 2 }}>
            {lang === 'bm' ? 'Semua rakaman anda, mengikut jenis.' : 'All your recordings, by type.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', minWidth: 200 }}>
            <Icon.Search size={13} style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'rgba(29,29,31,0.5)',
            }} />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder={lang === 'bm' ? 'Cari kuliah…' : 'Search lectures…'}
              style={{
                width: '100%', padding: '7px 12px 7px 30px',
                background: '#fff',
                border: '0.5px solid rgba(0,0,0,0.08)',
                borderRadius: 9, fontSize: 13,
                color: '#1d1d1f',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
          </div>
          <Link href="/dashboard/lectures/new" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 9,
            background: '#1d1d1f', color: '#fff',
            fontSize: 13, fontWeight: 500, textDecoration: 'none',
          }}>
            <Icon.Plus size={14} />
            {lang === 'bm' ? 'Kuliah baru' : 'New lecture'}
          </Link>
        </div>
      </div>

      {/* FILTER PILLS BY TYPE */}
      {all.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <FilterPill
            active={activeType === '__all__'}
            onClick={() => setActiveType('__all__')}
            label={`${lang === 'bm' ? 'Semua' : 'All'} · ${all.length}`}
          />
          {RECORDING_TYPES.filter(t => (typeCounts[t.id] || 0) > 0).map((t) => (
            <FilterPill
              key={t.id}
              active={activeType === t.id}
              onClick={() => setActiveType(t.id)}
              label={`${t.label[lang as 'en' | 'bm'] || t.label.en} · ${typeCounts[t.id]}`}
              accentBg={t.bg}
              accentColor={t.color}
            />
          ))}
        </div>
      )}

      {/* TABLE */}
      <div style={{
        background: '#fff',
        border: '0.5px solid rgba(0,0,0,0.06)',
        borderRadius: 14,
        overflow: 'hidden',
      }}>
        <div className="hidden md:grid" style={{
          padding: '12px 16px',
          borderBottom: '0.5px solid rgba(0,0,0,0.05)',
          display: 'grid',
          gridTemplateColumns: '1fr 100px 110px 80px 80px',
          gap: 14,
          fontSize: 11, fontWeight: 600,
          color: 'rgba(29,29,31,0.5)',
          textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          <span>{lang === 'bm' ? 'Tajuk' : 'Title'}</span>
          <span>{lang === 'bm' ? 'Jenis' : 'Type'}</span>
          <span>{lang === 'bm' ? 'AI' : 'AI'}</span>
          <span>{lang === 'bm' ? 'Tempoh' : 'Duration'}</span>
          <span>{lang === 'bm' ? 'Tarikh' : 'Date'}</span>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(29,29,31,0.5)', fontSize: 13 }}>
            {lang === 'bm' ? 'Memuatkan…' : 'Loading…'}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'rgba(29,29,31,0.5)', fontSize: 13 }}>
            {q || activeType !== '__all__'
              ? (lang === 'bm' ? 'Takda kuliah sepadan.' : 'No lectures match.')
              : (lang === 'bm' ? 'Belum ada kuliah.' : 'No lectures yet.')}
          </div>
        ) : (
          filtered.map((l, i) => (
            <Link key={l.id} href={`/dashboard/lectures/${l.id}`} style={{
              display: 'grid',
              gridTemplateColumns: '1fr 100px 110px 80px 80px',
              gap: 14,
              padding: '12px 16px',
              borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.05)',
              fontSize: 13,
              alignItems: 'center',
              textDecoration: 'none', color: 'inherit',
            }} className="cc-session-row">
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontWeight: 500, color: '#1d1d1f',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {l.title}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.5)', marginTop: 2 }}>
                  {[l.lecturer, l.location, l.subject].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
              <div>
                <TypeTag type={l.recording_type} lang={lang} />
              </div>
              <div>
                {l.ai_provider ? (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    background: '#fff',
                    border: '0.5px solid rgba(0,0,0,0.08)',
                    borderRadius: 6, padding: '2px 8px 2px 3px',
                    fontSize: 10.5, fontWeight: 500, color: 'rgba(29,29,31,0.6)',
                  }}>
                    <AILogo provider={l.ai_provider} size={12} />
                    {aiShort[l.ai_provider] || l.ai_provider}
                  </div>
                ) : (
                  <span style={{ fontSize: 11, color: 'rgba(29,29,31,0.3)' }}>—</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.55)', fontVariantNumeric: 'tabular-nums' }}>
                {Math.round((l.duration_seconds || 0) / 60)} min
              </div>
              <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.45)' }}>
                {fmtDate(l.created_at)}
              </div>
            </Link>
          ))
        )}
      </div>

      <style jsx>{`
        @media (max-width: 768px) {
          :global(.cc-session-row) {
            grid-template-columns: 1fr auto !important;
          }
          :global(.cc-session-row) > *:nth-child(3),
          :global(.cc-session-row) > *:nth-child(4),
          :global(.cc-session-row) > *:nth-child(5) {
            display: none;
          }
        }
      `}</style>
    </div>
  )
}

function FilterPill({ active, onClick, label, accentBg, accentColor }: {
  active: boolean; onClick: () => void; label: string;
  accentBg?: string; accentColor?: string;
}) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 11px',
      background: active ? '#1d1d1f' : (accentBg || '#fff'),
      border: `0.5px solid ${active ? '#1d1d1f' : 'rgba(0,0,0,0.08)'}`,
      color: active ? '#fff' : (accentColor || 'rgba(29,29,31,0.7)'),
      borderRadius: 7,
      fontSize: 11.5, fontWeight: 500,
      cursor: 'pointer', letterSpacing: '-0.005em',
      fontFamily: 'inherit',
    }}>
      {label}
    </button>
  )
}
