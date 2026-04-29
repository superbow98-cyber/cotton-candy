'use client'
// src/components/lecture/CottonCandyGame.tsx
// v54 — Mini-game shown during transcription/AI processing
// Cotton Candy Catcher: tap falling candies, score points

import { useEffect, useRef, useState } from 'react'

interface Candy {
  id: number
  x: number          // 0-100 (% of width)
  y: number          // 0-100 (% of height)
  emoji: string
  speed: number      // y units per frame
  size: number       // px
  caught: boolean
}

interface Props {
  status: string                  // e.g. "Transcribing..." or "AI organizing notes..."
  subStatus?: string              // e.g. "~12s left"
  lang?: 'en' | 'bm'
  compact?: boolean               // smaller variant
}

const EMOJIS = ['🍭', '🍬', '🧁', '🍩', '🍪']
const COLORS = [
  '#F4C0D1',  // pink
  '#CECBF6',  // purple
  '#B5D4F4',  // blue
  '#9FE1CB',  // teal
  '#FAC775',  // amber
]

const GAME_HEIGHT = 280
const SPAWN_INTERVAL_MS = 800
const FRAME_INTERVAL_MS = 16  // ~60fps
const FALL_SPEED_BASE = 0.3   // % per frame
const GAME_DIFFICULTY_RAMP = 0.0005  // speed increases per ms played

