'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme/ThemeProvider'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface PulseQuestion {
  question: string
  bloom: 'remember' | 'understand' | 'apply' | 'analyse'
  keyPoints: string[]
  redFlag: string
}

const BLOOM_META: Record<PulseQuestion['bloom'], { label: string; color: string; bg: string; desc: string }> = {
  'remember':   { label: 'Remember',   color: '#34C759', bg: 'rgba(52,199,89,0.1)',   desc: 'Recall facts' },
  'understand': { label: 'Understand', color: '#5A8FF5', bg: 'rgba(90,143,245,0.1)',  desc: 'Explain concepts' },
  'apply':      { label: 'Apply',      color: '#FF9F0A', bg: 'rgba(255,159,10,0.1)',  desc: 'Use in new context' },
  'analyse':    { label: 'Analyse',    color: '#FF3B30', bg: 'rgba(255,59,48,0.1)',   desc: 'Break down & compare' },
}

// ─── Question Card ──────────────────────────────────────────────────────────────
function QuestionCard({ q, index, expanded, onToggle, primary }: {
  q: PulseQuestion; index: number; expanded: boolean; onToggle: () => void; primary: string
}) {
  const bloom = BLOOM_META[q.bloom] ?? BLOOM_META['understand']

  return (
    <div style={{
      borderRadius: 14, border: '1px solid rgba(0,0,0,0.08)',
      background: '#fff', overflow: 'hidden', transition: 'box-shadow 0.18s',
      boxShadow: expanded ? '0 4px 20px rgba(0,0,0,0.08)' : 'none',
    }}>
      {/* Question header — always visible */}
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'left', padding: '16px 18px',
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}
      >
        {/* Index */}
        <div style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          background: bloom.bg, color: bloom.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700,
        }}>
          {index + 1}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Bloom level pill */}
          <span style={{
            display: 'inline-block', fontSize: 10, fontWeight: 700,
            letterSpacing: 0.5, padding: '2px 8px', borderRadius: 6,
            background: bloom.bg, color: bloom.color, marginBottom: 6,
          }}>
            {bloom.label.toUpperCase()} · {bloom.desc}
          </span>
          {/* Question text */}
          <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f', lineHeight: 1.5 }}>
            {q.question}
          </div>
        </div>

        {/* Chevron */}
        <div style={{
          flexShrink: 0, color: '#6e6e73', fontSize: 12, marginTop: 6,
          transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s',
        }}>
          ▾
        </div>
      </button>

      {/* Expanded: key points + red flag */}
      {expanded && (
        <div style={{ padding: '0 18px 18px 58px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          {/* Key Points */}
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', letterSpacing: 0.5, marginBottom: 8 }}>
              EXPECTED KEY POINTS
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {q.keyPoints.map((pt, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
                    background: primary, marginTop: 5,
                  }} />
                  <div style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.5 }}>{pt}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Red Flag */}
          <div style={{
            marginTop: 14, padding: '10px 14px', borderRadius: 10,
            background: 'rgba(255,59,48,0.06)', border: '1px solid rgba(255,59,48,0.15)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#FF3B30', letterSpacing: 0.5, marginBottom: 4 }}>
              ⚠ RED FLAG — Student hasn't understood if they say:
            </div>
            <div style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.5 }}>{q.redFlag}</div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ──────────────────────────────────────────────────────────────────
