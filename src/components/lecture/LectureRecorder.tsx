'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { type Lecture, PLANS } from '@/types'
import { lectureToMarkdown, lectureToPdf, downloadText, extractKeywords, secondsToClock } from '@/lib/export'
import { correctScientificTerms, detectSubject } from '@/lib/scientific-terms'
import { PROVIDER_ORDER, PROVIDER_META, DEFAULT_PROVIDER, type AIProvider } from '@/lib/ai-providers'
import { transcribeOne, whisperTextToLines, CapReachedError, type AudioUsageInfo } from '@/lib/whisper'
import { getRecordingTypeMeta, SECTION_LABELS } from '@/lib/recording-types'

type Line = { id: string; t: number; text: string; lang?: string }

type AISummary = {
  topics: string[]
  keyPoints: string[]
  formulas: string[]
  questions: string[]
  summary: string
}

import MindMapView from './MindMapView'
import ProcessingLoader from './ProcessingLoader'
import MicLevelMeter from './MicLevelMeter'
import KnowledgeFacts from './KnowledgeFacts'
import type { MindMapBranch } from '@/types'

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

type RecognitionLang = {
  code: string
  label: string
  flag: string
  sub: string
  key: string
}

const RECOGNITION_LANGS: RecognitionLang[] = [
  { code: 'en-US',  label: 'EN',  flag: '🇬🇧', sub: 'English',   key: 'e' },
  { code: 'ms-MY',  label: 'BM',  flag: '🇲🇾', sub: 'Malay',     key: 'm' },
  { code: 'zh-CN',  label: '中文', flag: '🇨🇳', sub: 'Chinese',   key: 'c' },
  { code: 'ta-MY',  label: 'த',   flag: '🇮🇳', sub: 'Tamil',     key: 't' },
  { code: 'ar-SA',  label: 'ع',    flag: '🇸🇦', sub: 'Arabic',    key: 'a' },
  { code: 'en-IN',  label: 'EN+', flag: '🌏', sub: 'Indian EN',  key: 'i' },
]

const STORAGE_KEY = 'cc:recLang'