export default function CottonCandyGame({ status, subStatus, lang = 'en', compact = false }: Props) {
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [candies, setCandies] = useState<Candy[]>([])
  const [highScore, setHighScore] = useState(0)
  const startTimeRef = useRef<number>(Date.now())
  const candyIdRef = useRef(0)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Load high score
  useEffect(() => {
    try {
      const saved = parseInt(localStorage.getItem('cc-game-highscore') || '0', 10)
      if (!isNaN(saved)) setHighScore(saved)
    } catch {}
  }, [])

  // Save high score on update
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score)
      try { localStorage.setItem('cc-game-highscore', String(score)) } catch {}
    }
  }, [score, highScore])

  // Spawn candies periodically
  useEffect(() => {
    const spawn = setInterval(() => {
      const id = ++candyIdRef.current
      const newCandy: Candy = {
        id,
        x: 5 + Math.random() * 90,
        y: -10,
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        speed: FALL_SPEED_BASE + Math.random() * 0.3,
        size: 28 + Math.floor(Math.random() * 16),
        caught: false,
      }
      setCandies(prev => {
        // Limit max candies on screen to avoid lag
        if (prev.length >= 12) return prev
        return [...prev, newCandy]
      })
    }, SPAWN_INTERVAL_MS)
    return () => clearInterval(spawn)
  }, [])

  // Animation frame — move candies down
  useEffect(() => {
    const tick = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current
      const speedMultiplier = 1 + elapsed * GAME_DIFFICULTY_RAMP
      setCandies(prev =>
        prev
          .map(c => ({ ...c, y: c.y + c.speed * speedMultiplier }))
          .filter(c => c.y < 110 && !c.caught) // remove off-screen + caught
      )
    }, FRAME_INTERVAL_MS)
    return () => clearInterval(tick)
  }, [])

  // Reset combo if no catch in last 1.5s
  const lastCatchRef = useRef<number>(Date.now())
  useEffect(() => {
    const check = setInterval(() => {
      if (Date.now() - lastCatchRef.current > 1500) {
        setCombo(0)
      }
    }, 500)
    return () => clearInterval(check)
  }, [])

  const catchCandy = (id: number) => {
    const candy = candies.find(c => c.id === id)
    if (!candy || candy.caught) return

    setCandies(prev => prev.map(c => c.id === id ? { ...c, caught: true } : c))

    const newCombo = combo + 1
    setCombo(newCombo)
    const points = 1 + Math.floor(newCombo / 3)  // bonus for combos
    setScore(s => s + points)
    lastCatchRef.current = Date.now()

    // Remove caught candy after brief animation
    setTimeout(() => {
      setCandies(prev => prev.filter(c => c.id !== id))
    }, 200)
  }

  const gameHeight = compact ? 200 : GAME_HEIGHT

  return (
    <div style={{
      background: '#fff',
      border: '2px dashed rgba(212, 83, 126, 0.3)',
      borderRadius: 18,
      padding: 16,
      maxWidth: 480,
      margin: '0 auto',
      boxShadow: '0 6px 20px rgba(212, 83, 126, 0.06)',
    }}>
      {/* Header — score + status */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 12,
      }}>
        <div>
          <div style={{
            fontSize: 10, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            color: 'rgba(29,29,31,0.5)',
          }}>{lang === 'bm' ? 'Markah' : 'Score'}</div>
          <div style={{
            fontSize: 22, fontWeight: 600,
            fontFamily: 'SF Mono, Monaco, monospace',
            color: '#1d1d1f',
            letterSpacing: '-0.02em',
          }}>{score}</div>
        </div>

        {combo >= 3 && (
          <div style={{
            padding: '4px 10px',
            background: 'linear-gradient(135deg, #F4C0D1, #CECBF6)',
            borderRadius: 100,
            fontSize: 12, fontWeight: 600,
            color: '#1d1d1f',
            animation: 'cc-pulse 0.4s ease',
          }}>
            🔥 ×{combo} combo
          </div>
        )}

        {highScore > 0 && (
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 10, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.06em',
              color: 'rgba(29,29,31,0.5)',
            }}>{lang === 'bm' ? 'Tertinggi' : 'Best'}</div>
            <div style={{
              fontSize: 16, fontWeight: 500,
              fontFamily: 'SF Mono, Monaco, monospace',
              color: 'rgba(29,29,31,0.6)',
            }}>{highScore}</div>
          </div>
        )}
      </div>

      {/* Game canvas */}
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          height: gameHeight,
          background: 'linear-gradient(180deg, rgba(255, 246, 250, 0.5), rgba(245, 245, 247, 0.8))',
          borderRadius: 12,
          overflow: 'hidden',
          touchAction: 'manipulation',
          userSelect: 'none',
          WebkitUserSelect: 'none',
        }}
      >
        {/* Candies */}
        {candies.map(candy => (
          <button
            key={candy.id}
            onClick={() => catchCandy(candy.id)}
            onTouchStart={(e) => { e.preventDefault(); catchCandy(candy.id) }}
            style={{
              position: 'absolute',
              left: `${candy.x}%`,
              top: `${candy.y}%`,
              width: candy.size,
              height: candy.size,
              borderRadius: '50%',
              background: COLORS[candy.id % COLORS.length],
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: candy.size * 0.6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
              transform: `translate(-50%, -50%) ${candy.caught ? 'scale(1.4)' : 'scale(1)'}`,
              opacity: candy.caught ? 0 : 1,
              transition: 'transform 0.2s ease, opacity 0.2s ease',
              touchAction: 'manipulation',
            }}
            aria-label="Catch candy"
          >
            {candy.emoji}
          </button>
        ))}

        {/* Bottom basket (decorative) */}
        <div style={{
          position: 'absolute',
          bottom: 4,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 80,
          height: 8,
          background: 'rgba(212, 83, 126, 0.4)',
          borderRadius: 100,
        }} />
      </div>

      {/* Status footer */}
      <div style={{
        marginTop: 12, padding: '10px 14px',
        background: 'rgba(90, 143, 245, 0.08)',
        border: '0.5px solid rgba(90, 143, 245, 0.2)',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: '2px solid rgba(90, 143, 245, 0.3)',
          borderTopColor: '#5A8FF5',
          animation: 'cc-game-spin 0.8s linear infinite',
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500,
            color: '#1d1d1f',
          }}>{status}</div>
          {subStatus && (
            <div style={{
              fontSize: 11,
              color: 'rgba(29,29,31,0.55)',
              marginTop: 2,
            }}>{subStatus}</div>
          )}
        </div>
      </div>

      {/* Hint */}
      {score === 0 && combo === 0 && (
        <div style={{
          marginTop: 10, textAlign: 'center',
          fontSize: 11, color: 'rgba(29,29,31,0.5)',
        }}>
          {lang === 'bm'
            ? '👆 Tap gula-gula untuk dapatkan markah!'
            : '👆 Tap candies to score points!'}
        </div>
      )}

      <style jsx>{`
        @keyframes cc-game-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes cc-pulse {
          0%   { transform: scale(1); }
          50%  { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
