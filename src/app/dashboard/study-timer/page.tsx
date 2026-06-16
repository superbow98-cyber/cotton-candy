'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useLang } from '@/lib/i18n/LangProvider'
import { Icon } from '@/components/ui/Icon'

const W = 80, H = 60
const MOTION_THRESHOLD = 25
const PIXEL_DIFF_THRESH = 30
const AWAY_COUNTDOWN_SECS = 3

type TimerState = 'idle' | 'running' | 'paused-away' | 'stopped'

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0')
}

export default function StudyTimer() {
  const { lang } = useLang()

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null)
  const [camReady, setCamReady] = useState(false)
  const [camError, setCamError] = useState(false)

  // Timer
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [focusSecs, setFocusSecs] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isAwayRef = useRef(false)

  // Motion
  const motionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [motionPct, setMotionPct] = useState(0)

  // Away countdown
  const [awayCountdown, setAwayCountdown] = useState<number | null>(null)
  const awayCountIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const awayTimerActiveRef = useRef(false)

  // Stats
  const [sessions, setSessions] = useState(0)
  const [pauseCount, setPauseCount] = useState(0)

  // ── camera ──────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCamReady(true)
      }
    } catch {
      setCamError(true)
    }
  }, [])

  // ── motion detection ────────────────────────────────────
  const getMotionScore = useCallback((): number => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !video.videoWidth) return 0
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, W, H)
    const frame = ctx.getImageData(0, 0, W, H).data
    if (!prevFrameRef.current) { prevFrameRef.current = frame; return 0 }
    let diff = 0
    for (let i = 0; i < frame.length; i += 4) {
      const dr = Math.abs(frame[i] - prevFrameRef.current[i])
      const dg = Math.abs(frame[i + 1] - prevFrameRef.current[i + 1])
      const db = Math.abs(frame[i + 2] - prevFrameRef.current[i + 2])
      if ((dr + dg + db) / 3 > PIXEL_DIFF_THRESH) diff++
    }
    prevFrameRef.current = frame
    return Math.round((diff / (W * H)) * 100)
  }, [])

  // ── away countdown ──────────────────────────────────────
  const cancelAwayCountdown = useCallback(() => {
    if (awayCountIntervalRef.current) clearInterval(awayCountIntervalRef.current)
    awayTimerActiveRef.current = false
    setAwayCountdown(null)
  }, [])

  const triggerPause = useCallback(() => {
    cancelAwayCountdown()
    isAwayRef.current = true
    setTimerState('paused-away')
    setPauseCount(p => p + 1)
  }, [cancelAwayCountdown])

  const startAwayCountdown = useCallback(() => {
    if (awayTimerActiveRef.current) return
    awayTimerActiveRef.current = true
    let count = AWAY_COUNTDOWN_SECS
    setAwayCountdown(count)
    awayCountIntervalRef.current = setInterval(() => {
      count--
      setAwayCountdown(count)
      if (count <= 0) {
        clearInterval(awayCountIntervalRef.current!)
        triggerPause()
      }
    }, 1000)
  }, [triggerPause])

  // ── motion watch loop ───────────────────────────────────
  const startMotionWatch = useCallback(() => {
    motionIntervalRef.current = setInterval(() => {
      const score = getMotionScore()
      setMotionPct(Math.min(100, score * 4))
      const high = score > MOTION_THRESHOLD

      if (high && !isAwayRef.current && !awayTimerActiveRef.current) {
        startAwayCountdown()
      } else if (!high && awayTimerActiveRef.current && !isAwayRef.current) {
        cancelAwayCountdown()
      } else if (!high && isAwayRef.current) {
        isAwayRef.current = false
        setTimerState('running')
      }
    }, 400)
  }, [getMotionScore, startAwayCountdown, cancelAwayCountdown])

  const stopMotionWatch = useCallback(() => {
    if (motionIntervalRef.current) clearInterval(motionIntervalRef.current)
    cancelAwayCountdown()
  }, [cancelAwayCountdown])

  // ── timer tick ──────────────────────────────────────────
  const startTick = useCallback(() => {
    timerRef.current = setInterval(() => {
      if (!isAwayRef.current) setFocusSecs(s => s + 1)
    }, 1000)
  }, [])

  const stopTick = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  // ── controls ────────────────────────────────────────────
  const handleStart = useCallback(() => {
    isAwayRef.current = false
    setTimerState('running')
    setSessions(s => s + 1)
    startTick()
    startMotionWatch()
  }, [startTick, startMotionWatch])

  const handleStop = useCallback(() => {
    setTimerState('stopped')
    stopTick()
    stopMotionWatch()
    isAwayRef.current = false
  }, [stopTick, stopMotionWatch])

  const handleReset = useCallback(() => {
    setTimerState('idle')
    stopTick()
    stopMotionWatch()
    isAwayRef.current = false
    setFocusSecs(0)
    setSessions(0)
    setPauseCount(0)
    setMotionPct(0)
    prevFrameRef.current = null
  }, [stopTick, stopMotionWatch])

  // cleanup on unmount
  useEffect(() => () => { stopTick(); stopMotionWatch() }, [stopTick, stopMotionWatch])

  const isRunning = timerState === 'running' || timerState === 'paused-away'
  const isPausedAway = timerState === 'paused-away'

  const t = {
    title: lang === 'bm' ? 'Timer Fokus' : 'Focus Timer',
    subtitle: lang === 'bm' ? 'Timer berhenti bila kau tinggalkan tempat duduk.' : 'Timer pauses when you leave your seat.',
    grantBtn: lang === 'bm' ? 'Benarkan kamera' : 'Allow camera',
    camPrompt: lang === 'bm' ? 'Kamera diperlukan untuk detect presence kau' : 'Camera required to detect your presence',
    camErr: lang === 'bm' ? 'Kamera tak dapat diakses. Semak permission browser.' : "Camera unavailable. Check browser permissions.",
    focused: lang === 'bm' ? 'Fokus' : 'Focused',
    paused: lang === 'bm' ? 'Timer paused' : 'Timer paused',
    labelFocus: lang === 'bm' ? 'masa fokus' : 'focus time',
    labelPaused: lang === 'bm' ? 'timer paused — balik ke tempat duduk' : 'timer paused — return to your seat',
    awayMsg: lang === 'bm' ? 'Kau dah gerak — pause dalam' : 'Movement detected — pausing in',
    sessions: lang === 'bm' ? 'Sesi hari ini' : 'Sessions today',
    pauses: lang === 'bm' ? 'Pause sebab gerak' : 'Motion pauses',
    start: lang === 'bm' ? 'Mula' : 'Start',
    stop: lang === 'bm' ? 'Berhenti' : 'Stop',
    reset: lang === 'bm' ? 'Reset' : 'Reset',
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 0 40px' }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f' }}>
          {t.title}
        </h1>
        <div style={{ fontSize: 12.5, color: 'rgba(29,29,31,0.55)', marginTop: 2 }}>
          {t.subtitle}
        </div>
      </div>

      {/* Camera feed */}
      <div style={{
        position: 'relative', width: '100%', aspectRatio: '4/3',
        borderRadius: 16, overflow: 'hidden',
        background: '#111',
        border: '0.5px solid rgba(0,0,0,0.08)',
        marginBottom: 20,
      }}>
        {/* Prompt / error */}
        {!camReady && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 10, padding: 24,
          }}>
            <Icon.Camera size={32} style={{ color: 'rgba(255,255,255,0.35)' }} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', textAlign: 'center', lineHeight: 1.4, margin: 0 }}>
              {camError ? t.camErr : t.camPrompt}
            </p>
            {!camError && (
              <button onClick={startCamera} style={{
                marginTop: 4, padding: '8px 20px', borderRadius: 8,
                background: '#fff', color: '#111', border: 'none',
                fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {t.grantBtn}
              </button>
            )}
          </div>
        )}

        {/* Video */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            transform: 'scaleX(-1)',
            display: camReady ? 'block' : 'none',
          }}
        />

        {/* Hidden diff canvas */}
        <canvas ref={canvasRef} width={W} height={H} style={{ display: 'none' }} />

        {/* Status pill */}
        {camReady && (
          <div style={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'rgba(0,0,0,0.55)', padding: '5px 12px', borderRadius: 999,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: isPausedAway ? '#ef4444' : awayCountdown !== null ? '#f59e0b' : '#22c55e',
            }} />
            <span style={{ fontSize: 12, color: '#fff', whiteSpace: 'nowrap' }}>
              {isPausedAway ? t.paused : t.focused}
            </span>
          </div>
        )}

        {/* Motion bar */}
        {camReady && (
          <div style={{
            position: 'absolute', bottom: 10, left: 12, right: 12,
            height: 4, background: 'rgba(255,255,255,0.15)', borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: `${motionPct}%`,
              background: motionPct > 60 ? '#ef4444' : '#22c55e',
              borderRadius: 2, transition: 'width 0.1s',
            }} />
          </div>
        )}

        {/* Away countdown overlay */}
        {awayCountdown !== null && !isPausedAway && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0 }}>{t.awayMsg}</p>
            <div style={{ fontSize: 40, fontWeight: 500, color: '#f59e0b', lineHeight: 1 }}>
              {awayCountdown}
            </div>
          </div>
        )}

        {/* Paused overlay */}
        {isPausedAway && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.55)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              background: 'rgba(239,68,68,0.15)',
              border: '0.5px solid rgba(239,68,68,0.4)',
              borderRadius: 12, padding: '10px 20px',
            }}>
              <p style={{ color: '#fca5a5', fontSize: 13, fontWeight: 500, margin: 0 }}>
                {t.labelPaused}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Timer display */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <div style={{
          fontSize: 64, fontWeight: 500, letterSpacing: '-3px', lineHeight: 1,
          color: isPausedAway ? 'rgba(29,29,31,0.3)' : '#1d1d1f',
          fontVariantNumeric: 'tabular-nums',
          transition: 'color 0.3s',
        }}>
          {fmt(focusSecs)}
        </div>
        <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.45)', marginTop: 6 }}>
          {isPausedAway ? t.labelPaused : t.labelFocus}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: t.sessions, val: sessions },
          { label: t.pauses, val: pauseCount },
        ].map(({ label, val }) => (
          <div key={label} style={{
            background: '#f5f5f7', borderRadius: 10, padding: '10px 14px',
          }}>
            <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.5)', marginBottom: 3 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 500, color: '#1d1d1f', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          disabled={!camReady}
          onClick={isRunning ? handleStop : handleStart}
          style={{
            flex: 1, padding: '12px', borderRadius: 10,
            background: isRunning ? '#ef4444' : '#1d1d1f',
            color: '#fff', border: 'none',
            fontSize: 14, fontWeight: 500, cursor: camReady ? 'pointer' : 'not-allowed',
            opacity: camReady ? 1 : 0.4, fontFamily: 'inherit',
            transition: 'background 0.2s',
          }}
        >
          {isRunning ? t.stop : t.start}
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: '12px 18px', borderRadius: 10,
            background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)',
            fontSize: 14, cursor: 'pointer',
            color: 'rgba(29,29,31,0.6)', fontFamily: 'inherit',
          }}
        >
          {t.reset}
        </button>
      </div>

    </div>
  )
}
