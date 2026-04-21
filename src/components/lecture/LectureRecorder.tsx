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
import { transcribeOne, whisperTextToLines } from '@/lib/whisper'
import { getRecordingTypeMeta, SECTION_LABELS } from '@/lib/recording-types'

type Line = { id: string; t: number; text: string; lang?: string }

type AISummary = {
  topics: string[]
  keyPoints: string[]
  formulas: string[]
  questions: string[]
  summary: string
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
  const [interim, setInterim] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState(true)
  const [saving, setSaving] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [aiResult, setAiResult] = useState<AISummary | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [aiUsedProvider, setAiUsedProvider] = useState<string | null>(null)
  const [aiProvider, setAiProvider] = useState<AIProvider>(DEFAULT_PROVIDER)
  const [recLang, setRecLang] = useState<string>('en-US')

  const recRef = useRef<any>(null)
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

      // Request with echo cancellation off — we want raw audio for better Whisper accuracy
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      mediaStreamRef.current = stream
      audioChunksRef.current = []

      // Pick best supported mime type — Chrome Android prefers webm/opus
      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ]
      const mime = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) || ''

      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)

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
        // Cleanup stream
        mediaStreamRef.current?.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
        resolve([])
        return
      }
      rec.onstop = () => {
        const chunks = audioChunksRef.current.slice()
        audioChunksRef.current = []
        mediaRecRef.current = null
        mediaStreamRef.current?.getTracks().forEach(t => t.stop())
        mediaStreamRef.current = null
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
        setElapsed(accumRef.current + Math.floor((Date.now() - startRef.current) / 1000))
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
        // Sequential to respect rate limits + clear progress UI
        for (let i = 0; i < chunks.length; i++) {
          const result = await transcribeOne(chunks[i])
          texts.push(result.text || '')
          setEnhanceProgress({ done: i + 1, total: chunks.length })
        }
        const combined = texts.join('\n').trim()

        if (combined.length > 20) {
          // Replace Web Speech lines with Whisper-derived lines
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
                }}>
                  {secondsToClock(elapsed)}
                </div>
                <div style={{ fontSize: 11, color: s.gray, marginTop: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span>
                    {recording
                      ? <><span style={{ color: '#E53935' }}>●</span> {t('recListening')}</>
                      : t('recDuration')
                    } · {wordCount} {t('recWords')}
                  </span>
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

      {/* WHISPER ENHANCE LOADER */}
      {enhancing && (
        <div className="fade-in" style={{
          background: 'linear-gradient(135deg, #FFFBFC, #fff)',
          padding: '22px 22px',
          borderRadius: 14,
          border: '0.5px solid rgba(212, 83, 126, 0.25)',
          marginBottom: 12,
          display: 'flex', alignItems: 'center', gap: 16,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: '50%',
            background: 'conic-gradient(from 0deg, #FF6B9D, #C471F5, #5A8FF5, #FF6B9D)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'cc-whisper-spin 2.5s linear infinite',
            flexShrink: 0,
          }}>
            <div style={{ width: 32, height: 32, background: '#fff', borderRadius: '50%' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 14, fontWeight: 600, color: '#1d1d1f',
              letterSpacing: '-0.015em', marginBottom: 3,
            }}>
              {lang === 'bm' ? 'Whisper sedang perbaiki transkrip…' : 'Whisper is enhancing your transcript…'}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.55)', marginBottom: 10 }}>
              {lang === 'bm'
                ? 'Auto-detect bahasa, betulkan rojak, ~95% tepat.'
                : 'Auto-detecting languages, fixing rojak, ~95% accurate.'}
              {enhanceProgress && enhanceProgress.total > 1 && (
                <> · {enhanceProgress.done}/{enhanceProgress.total}</>
              )}
            </div>
            <div style={{
              height: 3, borderRadius: 999,
              background: 'rgba(212, 83, 126, 0.12)', overflow: 'hidden',
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', height: '100%',
                width: enhanceProgress ? `${(enhanceProgress.done / enhanceProgress.total) * 100}%` : '40%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #FF6B9D, #C471F5)',
                transition: 'width 0.4s ease',
                animation: enhanceProgress ? 'none' : 'cc-whisper-slide 1.4s ease-in-out infinite',
              }} />
            </div>
          </div>
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
        <div className="fade-in" style={{
          background: `linear-gradient(135deg, ${s.soft}, #fff)`,
          padding: '28px 24px', borderRadius: 22,
          border: `2px dashed ${s.primaryDark}`, marginBottom: 14, textAlign: 'center',
          boxShadow: '0 10px 30px rgba(212, 83, 126, 0.08)',
        }}>
          {/* Animated AI orb */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            margin: '0 auto 14px',
            background: `conic-gradient(from 0deg, ${s.primary}, ${s.primaryDark}, ${s.primary})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'cc-spin 2.5s linear infinite',
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22,
            }}>🤖</div>
          </div>

          <div style={{ fontWeight: 700, fontSize: 17, color: s.dark, marginBottom: 4 }}>
            {lang === 'bm' ? 'AI sedang menyusun nota anda…' : 'AI is organizing your notes…'}
          </div>
          <div style={{ fontSize: 13, color: s.gray, marginBottom: 14 }}>
            {lang === 'bm'
              ? 'Extracting topik, key points, formula, soalan, dan ringkasan.'
              : 'Extracting topics, key points, formulas, questions, and summary.'}
          </div>

          {/* Indeterminate progress bar */}
          <div style={{
            maxWidth: 300, margin: '0 auto',
            height: 4, borderRadius: 999, background: 'rgba(212, 83, 126, 0.12)',
            overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              height: '100%', width: '40%',
              borderRadius: 999,
              background: `linear-gradient(90deg, ${s.primary}, ${s.primaryDark})`,
              animation: 'cc-slide 1.4s ease-in-out infinite',
            }} />
          </div>

          <div style={{
            fontSize: 11, color: s.gray, marginTop: 14, opacity: 0.7,
            display: 'inline-flex', alignItems: 'center', gap: 6,
          }}>
            <AILogo provider={aiProvider} size={11} />
            {PROVIDER_META[aiProvider].label}
          </div>
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
