'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/lib/theme/ThemeProvider'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Flashcard {
  question: string
  options: [string, string, string, string]
  answer: number
  explanation: string
}

type Mode = 'menu' | 'flashcard' | 'quiz' | 'results'

// ─── Flashcard Flip Card ───────────────────────────────────────────────────────
function FlipCard({ card, index, total, primary }: {
  card: Flashcard; index: number; total: number; primary: string
}) {
  const [flipped, setFlipped] = useState(false)

  return (
    <div style={{ perspective: 900, width: '100%', maxWidth: 500, margin: '0 auto' }}>
      <div
        onClick={() => setFlipped(f => !f)}
        style={{
          position: 'relative', width: '100%', paddingBottom: '65%',
          cursor: 'pointer', transformStyle: 'preserve-3d',
          transition: 'transform 0.45s cubic-bezier(.4,0,.2,1)',
          transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          background: '#fff', borderRadius: 20,
          border: `2px solid ${primary}33`,
          boxShadow: `0 8px 32px ${primary}22`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 28,
        }}>
          <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 12, letterSpacing: 1 }}>
            {index + 1} / {total}
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f', textAlign: 'center', lineHeight: 1.5 }}>
            {card.question}
          </div>
          <div style={{ marginTop: 20, fontSize: 11, color: '#6e6e73' }}>Tap to reveal answer</div>
        </div>

        {/* Back */}
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: `linear-gradient(135deg, ${primary}22 0%, ${primary}08 100%)`,
          borderRadius: 20, border: `2px solid ${primary}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: 28,
        }}>
          <div style={{
            fontSize: 14, fontWeight: 700, color: primary,
            marginBottom: 8, textAlign: 'center', lineHeight: 1.4,
          }}>
            {card.options[card.answer]}
          </div>
          <div style={{ fontSize: 13, color: '#1d1d1f', textAlign: 'center', lineHeight: 1.5 }}>
            {card.explanation}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Quiz Question ─────────────────────────────────────────────────────────────
function QuizQuestion({ card, index, total, primary, onAnswer }: {
  card: Flashcard; index: number; total: number; primary: string
  onAnswer: (correct: boolean) => void
}) {
  const [selected, setSelected] = useState<number | null>(null)

  const handleSelect = (i: number) => {
    if (selected !== null) return
    setSelected(i)
    setTimeout(() => onAnswer(i === card.answer), 900)
  }

  const optionColors = (i: number) => {
    if (selected === null) return { bg: '#f5f5f7', border: 'rgba(0,0,0,0.08)', color: '#1d1d1f' }
    if (i === card.answer) return { bg: '#d1fae5', border: '#34c759', color: '#065f46' }
    if (i === selected) return { bg: '#fee2e2', border: '#ff3b30', color: '#7f1d1d' }
    return { bg: '#f5f5f7', border: 'rgba(0,0,0,0.06)', color: '#6e6e73' }
  }

  return (
    <div style={{ width: '100%', maxWidth: 500, margin: '0 auto' }}>
      <div style={{ fontSize: 11, color: '#6e6e73', marginBottom: 12, letterSpacing: 1 }}>
        Question {index + 1} of {total}
      </div>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '20px 20px 16px',
        border: '1px solid rgba(0,0,0,0.07)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', lineHeight: 1.5 }}>
          {card.question}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {card.options.map((opt, i) => {
          const c = optionColors(i)
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              style={{
                padding: '14px 16px', borderRadius: 12, border: `2px solid ${c.border}`,
                background: c.bg, color: c.color, fontSize: 14, fontWeight: 500,
                textAlign: 'left', cursor: selected !== null ? 'default' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontWeight: 700, marginRight: 8, color: c.color }}>
                {['A', 'B', 'C', 'D'][i]}.
              </span>
              {opt}
            </button>
          )
        })}
      </div>

      {selected !== null && (
        <div style={{
          marginTop: 14, padding: '12px 16px', borderRadius: 12,
          background: selected === card.answer ? '#d1fae5' : '#fee2e2',
          color: selected === card.answer ? '#065f46' : '#7f1d1d',
          fontSize: 13, lineHeight: 1.5,
        }}>
          <strong>{selected === card.answer ? '✓ Correct! ' : '✗ Not quite. '}</strong>
          {card.explanation}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function FlashcardsPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const { tokens } = useTheme()
  const primary = tokens.primary
  
  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<Mode>('menu')
  const [cardIndex, setCardIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [lectureTitle, setLectureTitle] = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      // Get lecture title
      const { data: lecture } = await supabase
        .from('lectures')
        .select('title')
        .eq('id', params.id)
        .maybeSingle()
      if (lecture?.title) setLectureTitle(lecture.title)

      // Generate or fetch cached flashcards
      const res = await fetch('/api/generate-flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId: params.id }),
      })
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to generate flashcards')
        setLoading(false)
        return
      }

      // Kalau cached data adalah pulse type (dari Action Items), ignore cache — regenerate
      const dataType = json.data?.type
      if (dataType === 'pulse') {
        // Clear cache dan regenerate sebagai flashcards
        const res2 = await fetch('/api/generate-flashcards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lectureId: params.id, bustCache: true }),
        })
        const json2 = await res2.json()
        if (!res2.ok) { setError(json2.error || 'Failed to generate flashcards'); setLoading(false); return }
        setCards((json2.data?.items ?? []) as Flashcard[])
      } else {
        setCards((json.data?.items ?? []) as Flashcard[])
      }
      setLoading(false)
    }
    load()
  }, [params.id])

  const handleQuizAnswer = (correct: boolean) => {
    const newAnswers = [...answers, correct]
    setAnswers(newAnswers)
    if (correct) setScore(s => s + 1)

    if (cardIndex + 1 >= cards.length) {
      setTimeout(() => setMode('results'), 300)
    } else {
      setTimeout(() => setCardIndex(i => i + 1), 400)
    }
  }

  const resetQuiz = () => {
    setCardIndex(0)
    setScore(0)
    setAnswers([])
    setMode('menu')
  }

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
      <div style={{ fontSize: 14, color: '#6e6e73' }}>Generating flashcards...</div>
    </div>
  )

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) return (
    <div style={{ maxWidth: 460, margin: '80px auto', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontWeight: 600, color: '#1d1d1f', marginBottom: 8 }}>Couldn't generate flashcards</div>
      <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 24 }}>{error}</div>
      <button
        onClick={() => router.back()}
        style={{ padding: '10px 24px', borderRadius: 20, background: primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
      >
        Go back
      </button>
    </div>
  )

  // ── Menu ────────────────────────────────────────────────────────────────────
  if (mode === 'menu') return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: '40px 20px' }}>
      <button
        onClick={() => router.back()}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e6e73', fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        ← Back to lecture
      </button>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: 11, color: '#6e6e73', letterSpacing: 1, marginBottom: 4 }}>FLASHCARDS & QUIZ</div>
        <div style={{ fontWeight: 700, fontSize: 22, color: '#1d1d1f', lineHeight: 1.3 }}>
          {lectureTitle || 'Untitled Lecture'}
        </div>
        <div style={{ fontSize: 13, color: '#6e6e73', marginTop: 4 }}>{cards.length} cards generated by AI</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Flashcard mode */}
        <button
          onClick={() => { setCardIndex(0); setMode('flashcard') }}
          style={{
            padding: '20px 24px', borderRadius: 16, border: `2px solid ${primary}33`,
            background: `${primary}10`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, color: '#1d1d1f', marginBottom: 4 }}>🃏 Flashcards</div>
          <div style={{ fontSize: 13, color: '#6e6e73' }}>Tap to flip — study at your own pace</div>
        </button>

        {/* Quiz mode */}
        <button
          onClick={() => { setCardIndex(0); setScore(0); setAnswers([]); setMode('quiz') }}
          style={{
            padding: '20px 24px', borderRadius: 16, border: `2px solid ${primary}`,
            background: primary, cursor: 'pointer', textAlign: 'left', transition: 'all 0.18s',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 4 }}>🧠 Quiz Mode</div>
          <div style={{ fontSize: 13, color: `${primary}dd`, filter: 'brightness(2)' }}>MCQ — test what you know</div>
        </button>
      </div>
    </div>
  )

  // ── Flashcard Mode ───────────────────────────────────────────────────────────
  if (mode === 'flashcard') return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <button
          onClick={() => setMode('menu')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e6e73', fontSize: 13 }}
        >
          ← Menu
        </button>
        <div style={{ fontSize: 12, color: '#6e6e73' }}>Tap card to flip</div>
      </div>

      <FlipCard card={cards[cardIndex]} index={cardIndex} total={cards.length} primary={primary} />

      <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 32 }}>
        <button
          onClick={() => setCardIndex(i => Math.max(0, i - 1))}
          disabled={cardIndex === 0}
          style={{
            padding: '10px 24px', borderRadius: 20,
            background: cardIndex === 0 ? '#f5f5f7' : '#fff',
            border: '1px solid rgba(0,0,0,0.1)',
            color: cardIndex === 0 ? '#c7c7cc' : '#1d1d1f',
            cursor: cardIndex === 0 ? 'default' : 'pointer', fontWeight: 600, fontSize: 14,
          }}
        >
          ← Prev
        </button>
        <button
          onClick={() => setCardIndex(i => Math.min(cards.length - 1, i + 1))}
          disabled={cardIndex === cards.length - 1}
          style={{
            padding: '10px 24px', borderRadius: 20,
            background: cardIndex === cards.length - 1 ? '#f5f5f7' : primary,
            border: 'none',
            color: cardIndex === cards.length - 1 ? '#c7c7cc' : '#fff',
            cursor: cardIndex === cards.length - 1 ? 'default' : 'pointer', fontWeight: 600, fontSize: 14,
          }}
        >
          Next →
        </button>
      </div>
    </div>
  )

  // ── Quiz Mode ────────────────────────────────────────────────────────────────
  if (mode === 'quiz') return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '40px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <button
          onClick={resetQuiz}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6e6e73', fontSize: 13 }}
        >
          ← Menu
        </button>
        <div style={{
          background: `${primary}18`, borderRadius: 20, padding: '4px 14px',
          fontSize: 12, fontWeight: 600, color: primary,
        }}>
          {score} / {cardIndex} correct
        </div>
      </div>

      <QuizQuestion
        card={cards[cardIndex]}
        index={cardIndex}
        total={cards.length}
        primary={primary}
        onAnswer={handleQuizAnswer}
      />
    </div>
  )

  // ── Results ──────────────────────────────────────────────────────────────────
  if (mode === 'results') {
    const pct = Math.round((score / cards.length) * 100)
    const emoji = pct >= 80 ? '🎉' : pct >= 50 ? '👍' : '📚'
    return (
      <div style={{ maxWidth: 460, margin: '60px auto', padding: '40px 20px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>{emoji}</div>
        <div style={{ fontWeight: 700, fontSize: 24, color: '#1d1d1f', marginBottom: 4 }}>
          {pct}%
        </div>
        <div style={{ fontSize: 15, color: '#6e6e73', marginBottom: 8 }}>
          {score} out of {cards.length} correct
        </div>
        <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 32 }}>
          {pct >= 80 ? 'Excellent work!' : pct >= 50 ? 'Good effort — review the missed ones' : 'Keep studying — you\'ll get there!'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            onClick={() => { setCardIndex(0); setScore(0); setAnswers([]); setMode('quiz') }}
            style={{ padding: '12px 24px', borderRadius: 20, background: primary, color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            Try again
          </button>
          <button
            onClick={() => { setCardIndex(0); setMode('flashcard') }}
            style={{ padding: '12px 24px', borderRadius: 20, background: '#f5f5f7', color: '#1d1d1f', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
          >
            Review flashcards
          </button>
          <button
            onClick={() => router.back()}
            style={{ padding: '12px 24px', borderRadius: 20, background: 'none', color: '#6e6e73', border: '1px solid rgba(0,0,0,0.1)', cursor: 'pointer', fontSize: 14 }}
          >
            Back to lecture
          </button>
        </div>
      </div>
    )
  }

  return null
}