// ---------------- AI LOGO (reusable) ----------------
function AILogo({ provider, size = 18 }: { provider: AIProvider; size?: number }) {
  const meta = PROVIDER_META[provider]
  const logoKey = meta.logoKey
  const wrapStyle: React.CSSProperties = {
    width: size + 12, height: size + 12, borderRadius: 10,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 1px 2px rgba(0,0,0,0.1), inset 0 0.5px 0 rgba(255,255,255,0.4)',
  }

  if (logoKey === 'auto') {
    return (
      <div style={{ ...wrapStyle, background: 'linear-gradient(135deg, #FBEAF0, #FFB7C5)' }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#4B1528" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" />
          <path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" />
        </svg>
      </div>
    )
  }
  if (logoKey === 'groq') {
    return (
      <div style={{ ...wrapStyle, background: 'linear-gradient(180deg, #FF5D3A, #E23A20)' }}>
        <svg width={size} height={size} viewBox="0 0 32 32" fill="#fff">
          <path d="M16 3C8.8 3 3 8.8 3 16s5.8 13 13 13 13-5.8 13-13S23.2 3 16 3zm0 20c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7z" />
          <circle cx="16" cy="16" r="3.5" />
        </svg>
      </div>
    )
  }
  if (logoKey === 'gemini') {
    return (
      <div style={{ ...wrapStyle, background: 'linear-gradient(135deg, #4285F4 0%, #9168C0 50%, #EA4335 100%)' }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
          <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" />
        </svg>
      </div>
    )
  }
  // gemini-lite
  return (
    <div style={{ ...wrapStyle, background: 'linear-gradient(135deg, #4796E3, #34A853)' }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
        <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
      </svg>
    </div>
  )
}

// ---------------- AI CHIP (under timer) + DROPDOWN ----------------
function AIChipPicker({
  value, onChange, disabled,
}: {
  value: AIProvider
  onChange: (v: AIProvider) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const meta = PROVIDER_META[value]

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: open ? '#fff' : 'rgba(255,255,255,0.85)',
          border: `0.5px solid ${open ? 'rgba(212,83,126,0.35)' : 'rgba(212,83,126,0.15)'}`,
          borderRadius: 10,
          padding: '5px 9px 5px 5px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(75,21,40,0.04)',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <AILogo provider={value} size={13} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#2A0A15', letterSpacing: -0.2, whiteSpace: 'nowrap' }}>
          {meta.shortLabel}
        </span>
        <span style={{
          color: open ? '#D4537E' : 'rgba(75,21,40,0.4)',
          fontSize: 9, marginLeft: 2,
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s',
        }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 50,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(50px) saturate(180%)',
          WebkitBackdropFilter: 'blur(50px) saturate(180%)',
          border: '0.5px solid rgba(212,83,126,0.15)',
          borderRadius: 18,
          padding: 8,
          width: 340,
          maxWidth: 'calc(100vw - 32px)',
          display: 'flex', flexDirection: 'column', gap: 3,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 16px 40px rgba(75,21,40,0.14)',
        }}>
          {PROVIDER_ORDER.map((p) => {
            const m = PROVIDER_META[p]
            const selected = p === value
            return (
              <button
                key={p}
                onClick={() => { onChange(p); setOpen(false) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px',
                  borderRadius: 12,
                  cursor: 'pointer',
                  background: selected ? 'rgba(255,183,197,0.28)' : 'transparent',
                  border: 'none',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'rgba(255,183,197,0.18)' }}
                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent' }}
              >
                <AILogo provider={p} size={18} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#1A0510', letterSpacing: -0.25, lineHeight: 1.3 }}>
                    {m.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(75,21,40,0.58)', lineHeight: 1.4, letterSpacing: -0.1, marginTop: 2 }}>
                    {m.descEn}
                  </div>
                </div>
                <span style={{ color: '#D4537E', fontSize: 16, fontWeight: 700, flexShrink: 0, opacity: selected ? 1 : 0 }}>✓</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------- MAIN RECORDER ----------------
export default function LectureRecorder({ id }: { id: string }) {
  const { t, lang } = useLang()
  const { tokens: s } = useTheme()
  const router = useRouter()
  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [plan, setPlan] = useState<keyof typeof PLANS>('free')
  const [lines, setLines] = useState<Line[]>([])
  const [recording, setRecording] = useState(false)

  // v56: Opt-in preferences from settings (default OFF)
  const [showMicMeter, setShowMicMeter] = useState(false)
  const [showFactsLoader, setShowFactsLoader] = useState(false)
  const [showKnowledgeFacts, setShowKnowledgeFacts] = useState(false)
  useEffect(() => {
    try {
      setShowMicMeter(localStorage.getItem('cc-show-mic-meter') === 'on')
      setShowFactsLoader(localStorage.getItem('cc-show-facts-loader') === 'on')
      setShowKnowledgeFacts(localStorage.getItem('cc-show-knowledge') === 'on')
    } catch {}
  }, [])
  const [interim, setInterim] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiResult, setAiResult] = useState<AISummary | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [recordingLang, setRecordingLang] = useState<'auto' | 'ms' | 'en' | 'zh' | 'ta'>('auto')
  const [aiUsedProvider, setAiUsedProvider] = useState<string | null>(null)
  const [aiProvider, setAiProvider] = useState<AIProvider>(DEFAULT_PROVIDER)
  const [recLang, setRecLang] = useState<string>('en-US')

  const recRef = useRef<any>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const startRef = useRef<number>(0)
  const accumRef = useRef<number>(0)
  const tickRef = useRef<any>(null)
  const recLangRef = useRef<string>('en-US')
  const lectureRef = useRef<Lecture | null>(null)
  const aiSectionRef = useRef<HTMLDivElement | null>(null)

  // --- Whisper enhancement (MediaRecorder parallel, no storage) ---
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const [enhancing, setEnhancing] = useState(false)
  const [enhanceProgress, setEnhanceProgress] = useState<{ done: number; total: number } | null>(null)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)
  const [audioCaptureOk, setAudioCaptureOk] = useState<boolean | null>(null)
  const [aiFellBack, setAiFellBack] = useState<boolean>(false)
  const [usage, setUsage] = useState<AudioUsageInfo | null>(null)
  const [capReachedDuringRec, setCapReachedDuringRec] = useState(false)

  // Auto-scroll to AI section whenever loader or result appears
  useEffect(() => {
    if (aiProcessing || aiResult) {
      setTimeout(() => {
        aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }, [aiProcessing, aiResult])

  // Load preferred recording language
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && RECOGNITION_LANGS.some(l => l.code === saved)) {
        setRecLang(saved); recLangRef.current = saved
      } else {
        const initial = lang === 'bm' ? 'ms-MY' : 'en-US'
        setRecLang(initial); recLangRef.current = initial
      }
    } catch {
      const initial = lang === 'bm' ? 'ms-MY' : 'en-US'
      setRecLang(initial); recLangRef.current = initial
    }
  }, [lang])

  // Fetch current audio usage from server
  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const res = await fetch('/api/usage')
        if (res.ok) {
          const { usage: u } = await res.json()
          if (u) setUsage(u)
        }
      } catch {}
    }
    fetchUsage()
  }, [])

  // Load lecture + AI provider preference
  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('lectures').select('*').eq('id', id).maybeSingle()
      if (!data) { router.replace('/dashboard/lectures'); return }
      const lec = data as Lecture
      setLecture(lec); lectureRef.current = lec
      if (lec.transcript_md) {
        const parsed: Line[] = []
        let idx = 0
        for (const raw of lec.transcript_md.split('\n')) {
          if (!raw.trim()) continue
          const text = raw.replace(/^-\s*/, '').trim()
          if (text) parsed.push({ id: `r${idx++}`, t: 0, text })
        }
        setLines(parsed)
      }
      setElapsed(lec.duration_seconds || 0)
      accumRef.current = lec.duration_seconds || 0
      if (lec.summary) {
        try {
          const parsed = JSON.parse(lec.summary)
          if (parsed && typeof parsed === 'object' && 'topics' in parsed) setAiResult(parsed as AISummary)
        } catch {}
      }

      // Priority: lecture.ai_provider > profile.ai_provider > DEFAULT
      const { data: prof } = await sb.from('profiles').select('plan, ai_provider').eq('id', user.id).maybeSingle()
      setPlan((prof?.plan || 'free') as keyof typeof PLANS)
      const effective: AIProvider =
        (lec.ai_provider as AIProvider) ||
        (prof?.ai_provider as AIProvider) ||
        DEFAULT_PROVIDER
      setAiProvider(effective)
    })()
  }, [id, router])

  // Save AI provider to lecture row whenever user changes it
  const updateAIProvider = async (newProvider: AIProvider) => {
    setAiProvider(newProvider)
    if (!lecture) return
    try {
      const sb = createClient()
      await sb.from('lectures').update({ ai_provider: newProvider }).eq('id', lecture.id)
    } catch (e) { console.error(e) }
  }

  // Keyboard shortcuts for language swap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
      const key = e.key.toLowerCase()
      const match = RECOGNITION_LANGS.find(l => l.key === key)
      if (match) { e.preventDefault(); swapLanguage(match.code) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording])

  const startRecognition = useCallback((langCode: string) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setSupported(false); return null }
    try {
      const r = new SR()
      r.continuous = true
      r.interimResults = true
      r.lang = langCode
      r.onresult = (e: any) => {
        let finalText = '', interimText = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const chunk = e.results[i][0].transcript
          if (e.results[i].isFinal) finalText += chunk
          else interimText += chunk
        }
        if (finalText.trim()) {
          const now = Math.floor((Date.now() - startRef.current) / 1000) + accumRef.current
          const subjectHint = detectSubject(lectureRef.current?.title || '', lectureRef.current?.subject || '') ?? undefined
          const corrected = correctScientificTerms(finalText.trim(), subjectHint)
          setLines((prev) => [...prev, {
            id: `l${Date.now()}${Math.random()}`, t: now, text: corrected, lang: recLangRef.current,
          }])
          setInterim('')
        } else {
          setInterim(interimText)
        }
      }
      r.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setPermission(false)
      }
      r.onend = () => { if (recRef.current && recording) { try { r.start() } catch {} } }
      r.start()
      return r
    } catch {
      setSupported(false); return null
    }
  }, [recording])

  const stopRecognition = () => {
    if (recRef.current) {
      try { recRef.current.onend = null; recRef.current.stop() } catch {}
      recRef.current = null
    }
  }

  const swapLanguage = (newCode: string) => {
    if (!RECOGNITION_LANGS.some(l => l.code === newCode)) return
    setRecLang(newCode); recLangRef.current = newCode
    try { localStorage.setItem(STORAGE_KEY, newCode) } catch {}
    if (recording && recRef.current) {
      stopRecognition()
      setTimeout(() => { recRef.current = startRecognition(newCode) }, 120)
    }
  }

  // Start MediaRecorder for Whisper enhancement. Sets audioCaptureOk for UI indicator.
  // IMPORTANT: On Chrome Android, Web Speech API and MediaRecorder can compete for mic.
  // We explicitly grab getUserMedia FIRST, hold the stream, then let Web Speech start.
  const startAudioCapture = async (): Promise<boolean> => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        console.warn('[audio] getUserMedia not supported in this browser')
        setAudioCaptureOk(false)
        return false
      }
      if (typeof MediaRecorder === 'undefined') {
        console.warn('[audio] MediaRecorder not supported in this browser')
        setAudioCaptureOk(false)
        return false
      }

      // Read user prefs from localStorage (default: enhancement ON)
      const enhancementOn = (() => {
        try {
          return localStorage.getItem('cc-mic-enhance') !== 'off'
        } catch { return true }
      })()
      const gainBoost = (() => {
        try {
          const v = parseFloat(localStorage.getItem('cc-mic-gain') || '1.5')
          return Math.max(0.5, Math.min(3.0, v))
        } catch { return 1.5 }
      })()

      // Request mic with browser-native enhancement (echo/noise/AGC)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: enhancementOn,
          noiseSuppression: enhancementOn,
          autoGainControl: enhancementOn,
        },
      })
      mediaStreamRef.current = stream

      // Optional: Web Audio gain boost (extra amplification before MediaRecorder)
      // Graceful fallback — if anything fails, use raw stream
      let processedStream = stream
      try {
        const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext)
        if (AudioCtx) {
          const audioCtx = new AudioCtx()
          audioCtxRef.current = audioCtx
          const source = audioCtx.createMediaStreamSource(stream)

          // v56: Analyser node — taps audio for visualizer (parallel, no effect on recording)
          const analyserNode = audioCtx.createAnalyser()
          analyserNode.fftSize = 256
          analyserNode.smoothingTimeConstant = 0.7
          source.connect(analyserNode)  // parallel branch
          analyserRef.current = analyserNode
          setAnalyser(analyserNode)

          if (enhancementOn && gainBoost !== 1.0) {
            const gain = audioCtx.createGain()
            gain.gain.value = gainBoost  // boost (1.5 = +3.5dB default)

            // Compressor — soft-knee normalize loud peaks
            const compressor = audioCtx.createDynamicsCompressor()
            compressor.threshold.value = -24
            compressor.knee.value = 30
            compressor.ratio.value = 4
            compressor.attack.value = 0.003
            compressor.release.value = 0.25

            // High-pass filter — remove low rumble (typing, fans below 80Hz)
            const hipass = audioCtx.createBiquadFilter()
            hipass.type = 'highpass'
            hipass.frequency.value = 80

            // Output to MediaStream
            const dest = audioCtx.createMediaStreamDestination()
            source.connect(hipass)
            hipass.connect(gain)
            gain.connect(compressor)
            compressor.connect(dest)
            processedStream = dest.stream
            console.log('[audio] enhancement active: gain=', gainBoost, 'hipass=80Hz, compressor on')
          } else {
            console.log('[audio] enhancement disabled (visualizer still active)')
          }
        }
      } catch (enhanceErr) {
        console.warn('[audio] enhancement failed, fallback to raw stream:', enhanceErr)
        processedStream = stream
      }

      audioChunksRef.current = []

      // Pick best supported mime type — Chrome Android prefers webm/opus
      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ]
      const mime = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) || ''

      const rec = new MediaRecorder(processedStream, mime ? { mimeType: mime } : undefined)

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data)
          console.log(`[audio] chunk received: ${(e.data.size / 1024).toFixed(0)}KB, total chunks: ${audioChunksRef.current.length}`)
        }
      }
      rec.onerror = (e) => {
        console.error('[audio] MediaRecorder error:', e)
        setAudioCaptureOk(false)
      }
      rec.onstart = () => {
        console.log('[audio] MediaRecorder started, mime:', mime || 'default')
        setAudioCaptureOk(true)
      }

      // 9-minute timeslice — auto-chunk for long lectures
      rec.start(9 * 60 * 1000)
      mediaRecRef.current = rec
      return true
    } catch (e: any) {
      console.warn('[audio] startAudioCapture failed:', e.name, e.message)
      setAudioCaptureOk(false)
      mediaRecRef.current = null
      return false
    }
  }

  const stopAudioCapture = (): Promise<Blob[]> => {
    return new Promise((resolve) => {
      const rec = mediaRecRef.current
      if (!rec || rec.state === 'inactive') {
        // Cleanup stream + audio context
        mediaStreamRef.current?.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
        if (audioCtxRef.current) {
          try { audioCtxRef.current.close() } catch {}
          audioCtxRef.current = null
        }
        analyserRef.current = null
        setAnalyser(null)
        resolve([])
        return
      }
      rec.onstop = () => {
        const chunks = audioChunksRef.current.slice()
        audioChunksRef.current = []
        mediaRecRef.current = null
        mediaStreamRef.current?.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
        if (audioCtxRef.current) {
          try { audioCtxRef.current.close() } catch {}
          audioCtxRef.current = null
        }
        analyserRef.current = null
        setAnalyser(null)
        resolve(chunks)
      }
      rec.stop()
    })
  }

  const toggle = async () => {
    if (recording) {
      stopRecognition()
      accumRef.current = accumRef.current + Math.floor((Date.now() - startRef.current) / 1000)
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      setRecording(false)
    } else {
      setAiResult(null); setAiError(null); setEnhanceError(null); setAiFellBack(false)
      setAudioCaptureOk(null)

      // 1. Start audio capture FIRST — grabs mic exclusively for MediaRecorder
      const audioOk = await startAudioCapture()
      console.log('[toggle] audio capture ready:', audioOk)

      // 2. Small delay to let mic settle before Web Speech attaches
      await new Promise(r => setTimeout(r, 150))

      // 3. Start Web Speech API for live preview
      startRef.current = Date.now()
      recRef.current = startRecognition(recLangRef.current)

      tickRef.current = setInterval(() => {
        const nowElapsed = accumRef.current + Math.floor((Date.now() - startRef.current) / 1000)
        setElapsed(nowElapsed)

        // Check per-lecture minute cap (plan limit)
        const perLectureMax = PLANS[plan].minutesPerLecture * 60
        if (nowElapsed >= perLectureMax) {
          console.log('[cap] Per-lecture limit reached:', perLectureMax, 's — auto-stopping')
          toggle()  // stops recording
          return
        }

        // Check global audio cap (remaining audio budget)
        if (usage && usage.allowed) {
          const projected = (usage.usedSeconds || 0) + nowElapsed
          if (projected >= usage.capSeconds) {
            console.log('[cap] Global audio cap reached — auto-stopping')
            setCapReachedDuringRec(true)
            toggle()
          }
        }
      }, 500)
      setRecording(true)
    }
  }

  useEffect(() => {
    if (!recording) return
    const h = setInterval(() => save(false), 15000)
    return () => clearInterval(h)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, lines, elapsed])

  const linesToMd = (ll: Line[]) => ll.map((l) => `- ${l.text}`).join('\n')

  const save = async (finish: boolean) => {
    if (!lecture) return
    setSaving(true)
    try {
      const md = linesToMd(lines)
      const wordCount = md.replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean).length
      const keywords = extractKeywords(md, 12)
      const sb = createClient()
      await sb.from('lectures').update({
        transcript_md: md, word_count: wordCount, duration_seconds: elapsed, keywords,
        status: finish ? 'finished' : 'recording',
        ended_at: finish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('id', lecture.id)
      const updated = { ...lecture, transcript_md: md, keywords, word_count: wordCount, duration_seconds: elapsed }
      setLecture(updated); lectureRef.current = updated
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const runAI = async () => {
    if (!lecture) return
    setAiProcessing(true); setAiError(null); setAiUsedProvider(null); setAiFellBack(false)
    try {
      const res = await fetch('/api/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId: lecture.id, provider: aiProvider }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) setAiError(json.error || 'AI processing failed')
      else {
        setAiResult(json.data as AISummary)
        setAiUsedProvider(json.usedProvider || null)
        setAiFellBack(!!json.fellBack)

        // Generate mindmap from AI summary topics (client-side, no extra API)
        if (!lecture.mindmap_json && json.data) {
          try {
            const summary = json.data as AISummary
            const branches: MindMapBranch[] = []

            // Take up to 6 topics for branches
            const topicLimit = Math.min(6, summary.topics?.length || 0)
            for (let i = 0; i < topicLimit; i++) {
              const topic = summary.topics[i]
              // Try match a key point as subtitle
              const subtitle = summary.keyPoints?.[i]
                ? truncate(summary.keyPoints[i], 28)
                : undefined
              branches.push({ title: topic, subtitle })
            }

            if (branches.length > 0) {
              const mindmap = {
                center: lecture.title || (lang === 'bm' ? 'Topik Utama' : 'Main Topic'),
                branches,
              }
              const sb = createClient()
              await sb.from('lectures').update({
                mindmap_json: mindmap,
              }).eq('id', lecture.id)
              const updated = { ...lecture, mindmap_json: mindmap }
              setLecture(updated); lectureRef.current = updated
            }
          } catch (e) {
            console.warn('[mindmap] Generation failed:', e)
          }
        }
      }
    } catch (e: any) { setAiError(e.message || 'Network error') }
    finally { setAiProcessing(false) }
  }

  const finishLecture = async () => {
    if (recording) {
      stopRecognition()
      accumRef.current = accumRef.current + Math.floor((Date.now() - startRef.current) / 1000)
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      setRecording(false)
    }

    // Stop audio capture and collect chunks
    const chunks = await stopAudioCapture()

    setAiResult(null)
    setAiError(null)
    setAiUsedProvider(null)
    setEnhanceError(null)

    // --- Step 1: enhance transcript with Whisper (if audio captured) ---
    if (chunks.length > 0) {
      setEnhancing(true)
      setEnhanceProgress({ done: 0, total: chunks.length })
      try {
        const texts: string[] = []
        for (let i = 0; i < chunks.length; i++) {
          try {
            const result = await transcribeOne(chunks[i], undefined, recordingLang)
            texts.push(result.text || '')
            if (result.usage) setUsage(result.usage)
            setEnhanceProgress({ done: i + 1, total: chunks.length })
          } catch (chunkErr: any) {
            if (chunkErr instanceof CapReachedError) {
              // Cap hit mid-transcription — save what we have + show banner
              console.warn('[whisper] Cap reached mid-transcription, chunk', i + 1, '/', chunks.length)
              if (chunkErr.usage) setUsage(chunkErr.usage)
              setEnhanceError(
                lang === 'bm'
                  ? `Had audio tercapai selepas ${i} chunk. Transkrip separa tersimpan.`
                  : `Audio cap reached after ${i} chunk${i === 1 ? '' : 's'}. Partial transcript saved.`,
              )
              break  // stop processing more chunks
            }
            throw chunkErr  // other errors bubble up
          }
        }
        const combined = texts.join('\n').trim()

        if (combined.length > 20) {
          const whisperLines = whisperTextToLines(combined, elapsed)
          if (whisperLines.length > 0) {
            setLines(whisperLines)
          }
        }
      } catch (e: any) {
        console.warn('[whisper] Enhancement failed, keeping Web Speech transcript:', e)
        setEnhanceError(
          lang === 'bm'
            ? 'Whisper gagal — guna transkrip live sahaja.'
            : 'Whisper enhance failed — using live transcript.',
        )
      } finally {
        setEnhancing(false)
        setEnhanceProgress(null)
      }
    }

    // --- Step 2: save + run AI ---
    setAiProcessing(true)
    try {
      await save(true)
      await runAI()
    } catch (e: any) {
      setAiError(e.message || 'Failed')
      setAiProcessing(false)
    }
  }

  const exportMd = () => {
    if (!lecture) return
    let md = lectureToMarkdown({ ...lecture, transcript_md: linesToMd(lines) })
    if (aiResult) md = buildRichMarkdown(lecture, linesToMd(lines), aiResult)
    downloadText(`${(lecture.title || 'lecture').replace(/[^\w-]+/g, '_')}.md`, md, 'text/markdown')
  }
  const exportPdf = () => {
    if (!lecture) return
    const lec = { ...lecture, transcript_md: aiResult ? buildRichMarkdown(lecture, linesToMd(lines), aiResult) : linesToMd(lines) }
    lectureToPdf(lec, { watermark: PLANS[plan].watermark, theme: s })
  }

  if (!lecture) return <div style={{ color: s.gray, padding: 20 }}>{t('loading')}</div>

  const wordCount = linesToMd(lines).replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean).length
  const currentLang = RECOGNITION_LANGS.find(l => l.code === recLang) || RECOGNITION_LANGS[0]
  const detectedSubject = detectSubject(lecture?.title || '', lecture?.subject || '')

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <h1 style={{
            fontSize: 'clamp(20px, 3vw, 24px)', margin: 0,
            fontWeight: 600, letterSpacing: '-0.025em', color: '#1d1d1f',
          }}>{lecture.title}</h1>
          <div style={{ fontSize: 12.5, color: 'rgba(29,29,31,0.55)', marginTop: 2 }}>
            {[lecture.subject, lecture.lecturer, lecture.location].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" onClick={exportMd}>⬇ .md</Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>⬇ .pdf</Button>
        </div>
      </div>

      {/* AUTO-DETECT LANGUAGE BANNER (replaces manual pills) */}
      <div style={{
        background: '#fff',
        border: '0.5px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
        padding: '12px 16px',
        marginBottom: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
          <span style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #FFB7C5, #D4537E)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
              {lang === 'bm' ? 'Auto-detect bahasa' : 'Auto-detect language'}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.55)', marginTop: 1 }}>
              {lang === 'bm'
                ? 'Cakap rojak BM, EN, 中文, Tamil, Arab — Whisper handle semua.'
                : 'Speak rojak BM, EN, 中文, Tamil, Arabic — Whisper handles all.'}
            </div>
          </div>
        </div>
        {detectedSubject && (
          <span style={{
            fontSize: 10.5, fontWeight: 600,
            background: 'rgba(29,29,31,0.06)',
            color: 'rgba(29,29,31,0.65)',
            padding: '3px 9px', borderRadius: 100,
            letterSpacing: '-0.005em',
            whiteSpace: 'nowrap',
          }}>
            {lang === 'bm' ? 'Kamus' : 'Dict'}: {detectedSubject}
          </span>
        )}
      </div>

      {/* AUDIO USAGE BAR — shows remaining cap for current plan */}
      {usage && (
        <div style={{
          background: usage.percentUsed >= 90 ? 'rgba(229,57,53,0.04)'
                    : usage.percentUsed >= 75 ? 'rgba(186,117,23,0.05)'
                    : '#fff',
          border: `0.5px solid ${
            usage.percentUsed >= 90 ? 'rgba(229,57,53,0.25)'
            : usage.percentUsed >= 75 ? 'rgba(186,117,23,0.25)'
            : 'rgba(0,0,0,0.06)'
          }`,
          borderRadius: 12,
          padding: '10px 14px',
          marginBottom: 14,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 6, gap: 10,
          }}>
            <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.6)', fontWeight: 500, letterSpacing: '-0.005em' }}>
              {lang === 'bm' ? 'Kuota audio' : 'Audio quota'}
            </div>
            <div style={{
              fontSize: 11.5, fontWeight: 600,
              color: usage.percentUsed >= 90 ? '#C62828'
                  : usage.percentUsed >= 75 ? '#8a6d0f'
                  : 'rgba(29,29,31,0.7)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {usage.capSeconds < 3600 ? (
                <>
                  {Math.floor(usage.usedSeconds / 60)} / {Math.floor(usage.capSeconds / 60)} {lang === 'bm' ? 'min' : 'min'}
                </>
              ) : (
                <>
                  {(usage.usedSeconds / 3600).toFixed(1)} / {(usage.capSeconds / 3600).toFixed(1)} {lang === 'bm' ? 'jam' : 'h'}
                </>
              )}
              <span style={{ marginLeft: 6, fontWeight: 500, opacity: 0.7 }}>
                · {usage.percentUsed}%
              </span>
            </div>
          </div>
          <div style={{
            height: 4, borderRadius: 100,
            background: 'rgba(0,0,0,0.05)', overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0,
              height: '100%', width: `${usage.percentUsed}%`,
              borderRadius: 100,
              background: usage.percentUsed >= 90 ? 'linear-gradient(90deg, #E53935, #C62828)'
                        : usage.percentUsed >= 75 ? 'linear-gradient(90deg, #F0B030, #BA7517)'
                        : 'linear-gradient(90deg, #FFB7C5, #D4537E)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          {usage.percentUsed >= 90 && !capReachedDuringRec && (
            <div style={{
              fontSize: 11, color: '#C62828', marginTop: 6,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>⚠</span>
              {lang === 'bm'
                ? `Hampir habis (${((usage.capSeconds - usage.usedSeconds) / 60).toFixed(0)} min lagi). Pertimbangkan upgrade.`
                : `Almost full (${((usage.capSeconds - usage.usedSeconds) / 60).toFixed(0)} min left). Consider upgrading.`}
            </div>
          )}
        </div>
      )}

      {/* CAP REACHED BANNER — shown when recording auto-stopped */}
      {capReachedDuringRec && (
        <div style={{
          background: 'linear-gradient(135deg, #FDE8E8, #fff)',
          border: '0.5px solid rgba(229,57,53,0.3)',
          borderRadius: 12,
          padding: '14px 16px',
          marginBottom: 14,
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <span style={{
            width: 24, height: 24, borderRadius: '50%',
            background: '#E53935', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: 14, fontWeight: 700,
          }}>!</span>
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: '#1d1d1f',
              marginBottom: 3, letterSpacing: '-0.015em',
            }}>
              {lang === 'bm' ? 'Had audio tercapai' : 'Audio cap reached'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.65)', lineHeight: 1.5 }}>
              {lang === 'bm'
                ? 'Rakaman dihentikan automatik. Upgrade pelan untuk rakam lebih.'
                : 'Recording auto-stopped. Upgrade your plan to record more.'}
            </div>
            <a href="/#pricing" style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 8, fontSize: 12, fontWeight: 500,
              color: '#1d1d1f', textDecoration: 'none',
              padding: '6px 12px', borderRadius: 7,
              background: '#fff', border: '0.5px solid rgba(0,0,0,0.12)',
            }}>
              {lang === 'bm' ? 'Lihat pelan' : 'View plans'} →
            </a>
          </div>
        </div>
      )}

      {/* RECORDER CARD — record | [timer + AI chip] | finish */}
      <div style={{
        background: '#fff', borderRadius: 24, padding: 22,
        border: `1px solid ${s.border}`, marginBottom: 18,
      }}>
        {!supported && (
          <div style={{ background: '#FDE8E8', color: '#B94141', padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 12 }}>
            ⚠ {t('recNotSupported')}
          </div>
        )}
        {!permission && (
          <div style={{ background: '#FEF3C7', color: '#92400E', padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 12 }}>
            🎤 {t('recPermission')}
          </div>
        )}

        {/* FREE TIER LIMIT BANNER (v31) */}
        {plan === 'free' && !recording && lines.length === 0 && (
          <div style={{
            background: 'rgba(90, 143, 245, 0.08)',
            border: '0.5px solid rgba(90, 143, 245, 0.2)',
            borderRadius: 12, padding: '10px 14px', marginBottom: 12,
            fontSize: 12, color: 'rgba(29,29,31,0.75)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>ℹ️</span>
            <span>
              {lang === 'bm'
                ? <>Pelan Percuma: <strong>1 rakaman/bulan</strong>, max <strong>15 minit</strong>. <a href="/#pricing" style={{ color: '#5A8FF5', textDecoration: 'none', fontWeight: 600 }}>Upgrade →</a></>
                : <>Free Plan: <strong>1 recording/month</strong>, max <strong>15 minutes</strong>. <a href="/#pricing" style={{ color: '#5A8FF5', textDecoration: 'none', fontWeight: 600 }}>Upgrade →</a></>}
            </span>
          </div>
        )}

        {/* LANGUAGE PICKER (v29) — dropdown, default rojak */}
        {!recording && lines.length === 0 && (
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 11.5, fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'rgba(29,29,31,0.55)',
              marginBottom: 8,
            }}>
              🌐 {lang === 'bm' ? 'Bahasa Rakaman' : 'Recording Language'}
            </label>
            <select
              value={recordingLang}
              onChange={(e) => setRecordingLang(e.target.value as any)}
              style={{
                width: '100%', padding: '12px 14px',
                background: '#fff',
                border: '0.5px solid rgba(0,0,0,0.14)',
                borderRadius: 12, fontSize: 14,
                fontFamily: 'inherit', color: '#1d1d1f',
                appearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath fill='%231d1d1f' d='M6 8L0 0h12z'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                cursor: 'pointer',
              }}
            >
              <option value="auto">✨ {lang === 'bm' ? 'Mod Rojak (BM + EN, Soniox AI) — Disyorkan' : 'Rojak Mode (BM + EN, Soniox AI) — Recommended'}</option>
              <option value="ms">🇲🇾 Bahasa Melayu (Soniox AI)</option>
              <option value="en">🇬🇧 English</option>
              <option value="zh">🇨🇳 Mandarin (中文)</option>
              <option value="ta">🇮🇳 Tamil (தமிழ்)</option>
            </select>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              onClick={toggle}
              className={recording ? 'pulse-rec' : ''}
              disabled={!supported || aiProcessing}
              style={{
                width: 68, height: 68, borderRadius: '50%',
                background: recording ? '#D94A4A' : s.primary,
                border: `3px solid ${recording ? '#B33535' : s.primaryDark}`,
                cursor: (!supported || aiProcessing) ? 'not-allowed' : 'pointer',
                color: '#fff', fontSize: 24,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {recording ? '■' : '●'}
            </button>

            {/* Stacked: time + AI chip below */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
              <div>
                <div style={{
                  fontSize: 32, fontWeight: 300, lineHeight: 1,
                  letterSpacing: '-0.04em',
                  fontVariantNumeric: 'tabular-nums',
                  color: '#1d1d1f',
                  display: 'flex', alignItems: 'baseline', gap: 6,
                  flexWrap: 'wrap',
                }}>
                  <span>{secondsToClock(elapsed)}</span>
                  <span style={{
                    fontSize: 14, fontWeight: 400,
                    color: (() => {
                      const max = PLANS[plan].minutesPerLecture * 60
                      const pct = (elapsed / max) * 100
                      if (pct >= 90) return '#C62828'
                      if (pct >= 75) return '#8a6d0f'
                      return 'rgba(29,29,31,0.45)'
                    })(),
                  }}>
                    / {PLANS[plan].minutesPerLecture}:00
                  </span>
                </div>
                <div style={{ fontSize: 11, color: s.gray, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>
                    {recording
                      ? <><span style={{ color: '#E53935' }}>●</span> {t('recListening')}</>
                      : t('recDuration')
                    } · {wordCount} {t('recWords')}
                  </span>
                  {/* Session timer warning */}
                  {recording && (() => {
                    const max = PLANS[plan].minutesPerLecture * 60
                    const remaining = max - elapsed
                    const pct = (elapsed / max) * 100
                    if (pct >= 75) {
                      return (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 600,
                          background: pct >= 90 ? 'rgba(229, 57, 53, 0.12)' : 'rgba(240, 176, 48, 0.15)',
                          color: pct >= 90 ? '#C62828' : '#8a6d0f',
                        }}>
                          ⏱ {Math.max(0, Math.ceil(remaining / 60))} min {lang === 'bm' ? 'lagi' : 'left'}
                        </span>
                      )
                    }
                    return null
                  })()}
                  {recording && audioCaptureOk !== null && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 100, fontSize: 10, fontWeight: 500,
                      background: audioCaptureOk ? 'rgba(52, 168, 83, 0.1)' : 'rgba(229, 57, 53, 0.1)',
                      color: audioCaptureOk ? '#2C8545' : '#C62828',
                    }}>
                      {audioCaptureOk
                        ? <>● {lang === 'bm' ? 'Audio direkod' : 'Audio ok'}</>
                        : <>✗ {lang === 'bm' ? 'Audio gagal' : 'Audio off'}</>
                      }
                    </span>
                  )}
                </div>
              </div>

              {/* AI chip — under timer */}
              <AIChipPicker
                value={aiProvider}
                onChange={updateAIProvider}
                disabled={aiProcessing}
              />
            </div>
          </div>

          <Button
            size="md" variant="dark" onClick={finishLecture}
            disabled={saving || aiProcessing || (!recording && lines.length === 0)}
          >
            {aiProcessing
              ? (lang === 'bm' ? '🤖 AI sedang susun…' : '🤖 AI organizing…')
              : `✓ ${t('recStop')}`
            }
          </Button>
        </div>
      </div>

      {/* v56: LIVE MIC LEVEL METER (opt-in via settings) */}
      {recording && analyser && showMicMeter && (
        <div className="fade-in" style={{ marginBottom: 12 }}>
          <MicLevelMeter
            analyser={analyser}
            active={recording}
            lang={lang}
          />
        </div>
      )}

      {/* v56b: UNIVERSAL KNOWLEDGE FACTS (opt-in, during recording) */}
      {recording && showKnowledgeFacts && (
        <KnowledgeFacts active={recording} lang={lang} />
      )}

      {/* WHISPER ENHANCE LOADER */}
      {enhancing && !aiProcessing && (
        <div className="fade-in" style={{ marginBottom: 14 }}>
          {showFactsLoader ? (
            <ProcessingLoader
              status={lang === 'bm'
                ? `Sedang menulis transkrip…${enhanceProgress && enhanceProgress.total > 1 ? ` (${enhanceProgress.done}/${enhanceProgress.total})` : ''}`
                : `Transcribing your audio…${enhanceProgress && enhanceProgress.total > 1 ? ` (${enhanceProgress.done}/${enhanceProgress.total})` : ''}`}
              subStatus={lang === 'bm'
                ? 'AI sedang dengar dengan teliti'
                : 'AI is listening carefully'}
              lang={lang}
            />
          ) : (
            <SimpleLoader
              status={lang === 'bm'
                ? `Sedang menulis transkrip…${enhanceProgress && enhanceProgress.total > 1 ? ` (${enhanceProgress.done}/${enhanceProgress.total})` : ''}`
                : `Transcribing your audio…${enhanceProgress && enhanceProgress.total > 1 ? ` (${enhanceProgress.done}/${enhanceProgress.total})` : ''}`}
              subStatus={lang === 'bm' ? 'AI sedang dengar' : 'AI is listening'}
            />
          )}
        </div>
      )}

      {/* WHISPER ENHANCE ERROR (non-blocking — we fall back to Web Speech) */}
      {enhanceError && !enhancing && (
        <div style={{
          background: '#fff9e6',
          border: '0.5px solid rgba(184, 134, 11, 0.25)',
          borderRadius: 10,
          padding: '10px 14px',
          marginBottom: 12,
          fontSize: 12, color: '#8a6d0f',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>⚠</span>
          {enhanceError}
        </div>
      )}

      {/* AI SECTION (processing / error / result) — wrapped for scroll target */}
      <div ref={aiSectionRef} style={{ scrollMarginTop: 16 }}>

      {/* AI PROCESSING */}
      {aiProcessing && (
        <div className="fade-in" style={{ marginBottom: 14 }}>
          {showFactsLoader ? (
            <ProcessingLoader
              status={lang === 'bm' ? 'AI sedang menyusun nota anda…' : 'AI is organizing your notes…'}
              subStatus={lang === 'bm'
                ? `Mengekstrak topik & ringkasan · ${PROVIDER_META[aiProvider].label}`
                : `Extracting topics & summary · ${PROVIDER_META[aiProvider].label}`}
              lang={lang}
            />
          ) : (
            <SimpleLoader
              status={lang === 'bm' ? 'AI sedang menyusun nota anda…' : 'AI is organizing your notes…'}
              subStatus={lang === 'bm'
                ? `Mengekstrak topik · ${PROVIDER_META[aiProvider].label}`
                : `Extracting topics · ${PROVIDER_META[aiProvider].label}`}
            />
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes cc-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes cc-slide {
          0%   { left: -40%; }
          100% { left: 100%; }
        }
        @keyframes cc-whisper-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes cc-whisper-slide {
          0%   { left: -40%; width: 40%; }
          100% { left: 100%; width: 40%; }
        }
      `}</style>

      {/* AI ERROR */}
      {aiError && !aiProcessing && (
        <div style={{
          background: '#FDE8E8', padding: 14, borderRadius: 14,
          border: '1px solid #F4B4B4', marginBottom: 14, fontSize: 13, color: '#B94141',
        }}>
          ⚠ {aiError}
          <button
            onClick={runAI}
            style={{
              marginLeft: 10, padding: '4px 12px',
              background: '#B94141', color: '#fff',
              border: 'none', borderRadius: 999,
              fontSize: 12, cursor: 'pointer', fontWeight: 600,
            }}
          >{lang === 'bm' ? 'Cuba lagi' : 'Retry'}</button>
        </div>
      )}

      {/* AI RESULT */}
      {aiResult && !aiProcessing && (
        <div className="fade-in" style={{ marginBottom: 14 }}>
          {/* Hero image (Unsplash) */}
          {lecture?.hero_image_url && (
            <div style={{
              borderRadius: 14,
              overflow: 'hidden',
              marginBottom: 14,
              position: 'relative',
              height: 200,
              background: `url(${lecture.hero_image_url}) center / cover no-repeat`,
            }}>
              {lecture.hero_photographer_name && (
                <a
                  href={lecture.hero_photographer_link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    position: 'absolute', bottom: 8, right: 10,
                    fontSize: 10, color: '#fff',
                    background: 'rgba(0,0,0,0.4)',
                    padding: '3px 8px', borderRadius: 4,
                    textDecoration: 'none',
                  }}
                >
                  Photo by {lecture.hero_photographer_name} · Unsplash
                </a>
              )}
            </div>
          )}
          {aiFellBack && aiUsedProvider && (
            <div style={{
              padding: '10px 14px', marginBottom: 10,
              background: 'rgba(184, 134, 11, 0.08)',
              border: '0.5px solid rgba(184, 134, 11, 0.2)',
              borderRadius: 10,
              fontSize: 12, color: '#8a6d0f',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>ℹ</span>
              {lang === 'bm'
                ? `AI pilihan anda sibuk — auto-fallback ke ${aiUsedProvider}. Nota tersusun dengan jayanya.`
                : `Your chosen AI was busy — auto-fell back to ${aiUsedProvider}. Notes organized successfully.`}
            </div>
          )}
          {aiUsedProvider && !aiFellBack && (
            <div style={{
              fontSize: 11, color: s.gray, textAlign: 'right', marginBottom: 6, opacity: 0.7,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5,
            }}>
              {lang === 'bm' ? '✨ Disusun oleh' : '✨ Organized by'}: <strong>{aiUsedProvider}</strong>
            </div>
          )}
          {aiResult.summary && (
            <Section icon="✨" title={SECTION_LABELS.summary[lang as 'en' | 'bm']} s={s}>
              <p style={{ margin: 0, lineHeight: 1.7, fontSize: 15 }}>{aiResult.summary}</p>
            </Section>
          )}
          {/* Dynamic sections from recording type config */}
          {(() => {
            const typeMeta = getRecordingTypeMeta(lecture?.recording_type)
            return typeMeta.sections
              .filter(key => key !== 'summary')  // already rendered above
              .map(key => {
                const items = (aiResult as any)[key] as string[] | undefined
                if (!items || items.length === 0) return null
                const label = SECTION_LABELS[key]?.[lang as 'en' | 'bm'] || key
                const isFormula = key === 'formulas'
                const isQuotes = key === 'quotes'
                const Listing = (
                  <ul style={{
                    margin: 0, paddingLeft: 24, lineHeight: 1.8,
                    ...(isFormula ? { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 13 } : {}),
                    ...(isQuotes ? { fontStyle: 'italic', listStyle: 'none', paddingLeft: 0 } : {}),
                  }}>
                    {items.map((it, i) => (
                      <li key={i} style={isQuotes ? { borderLeft: '2px solid rgba(0,0,0,0.1)', paddingLeft: 12, marginBottom: 8 } : undefined}>
                        {isQuotes ? `"${it}"` : it}
                      </li>
                    ))}
                  </ul>
                )
                return (
                  <Section key={key} icon="" title={label} s={s}>
                    {Listing}
                  </Section>
                )
              })
              .filter(Boolean)
          })()}

          {/* MIND MAP (v41 — moved below keyPoints in v45) */}
          {lecture?.mindmap_json && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: '#5A8FF5', marginBottom: 8,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                🧠 {lang === 'bm' ? 'Peta Minda' : 'Mind Map'}
              </div>
              <MindMapView mindmap={lecture.mindmap_json} />
            </div>
          )}
        </div>
      )}

      </div>{/* end AI SECTION wrapper */}

      {/* RAW TRANSCRIPT */}
      <div style={{
        background: '#fff', padding: '18px 20px', borderRadius: 14,
        border: '0.5px solid rgba(0,0,0,0.06)', minHeight: 200,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.5)',
          textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12,
        }}>
          {lang === 'bm' ? 'Transkrip' : 'Transcript'}
        </div>
        {lines.length === 0 && !interim && (
          <div style={{ color: 'rgba(29,29,31,0.5)', fontStyle: 'italic', padding: 20, textAlign: 'center', fontSize: 13 }}>
            {recording ? '…' : t('recStart')}
          </div>
        )}
        <div className="transcript-md">
          {lines.map((l) => {
            const langInfo = l.lang ? RECOGNITION_LANGS.find(x => x.code === l.lang) : null
            return (
              <div key={l.id} className="fade-in" style={{ padding: '4px 0', fontSize: 13, color: 'rgba(29,29,31,0.85)', lineHeight: 1.75 }}>
                - {l.text}
                <span style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', marginLeft: 6 }}>
                  {l.t ? `[${secondsToClock(l.t)}]` : ''}{langInfo && ` ${langInfo.flag}`}
                </span>
              </div>
            )
          })}
          {interim && (
            <div style={{ color: 'rgba(29,29,31,0.5)', fontStyle: 'italic', padding: '4px 0', fontSize: 13 }}>{interim}…</div>
          )}
        </div>
      </div>

      {!aiProcessing && !aiResult && !recording && lines.length > 0 && !aiError && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={runAI} variant="outline">
            {lang === 'bm' ? 'Susun nota dengan AI' : 'Organize with AI'}
          </Button>
        </div>
      )}
    </div>
  )
}

function Section({ icon, title, children, s }: {
  icon: string; title: string; children: React.ReactNode; s: any
}) {
  return (
    <section style={{
      background: '#fff', padding: '16px 18px', borderRadius: 14,
      border: '0.5px solid rgba(0,0,0,0.06)', marginBottom: 10,
    }}>
      <h3 style={{
        fontSize: 12, fontWeight: 600,
        color: 'rgba(29,29,31,0.55)',
        textTransform: 'uppercase', letterSpacing: '0.5px',
        margin: '0 0 10px', display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {icon} {title}
      </h3>
      {children}
    </section>
  )
}

function buildRichMarkdown(lecture: Lecture, transcript: string, ai: AISummary): string {
  const lines: string[] = []
  lines.push(`# ${lecture.title}`, '')
  if (lecture.subject)  lines.push(`**Subject:** ${lecture.subject}  `)
  if (lecture.lecturer) lines.push(`**Lecturer:** ${lecture.lecturer}  `)
  if (lecture.location) lines.push(`**Location:** ${lecture.location}  `)
  lines.push(`**Date:** ${new Date(lecture.started_at).toLocaleString()}  `)
  lines.push(`**Duration:** ${Math.round((lecture.duration_seconds || 0) / 60)} min  `)
  lines.push('')
  if (ai.summary) lines.push('## ✨ Summary', '', ai.summary, '')
  if (ai.topics?.length) {
    lines.push('## 📌 Topics covered', '')
    ai.topics.forEach((t, i) => lines.push(`${i + 1}. ${t}`))
    lines.push('')
  }
  if (ai.keyPoints?.length) {
    lines.push('## 🔑 Key points', '')
    ai.keyPoints.forEach((k) => lines.push(`- ${k}`))
    lines.push('')
  }
  if (ai.formulas?.length) {
    lines.push('## 📐 Formulas', '')
    ai.formulas.forEach((f) => lines.push(`- ${f}`))
    lines.push('')
  }
  if (ai.questions?.length) {
    lines.push('## ❓ Questions', '')
    ai.questions.forEach((q) => lines.push(`- ${q}`))
    lines.push('')
  }
  lines.push('---', '', '## 📝 Raw transcript', '', transcript || '_No transcript_', '')
  lines.push('---', '', '_Generated by Cotton Candy 🍭_')
  return lines.join('\n')
}

// v56: Minimal loader fallback when ProcessingLoader (facts) opt-in disabled
function SimpleLoader({ status, subStatus }: { status: string; subStatus?: string }) {
  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid rgba(0,0,0,0.08)',
      borderRadius: 12,
      padding: '14px 18px',
      display: 'flex', alignItems: 'center', gap: 12,
      maxWidth: 480, margin: '0 auto',
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        border: '2px solid rgba(90, 143, 245, 0.25)',
        borderTopColor: '#5A8FF5',
        animation: 'cc-simple-spin 0.8s linear infinite',
        flexShrink: 0,
      }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500,
          color: '#1d1d1f',
          letterSpacing: '-0.01em',
        }}>{status}</div>
        {subStatus && (
          <div style={{
            fontSize: 11,
            color: 'rgba(29,29,31,0.5)',
            marginTop: 2,
          }}>{subStatus}</div>
        )}
      </div>
      <style jsx>{`
        @keyframes cc-simple-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