export default function ActionItemsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { tokens } = useTheme()
  const primary = tokens.primary

  const [questions, setQuestions] = useState<PulseQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lectureTitle, setLectureTitle] = useState('')
  const [filter, setFilter] = useState<PulseQuestion['bloom'] | 'all'>('all')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: lecture } = await supabase
          .from('lectures')
          .select('title')
          .eq('id', params.id)
          .maybeSingle()
        if (lecture?.title) setLectureTitle(lecture.title)

        const res = await fetch('/api/generate-flashcards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lectureId: params.id, mode: 'pulse' }),
        })

        let json: any = {}
        try { json = await res.json() } catch { throw new Error('Server returned invalid response') }

        if (!res.ok) {
          setError(json.error || 'Failed to generate pulse check')
          return
        }

        setQuestions(json.data?.items ?? [])
      } catch (err: any) {
        setError(err?.message || 'Something went wrong. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id])

  const filtered = filter === 'all' ? questions : questions.filter(q => q.bloom === filter)

  // Copy all questions as plain text
  const handleCopy = () => {
    const text = questions.map((q, i) =>
      `Q${i + 1} [${q.bloom.toUpperCase()}]\n${q.question}`
    ).join('\n\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: `3px solid ${primary}33`, borderTopColor: primary,
        animation: 'spin 0.9s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ fontSize: 14, color: '#6e6e73' }}>Analysing lecture objectives...</div>
    </div>
  )

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ maxWidth: 460, margin: '80px auto', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>Couldn't generate pulse check</div>
      <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 24 }}>{error}</div>
      <button onClick={() => router.back()}
        style={{ padding: '10px 24px', borderRadius: 20, background: primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
        Go back
      </button>
    </div>
  )

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: '40px 20px' }}>

      {/* Back */}
      <button onClick={() => router.back()}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e6e73', fontSize: 13, marginBottom: 24 }}>
        ← Back to lecture
      </button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6, gap: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: '#6e6e73', letterSpacing: 1, marginBottom: 4 }}>STUDENT PULSE CHECK</div>
          <div style={{ fontWeight: 700, fontSize: 22, color: '#1d1d1f', lineHeight: 1.3 }}>
            {lectureTitle || 'Untitled Lecture'}
          </div>
        </div>
        {/* Copy button */}
        <button onClick={handleCopy} style={{
          flexShrink: 0, padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 600,
          border: '1.5px solid rgba(0,0,0,0.12)', background: copied ? '#34C759' : '#fff',
          color: copied ? '#fff' : '#1d1d1f', cursor: 'pointer', transition: 'all 0.2s', marginTop: 4,
        }}>
          {copied ? '✓ Copied' : 'Copy questions'}
        </button>
      </div>

      <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 24 }}>
        {questions.length} diagnostic questions · Tap each to reveal expected answers
      </div>

      {/* Bloom filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {(['all', 'remember', 'understand', 'apply', 'analyse'] as const).map(level => {
          const selected = filter === level
          const meta = level !== 'all' ? BLOOM_META[level] : null
          return (
            <button key={level} onClick={() => setFilter(level)} style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              border: `1.5px solid ${selected ? (meta?.color ?? primary) : 'rgba(0,0,0,0.1)'}`,
              background: selected ? (meta?.bg ?? `${primary}18`) : '#fff',
              color: selected ? (meta?.color ?? primary) : '#6e6e73',
              cursor: 'pointer', transition: 'all 0.15s',
            }}>
              {level === 'all' ? 'All levels' : meta!.label}
            </button>
          )
        })}
      </div>

      {/* Questions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6e6e73', fontSize: 13, padding: '40px 0' }}>
            No questions at this level
          </div>
        )}
        {filtered.map((q, i) => {
          const realIndex = questions.indexOf(q)
          return (
            <QuestionCard
              key={realIndex}
              q={q}
              index={realIndex}
              expanded={expanded === realIndex}
              onToggle={() => setExpanded(expanded === realIndex ? null : realIndex)}
              primary={primary}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div style={{
        marginTop: 32, padding: '16px 20px', borderRadius: 14,
        background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6e6e73', letterSpacing: 0.5, marginBottom: 12 }}>
          BLOOM'S TAXONOMY
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(['remember', 'understand', 'apply', 'analyse'] as const).map(level => {
            const m = BLOOM_META[level]
            return (
              <div key={level} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: 3, background: m.color, flexShrink: 0 }} />
                <div style={{ fontSize: 12, fontWeight: 600, color: m.color, width: 80 }}>{m.label}</div>
                <div style={{ fontSize: 12, color: '#6e6e73' }}>{m.desc}</div>
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}
