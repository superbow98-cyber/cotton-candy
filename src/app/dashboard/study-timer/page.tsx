'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useLang } from '@/lib/i18n/LangProvider'
import { Icon } from '@/components/ui/Icon'

const W = 80, H = 60
const MOTION_THRESHOLD = 25
const PIXEL_DIFF_THRESH = 30
const AWAY_COUNTDOWN_SECS = 3

type TimerState = 'idle' | 'running' | 'paused-away' | 'stopped'

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

export default function StudyTimer() {
  const { lang } = useLang()

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
    vibe: string, created_at: string
  }[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [historyBgPhoto, setHistoryBgPhoto] = useState<{ [id: string]: HTMLImageElement }>({})
  const historyPhotoInputRef = useRef<HTMLInputElement>(null)
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)

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

    // Background
    if (bgPhoto) {
      const scale = Math.max(CW / bgPhoto.width, CH / bgPhoto.height)
      const sw = bgPhoto.width * scale, sh = bgPhoto.height * scale
      ctx.drawImage(bgPhoto, (CW - sw) / 2, (CH - sh) / 2, sw, sh)
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(0, 0, CW, CH)
    } else {
      ctx.fillStyle = '#0a0a0a'
      ctx.fillRect(0, 0, CW, CH)
      // Subtle pink tint top
      const grad = ctx.createLinearGradient(0, 0, 0, CH * 0.4)
      grad.addColorStop(0, 'rgba(255,107,157,0.08)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, CW, CH)
    }

    const pad = 90
    ctx.textBaseline = 'top'

    // CC logo — real logo dari public/cc-logo.png
    const logoSize = 88
    await new Promise<void>(resolve => {
      const logoImg = new Image()
      logoImg.onload = () => {
        ctx.drawImage(logoImg, pad, 100, logoSize, logoSize)
        resolve()
      }
      logoImg.onerror = () => resolve() // fallback — skip logo kalau gagal load
      logoImg.src = '/cc-logo.png'
    })

    // Brand
    ctx.font = `500 52px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.fillText('Cotton Candy', pad + logoSize + 20, 106)
    ctx.font = `400 32px -apple-system, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.fillText('cottoncandy-s.com', pad + logoSize + 20, 166)

    // Session label
    ctx.font = `400 36px -apple-system, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('Focus session', pad, 290)

    // Focus time — big hero number
    const focusDisplay = fmtDisplay(focusSecsRef.current)
    ctx.font = `500 ${focusDisplay.length > 6 ? 130 : 160}px -apple-system, BlinkMacSystemFont, sans-serif`
    ctx.fillStyle = '#ffffff'
    ctx.fillText(focusDisplay, pad, 340)

    // Presence score
    const targetSecs = targetMins * 60
    const presencePct = Math.min(100, Math.round((focusSecsRef.current / targetSecs) * 100))
    ctx.font = `400 36px -apple-system, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('Target reached', pad, 560)
    ctx.font = `500 120px -apple-system, sans-serif`
    ctx.fillStyle = '#FF6B9D'
    ctx.fillText(`${presencePct}%`, pad, 605)

    // Divider line
    ctx.strokeStyle = 'rgba(255,255,255,0.1)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(pad, 790); ctx.lineTo(CW - pad, 790); ctx.stroke()

    // 4 mini stats grid
    const pct = Math.min(100, Math.round((focusSecsRef.current / targetSecs) * 100))
    const vibe = pct >= 100 ? 'in the zone, completely.'
      : pct >= 80 ? 'nearly flawless'
      : pct >= 60 ? 'solid effort today'
      : pct >= 40 ? 'progress, not perfection'
      : pct >= 20 ? 'getting started counts'
      : 'showed up.'
    const stats = [
      { label: 'Motion pauses', val: String(pauseCountRef.current) },
      { label: 'Sessions today', val: String(sessions) },
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
      // Vibe check guna font kecil sikit sebab text panjang
      const isVibe = s.label === 'Vibe check'
      ctx.font = `500 ${isVibe ? 42 : 68}px -apple-system, sans-serif`
      ctx.fillStyle = '#ffffff'
      ctx.fillText(s.val, x, y + (isVibe ? 50 : 40))
    })
    // Bottom divider
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.beginPath(); ctx.moveTo(pad, CH - 200); ctx.lineTo(CW - pad, CH - 200); ctx.stroke()

    // Tagline
    ctx.font = `400 30px -apple-system, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText('Focus like a student. Study with Cotton Candy.', pad, CH - 170)

    // Hashtag right
    ctx.textAlign = 'right'
    ctx.font = `500 30px -apple-system, sans-serif`
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.fillText('#cottoncandystudy', CW - pad, CH - 170)
    ctx.textAlign = 'left'

    // CC logo bottom right — REMOVED

    setCardDrawn(true)
    setCardLoading(false)
}, [bgPhoto, targetMins, sessions, lang])

  // Draw card after restore — delay bagi state settle
  useEffect(() => {
    if (restoredSession) {
      setTimeout(() => drawAchievementCard(), 50)
    }
  }, [restoredSession, drawAchievementCard])

  // Redraw card if bgPhoto changes while stopped
  useEffect(() => {
    if (timerState === 'stopped' && bgPhoto) drawAchievementCard()
  }, [bgPhoto, drawAchievementCard])

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
    // Save session to localStorage
    localStorage.setItem('cc_last_session', JSON.stringify({
      focusSecs: focusSecsRef.current,
      sessions,
      pauseCount: pauseCountRef.current,
      targetMins,
      timestamp: Date.now(),
    }))
    setTimeout(() => drawAchievementCard(), 100)
  // Save to Supabase
    const targetSecs = targetMins * 60
    const pct = Math.min(100, Math.round((focusSecsRef.current / targetSecs) * 100))
    const v = pct >= 100 ? 'in the zone, completely.'
  : pct >= 80 ? 'nearly flawless'
  : pct >= 60 ? 'solid effort today'
  : pct >= 40 ? 'progress, not perfection'
  : pct >= 20 ? 'getting started counts'
  : 'showed up.'
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
      }),
    }).then(r => r.json()).then(({ session }) => {
      if (session) setHistory(h => [session, ...h])
    })
  }, [stopTick, stopMotionWatch, drawAchievementCard, sessions, targetMins])

  const handleReset = useCallback(() => {
    setTimerState('idle')
    stopTick()
    stopMotionWatch()
    isAwayRef.current = false
    focusSecsRef.current = 0
    setFocusSecs(0)
    setSessions(0)
    pauseCountRef.current = 0
    setPauseCount(0)
    setMotionPct(0)
    prevFrameRef.current = null
    setCardDrawn(false)
    setRestoredSession(false)
    localStorage.removeItem('cc_last_session')
  }, [stopTick, stopMotionWatch])

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

  // Restore last session on mount (within 24 hours)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('cc_last_session')
      if (!raw) return
      const saved = JSON.parse(raw)
      const age = Date.now() - saved.timestamp
      if (age > 24 * 60 * 60 * 1000) return // expired
      focusSecsRef.current = saved.focusSecs
      setFocusSecs(saved.focusSecs)
      setSessions(saved.sessions)
      pauseCountRef.current = saved.pauseCount
      setPauseCount(saved.pauseCount)
      setTargetMins(saved.targetMins)
      setTimerState('stopped')
      setRestoredSession(true)
    } catch {
      // corrupt data — ignore
    }
  }, [])

  // Load session history on mount
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
    img.onload = () => {
      setHistoryBgPhoto(prev => ({ ...prev, [activeHistoryId]: img }))
    }
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
    const stats = [
      { label: 'Motion pauses', val: String(s.pause_count) },
      { label: 'Sessions today', val: String(s.sessions) },
      { label: 'Target', val: `${s.target_mins}m` },
      { label: 'Vibe check', val: s.vibe },
    ]
    const colW = (CW - pad * 2) / 2
    stats.forEach((st, i) => {
      const x = pad + (i % 2) * colW
      const y = 830 + Math.floor(i / 2) * 180
      ctx.font = '400 30px -apple-system, sans-serif'; ctx.fillStyle = 'rgba(255,255,255,0.38)'
      ctx.fillText(st.label, x, y)
      const isVibe = st.label === 'Vibe check'
      ctx.font = `500 ${isVibe ? 42 : 68}px -apple-system, sans-serif`; ctx.fillStyle = '#fff'
      ctx.fillText(st.val, x, y + (isVibe ? 50 : 40))
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

    // Mobile: guna Web Share API (iOS Safari, Android Chrome support)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    if (isMobile && navigator.share) {
      await new Promise<void>(resolve => {
        c.toBlob(async (blob) => {
          if (!blob) { resolve(); return }
          const file = new File([blob], 'cotton-candy-study.png', { type: 'image/png' })
          try {
            await navigator.share({ files: [file], title: 'Cotton Candy Study' })
          } catch {
            // User cancel — ignore
          }
          resolve()
        }, 'image/png')
      })
      return
    }

    // Desktop: download biasa
    const link = document.createElement('a')
    link.download = 'cotton-candy-study.png'
    link.href = c.toDataURL('image/png')
    link.click()
  }

  const isRunning = timerState === 'running' || timerState === 'paused-away'
  const isPausedAway = timerState === 'paused-away'
  const isStopped = timerState === 'stopped'
  const targetSecs = targetMins * 60
  const progress = Math.min(1, focusSecs / targetSecs)
  

  const bm = lang === 'bm'
  const t = {
    title: bm ? 'Timer Fokus' : 'Focus timer',
    subtitle: bm ? 'Timer berhenti bila kau tinggalkan tempat duduk.' : 'Timer pauses when you leave your seat.',
    grantBtn: bm ? 'Benarkan kamera' : 'Allow camera',
    camPrompt: bm ? 'Kamera diperlukan untuk detect presence kau' : 'Camera required to detect your presence',
    camErr: bm ? 'Kamera tak dapat diakses. Semak permission browser.' : 'Camera unavailable. Check browser permissions.',
    focused: bm ? 'Fokus' : 'Focused',
    paused: bm ? 'Paused' : 'Paused',
    labelPaused: bm ? 'balik ke tempat duduk' : 'return to your seat',
    awayMsg: bm ? 'Kau dah gerak — pause dalam' : 'Movement detected — pausing in',
    sessions: bm ? 'Sesi' : 'Sessions',
    pauses: bm ? 'Pause' : 'Pauses',
    start: bm ? 'Mula' : 'Start',
    stop: bm ? 'Selesai' : 'Finish',
    reset: bm ? 'Reset' : 'Reset',
    target: bm ? 'Sasaran' : 'Target',
    of: bm ? 'daripada' : 'of',
    achievement: bm ? 'Pencapaian kau' : 'Your achievement',
    uploadPhoto: bm ? 'Tukar gambar latar' : 'Upload background photo',
    download: bm ? 'Simpan kad' : 'Save card',
    newSession: bm ? 'Sesi baru' : 'New session',
  }

  // ── Inline styles ────────────────────────────────────────
  const S = {
    page: { maxWidth: 480, margin: '0 auto', padding: '0 0 60px' } as React.CSSProperties,
    header: { marginBottom: 24 } as React.CSSProperties,
    h1: { margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f' } as React.CSSProperties,
    sub: { fontSize: 12.5, color: 'rgba(29,29,31,0.5)', marginTop: 3 } as React.CSSProperties,
    camBox: {
      position: 'relative' as const, width: '100%', aspectRatio: '4/3',
      borderRadius: 16, overflow: 'hidden', background: '#111',
      border: '0.5px solid rgba(0,0,0,0.08)', marginBottom: 20,
    },
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
    timerBlock: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', marginBottom: 24 },
    ringWrap: { position: 'relative' as const, width: 140, height: 140, marginBottom: 10 },
    ringTime: {
      position: 'absolute' as const, inset: 0,
      display: 'flex', flexDirection: 'column' as const,
      alignItems: 'center', justifyContent: 'center',
    },
    statsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 },
    statCard: { background: '#f5f5f7', borderRadius: 10, padding: '10px 14px' },
    btnRow: { display: 'flex', gap: 8, marginBottom: 8 },
    targetRow: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      marginBottom: 16, flexWrap: 'wrap' as const,
    },
    sectionLabel: {
      fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
      textTransform: 'uppercase' as const, color: 'rgba(29,29,31,0.4)', marginBottom: 10,
    },
    divider: { border: 'none', borderTop: '0.5px solid rgba(0,0,0,0.06)', margin: '28px 0' },
    achieveWrap: { display: 'flex', flexDirection: 'column' as const, gap: 10 },
    cardPreview: { width: '100%', borderRadius: 16, display: 'block', border: '0.5px solid rgba(0,0,0,0.06)' },
    uploadBtn: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '11px', borderRadius: 10, background: '#f5f5f7',
      border: '0.5px solid rgba(0,0,0,0.06)', fontSize: 13, fontWeight: 500,
      color: 'rgba(29,29,31,0.7)', cursor: 'pointer', fontFamily: 'inherit',
    },
    dlBtn: {
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
      padding: '13px', borderRadius: 10, background: '#1d1d1f',
      border: 'none', fontSize: 14, fontWeight: 500,
      color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
    },
  }

  return (
    <div style={S.page}>

      {/* Header */}
      <div style={S.header}>
        <h1 style={S.h1}>{t.title}</h1>
        <div style={S.sub}>{t.subtitle}</div>
      </div>

      {/* Target picker */}
      {!isStopped && (
        <div style={S.targetRow}>
          <span style={{ fontSize: 12, color: 'rgba(29,29,31,0.45)' }}>{t.target}:</span>
          {TARGET_OPTIONS.map(m => (
            <button key={m} onClick={() => setTargetMins(m)} style={{
              padding: '5px 14px', borderRadius: 999, border: 'none', cursor: 'pointer',
              fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
              background: targetMins === m ? '#1d1d1f' : '#f0f0f2',
              color: targetMins === m ? '#fff' : 'rgba(29,29,31,0.6)',
              transition: 'background 0.15s',
            }}>
              {m}m
            </button>
          ))}
          {/* Custom */}
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
                fontFamily: 'inherit', background: '#f0f0f2', color: '#1d1d1f',
              }}
            />
          </form>
        </div>
      )}

      {/* Camera + Ring + Timer block */}
      {!isStopped && (
        <div style={{ marginBottom: 20 }}>

          {/* Ring wrapping video */}
          <div style={{ position: 'relative', width: '100%', paddingBottom: '75%' }}>
            {/* SVG ring — absolute, fills container */}
            <svg
              viewBox="0 0 100 75"
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                zIndex: 2, pointerEvents: 'none',
              }}
            >
              {/* Ring — centered in 4:3 viewBox, radius fits short side */}
              <circle
                cx="50" cy="37.5" r="34"
                fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="2.2"
              />
              <circle
                cx="50" cy="37.5" r="34"
                fill="none"
                stroke={isPausedAway ? '#ef4444' : '#1d1d1f'}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34 * progress} ${2 * Math.PI * 34}`}
                transform="rotate(-90 50 37.5)"
                style={{ transition: 'stroke-dasharray 0.5s, stroke 0.3s' }}
              />
            </svg>

            {/* Video — inset from ring edges */}
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

              {/* Status pill */}
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

              {/* Motion bar */}
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

              {/* Away countdown overlay */}
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

              {/* Paused overlay */}
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
            </div>
          </div>

          {/* Timer + branding below video */}
          <div style={{
            background: '#fff',
            borderRadius: 16,
            padding: '20px 24px 16px',
            marginTop: 12,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          }}>
            {/* Cotton Candy branding */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <img src="/cc-logo.png" alt="Cotton Candy" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'contain' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(29,29,31,0.4)', letterSpacing: '0.04em' }}>
                COTTON CANDY
              </span>
            </div>

            {/* Big timer */}
            <div style={{
              fontSize: 56, fontWeight: 600, letterSpacing: '-3px', lineHeight: 1,
              color: isPausedAway ? 'rgba(29,29,31,0.25)' : '#1d1d1f',
              fontVariantNumeric: 'tabular-nums',
              transition: 'color 0.3s',
              marginBottom: 10,
            }}>
              {fmt(focusSecs)}
            </div>

            {/* Progress bar + % */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ flex: 1, height: 2, background: 'rgba(0,0,0,0.06)', borderRadius: 1, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.round(progress * 100)}%`,
                  background: '#1d1d1f', borderRadius: 1, transition: 'width 0.5s',
                }} />
              </div>
              <span style={{ fontSize: 11, color: 'rgba(29,29,31,0.4)', fontVariantNumeric: 'tabular-nums', minWidth: 32 }}>
                {Math.round(progress * 100)}%
              </span>
              <span style={{ fontSize: 11, color: 'rgba(29,29,31,0.3)' }}>
                {t.of} {fmt(targetSecs)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {!isStopped && (
        <div style={S.statsGrid}>
          {[
            { label: t.sessions, val: sessions },
            { label: t.pauses, val: pauseCount },
          ].map(({ label, val }) => (
            <div key={label} style={S.statCard}>
              <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 24, fontWeight: 500, color: '#1d1d1f', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Control buttons */}
      {!isStopped && (
        <div style={S.btnRow}>
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
              background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)',
              fontSize: 14, cursor: 'pointer',
              color: 'rgba(29,29,31,0.6)', fontFamily: 'inherit',
            }}>
              {t.reset}
            </button>
          )}
        </div>
      )}

      {/* ── Achievement card ── */}
      {isStopped && (
        <>
          <div style={{ marginBottom: 20 }}>
            <h1 style={S.h1}>{t.achievement}</h1>
            <div style={S.sub}>{fmtDisplay(focusSecs)} · {Math.min(100, Math.round(progress * 100))}% of {targetMins}m target</div>
          </div>

          <div style={S.achieveWrap}>
            {/* Canvas preview — rendered as image */}
            <canvas ref={achieveCanvasRef} style={{ display: 'none' }} />

            {/* Loading state */}
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

            {/* Upload photo */}
            <button
              style={{ ...S.uploadBtn, opacity: cardLoading ? 0.4 : 1, pointerEvents: cardLoading ? 'none' : 'auto' }}
              onClick={() => photoInputRef.current?.click()}
            >
              <Icon.Export size={16} />
              {t.uploadPhoto}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoUpload}
            />

            {/* Download */}
            <button
              style={{ ...S.dlBtn, opacity: cardLoading ? 0.4 : 1, pointerEvents: cardLoading ? 'none' : 'auto' }}
              onClick={downloadCard}
            >
              <Icon.Download size={16} />
              {cardLoading ? (bm ? 'Menyediakan...' : 'Preparing...') : t.download}
            </button>

            {/* New session */}
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
                  {/* Row header */}
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
                        {dateStr} · {timeStr}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#FF6B9D', fontWeight: 500 }}>{s.vibe}</div>
                    <div style={{ fontSize: 10, color: 'rgba(29,29,31,0.3)', marginLeft: 4 }}>{isOpen ? '▲' : '▼'}</div>
                  </button>

                  {/* Expanded */}
                  {isOpen && (
                    <div style={{ padding: '0 14px 14px', borderTop: '0.5px solid rgba(0,0,0,0.05)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12, marginBottom: 12 }}>
                        {[
                          { label: 'Motion pauses', val: s.pause_count },
                          { label: 'Sessions', val: s.sessions },
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
                        <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.4)', marginBottom: 8 }}>
                          ✓ Background photo ready
                        </div>
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

      <input
        ref={historyPhotoInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleHistoryPhotoUpload}
      />

    </div>
  )
}
