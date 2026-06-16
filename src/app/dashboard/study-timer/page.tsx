'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useLang } from '@/lib/i18n/LangProvider'
import { Icon } from '@/components/ui/Icon'

const W = 80, H = 60
const MOTION_THRESHOLD = 25
const PIXEL_DIFF_THRESH = 30
const AWAY_COUNTDOWN_SECS = 3

type TimerState = 'idle' | 'running' | 'paused-away' | 'paused-ghost' | 'stopped'
type TimerMode = 'timer-only' | 'camera'

const TARGET_OPTIONS = [25, 50, 90]

function fmt(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return String(m).padStart(2, '0') + ':' + String(sec).padStart(2, '0')
}

function fmtDisplay(s: number) {
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${sec}s`
  return `${sec}s`
}

function fmtTime(date: Date) {
  return date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
}

// Inline SVG icons — no Icon.tsx dependency needed
function IconExpand() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 2h4M2 2v4M14 2h-4M14 2v4M2 14h4M2 14v-4M14 14h-4M14 14v-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IconCompress() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M6 2v4H2M10 2v4h4M6 14v-4H2M10 14v-4h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function StudyTimer() {
  const { lang } = useLang()

  // Mode
  const [mode, setMode] = useState<TimerMode>('camera')

  // Fullscreen
  const fsWrapRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const isIOS = useRef(false)

  // Camera
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const prevFrameRef = useRef<Uint8ClampedArray | null>(null)
  const [camReady, setCamReady] = useState(false)
  const [camError, setCamError] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)

  // Timer
  const [timerState, setTimerState] = useState<TimerState>('idle')
  const [focusSecs, setFocusSecs] = useState(0)
  const focusSecsRef = useRef(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isAwayRef = useRef(false)

  // Target
  const [targetMins, setTargetMins] = useState(50)
  const [customTarget, setCustomTarget] = useState('')

  // Study title
  const [studyTitle, setStudyTitle] = useState('')
  const studyTitleRef = useRef('')

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
  const pauseCountRef = useRef(0)

  const [ghostCount, setGhostCount] = useState(0)
  const ghostCountRef = useRef(0)
  const zeroStreakRef = useRef(0)

  // Achievement card
  const achieveCanvasRef = useRef<HTMLCanvasElement>(null)
  const [bgPhoto, setBgPhoto] = useState<HTMLImageElement | null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [cardDrawn, setCardDrawn] = useState(false)
  const [restoredSession, setRestoredSession] = useState(false)
  const [cardLoading, setCardLoading] = useState(false)

  // Session history
  const [history, setHistory] = useState<{
    id: string, focus_secs: number, target_mins: number,
    sessions: number, pause_count: number, presence_pct: number,
    vibe: string, created_at: string, study_title?: string
  }[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [historyBgPhoto, setHistoryBgPhoto] = useState<{ [id: string]: HTMLImageElement }>({})
  const historyPhotoInputRef = useRef<HTMLInputElement>(null)
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)

  // ── Fullscreen logic ─────────────────────────────────
  useEffect(() => {
    isIOS.current = /iPhone|iPad|iPod/i.test(navigator.userAgent)
  }, [])

  const enterFullscreen = useCallback(() => {
    const el = fsWrapRef.current
    if (!el) return
    if (isIOS.current) {
      // iOS: CSS fullscreen fallback
      setIsFullscreen(true)
      return
    }
    if (el.requestFullscreen) {
      el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {
        // fallback to CSS if API fails
        setIsFullscreen(true)
      })
    } else {
      setIsFullscreen(true)
    }
  }, [])

  const exitFullscreen = useCallback(() => {
    if (!isIOS.current && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    }
    setIsFullscreen(false)
  }, [])

  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false)
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Lock screen orientation to portrait when fullscreen on mobile
  useEffect(() => {
    if (isFullscreen && (screen.orientation as any)?.lock) {
      (screen.orientation as any).lock('portrait').catch(() => {})
    }
    if (!isFullscreen && (screen.orientation as any)?.unlock) {
      (screen.orientation as any).unlock()
    }
  }, [isFullscreen])

  // ── mode switch — reset if timer running ────────────────
  const handleModeSwitch = useCallback((newMode: TimerMode) => {
    if (newMode === mode) return
    if (timerState !== 'idle') {
      if (timerRef.current) clearInterval(timerRef.current)
      if (motionIntervalRef.current) clearInterval(motionIntervalRef.current)
      if (awayCountIntervalRef.current) clearInterval(awayCountIntervalRef.current)
      isAwayRef.current = false
      focusSecsRef.current = 0
      setFocusSecs(0)
      setSessions(0)
      pauseCountRef.current = 0
      setPauseCount(0)
      ghostCountRef.current = 0
      setGhostCount(0)
      zeroStreakRef.current = 0
      setMotionPct(0)
      prevFrameRef.current = null
      setCardDrawn(false)
      setRestoredSession(false)
      setTimerState('idle')
      setAwayCountdown(null)
      awayTimerActiveRef.current = false
    }
    setMode(newMode)
  }, [mode, timerState])

  // ── camera ──────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 320, height: 240 },
      })
      streamRef.current = stream
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
    pauseCountRef.current += 1
    setPauseCount(pauseCountRef.current)
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
      const zero = score === 0

      if (zero && !isAwayRef.current) {
        zeroStreakRef.current += 1
        if (zeroStreakRef.current >= 25) {
          zeroStreakRef.current = 0
          cancelAwayCountdown()
          isAwayRef.current = true
          ghostCountRef.current += 1
          setGhostCount(ghostCountRef.current)
          setTimerState('paused-ghost')
        }
      } else if (!zero && isAwayRef.current) {
        zeroStreakRef.current = 0
        isAwayRef.current = false
        setTimerState('running')
      } else if (!zero) {
        zeroStreakRef.current = 0
      }

      if (high && !isAwayRef.current && !awayTimerActiveRef.current) {
        startAwayCountdown()
      } else if (!high && awayTimerActiveRef.current && !isAwayRef.current) {
        cancelAwayCountdown()
      } else if (!high && isAwayRef.current && timerState === 'paused-away') {
        isAwayRef.current = false
        setTimerState('running')
      }
    }, 400)
  }, [getMotionScore, startAwayCountdown, cancelAwayCountdown, timerState])

  const stopMotionWatch = useCallback(() => {
    if (motionIntervalRef.current) clearInterval(motionIntervalRef.current)
    cancelAwayCountdown()
  }, [cancelAwayCountdown])

  // ── timer tick ──────────────────────────────────────────
  const startTick = useCallback(() => {
    timerRef.current = setInterval(() => {
      if (!isAwayRef.current) {
        focusSecsRef.current += 1
        setFocusSecs(focusSecsRef.current)
      }
    }, 1000)
  }, [])

  const stopTick = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
  }, [])

  // ── achievement card drawing ─────────────────────────────
  const drawAchievementCard = useCallback(async () => {
    const c = achieveCanvasRef.current
    if (!c) return
    setCardLoading(true)
    const ctx = c.getContext('2d')!
    const CW = 1080, CH = 1920
    c.width = CW; c.height = CH

    if (bgPhoto) {
      const scale = Math.max(CW / bgPhoto.width, CH / bgPhoto.height)
      const sw = bgPhoto.width * scale, sh = bgPhoto.height * scale
      ctx.drawImage(bgPhoto, (CW - sw) / 2, (CH - sh) / 2, sw, sh)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(0, 0, CW, CH)
    } else {
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, CW, CH)
      const grad = ctx.createLinearGradient(0, 0, 0, CH * 0.4)
      grad.addColorStop(0, 'rgba(255,107,157,0.08)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CW, CH)
    }

    const pad = 90
    ctx.textBaseline = 'top'

    await new Promise<void>(resolve => {
      const logoImg = new Image()
      logoImg.onload = () => {
        ctx.drawImage(logoImg, pad, 100, 88, 88)
        resolve()
      }
      logoImg.onerror = () => resolve()
      logoImg.src = '/cc-logo.png'
    })

    ctx.font = `500 52px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.fillText('Cotton Candy', pad + 108, 106)
    ctx.font = `400 32px -apple-system, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText('cottoncandy-s.com', pad + 108, 166)

    ctx.font = `400 36px -apple-system, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('Focus session', pad, 290)

    const focusDisplay = fmtDisplay(focusSecsRef.current)
    ctx.font = `500 ${focusDisplay.length > 6 ? 130 : 160}px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(focusDisplay, pad, 340)

    const targetSecs = targetMins * 60
    const presencePct = Math.min(100, Math.round((focusSecsRef.current / targetSecs) * 100))
    ctx.font = `400 36px -apple-system, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('Target reached', pad, 560)
    ctx.font = `500 120px -apple-system, sans-serif`
    ctx.fillStyle = '#FF6B9D'
    ctx.fillText(`${presencePct}%`, pad, 605)

    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(pad, 790); ctx.lineTo(CW - pad, 790); ctx.stroke()

    const pct = presencePct
    const vibe = pct >= 100 ? 'certified nerd fr'
      : pct >= 80 ? 'almost there bestie'
      : pct >= 60 ? 'not bad, keep going'
      : pct >= 40 ? 'mid session energy'
      : pct >= 20 ? 'just warming up huh'
      : 'bro just opened the app'

    const stats = mode === 'camera'
      ? [
          { label: 'Motion pauses', val: String(pauseCountRef.current) },
          { label: 'Ghost exits', val: String(ghostCountRef.current) },
          { label: 'Studying', val: studyTitleRef.current || '—' },
          { label: 'Target', val: `${targetMins}m` },
          { label: 'Vibe check', val: vibe },
        ]
      : [
          { label: 'Studying', val: studyTitleRef.current || '—' },
          { label: 'Target', val: `${targetMins}m` },
          { label: 'Vibe check', val: vibe },
        ]

    const colW = (CW - pad * 2) / 2
    stats.forEach((s, i) => {
      const x = pad + (i % 2) * colW
      const y = 830 + Math.floor(i / 2) * 180
      ctx.font = `400 30px -apple-system, sans-serif`
      ctx.fillStyle = 'rgba(255,255,255,0.38)'
      ctx.fillText(s.label, x, y)
      const isText = s.label === 'Vibe check' || s.label === 'Studying'
      ctx.font = `500 ${isText ? 42 : 68}px -apple-system, sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.fillText(s.val, x, y + (isText ? 50 : 40))
    })

    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad, CH - 200); ctx.lineTo(CW - pad, CH - 200); ctx.stroke()

    ctx.font = `400 30px -apple-system, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText('Focus like a student. Study with Cotton Candy.', pad, CH - 170)

    ctx.textAlign = 'right'
    ctx.font = `500 30px -apple-system, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('#cottoncandystudy', CW - pad, CH - 170)
    ctx.textAlign = 'left'

    setCardDrawn(true)
    setCardLoading(false)
  }, [bgPhoto, targetMins, sessions, mode])

  useEffect(() => {
    if (restoredSession) {
      setTimeout(() => drawAchievementCard(), 50)
    }
  }, [restoredSession, drawAchievementCard])

  useEffect(() => {
    if (timerState === 'stopped' && bgPhoto) drawAchievementCard()
  }, [bgPhoto, drawAchievementCard])

  // ── controls ────────────────────────────────────────────
  const handleStart = useCallback(() => {
    isAwayRef.current = false
    setTimerState('running')
    setSessions(s => s + 1)
    startTick()
    if (mode === 'camera') startMotionWatch()
  }, [startTick, startMotionWatch, mode])

  const handleStop = useCallback(() => {
    setTimerState('stopped')
    stopTick()
    if (mode === 'camera') stopMotionWatch()
    isAwayRef.current = false
    // Exit fullscreen when session ends
    if (isFullscreen) exitFullscreen()
    localStorage.setItem('cc_last_session', JSON.stringify({
      focusSecs: focusSecsRef.current,
      sessions,
      pauseCount: pauseCountRef.current,
      targetMins,
      studyTitle: studyTitleRef.current,
      timestamp: Date.now(),
    }))
    setTimeout(() => drawAchievementCard(), 100)
    const targetSecs = targetMins * 60
    const pct = Math.min(100, Math.round((focusSecsRef.current / targetSecs) * 100))
    const v = pct >= 100 ? 'certified nerd fr'
      : pct >= 80 ? 'almost there bestie'
      : pct >= 60 ? 'not bad, keep going'
      : pct >= 40 ? 'mid session energy'
      : pct >= 20 ? 'just warming up huh'
      : 'bro just opened the app'
    fetch('/api/study-sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        focus_secs: focusSecsRef.current,
        target_mins: targetMins,
        sessions,
        pause_count: pauseCountRef.current,
        presence_pct: pct,
        vibe: v,
        study_title: studyTitleRef.current || null,
      }),
    }).then(r => r.json()).then(({ session }) => {
      // Fallback: if backend doesn't yet persist study_title, keep what we typed locally
      if (session) setHistory(h => [{ ...session, study_title: session.study_title ?? studyTitleRef.current }, ...h])
    })
  }, [stopTick, stopMotionWatch, drawAchievementCard, sessions, targetMins, mode, isFullscreen, exitFullscreen])

  const handleReset = useCallback(() => {
    setTimerState('idle')
    stopTick()
    if (mode === 'camera') stopMotionWatch()
    isAwayRef.current = false
    focusSecsRef.current = 0
    setFocusSecs(0)
    setSessions(0)
    pauseCountRef.current = 0
    setPauseCount(0)
    ghostCountRef.current = 0
    setGhostCount(0)
    zeroStreakRef.current = 0
    setMotionPct(0)
    prevFrameRef.current = null
    setCardDrawn(false)
    setRestoredSession(false)
    setStudyTitle('')
    studyTitleRef.current = ''
    localStorage.removeItem('cc_last_session')
  }, [stopTick, stopMotionWatch, mode])

  useEffect(() => () => {
    stopTick()
    stopMotionWatch()
    streamRef.current?.getTracks().forEach(t => t.stop())
  }, [stopTick, stopMotionWatch])

  useEffect(() => {
    const style = document.createElement('style')
    style.innerHTML = `@keyframes cc-slide { 0% { width: 0%; margin-left: 0% } 50% { width: 60%; margin-left: 20% } 100% { width: 0%; margin-left: 100% } }`
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('cc_last_session')
      if (!raw) return
      const saved = JSON.parse(raw)
      const age = Date.now() - saved.timestamp
      if (age > 24 * 60 * 60 * 1000) return
      focusSecsRef.current = saved.focusSecs
      setFocusSecs(saved.focusSecs)
      setSessions(saved.sessions)
      pauseCountRef.current = saved.pauseCount
      setPauseCount(saved.pauseCount)
      setTargetMins(saved.targetMins)
      if (saved.studyTitle) {
        setStudyTitle(saved.studyTitle)
        studyTitleRef.current = saved.studyTitle
      }
      setTimerState('stopped')
      setRestoredSession(true)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetch('/api/study-sessions')
      .then(r => r.json())
      .then(({ sessions: data }) => { if (data) setHistory(data) })
      .catch(() => {})
  }, [])

  const handleHistoryPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f || !activeHistoryId) return
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => setHistoryBgPhoto(prev => ({ ...prev, [activeHistoryId]: img }))
    img.src = url
  }

  const saveHistoryCard = async (s: typeof history[0]) => {
    const c = document.createElement('canvas')
    const ctx = c.getContext('2d')!
    const CW = 1080, CH = 1920
    c.width = CW; c.height = CH
    const bg = historyBgPhoto[s.id]
    if (bg) {
      const scale = Math.max(CW / bg.width, CH / bg.height)
      const sw = bg.width * scale, sh = bg.height * scale
      ctx.drawImage(bg, (CW - sw) / 2, (CH - sh) / 2, sw, sh)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, CW, CH)
    } else {
      ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0, 0, CW, CH)
      const grad = ctx.createLinearGradient(0, 0, 0, CH * 0.4)
      grad.addColorStop(0, 'rgba(255,107,157,0.08)'); grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad; ctx.fillRect(0, 0, CW, CH)
    }
    const pad = 90
    ctx.textBaseline = 'top'
    await new Promise<void>(resolve => {
      const logo = new Image()
      logo.onload = () => { ctx.drawImage(logo, pad, 100, 88, 88); resolve() }
      logo.onerror = () => resolve()
      logo.src = '/cc-logo.png'
    })
    ctx.font = '500 52px -apple-system, sans-serif'; ctx.fillStyle = '#fff'
    ctx.fillText('Cotton Candy', pad + 108, 106)
    ctx.font = '400 32px -apple-system, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText('cottoncandy-s.com', pad + 108, 166)
    ctx.font = '400 36px -apple-system, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('Focus session', pad, 290)
    const focusDisplay = fmtDisplay(s.focus_secs)
    ctx.font = `500 ${focusDisplay.length > 6 ? 130 : 160}px -apple-system, sans-serif`
    ctx.fillStyle = '#fff'; ctx.fillText(focusDisplay, pad, 340)
    ctx.font = '400 36px -apple-system, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('Target reached', pad, 560)
    ctx.font = '500 120px -apple-system, sans-serif'; ctx.fillStyle = '#FF6B9D'
    ctx.fillText(`${s.presence_pct}%`, pad, 605)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(pad, 790); ctx.lineTo(CW - pad, 790); ctx.stroke()
    const wasCameraMode = s.pause_count > 0
    const stats = wasCameraMode
      ? [
          { label: 'Motion pauses', val: String(s.pause_count) },
          { label: 'Studying', val: s.study_title || '—' },
          { label: 'Target', val: `${s.target_mins}m` },
          { label: 'Vibe check', val: s.vibe },
        ]
      : [
          { label: 'Studying', val: s.study_title || '—' },
          { label: 'Target', val: `${s.target_mins}m` },
          { label: 'Vibe check', val: s.vibe },
        ]
    const colW = (CW - pad * 2) / 2
    stats.forEach((st, i) => {
      const x = pad + (i % 2) * colW
      const y = 830 + Math.floor(i / 2) * 180
      ctx.font = '400 30px -apple-system, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.38)'
      ctx.fillText(st.label, x, y)
      const isText = st.label === 'Vibe check' || st.label === 'Studying'
      ctx.font = `500 ${isText ? 42 : 68}px -apple-system, sans-serif`; ctx.fillStyle = '#fff'
      ctx.fillText(st.val, x, y + (isText ? 50 : 40))
    })
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad, CH - 200); ctx.lineTo(CW - pad, CH - 200); ctx.stroke()
    ctx.font = '400 30px -apple-system, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText('Focus like a student. Study with Cotton Candy.', pad, CH - 170)
    ctx.textAlign = 'right'; ctx.font = '500 30px -apple-system, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillText('#cottoncandystudy', CW - pad, CH - 170)
    ctx.textAlign = 'left'

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile && navigator.share) {
      await new Promise<void>(resolve => {
        c.toBlob(async (blob) => {
          if (!blob) { resolve(); return }
          const file = new File([blob], 'cotton-candy-study.png', { type: 'image/png' })
          try { await navigator.share({ files: [file], title: 'Cotton Candy Study' }) } catch {}
          resolve()
        }, 'image/png')
      })
    } else {
      const link = document.createElement('a')
      link.download = 'cotton-candy-study.png'
      link.href = c.toDataURL('image/png')
      link.click()
    }
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const url = URL.createObjectURL(f)
    const img = new Image()
    img.onload = () => setBgPhoto(img)
    img.src = url
  }

  const downloadCard = async () => {
    await drawAchievementCard()
    const c = achieveCanvasRef.current
    if (!c) return
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile && navigator.share) {
      await new Promise<void>(resolve => {
        c.toBlob(async (blob) => {
          if (!blob) { resolve(); return }
          const file = new File([blob], 'cotton-candy-study.png', { type: 'image/png' })
          try { await navigator.share({ files: [file], title: 'Cotton Candy Study' }) } catch {}
          resolve()
        }, 'image/png')
      })
      return
    }
    const link = document.createElement('a')
    link.download = 'cotton-candy-study.png'
    link.href = c.toDataURL('image/png')
    link.click()
  }

  const isRunning = timerState === 'running' || timerState === 'paused-away'
  const isPausedAway = timerState === 'paused-away'
  const isGhost = timerState === 'paused-ghost'
  const isStopped = timerState === 'stopped'
  const targetSecs = targetMins * 60
  const progress = Math.min(1, focusSecs / targetSecs)

  const remainingSecs = Math.max(0, targetSecs - focusSecs)
  const expectedFinish = new Date(Date.now() + remainingSecs * 1000)

  const bm = lang === 'bm'
  const t = {
    title: bm ? 'Timer Fokus' : 'Focus timer',
    grantBtn: bm ? 'Benarkan kamera' : 'Allow camera',
    camPrompt: bm ? 'Kamera diperlukan untuk detect presence kau' : 'Camera required to detect your presence',
    camErr: bm ? 'Kamera tak dapat diakses. Semak permission browser.' : 'Camera unavailable. Check browser permissions.',
    focused: bm ? 'Fokus' : 'Focused',
    paused: bm ? 'Paused' : 'Paused',
    labelPaused: bm ? 'balik ke tempat duduk' : 'return to your seat',
    awayMsg: bm ? 'Kau dah gerak — pause dalam' : 'Movement detected — pausing in',
    start: bm ? 'Mula' : 'Start',
    stop: bm ? 'Selesai' : 'Finish',
    reset: bm ? 'Reset' : 'Reset',
    target: bm ? 'Sasaran' : 'Target',
    titlePlaceholder: bm ? 'Apa yang kau study? (cth: Bab 3 Kimia)' : 'What are you studying? (e.g. Chapter 3 Chemistry)',
    of: bm ? 'daripada' : 'of',
    achievement: bm ? 'Pencapaian kau' : 'Your achievement',
    uploadPhoto: bm ? 'Tukar gambar latar' : 'Upload background photo',
    download: bm ? 'Simpan kad' : 'Save card',
    newSession: bm ? 'Sesi baru' : 'New session',
    expectedFinish: bm ? 'Jangka tamat' : 'Expected finish',
    timeAchieved: bm ? 'Masa fokus' : 'Time achieved',
    fullscreen: bm ? 'Skrin penuh' : 'Fullscreen',
    exitFullscreen: bm ? 'Keluar skrin penuh' : 'Exit fullscreen',
  }

  // Fullscreen button — shared between modes
  const FsBtn = () => (
    <button
      onClick={isFullscreen ? exitFullscreen : enterFullscreen}
      title={isFullscreen ? t.exitFullscreen : t.fullscreen}
      style={{
        position: 'absolute', top: 12, right: 12, zIndex: 10,
        width: 32, height: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.10)',
        border: '0.5px solid rgba(255,255,255,0.15)',
        borderRadius: 8, cursor: 'pointer', color: 'rgba(255,255,255,0.6)',
        backdropFilter: 'blur(8px)',
        transition: 'background 0.15s, color 0.15s',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.18)'
        ;(e.currentTarget as HTMLButtonElement).style.color = '#fff'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.10)'
        ;(e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.6)'
      }}
    >
      {isFullscreen ? <IconCompress /> : <IconExpand />}
    </button>
  )

  const S = {
    page: { maxWidth: 480, margin: '0 auto', padding: '0 0 60px' } as React.CSSProperties,
    statCard: { background: '#f5f5f7', borderRadius: 10, padding: '10px 14px' } as React.CSSProperties,
    btnRow: { display: 'flex', gap: 8, marginBottom: 8 } as React.CSSProperties,
    targetRow: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginBottom: 16, flexWrap: 'wrap' as const,
    },
    divider: { border: 'none', borderTop: '0.5px solid rgba(0,0,0,0.06)', margin: '28px 0' } as React.CSSProperties,
    achieveWrap: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
    cardPreview: { width: '100%', borderRadius: 16, display: 'block', border: '0.5px solid rgba(0,0,0,0.06)' } as React.CSSProperties,
    uploadBtn: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '11px', borderRadius: 10, background: '#f5f5f7',
      border: '0.5px solid rgba(0,0,0,0.06)', fontSize: 13, fontWeight: 500,
      color: 'rgba(29,29,31,0.7)', cursor: 'pointer', fontFamily: 'inherit',
    } as React.CSSProperties,
    dlBtn: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '13px', borderRadius: 10, background: '#1d1d1f',
      border: 'none', fontSize: 14, fontWeight: 500,
      color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
    } as React.CSSProperties,
    camPromptWrap: {
      position: 'absolute' as const, inset: 0,
      display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', justifyContent: 'center', gap: 10, padding: 24,
    },
    statusPill: {
      position: 'absolute' as const, top: 10, left: '50%', transform: 'translateX(-50%)',
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(0,0,0,0.55)', padding: '5px 12px', borderRadius: 999,
    },
  }

  // Fullscreen wrapper styles — CSS fallback for iOS
  const fsWrapStyle: React.CSSProperties = isFullscreen
    ? {
        position: 'fixed', inset: 0, zIndex: 9999,
        background: '#0A0A10',
        display: 'flex', flexDirection: 'column',
        alignItems: 'stretch', justifyContent: 'center',
        padding: '24px 20px',
        overflowY: 'auto',
      }
    : {}

  return (
    <div style={S.page}>

      {/* Header — hidden during fullscreen */}
      {!isFullscreen && (
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f' }}>
            {t.title}
          </h1>
        </div>
      )}

      {/* ── Fullscreen outer wrapper ── */}
      <div ref={fsWrapRef} style={fsWrapStyle}>

        {/* ── 2-Pill Mode Toggle ── */}
        {!isStopped && (
          <div style={{
            display: 'flex', gap: 4, marginBottom: 20,
            background: isFullscreen ? 'rgba(255,255,255,0.06)' : '#f0f0f2',
            borderRadius: 12, padding: 4,
          }}>
            {(['timer-only', 'camera'] as TimerMode[]).map(m => {
              const active = mode === m
              const label = m === 'timer-only'
                ? (bm ? 'Timer Sahaja' : 'Timer Only')
                : (bm ? 'Kamera' : 'Camera')
              return (
                <button
                  key={m}
                  onClick={() => handleModeSwitch(m)}
                  style={{
                    flex: 1, padding: '9px 12px',
                    borderRadius: 9, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                    background: active
                      ? 'linear-gradient(135deg, #FF6B9D, #C471F5)'
                      : 'transparent',
                    color: active ? '#fff' : isFullscreen ? 'rgba(255,255,255,0.35)' : 'rgba(29,29,31,0.5)',
                    transition: 'all 0.2s',
                    boxShadow: active ? '0 1px 6px rgba(196,113,245,0.3)' : 'none',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        )}

        {/* Target picker */}
        {!isStopped && (
          <div style={S.targetRow}>
            <span style={{ fontSize: 12, color: isFullscreen ? 'rgba(255,255,255,0.3)' : 'rgba(29,29,31,0.45)' }}>{t.target}:</span>
            {TARGET_OPTIONS.map(m => (
              <button key={m} onClick={() => setTargetMins(m)} style={{
                padding: '5px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                background: targetMins === m
                  ? (isFullscreen ? '#fff' : '#1d1d1f')
                  : (isFullscreen ? 'rgba(255,255,255,0.08)' : '#f0f0f2'),
                color: targetMins === m
                  ? (isFullscreen ? '#1d1d1f' : '#fff')
                  : (isFullscreen ? 'rgba(255,255,255,0.5)' : 'rgba(29,29,31,0.6)'),
                transition: 'background 0.15s',
              }}>
                {m}m
              </button>
            ))}
            <form onSubmit={e => {
              e.preventDefault()
              const v = parseInt(customTarget)
              if (v > 0 && v <= 480) { setTargetMins(v); setCustomTarget('') }
            }} style={{ display: 'flex', gap: 4 }}>
              <input
                type="number" min={1} max={480} placeholder="Custom"
                value={customTarget}
                onChange={e => setCustomTarget(e.target.value)}
                style={{
                  width: 72, padding: '5px 10px', borderRadius: 999,
                  border: '0.5px solid rgba(0,0,0,0.1)', fontSize: 12,
                  fontFamily: 'inherit',
                  background: isFullscreen ? 'rgba(255,255,255,0.08)' : '#f0f0f2',
                  color: isFullscreen ? '#fff' : '#1d1d1f',
                }}
              />
            </form>
          </div>
        )}

        {/* Study title input */}
        {!isStopped && timerState === 'idle' && (
          <div style={{ marginBottom: 16 }}>
            <input
              type="text" maxLength={60}
              placeholder={t.titlePlaceholder}
              value={studyTitle}
              onChange={e => { setStudyTitle(e.target.value); studyTitleRef.current = e.target.value }}
              style={{
                width: '100%', padding: '10px 14px', borderRadius: 10,
                border: isFullscreen ? '0.5px solid rgba(255,255,255,0.12)' : '0.5px solid rgba(0,0,0,0.08)',
                fontSize: 13, fontFamily: 'inherit', textAlign: 'center',
                background: isFullscreen ? 'rgba(255,255,255,0.06)' : '#f5f5f7',
                color: isFullscreen ? '#fff' : '#1d1d1f',
              }}
            />
          </div>
        )}

        {/* ════════════════════════════════════════
            TIMER ONLY MODE
        ════════════════════════════════════════ */}
        {mode === 'timer-only' && !isStopped && (
          <div style={{ marginBottom: 20 }}>
            {/* Timer hero card */}
            <div style={{
              background: '#0A0A10',
              borderRadius: isFullscreen ? 0 : 24,
              padding: isFullscreen ? '20px 28px 28px' : '36px 28px 28px',
              border: isFullscreen ? 'none' : '0.5px solid rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              position: 'relative',
            }}>
              {/* Fullscreen button */}
              <FsBtn />

              {/* CC Branding */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isFullscreen ? 12 : 20 }}>
                <img src="/cc-logo.png" alt="" style={{ width: 22, height: 22, borderRadius: 5, objectFit: 'contain' }} />
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.12em',
                  color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase',
                }}>
                  Cotton Candy
                </span>
              </div>

              {/* Big timer — scales with viewport, always fits */}
              <div style={{
                fontSize: isFullscreen ? 'clamp(64px, 22vw, 220px)' : 'clamp(48px, 18vw, 140px)',
                fontWeight: 600,
                letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
                color: timerState === 'idle' ? 'rgba(255,255,255,0.3)' : '#ffffff',
                lineHeight: 1,
                marginBottom: isFullscreen ? 32 : 24,
                fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                transition: 'color 0.3s, font-size 0.3s',
                maxWidth: '100%',
                textAlign: 'center',
              }}>
                {fmt(focusSecs)}
              </div>

              {/* Progress bar */}
              <div style={{ width: '100%', marginBottom: 20 }}>
                <div style={{ height: 2, background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${progress * 100}%`,
                    background: 'linear-gradient(90deg, #FF6B9D, #C471F5)',
                    borderRadius: 2,
                    transition: 'width 0.5s',
                  }} />
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 6, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {Math.round(progress * 100)}% of {targetMins}m
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
                    {t.expectedFinish}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: 'rgba(255,255,255,0.8)', fontVariantNumeric: 'tabular-nums' }}>
                    {timerState === 'running' || timerState === 'paused-away' || timerState === 'paused-ghost'
                      ? fmtTime(expectedFinish)
                      : '—'}
                  </div>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px' }}>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)', marginBottom: 6 }}>
                    {t.timeAchieved}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 500, color: '#FF6B9D', fontVariantNumeric: 'tabular-nums' }}>
                    {focusSecs > 0 ? fmtDisplay(focusSecs) : '—'}
                  </div>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ ...S.btnRow, marginTop: 12 }}>
              <button
                onClick={isRunning ? handleStop : handleStart}
                style={{
                  flex: 1, padding: '13px', borderRadius: 10,
                  background: isRunning
                    ? '#ef4444'
                    : 'linear-gradient(135deg, #FF6B9D, #C471F5)',
                  color: '#fff', border: 'none',
                  fontSize: 14, fontWeight: 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'opacity 0.2s',
                }}
              >
                {isRunning ? t.stop : t.start}
              </button>
              {(isRunning || focusSecs > 0) && (
                <button onClick={handleReset} style={{
                  padding: '13px 18px', borderRadius: 10,
                  background: isFullscreen ? 'rgba(255,255,255,0.08)' : '#fff',
                  border: isFullscreen ? '0.5px solid rgba(255,255,255,0.12)' : '0.5px solid rgba(0,0,0,0.08)',
                  fontSize: 14, cursor: 'pointer',
                  color: isFullscreen ? 'rgba(255,255,255,0.6)' : 'rgba(29,29,31,0.6)',
                  fontFamily: 'inherit',
                }}>
                  {t.reset}
                </button>
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════
            CAMERA MODE
        ════════════════════════════════════════ */}
        {mode === 'camera' && !isStopped && (
          <div style={{ marginBottom: 20 }}>
            {/* Ring wrapping video */}
            <div style={{ position: 'relative', width: '100%', paddingBottom: '75%' }}>
              <svg
                viewBox="0 0 100 75"
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  zIndex: 2, pointerEvents: 'none',
                }}
              >
                <circle cx="50" cy="37.5" r="34" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="2.2" />
                <circle
                  cx="50" cy="37.5" r="34"
                  fill="none"
                  stroke={isPausedAway ? '#ef4444' : isGhost ? '#6366f1' : '#1d1d1f'}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 34 * progress} ${2 * Math.PI * 34}`}
                  transform="rotate(-90 50 37.5)"
                  style={{ transition: 'stroke-dasharray 0.5s, stroke 0.3s' }}
                />
              </svg>

              <div style={{
                position: 'absolute',
                top: '5%', left: '5%', right: '5%', bottom: '5%',
                borderRadius: 12, overflow: 'hidden', background: '#111',
                border: '0.5px solid rgba(0,0,0,0.08)',
                zIndex: 1,
              }}>
                {!camReady && (
                  <div style={S.camPromptWrap}>
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
                <video ref={videoRef} autoPlay playsInline muted style={{
                  width: '100%', height: '100%', objectFit: 'cover',
                  transform: 'scaleX(-1)', display: camReady ? 'block' : 'none',
                }} />
                <canvas ref={canvasRef} width={W} height={H} style={{ display: 'none' }} />

                {camReady && (
                  <div style={S.statusPill}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: isPausedAway ? '#ef4444' : awayCountdown !== null ? '#f59e0b' : '#22c55e',
                    }} />
                    <span style={{ fontSize: 11, color: '#fff', whiteSpace: 'nowrap' }}>
                      {isPausedAway ? t.paused : t.focused}
                    </span>
                  </div>
                )}

                {/* Fullscreen button — sits inside video box, top-right */}
                <button
                  onClick={isFullscreen ? exitFullscreen : enterFullscreen}
                  title={isFullscreen ? t.exitFullscreen : t.fullscreen}
                  style={{
                    position: 'absolute', top: 10, right: 10, zIndex: 5,
                    width: 30, height: 30,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.45)',
                    border: '0.5px solid rgba(255,255,255,0.15)',
                    borderRadius: 7, cursor: 'pointer', color: 'rgba(255,255,255,0.7)',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  {isFullscreen ? <IconCompress /> : <IconExpand />}
                </button>

                {camReady && (
                  <div style={{
                    position: 'absolute', bottom: 10, left: 12, right: 12,
                    height: 3, background: 'rgba(255,255,255,0.12)', borderRadius: 2, overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%', width: `${motionPct}%`,
                      background: motionPct > 60 ? '#ef4444' : '#22c55e',
                      borderRadius: 2, transition: 'width 0.1s',
                    }} />
                  </div>
                )}

                {awayCountdown !== null && !isPausedAway && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}>
                    <p style={{ color: '#fff', fontSize: 13, fontWeight: 500, margin: 0 }}>{t.awayMsg}</p>
                    <div style={{ fontSize: 44, fontWeight: 500, color: '#f59e0b', lineHeight: 1 }}>{awayCountdown}</div>
                  </div>
                )}

                {isPausedAway && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.52)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      background: 'rgba(239,68,68,0.15)', border: '0.5px solid rgba(239,68,68,0.35)',
                      borderRadius: 12, padding: '10px 20px',
                    }}>
                      <p style={{ color: '#fca5a5', fontSize: 13, fontWeight: 500, margin: 0 }}>{t.labelPaused}</p>
                    </div>
                  </div>
                )}

                {isGhost && (
                  <div style={{
                    position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{
                      background: 'rgba(99,102,241,0.15)', border: '0.5px solid rgba(99,102,241,0.35)',
                      borderRadius: 12, padding: '10px 20px', textAlign: 'center' as const,
                    }}>
                      <p style={{ color: 'rgba(199,210,254,0.9)', fontSize: 13, fontWeight: 500, margin: 0 }}>
                        {bm ? 'Tiada orang dikesan' : 'No one detected'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Timer + Logo bawah video */}
            <div style={{
              background: isFullscreen ? 'rgba(255,255,255,0.04)' : '#fff',
              borderRadius: 16, padding: '20px 24px 16px',
              marginTop: 12,
              border: isFullscreen ? '0.5px solid rgba(255,255,255,0.07)' : '0.5px solid rgba(0,0,0,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <img src="/cc-logo.png" alt="" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain' }} />
                <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.04em', color: isFullscreen ? 'rgba(255,255,255,0.3)' : 'rgba(29,29,31,0.4)', textTransform: 'uppercase' as const }}>
                  Cotton Candy
                </span>
              </div>
              <div style={{
                fontSize: isFullscreen ? 72 : 56,
                fontWeight: 600, letterSpacing: '-3px',
                fontVariantNumeric: 'tabular-nums',
                color: isFullscreen ? '#fff' : '#1d1d1f',
                lineHeight: 1, marginBottom: 12,
                transition: 'font-size 0.3s',
              }}>
                {fmt(focusSecs)}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, height: 4, background: isFullscreen ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${progress * 100}%`,
                    background: 'linear-gradient(90deg, #FF6B9D, #C471F5)',
                    borderRadius: 2, transition: 'width 0.5s',
                  }} />
                </div>
                <span style={{ fontSize: 12, color: isFullscreen ? 'rgba(255,255,255,0.3)' : 'rgba(29,29,31,0.4)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {Math.round(progress * 100)}% {t.of} {targetMins}m
                </span>
              </div>
            </div>

            {/* Stats — Ghost + Grade */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 10 }}>
              {[
                { label: 'Ghost', val: ghostCount },
                { label: 'Grade', val: focusSecs === 0 ? '—' : progress < 0.2 ? '...' : (() => {
                  const score = Math.max(0, Math.min(100, progress * 100) - (ghostCountRef.current * 5) - (pauseCountRef.current * 2))
                  return score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : score >= 50 ? 'E' : score >= 30 ? 'F' : 'G'
                })() },
              ].map(({ label, val }) => (
                <div key={label} style={{
                  background: isFullscreen ? 'rgba(255,255,255,0.05)' : '#f5f5f7',
                  borderRadius: 10, padding: '10px 14px',
                }}>
                  <div style={{ fontSize: 11, color: isFullscreen ? 'rgba(255,255,255,0.35)' : 'rgba(29,29,31,0.45)', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 24, fontWeight: 500, color: isFullscreen ? '#fff' : '#1d1d1f', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Camera control buttons */}
            <div style={{ ...S.btnRow, marginTop: 10 }}>
              <button
                disabled={!camReady}
                onClick={isRunning ? handleStop : handleStart}
                style={{
                  flex: 1, padding: '13px', borderRadius: 10,
                  background: isRunning ? '#ef4444' : '#1d1d1f',
                  color: '#fff', border: 'none',
                  fontSize: 14, fontWeight: 500,
                  cursor: camReady ? 'pointer' : 'not-allowed',
                  opacity: camReady ? 1 : 0.4,
                  fontFamily: 'inherit', transition: 'background 0.2s',
                }}
              >
                {isRunning ? t.stop : t.start}
              </button>
              {(isRunning || focusSecs > 0) && (
                <button onClick={handleReset} style={{
                  padding: '13px 18px', borderRadius: 10,
                  background: isFullscreen ? 'rgba(255,255,255,0.08)' : '#fff',
                  border: isFullscreen ? '0.5px solid rgba(255,255,255,0.12)' : '0.5px solid rgba(0,0,0,0.08)',
                  fontSize: 14, cursor: 'pointer',
                  color: isFullscreen ? 'rgba(255,255,255,0.6)' : 'rgba(29,29,31,0.6)',
                  fontFamily: 'inherit',
                }}>
                  {t.reset}
                </button>
              )}
            </div>
          </div>
        )}

      </div>{/* end fsWrap */}

      {/* ── Achievement card — never fullscreened ── */}
      {isStopped && (
        <>
          <div style={{ marginBottom: 20 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f' }}>
              {t.achievement}
            </h1>
            {studyTitle && (
              <div style={{ fontSize: 14, fontWeight: 500, color: '#FF6B9D', marginTop: 4 }}>
                {studyTitle}
              </div>
            )}
            <div style={{ fontSize: 12.5, color: 'rgba(29,29,31,0.5)', marginTop: 3 }}>
              {fmtDisplay(focusSecs)} · {Math.min(100, Math.round(progress * 100))}% of {targetMins}m target
            </div>
          </div>

          <div style={S.achieveWrap}>
            <canvas ref={achieveCanvasRef} style={{ display: 'none' }} />

            {cardLoading && (
              <div style={{
                width: '100%', aspectRatio: '9/16',
                borderRadius: 16, background: '#0a0a0a',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16,
              }}>
                <div style={{
                  width: 180, height: 3, background: 'rgba(255,255,255,0.08)',
                  borderRadius: 99, overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%', borderRadius: 99,
                    background: 'linear-gradient(90deg, #FF6B9D, #C471F5)',
                    animation: 'cc-slide 1.2s ease-in-out infinite',
                  }} />
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  {bm ? 'Menyediakan kad...' : 'Preparing card...'}
                </span>
              </div>
            )}

            {cardDrawn && !cardLoading && achieveCanvasRef.current && (
              <img
                key={bgPhoto ? bgPhoto.src : 'default'}
                src={achieveCanvasRef.current.toDataURL('image/png')}
                alt="Study achievement card"
                style={S.cardPreview}
              />
            )}

            <button
              style={{ ...S.uploadBtn, opacity: cardLoading ? 0.4 : 1, pointerEvents: cardLoading ? 'none' : 'auto' }}
              onClick={() => photoInputRef.current?.click()}
            >
              <Icon.Export size={16} />
              {t.uploadPhoto}
            </button>
            <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />

            <button
              style={{ ...S.dlBtn, opacity: cardLoading ? 0.4 : 1, pointerEvents: cardLoading ? 'none' : 'auto' }}
              onClick={downloadCard}
            >
              <Icon.Download size={16} />
              {cardLoading ? (bm ? 'Menyediakan...' : 'Preparing...') : t.download}
            </button>

            <button onClick={handleReset} style={{
              padding: '11px', borderRadius: 10,
              background: 'transparent', border: '0.5px solid rgba(0,0,0,0.08)',
              fontSize: 13, cursor: 'pointer',
              color: 'rgba(29,29,31,0.5)', fontFamily: 'inherit',
            }}>
              {t.newSession}
            </button>
          </div>
        </>
      )}

      {/* ── Session History ── */}
      {history.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'rgba(29,29,31,0.4)', marginBottom: 12 }}>
            Study history
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {history.map(s => {
              const isOpen = expandedId === s.id
              const date = new Date(s.created_at)
              const dateStr = date.toLocaleDateString('en-MY', { day: 'numeric', month: 'short' })
              const timeStr = date.toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' })
              return (
                <div key={s.id} style={{ borderRadius: 12, border: '0.5px solid rgba(0,0,0,0.07)', overflow: 'hidden', background: '#fff' }}>
                  <button onClick={() => setExpandedId(isOpen ? null : s.id)} style={{
                    width: '100%', display: 'flex', alignItems: 'center',
                    padding: '12px 14px', background: 'none', border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', gap: 10,
                  }}>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f' }}>
                        {fmtDisplay(s.focus_secs)}
                        <span style={{ fontSize: 11, fontWeight: 400, color: 'rgba(29,29,31,0.4)', marginLeft: 6 }}>
                          {s.presence_pct}% of {s.target_mins}m
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.4)', marginTop: 2 }}>
                        {s.study_title ? `${s.study_title} · ` : ''}{dateStr} · {timeStr}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#FF6B9D', fontWeight: 500 }}>{s.vibe}</div>
                    <div style={{ fontSize: 10, color: 'rgba(29,29,31,0.3)', marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</div>
                  </button>

                  {isOpen && (
                    <div style={{ padding: '0 14px 14px', borderTop: '0.5px solid rgba(0,0,0,0.05)' }}>
                      {s.study_title && (
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f', marginTop: 12 }}>
                          {s.study_title}
                        </div>
                      )}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: s.study_title ? 8 : 12, marginBottom: 12 }}>
                        {[
                          ...(s.pause_count > 0 ? [{ label: 'Motion pauses', val: s.pause_count }] : []),
                          { label: 'Target', val: `${s.target_mins}m` },
                          { label: 'Reached', val: `${s.presence_pct}%` },
                        ].map(({ label, val }) => (
                          <div key={label} style={{ background: '#f5f5f7', borderRadius: 8, padding: '8px 12px' }}>
                            <div style={{ fontSize: 10, color: 'rgba(29,29,31,0.4)', marginBottom: 2 }}>{label}</div>
                            <div style={{ fontSize: 18, fontWeight: 500, color: '#1d1d1f' }}>{val}</div>
                          </div>
                        ))}
                      </div>
                      {historyBgPhoto[s.id] && (
                        <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.4)', marginBottom: 8 }}>✓ Background photo ready</div>
                      )}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => { setActiveHistoryId(s.id); historyPhotoInputRef.current?.click() }}
                          style={{ flex: 1, padding: '9px', borderRadius: 8, background: '#f5f5f7', border: '0.5px solid rgba(0,0,0,0.06)', fontSize: 12, fontWeight: 500, color: 'rgba(29,29,31,0.7)', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          {historyBgPhoto[s.id] ? 'Change photo' : 'Upload photo'}
                        </button>
                        <button
                          onClick={() => saveHistoryCard(s)}
                          style={{ flex: 1, padding: '9px', borderRadius: 8, background: '#1d1d1f', border: 'none', fontSize: 12, fontWeight: 500, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}
                        >
                          Save card
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <input ref={historyPhotoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleHistoryPhotoUpload} />

    </div>
  )
}
