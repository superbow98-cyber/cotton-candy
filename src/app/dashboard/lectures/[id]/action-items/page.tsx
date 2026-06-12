'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme/ThemeProvider'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface ActionItem {
  task: string
  category: 'follow-up' | 'assignment' | 'reminder' | 'resource'
  priority: 'high' | 'medium' | 'low'
  done: boolean
}

const CATEGORY_META: Record<ActionItem['category'], { label: string; emoji: string; color: string }> = {
  'follow-up':  { label: 'Follow-up',  emoji: '💬', color: '#5A8FF5' },
  'assignment': { label: 'Assignment', emoji: '📋', color: '#FF6B9D' },
  'reminder':   { label: 'Reminder',   emoji: '⏰', color: '#FF9F0A' },
  'resource':   { label: 'Resource',   emoji: '📚', color: '#34C759' },
}

const PRIORITY_META: Record<ActionItem['priority'], { label: string; color: string }> = {
  'high':   { label: 'High',   color: '#FF3B30' },
  'medium': { label: 'Medium', color: '#FF9F0A' },
  'low':    { label: 'Low',    color: '#34C759' },
}

// ─── Single Action Item Row ────────────────────────────────────────────────────
function ActionRow({ item, onToggle, primary }: {
  item: ActionItem; onToggle: () => void; primary: string
}) {
  const cat = CATEGORY_META[item.category]
  const pri = PRIORITY_META[item.priority]

  return (
    <div
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 16px',
        background: item.done ? 'rgba(52,199,89,0.06)' : '#fff',
        borderRadius: 12, border: `1px solid ${item.done ? 'rgba(52,199,89,0.2)' : 'rgba(0,0,0,0.07)'}`,
        transition: 'all 0.18s',
      }}
    >
      {/* Checkbox */}
      <button
        onClick={onToggle}
        style={{
          width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
          border: `2px solid ${item.done ? '#34c759' : 'rgba(0,0,0,0.15)'}`,
          background: item.done ? '#34c759' : '#fff',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.15s',
        }}
      >
        {item.done && (
          <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
            <path d="M1 4l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: item.done ? '#6e6e73' : '#1d1d1f',
          textDecoration: item.done ? 'line-through' : 'none',
          lineHeight: 1.4, marginBottom: 6,
        }}>
          {item.task}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {/* Category pill */}
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
            background: `${cat.color}18`, color: cat.color,
          }}>
            {cat.emoji} {cat.label}
          </span>
          {/* Priority pill */}
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8,
            background: `${pri.color}15`, color: pri.color,
          }}>
            {pri.label}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function ActionItemsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { primary } = useTheme()

  const [items, setItems] = useState<ActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lectureTitle, setLectureTitle] = useState('')
  const [filter, setFilter] = useState<ActionItem['category'] | 'all'>('all')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data: lecture } = await supabase
        .from('lectures')
        .select('title')
        .eq('id', params.id)
        .maybeSingle()
      if (lecture?.title) setLectureTitle(lecture.title)

      const res = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId: params.id }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to generate action items')
        setLoading(false)
        return
      }

      const rawItems = json.data?.items ?? []
      setItems(rawItems.map((i: ActionItem) => ({ ...i, done: false })))
      setLoading(false)
    }
    load()
  }, [params.id])

  const toggleItem = (index: number) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, done: !item.done } : item))
  }

  const doneCount = items.filter(i => i.done).length
  const filtered = filter === 'all' ? items : items.filter(i => i.category === filter)

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 16 }}>
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        border: `3px solid ${primary}33`,
        borderTopColor: primary,
        animation: 'spin 0.9s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ fontSize: 14, color: '#6e6e73' }}>Generating action items...</div>
    </div>
  )

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ maxWidth: 460, margin: '80px auto', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>Couldn't generate action items</div>
      <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 24 }}>{error}</div>
      <button
        onClick={() => router.back()}
        style={{ padding: '10px 24px', borderRadius: 20, background: primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
      >
        Go back
      </button>
    </div>
  )

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>

      {/* Header */}
      <button
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e6e73', fontSize: 13, marginBottom: 24 }}
      >
        ← Back to lecture
      </button>

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 11, color: '#6e6e73', letterSpacing: 1, marginBottom: 4 }}>ACTION ITEMS</div>
        <div style={{ fontWeight: 700, fontSize: 22, color: '#1d1d1f', lineHeight: 1.3 }}>
          {lectureTitle || 'Untitled Lecture'}
        </div>
        <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>
          {doneCount} of {items.length} completed
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'rgba(0,0,0,0.06)', borderRadius: 4, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{
          height: '100%', borderRadius: 4, background: primary,
          width: `${items.length > 0 ? (doneCount / items.length) * 100 : 0}%`,
          transition: 'width 0.3s ease',
        }} />
      </div>

      {/* Category filter pills */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        {(['all', 'follow-up', 'assignment', 'reminder', 'resource'] as const).map(cat => {
          const selected = filter === cat
          const meta = cat !== 'all' ? CATEGORY_META[cat] : null
          return (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                border: `1.5px solid ${selected ? (meta?.color ?? primary) : 'rgba(0,0,0,0.1)'}`,
                background: selected ? `${meta?.color ?? primary}18` : '#fff',
                color: selected ? (meta?.color ?? primary) : '#6e6e73',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {cat === 'all' ? 'All' : `${meta?.emoji} ${meta?.label}`}
            </button>
          )
        })}
      </div>

      {/* Action items list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: '#6e6e73', fontSize: 13, padding: '40px 0' }}>
            No items in this category
          </div>
        )}
        {filtered.map((item, i) => {
          const realIndex = items.indexOf(item)
          return (
            <ActionRow
              key={realIndex}
              item={item}
              onToggle={() => toggleItem(realIndex)}
              primary={primary}
            />
          )
        })}
      </div>

      {/* All done celebration */}
      {items.length > 0 && doneCount === items.length && (
        <div style={{
          marginTop: 24, padding: '16px 20px', borderRadius: 14,
          background: 'rgba(52,199,89,0.1)', border: '1px solid rgba(52,199,89,0.2)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>🎉</div>
          <div style={{ fontWeight: 600, color: '#1d1d1f', fontSize: 14 }}>All done!</div>
          <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>Great lecture prep work</div>
        </div>
      )}
    </div>
  )
}
