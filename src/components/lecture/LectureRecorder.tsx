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
import { LiveTranscriptEngine } from '@/lib/live-transcript'

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
import type { MindMapBranch, CleanSegment, TranscriptImage } from '@/types'

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
  const meta = PROVIDER_META[provider] ?? PROVIDER_META['auto']
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
  if (logoKey === 'deepseek') {
    return (
      <div style={{ ...wrapStyle, background: '#ECEEF8' }}>
        <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M23.748 4.482c-.254-.124-.364.113-.512.234-.051.039-.094.09-.137.136-.372.397-.806.657-1.373.626-.829-.046-1.537.214-2.163.848-.133-.782-.575-1.248-1.247-1.548-.352-.156-.708-.311-.955-.65-.172-.241-.219-.51-.305-.774-.055-.16-.11-.323-.293-.35-.2-.031-.278.136-.356.276-.313.572-.434 1.202-.422 1.84.027 1.436.633 2.58 1.838 3.393.137.093.172.187.129.323-.082.28-.18.552-.266.833-.055.179-.137.217-.329.14a5.526 5.526 0 01-1.736-1.18c-.857-.828-1.631-1.742-2.597-2.458a11.365 11.365 0 00-.689-.471c-.985-.957.13-1.743.388-1.836.27-.098.093-.432-.779-.428-.872.004-1.67.295-2.687.684a3.055 3.055 0 01-.465.137 9.597 9.597 0 00-2.883-.102c-1.885.21-3.39 1.102-4.497 2.623C.082 8.606-.231 10.684.152 12.85c.403 2.284 1.569 4.175 3.36 5.653 1.858 1.533 3.997 2.284 6.438 2.14 1.482-.085 3.133-.284 4.994-1.86.47.234.962.327 1.78.397.63.059 1.236-.03 1.705-.128.735-.156.684-.837.419-.961-2.155-1.004-1.682-.595-2.113-.926 1.096-1.296 2.746-2.642 3.392-7.003.05-.347.007-.565 0-.845-.004-.17.035-.237.23-.256a4.173 4.173 0 001.545-.475c1.396-.763 1.96-2.015 2.093-3.517.02-.23-.004-.467-.247-.588zM11.581 18c-2.089-1.642-3.102-2.183-3.52-2.16-.392.024-.321.471-.235.763.09.288.207.486.371.739.114.167.192.416-.113.603-.673.416-1.842-.14-1.897-.167-1.361-.802-2.5-1.86-3.301-3.307-.774-1.393-1.224-2.887-1.298-4.482-.02-.386.093-.522.477-.592a4.696 4.696 0 011.529-.039c2.132.312 3.946 1.265 5.468 2.774.868.86 1.525 1.887 2.202 2.891.72 1.066 1.494 2.082 2.48 2.914.348.292.625.514.891.677-.802.09-2.14.11-3.054-.614zm1-6.44a.306.306 0 01.415-.287.302.302 0 01.2.288.306.306 0 01-.31.307.303.303 0 01-.304-.308zm3.11 1.596c-.2.081-.399.151-.59.16a1.245 1.245 0 01-.798-.254c-.274-.23-.47-.358-.552-.758a1.73 1.73 0 01.016-.588c.07-.327-.008-.537-.239-.727-.187-.156-.426-.199-.688-.199a.559.559 0 01-.254-.078c-.11-.054-.2-.19-.114-.358.028-.054.16-.186.192-.21.356-.202.767-.136 1.146.016.352.144.618.408 1.001.782.391.451.462.576.685.914.176.265.336.537.445.848.067.195-.019.354-.25.452z" fill="#4D6BFE"/>
        </svg>
      </div>
    )
  }
  if (logoKey === 'gpt') {
    return (
      <div style={{ ...wrapStyle, background: '#000000' }}>
        <svg width={size} height={size} viewBox="0 0 24 24" fill="#fff">
          <path d="M22.289 9.94a5.998 5.998 0 0 0-.515-4.926 6.065 6.065 0 0 0-6.525-2.908A5.998 5.998 0 0 0 10.724 0a6.064 6.064 0 0 0-5.781 4.202 5.998 5.998 0 0 0-4.002 2.91 6.065 6.065 0 0 0 .747 7.11 5.998 5.998 0 0 0 .515 4.926 6.065 6.065 0 0 0 6.525 2.908A5.997 5.997 0 0 0 13.276 24a6.064 6.064 0 0 0 5.782-4.202 5.998 5.998 0 0 0 4.001-2.91 6.065 6.065 0 0 0-.77-6.948zM13.276 22.4a4.49 4.49 0 0 1-2.882-1.041l.142-.08 4.783-2.762a.78.78 0 0 0 .396-.68v-6.747l2.023 1.168a.072.072 0 0 1 .04.057v5.585a4.505 4.505 0 0 1-4.502 4.5zm-9.684-4.131a4.49 4.49 0 0 1-.537-3.018l.142.085 4.783 2.762a.779.779 0 0 0 .785 0l5.843-3.373v2.335a.072.072 0 0 1-.029.063l-4.836 2.791a4.504 4.504 0 0 1-6.151-1.645zm-1.261-10.46a4.489 4.489 0 0 1 2.347-1.975V11.5a.769.769 0 0 0 .389.678l5.82 3.361-2.023 1.168a.073.073 0 0 1-.071 0L4.009 13.9a4.505 4.505 0 0 1-.678-6.091zm16.614 3.864l-5.843-3.375 2.023-1.167a.072.072 0 0 1 .071 0l4.783 2.762a4.502 4.502 0 0 1-.696 8.124V12.35a.77.77 0 0 0-.338-.677zm2.014-3.025l-.142-.085-4.783-2.762a.779.779 0 0 0-.785 0L9.406 9.974V7.639a.072.072 0 0 1 .029-.063l4.836-2.79a4.503 4.503 0 0 1 6.688 4.664zm-12.664 4.161L6.272 11.64a.072.072 0 0 1-.04-.057V5.999a4.503 4.503 0 0 1 7.384-3.458l-.142.08-4.783 2.762a.779.779 0 0 0-.396.68zm1.098-2.366l2.602-1.502 2.603 1.5v3l-2.603 1.5-2.602-1.5z"/>
        </svg>
      </div>
    )
  }
  if (logoKey === 'claude') {
    return (
      <div style={{ ...wrapStyle, background: '#DA7756' }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          <line x1="50" y1="5"  x2="50" y2="95" stroke="#fff" strokeWidth="16" strokeLinecap="round"/>
          <line x1="5"  y1="50" x2="95" y2="50" stroke="#fff" strokeWidth="16" strokeLinecap="round"/>
          <line x1="15" y1="15" x2="85" y2="85" stroke="#fff" strokeWidth="16" strokeLinecap="round"/>
          <line x1="85" y1="15" x2="15" y2="85" stroke="#fff" strokeWidth="16" strokeLinecap="round"/>
        </svg>
      </div>
    )
  }
  // gemini-lite fallback
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
  value, onChange, disabled, plan,
}: {
  value: AIProvider
  onChange: (v: AIProvider) => void
  disabled?: boolean
  plan?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // FIX v20.14: plan names lama ('pro','max') dah deprecated — guna 'month','year','student_pro'
  const isProPlan = plan === 'month' || plan === 'year' || plan === 'student_pro'

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  const meta = PROVIDER_META[value] ?? PROVIDER_META['auto']

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
            const locked = !!m.proOnly && !isProPlan
            return (
              <button
                key={p}
                onClick={() => {
                  if (!locked) { onChange(p); setOpen(false) }
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px',
                  borderRadius: 12,
                  cursor: locked ? 'default' : 'pointer',
                  background: selected ? 'rgba(255,183,197,0.28)' : 'transparent',
                  opacity: locked ? 0.5 : 1,
                  border: 'none',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { if (!selected && !locked) e.currentTarget.style.background = 'rgba(255,183,197,0.18)' }}
                onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent' }}
              >
                <AILogo provider={p} size={18} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 600, color: '#1A0510',
                    letterSpacing: -0.25, lineHeight: 1.3,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    {m.label}
                    {locked && (
                      <span style={{
                        fontSize: 9, fontWeight: 700,
                        background: 'rgba(212,83,126,0.12)',
                        color: '#D4537E',
                        padding: '2px 6px', borderRadius: 100,
                        letterSpacing: 0.3,
                      }}>PRO</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(75,21,40,0.58)', lineHeight: 1.4, letterSpacing: -0.1, marginTop: 2 }}>
                    {locked ? 'Upgrade to Monthly or Yearly to unlock' : m.descEn}
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
  const [cleanSegments, setCleanSegments] = useState<CleanSegment[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [editedText, setEditedText] = useState<string>('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [transcriptImages, setTranscriptImages] = useState<TranscriptImage[]>([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageUploadError, setImageUploadError] = useState<string | null>(null)
  const [recording, setRecording] = useState(false)

  const [showMicMeter, setShowMicMeter] = useState(false)
  const [showFactsLoader, setShowFactsLoader] = useState(true)
  const [showKnowledgeFacts, setShowKnowledgeFacts] = useState(true)
  useEffect(() => {
    try {
      setShowMicMeter(localStorage.getItem('cc-show-mic-meter') === 'on')
      setShowFactsLoader(localStorage.getItem('cc-show-facts-loader') !== 'off')
      setShowKnowledgeFacts(localStorage.getItem('cc-show-knowledge') !== 'off')
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
  const [recLang, setRecLang] = useState<string>('ms-MY')

  const isSafari = typeof navigator !== 'undefined'
    && /^((?!chrome|android).)*safari/i.test(navigator.userAgent)

  const recRef = useRef<any>(null)
  // v20.17: LiveTranscriptEngine ref
  const liveEngineRef = useRef<LiveTranscriptEngine | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const startRef = useRef<number>(0)
  const accumRef = useRef<number>(0)
  const tickRef = useRef<any>(null)
  const recLangRef = useRef<string>('ms-MY')
  const lectureRef = useRef<Lecture | null>(null)
  const aiSectionRef = useRef<HTMLDivElement | null>(null)

  // v20.14: Refs untuk pastikan autosave dan finishLecture dapat nilai terkini
  const linesRef = useRef<Line[]>([])
  const cleanSegmentsRef = useRef<CleanSegment[]>([])

  // --- Whisper enhancement (MediaRecorder parallel, no storage) ---
  const mediaRecRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const [enhancing, setEnhancing] = useState(false)
  const [enhanceProgress, setEnhanceProgress] = useState<{ done: number; total: number } | null>(null)
  const [enhanceError, setEnhanceError] = useState<string | null>(null)
  const [audioCaptureOk, setAudioCaptureOk] = useState<boolean | null>(null)
  const [aiFellBack, setAiFellBack] = useState<boolean>(false)
  const [summaryLang, setSummaryLang] = useState<'en' | 'bm' | 'zh' | 'ta'>('en')
  const [summaryTranslating, setSummaryTranslating] = useState(false)
  const [usage, setUsage] = useState<AudioUsageInfo | null>(null)
  const [capReachedDuringRec, setCapReachedDuringRec] = useState(false)

  useEffect(() => {
    if (aiProcessing || aiResult) {
      setTimeout(() => {
        aiSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }, [aiProcessing, aiResult])

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && RECOGNITION_LANGS.some(l => l.code === saved)) {
        setRecLang(saved); recLangRef.current = saved
      } else {
        const initial = 'ms-MY'
        setRecLang(initial); recLangRef.current = initial
      }
    } catch {
      const initial = 'ms-MY'
      setRecLang(initial); recLangRef.current = initial
    }
  }, [lang])

  useEffect(() => {
    const map: Record<string, string> = {
      'auto': 'ms-MY',
      'ms':   'ms-MY',
      'en':   'en-US',
      'zh':   'zh-CN',
      'ta':   'ta-MY',
    }
    const mapped = map[recordingLang] || 'ms-MY'
    setRecLang(mapped)
    recLangRef.current = mapped
    try { localStorage.setItem(STORAGE_KEY, mapped) } catch {}
  }, [recordingLang])

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

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('lectures').select('*').eq('id', id).maybeSingle()
      if (!data) { router.replace('/dashboard/lectures'); return }
      const lec = data as Lecture
      setLecture(lec); lectureRef.current = lec
      if (Array.isArray(lec.clean_segments)) {
        setCleanSegments(lec.clean_segments)
        cleanSegmentsRef.current = lec.clean_segments
      }
      if (lec.clean_transcript_edited) {
        setEditedText(lec.clean_transcript_edited)
      }
      if (Array.isArray(lec.transcript_images)) {
        setTranscriptImages(lec.transcript_images)
      }
      if (lec.transcript_md) {
        const parsed: Line[] = []
        let idx = 0
        for (const raw of lec.transcript_md.split('\n')) {
          if (!raw.trim()) continue
          const text = raw.replace(/^-\s*/, '').trim()
          if (text) parsed.push({ id: `r${idx++}`, t: 0, text })
        }
        setLines(parsed)
        linesRef.current = parsed
      }
      setElapsed(lec.duration_seconds || 0)
      accumRef.current = lec.duration_seconds || 0
      if (lec.summary) {
        try {
          const parsed = JSON.parse(lec.summary)
          if (parsed && typeof parsed === 'object' && 'topics' in parsed) setAiResult(parsed as AISummary)
        } catch {}
      }

      const { data: prof } = await sb.from('profiles').select('plan, ai_provider').eq('id', user.id).maybeSingle()
      setPlan((prof?.plan || 'free') as keyof typeof PLANS)
      const effective: AIProvider =
        (lec.ai_provider as AIProvider) ||
        (prof?.ai_provider as AIProvider) ||
        DEFAULT_PROVIDER
      setAiProvider(effective)
    })()
  }, [id, router])

  // v20.14: Sync refs setiap kali state berubah
  useEffect(() => { linesRef.current = lines }, [lines])
  useEffect(() => { cleanSegmentsRef.current = cleanSegments }, [cleanSegments])

  const updateAIProvider = async (newProvider: AIProvider) => {
    setAiProvider(newProvider)
    if (!lecture) return
    try {
      const sb = createClient()
      await sb.from('lectures').update({ ai_provider: newProvider }).eq('id', lecture.id)
    } catch (e) { console.error(e) }
  }

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

  // SEBAB UBAH:
// 1. 'lang' → 'language' — ikut LiveTranscriptOptions interface
// 2. onLine terima LiveLine object (bukan string) — ambil line.text untuk correctScientificTerms
// 3. onPermissionDenied + onUnsupported tidak wujud dalam LiveTranscriptOptions — ganti ke onError
//    yang parse error string untuk tentukan jenis error
const startRecognition = useCallback((langCode: string) => {
  const engine = new LiveTranscriptEngine({
    getElapsed: () => Math.floor((Date.now() - startRef.current) / 1000) + accumRef.current,
    language: langCode,
    onLine: (line) => {
      const subjectHint = detectSubject(lectureRef.current?.title || '', lectureRef.current?.subject || '') ?? undefined
      const corrected = correctScientificTerms(line.text, subjectHint)
      setLines((prev) => [...prev, {
        id: line.id, t: line.t, text: corrected, lang: line.lang,
      }])
      setInterim('')
    },
    onInterim: (text: string) => setInterim(text),
    onError: (err: string) => {
      if (err.includes('permission') || err.includes('not-allowed')) {
        setPermission(false)
      } else {
        setSupported(false)
      }
    },
  })
  liveEngineRef.current = engine
  engine.start().catch((err) => {
    console.warn('[live-transcript] engine start failed:', err)
    setSupported(false)
  })
}, [])

  // v20.17: stopRecognition — stop LiveTranscriptEngine
  const stopRecognition = () => {
    if (liveEngineRef.current) {
      liveEngineRef.current.stop()
      liveEngineRef.current = null
    }
    // legacy cleanup kalau recRef masih ada (shouldn't happen, tapi safe)
    if (recRef.current) {
      try { recRef.current.onend = null; recRef.current.stop() } catch {}
      recRef.current = null
    }
  }

  const swapLanguage = (newCode: string) => {
    if (!RECOGNITION_LANGS.some(l => l.code === newCode)) return
    setRecLang(newCode); recLangRef.current = newCode
    try { localStorage.setItem(STORAGE_KEY, newCode) } catch {}
    if (recording) {
      stopRecognition()
      setTimeout(() => startRecognition(newCode), 120)
    }
  }

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

      const enhancementOn = (() => {
        try { return localStorage.getItem('cc-mic-enhance') === 'on' } catch { return false }
      })()
      const gainBoost = (() => {
        try {
          const v = parseFloat(localStorage.getItem('cc-mic-gain') || '1.0')
          return Math.max(0.5, Math.min(3.0, v))
        } catch { return 1.0 }
      })()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: enhancementOn,
          noiseSuppression: enhancementOn,
          autoGainControl: enhancementOn,
        },
      })
      mediaStreamRef.current = stream

      let processedStream = stream
      const needsEnhancement = enhancementOn && gainBoost !== 1.0
      const needsAnalyser = (() => {
        try { return localStorage.getItem('cc-show-mic-meter') === 'on' } catch { return false }
      })()

      if (needsEnhancement || needsAnalyser) {
        try {
          const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext)
          if (AudioCtx) {
            const audioCtx = new AudioCtx()
            audioCtxRef.current = audioCtx
            const source = audioCtx.createMediaStreamSource(stream)

            if (needsAnalyser) {
              const analyserNode = audioCtx.createAnalyser()
              analyserNode.fftSize = 256
              analyserNode.smoothingTimeConstant = 0.7
              source.connect(analyserNode)
              analyserRef.current = analyserNode
              setAnalyser(analyserNode)
            }

            if (needsEnhancement) {
              const gain = audioCtx.createGain()
              gain.gain.value = gainBoost
              const compressor = audioCtx.createDynamicsCompressor()
              compressor.threshold.value = -24
              compressor.knee.value = 30
              compressor.ratio.value = 4
              compressor.attack.value = 0.003
              compressor.release.value = 0.25
              const hipass = audioCtx.createBiquadFilter()
              hipass.type = 'highpass'
              hipass.frequency.value = 80
              const dest = audioCtx.createMediaStreamDestination()
              source.connect(hipass)
              hipass.connect(gain)
              gain.connect(compressor)
              compressor.connect(dest)
              processedStream = dest.stream
              console.log('[audio] enhancement active: gain=', gainBoost)
            } else {
              console.log('[audio] mic meter only (no enhancement)')
            }
          }
        } catch (enhanceErr) {
          console.warn('[audio] enhancement failed, fallback to raw stream:', enhanceErr)
          processedStream = stream
        }
      } else {
        console.log('[audio] raw stream (no AudioContext)')
      }

      audioChunksRef.current = []

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

      rec.start(9000)
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
      const isResume = lines.length > 0 || aiResult !== null
      if (!isResume) {
        setAiResult(null); setAiError(null); setEnhanceError(null); setAiFellBack(false)
      } else {
        console.log('[toggle] RESUME mode — keeping existing transcript + AI summary')
      }
      setAudioCaptureOk(null)

      const audioOk = await startAudioCapture()
      console.log('[toggle] audio capture ready:', audioOk)

      await new Promise(r => setTimeout(r, 150))

      startRef.current = Date.now()
      startRecognition(recLangRef.current)

      tickRef.current = setInterval(() => {
        const nowElapsed = accumRef.current + Math.floor((Date.now() - startRef.current) / 1000)
        setElapsed(nowElapsed)

        const perLectureMax = PLANS[plan].minutesPerLecture * 60
        if (nowElapsed >= perLectureMax) {
          console.log('[cap] Per-lecture limit reached:', perLectureMax, 's — auto-stopping')
          toggle()
          return
        }

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

  // v20.14: Autosave guna refs (bukan closure) — fix stale closure bug
  useEffect(() => {
    if (!recording) return
    const h = setInterval(
      () => save(false, cleanSegmentsRef.current, linesRef.current),
      15000,
    )
    return () => clearInterval(h)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording])

  const linesToMd = (ll: Line[]) => ll.map((l) => `- ${l.text}`).join('\n')

  const cleanSegmentsToMd = (segs: CleanSegment[]) =>
    segs.map(s => s.text.trim()).filter(Boolean).join('\n\n')

  const fmtTime = (sec: number) => {
    const m = Math.floor(sec / 60)
    const s = Math.floor(sec % 60)
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // v20.14: Tambah linesOverride param — fix stale closure dalam autosave dan finishLecture
  const save = async (finish: boolean, segmentsOverride?: CleanSegment[], linesOverride?: Line[]) => {
    if (!lecture) return
    setSaving(true)
    try {
      const effectiveLines = linesOverride ?? lines
      const effectiveSegments = segmentsOverride ?? cleanSegments

      const rawMd = linesToMd(effectiveLines)
      const cleanMd = cleanSegmentsToMd(effectiveSegments)

      const md = cleanMd.trim().length > 20
        ? cleanMd
        : rawMd.trim().length > 0
          ? rawMd
          : ''

      const wordCount = md.replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean).length
      const keywords = extractKeywords(md, 12)
      const sb = createClient()
      await sb.from('lectures').update({
        transcript_md: md,
        raw_transcript_md: rawMd,
        clean_segments: effectiveSegments,
        word_count: wordCount, duration_seconds: elapsed, keywords,
        status: finish ? 'finished' : 'recording',
        ended_at: finish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('id', lecture.id)
      const updated = {
        ...lecture, transcript_md: md, raw_transcript_md: rawMd,
        clean_segments: effectiveSegments,
        keywords, word_count: wordCount, duration_seconds: elapsed,
      }
      setLecture(updated); lectureRef.current = updated
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }
  const translateSummary = async (targetLang: 'en' | 'bm' | 'zh' | 'ta') => {
    if (!lecture) return
    setSummaryLang(targetLang)

    const cacheKey = `summary_${targetLang}` as keyof Lecture
    const cached = (lecture as any)[cacheKey] as string | undefined
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed && typeof parsed === 'object' && 'summary' in parsed) {
          setAiResult(parsed as AISummary)
          return
        }
      } catch {}
    }

    setSummaryTranslating(true)
    try {
      const res = await fetch('/api/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId: lecture.id, provider: aiProvider, language: targetLang }),
      })
      const json = await res.json()
      if (res.ok && json.ok) {
        setAiResult(json.data as AISummary)
        const updated = { ...lecture, [`summary_${targetLang}`]: JSON.stringify(json.data) }
        setLecture(updated); lectureRef.current = updated
      }
    } catch (e) {
      console.error('[translateSummary] failed:', e)
    } finally {
      setSummaryTranslating(false)
    }
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

        if (json.data) {
          try {
            const summary = json.data as AISummary
            const branches: MindMapBranch[] = []
            const topicLimit = Math.min(6, summary.topics?.length || 0)
            for (let i = 0; i < topicLimit; i++) {
              const topic = summary.topics[i]
              const subtitle = summary.keyPoints?.[i]
                ? truncate(summary.keyPoints[i], 28)
                : undefined
              branches.push({ title: topic, subtitle })
            }
            if (branches.length === 0 && summary.keyPoints && summary.keyPoints.length > 0) {
              const kpLimit = Math.min(6, summary.keyPoints.length)
              for (let i = 0; i < kpLimit; i++) {
                branches.push({ title: truncate(summary.keyPoints[i], 28), subtitle: undefined })
              }
            }
            const centerLabel = summary.inferredTitle
              || lecture.title
              || (lang === 'bm' ? 'Topik Utama' : 'Main Topic')
            const mindmap = {
              center: centerLabel,
              branches: branches.length > 0
                ? branches
                : [{ title: centerLabel, subtitle: truncate(summary.summary || '', 40) }],
            }
            const sb = createClient()
            await sb.from('lectures').update({ mindmap_json: mindmap }).eq('id', lecture.id)
            const updated = { ...lecture, mindmap_json: mindmap }
            setLecture(updated); lectureRef.current = updated
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

    const chunks = await stopAudioCapture()

    const isResume = lines.length > 0
    if (!isResume) {
      setAiResult(null)
      setAiError(null)
      setAiUsedProvider(null)
    }
    setEnhanceError(null)

    let finalSegments: CleanSegment[] = cleanSegmentsRef.current
    if (chunks.length > 0) {
      setEnhancing(true)
      setEnhanceProgress({ done: 0, total: 1 })
      try {
        const mime = chunks[0]?.type || 'audio/webm'
        const combinedBlob = new Blob(chunks, { type: mime })

        try {
          const result = await transcribeOne(combinedBlob, undefined, recordingLang)
          if (result.usage) setUsage(result.usage)
          setEnhanceProgress({ done: 1, total: 1 })
          const combined = result.text?.trim() || ''

          if (combined.length > 20) {
            const currentSegs = cleanSegmentsRef.current
            const segmentStart = isResume && currentSegs.length > 0
              ? Math.max(...currentSegs.map(s => s.end))
              : 0
            const segmentEnd = elapsed
            const isMalayMode = recordingLang === 'ms' || recordingLang === 'auto'
            const newSegment: CleanSegment = {
              start: segmentStart,
              end: segmentEnd,
              text: combined,
              source: isMalayMode ? 'soniox_async' : 'whisper_turbo',
              language: recordingLang === 'ms' ? 'ms' : recordingLang === 'auto' ? 'auto' : recordingLang,
              created_at: new Date().toISOString(),
            }
            finalSegments = [...currentSegs, newSegment]
            setCleanSegments(finalSegments)

            const whisperLines = whisperTextToLines(combined, elapsed)
            if (whisperLines.length > 0) {
              if (isResume) {
                setLines(prev => [...prev, ...whisperLines])
              } else {
                setLines(whisperLines)
              }
            }
          }
        } catch (chunkErr: any) {
          if (chunkErr instanceof CapReachedError) {
            if (chunkErr.usage) setUsage(chunkErr.usage)
            setEnhanceError(
              lang === 'bm'
                ? 'Had audio tercapai. Transkrip separa tersimpan.'
                : 'Audio cap reached. Partial transcript saved.',
            )
          } else {
            throw chunkErr
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

    // v20.14: Hantar linesRef.current supaya save() dapat live lines terkini
    setAiProcessing(true)
    try {
      const currentLines = linesRef.current.length > 0 ? linesRef.current : lines
      await save(true, finalSegments, currentLines)
      await runAI()
    } catch (e: any) {
      setAiError(e.message || 'Failed')
      setAiProcessing(false)
    }
  }

  const startEdit = () => {
    const initial = editedText
      || cleanSegments.map(s => s.text).join('\n\n')
      || ''
    setEditedText(initial)
    setIsEditing(true)
  }

  const saveEdit = async () => {
    if (!lecture) return
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/lectures/${lecture.id}/transcript-edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edited: editedText }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Save failed')
      }
      setIsEditing(false)
      const updated = { ...lecture, clean_transcript_edited: editedText }
      setLecture(updated); lectureRef.current = updated
    } catch (e: any) {
      alert((lang === 'bm' ? 'Gagal simpan: ' : 'Save failed: ') + e.message)
    } finally {
      setSavingEdit(false)
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditedText(lecture?.clean_transcript_edited || '')
  }

  const uploadImage = async (file: File) => {
    if (!lecture) return
    if (transcriptImages.length >= 5) {
      setImageUploadError(lang === 'bm' ? 'Maksimum 5 gambar tercapai' : 'Max 5 images reached')
      setTimeout(() => setImageUploadError(null), 3000)
      return
    }
    if (file.size > 1024 * 1024) {
      setImageUploadError(lang === 'bm' ? 'Saiz fail melebihi 1MB' : 'File exceeds 1MB')
      setTimeout(() => setImageUploadError(null), 3000)
      return
    }
    setUploadingImage(true)
    setImageUploadError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`/api/lectures/${lecture.id}/transcript-image`, {
        method: 'POST',
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setTranscriptImages(data.images || [])
      const updated = { ...lecture, transcript_images: data.images || [] }
      setLecture(updated); lectureRef.current = updated
    } catch (e: any) {
      setImageUploadError(e.message)
      setTimeout(() => setImageUploadError(null), 4000)
    } finally {
      setUploadingImage(false)
    }
  }

  const deleteImage = async (imageId: string) => {
    if (!lecture) return
    if (!confirm(lang === 'bm' ? 'Padam gambar ini?' : 'Delete this image?')) return
    try {
      const res = await fetch(`/api/lectures/${lecture.id}/transcript-image?imageId=${imageId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setTranscriptImages(data.images || [])
      const updated = { ...lecture, transcript_images: data.images || [] }
      setLecture(updated); lectureRef.current = updated
    } catch (e: any) {
      alert(e.message)
    }
  }

  const exportMd = () => {
    if (!lecture) return
    const lec = { ...lecture, clean_transcript_edited: editedText || lecture.clean_transcript_edited, transcript_images: transcriptImages }
    const md = lectureToMarkdown(lec, aiResult || undefined)
    const title = aiResult?.inferredTitle || lecture.title || 'lecture'
    downloadText(`${title.replace(/[^\w-]+/g, '_')}.md`, md, 'text/markdown')
  }
  const exportPdf = () => {
    if (!lecture) return
    const lec = { ...lecture, clean_transcript_edited: editedText || lecture.clean_transcript_edited, transcript_images: transcriptImages }
    lectureToPdf(lec, { watermark: PLANS[plan].watermark, theme: s, ai: aiResult || undefined })
  }

  if (!lecture) return <div style={{ color: s.gray, padding: 20 }}>{t('loading')}</div>

  const wordCount = linesToMd(lines).replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean).length
  const _currentLang = RECOGNITION_LANGS.find(l => l.code === recLang) || RECOGNITION_LANGS[0]
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

      {/* AUTO-DETECT LANGUAGE BANNER */}
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

      {/* AUDIO USAGE BAR */}
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

      {/* CAP REACHED BANNER */}
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

      {/* RECORDER CARD */}
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
                </div>
              </div>

              <AIChipPicker
                value={aiProvider}
                onChange={updateAIProvider}
                disabled={aiProcessing}
                plan={plan}
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

        {isSafari && recording && (
          <div style={{
            marginTop: 10,
            fontSize: 11, color: 'rgba(29,29,31,0.45)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <span>ℹ</span>
            {lang === 'bm'
              ? 'Safari: live preview terhad — transkrip penuh selepas stop'
              : 'Safari: live preview is limited — full transcript ready after stop'}
          </div>
        )}
      </div>

      {recording && analyser && showMicMeter && (
        <div className="fade-in" style={{ marginBottom: 12 }}>
          <MicLevelMeter analyser={analyser} active={recording} lang={lang} />
        </div>
      )}

      {recording && showKnowledgeFacts && (
        <KnowledgeFacts active={recording} lang={lang} />
      )}

      {enhancing && !aiProcessing && (
        <div className="fade-in" style={{ marginBottom: 14 }}>
          {showFactsLoader ? (
            <ProcessingLoader
              status={lang === 'bm'
                ? `Sedang menulis transkrip…${enhanceProgress && enhanceProgress.total > 1 ? ` (${enhanceProgress.done}/${enhanceProgress.total})` : ''}`
                : `Transcribing your audio…${enhanceProgress && enhanceProgress.total > 1 ? ` (${enhanceProgress.done}/${enhanceProgress.total})` : ''}`}
              subStatus={lang === 'bm' ? 'AI sedang dengar dengan teliti' : 'AI is listening carefully'}
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

      <div ref={aiSectionRef} style={{ scrollMarginTop: 16 }}>

      {aiProcessing && (
        <div className="fade-in" style={{ marginBottom: 14 }}>
          {showFactsLoader ? (
            <ProcessingLoader
              status={lang === 'bm' ? 'AI sedang menyusun nota anda…' : 'AI is organizing your notes…'}
              subStatus={lang === 'bm'
                ? `Mengekstrak topik & ringkasan · ${(PROVIDER_META[aiProvider] ?? PROVIDER_META['auto']).label}`
                : `Extracting topics & summary · ${(PROVIDER_META[aiProvider] ?? PROVIDER_META['auto']).label}`}
              lang={lang}
            />
          ) : (
            <SimpleLoader
              status={lang === 'bm' ? 'AI sedang menyusun nota anda…' : 'AI is organizing your notes…'}
              subStatus={lang === 'bm'
                ? `Mengekstrak topik · ${(PROVIDER_META[aiProvider] ?? PROVIDER_META['auto']).label}`
                : `Extracting topics · ${(PROVIDER_META[aiProvider] ?? PROVIDER_META['auto']).label}`}
            />
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes cc-spin { to { transform: rotate(360deg); } }
        @keyframes cc-slide { 0% { left: -40%; } 100% { left: 100%; } }
        @keyframes cc-whisper-spin { to { transform: rotate(360deg); } }
        @keyframes cc-whisper-slide { 0% { left: -40%; width: 40%; } 100% { left: 100%; width: 40%; } }
        @keyframes cc-pulse-dot { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.85); } }
        .cc-cloud-cursor { display: inline-block; position: relative; width: 32px; height: 16px; vertical-align: middle; margin-left: 4px; }
        .cc-cloud-puff { position: absolute; border-radius: 50%; animation: cc-cloud-pulse 1.4s ease-in-out infinite; }
        .cc-puff-1 { width: 12px; height: 12px; background: #F4C0D1; top: 2px; left: 0; animation-delay: 0s; }
        .cc-puff-2 { width: 14px; height: 14px; background: #CECBF6; top: 0; left: 9px; animation-delay: 0.2s; }
        .cc-puff-3 { width: 11px; height: 11px; background: #B5D4F4; top: 3px; left: 19px; animation-delay: 0.4s; }
        @keyframes cc-cloud-pulse { 0%, 100% { transform: scale(0.85); opacity: 0.7; } 50% { transform: scale(1.15); opacity: 1; } }
      `}</style>

      {aiError && !aiProcessing && (
        <div style={{
          background: '#FDE8E8', padding: 14, borderRadius: 14,
          border: '1px solid #F4B4B4', marginBottom: 14, fontSize: 13, color: '#B94141',
        }}>
          ⚠ {aiError}
          <button onClick={runAI} style={{
            marginLeft: 10, padding: '4px 12px',
            background: '#B94141', color: '#fff',
            border: 'none', borderRadius: 999,
            fontSize: 12, cursor: 'pointer', fontWeight: 600,
          }}>{lang === 'bm' ? 'Cuba lagi' : 'Retry'}</button>
        </div>
      )}

      {aiResult && !aiProcessing && (
        <div className="fade-in" style={{ marginBottom: 14 }}>
          {lecture?.hero_image_url && (
            <div style={{
              borderRadius: 14, overflow: 'hidden', marginBottom: 14,
              position: 'relative', height: 200,
              background: `url(${lecture.hero_image_url}) center / cover no-repeat`,
            }}>
              {lecture.hero_photographer_name && (
                <a href={lecture.hero_photographer_link || '#'} target="_blank" rel="noopener noreferrer"
                  style={{
                    position: 'absolute', bottom: 8, right: 10,
                    fontSize: 10, color: '#fff', background: 'rgba(0,0,0,0.4)',
                    padding: '3px 8px', borderRadius: 4, textDecoration: 'none',
                  }}>
                  Photo by {lecture.hero_photographer_name} · Unsplash
                </a>
              )}
            </div>
          )}
          {/* SUMMARY LANGUAGE PILLS */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', fontWeight: 500 }}>
              {lang === 'bm' ? 'Bahasa ringkasan:' : 'Summary language:'}
            </span>
            {(['en', 'bm', 'zh', 'ta'] as const).map((l) => {
              const labels = { en: '🇬🇧 EN', bm: '🇲🇾 BM', zh: '🇨🇳 中文', ta: '🇮🇳 TA' }
              const isActive = summaryLang === l
              const isCached = !!(lecture as any)[`summary_${l}`]
              return (
                <button
                  key={l}
                  onClick={() => translateSummary(l)}
                  disabled={summaryTranslating}
                  style={{
                    padding: '4px 12px', borderRadius: 100,
                    border: isActive ? '1.5px solid #D4537E' : '0.5px solid rgba(0,0,0,0.12)',
                    background: isActive ? 'linear-gradient(135deg, #FFB7C5, #D4537E)' : isCached ? 'rgba(212,83,126,0.06)' : '#fff',
                    color: isActive ? '#fff' : 'rgba(29,29,31,0.75)',
                    fontSize: 12, fontWeight: isActive ? 600 : 400,
                    cursor: summaryTranslating ? 'wait' : 'pointer',
                    transition: 'all 0.15s',
                    opacity: summaryTranslating && !isActive ? 0.5 : 1,
                  }}
                >
                  {summaryTranslating && isActive ? '⏳' : labels[l]}
                  {isCached && !isActive && <span style={{ marginLeft: 3, opacity: 0.5, fontSize: 9 }}>●</span>}
                </button>
              )
            })}
          </div>
          {aiFellBack && aiUsedProvider && (
            <div style={{
              padding: '10px 14px', marginBottom: 10,
              background: 'rgba(184, 134, 11, 0.08)',
              border: '0.5px solid rgba(184, 134, 11, 0.2)',
              borderRadius: 10, fontSize: 12, color: '#8a6d0f',
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
          {(() => {
            const typeMeta = getRecordingTypeMeta(lecture?.recording_type)
            return typeMeta.sections
              .filter(key => key !== 'summary')
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
                  <Section key={key} icon="" title={label} s={s}>{Listing}</Section>
                )
              })
              .filter(Boolean)
          })()}

          {lecture?.mindmap_json && (
            <div style={{ marginTop: 14 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: '#5A8FF5', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                🧠 {lang === 'bm' ? 'Peta Minda' : 'Mind Map'}
              </div>
              <MindMapView mindmap={lecture.mindmap_json} />
            </div>
          )}
        </div>
      )}

      </div>

      {/* CLEAN TRANSCRIPT */}
      {(cleanSegments.length > 0 || editedText || transcriptImages.length > 0) && (
        <div style={{
          background: '#FFFBFC', borderRadius: 14, padding: 18, marginTop: 18,
          border: '0.5px solid rgba(212, 83, 126, 0.18)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12, gap: 8, flexWrap: 'wrap',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: '#993556',
              textTransform: 'uppercase', letterSpacing: '0.5px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              ✨ {lang === 'bm' ? 'Transkrip Bersih' : 'Clean Transcript'}
            </div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 10, color: 'rgba(29,29,31,0.45)' }}>
                {cleanSegments.length} {lang === 'bm' ? 'sesi' : 'sessions'} · Soniox
              </span>
              {!isEditing && (
                <>
                  <button onClick={startEdit} style={{
                    background: 'transparent', border: '0.5px solid rgba(212, 83, 126, 0.4)',
                    color: '#993556', padding: '3px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  }}>
                    ✏️ {lang === 'bm' ? 'Edit' : 'Edit'}
                  </button>
                  <label style={{
                    background: 'transparent', border: '0.5px solid rgba(212, 83, 126, 0.4)',
                    color: '#993556', padding: '3px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 500, cursor: 'pointer',
                    opacity: transcriptImages.length >= 5 ? 0.4 : 1,
                  }}>
                    {uploadingImage
                      ? (lang === 'bm' ? '⏳ Uploading...' : '⏳ Uploading...')
                      : `🖼️ ${lang === 'bm' ? 'Tambah gambar' : 'Add image'} (${transcriptImages.length}/5)`}
                    <input type="file" accept="image/*" style={{ display: 'none' }}
                      disabled={uploadingImage || transcriptImages.length >= 5}
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) uploadImage(file)
                        e.target.value = ''
                      }}
                    />
                  </label>
                </>
              )}
              {isEditing && (
                <>
                  <button onClick={saveEdit} disabled={savingEdit} style={{
                    background: '#993556', border: 'none',
                    color: '#fff', padding: '3px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    opacity: savingEdit ? 0.6 : 1,
                  }}>
                    {savingEdit
                      ? (lang === 'bm' ? '💾 Menyimpan...' : '💾 Saving...')
                      : (lang === 'bm' ? '✓ Simpan' : '✓ Save')}
                  </button>
                  <button onClick={cancelEdit} disabled={savingEdit} style={{
                    background: 'transparent', border: '0.5px solid rgba(0,0,0,0.2)',
                    color: 'rgba(29,29,31,0.65)', padding: '3px 10px', borderRadius: 6,
                    fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  }}>
                    {lang === 'bm' ? 'Batal' : 'Cancel'}
                  </button>
                </>
              )}
            </div>
          </div>

          {imageUploadError && (
            <div style={{
              background: '#fde8e8', color: '#b42929',
              padding: '6px 10px', borderRadius: 6, fontSize: 11, marginBottom: 10,
            }}>⚠ {imageUploadError}</div>
          )}

          {isEditing ? (
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              autoFocus
              style={{
                width: '100%', minHeight: 180, padding: 12,
                border: '0.5px solid rgba(212, 83, 126, 0.25)',
                borderRadius: 8, fontFamily: 'inherit', fontSize: 13,
                lineHeight: 1.65, color: 'rgba(29,29,31,0.92)',
                background: '#fff', resize: 'vertical',
              }}
              placeholder={lang === 'bm' ? 'Edit transkrip di sini...' : 'Edit transcript here...'}
            />
          ) : (editedText && editedText.trim()) ? (
            <div className="transcript-md" style={{
              fontSize: 13, lineHeight: 1.65, color: 'rgba(29,29,31,0.92)', whiteSpace: 'pre-wrap',
            }}>
              {editedText}
            </div>
          ) : (
            <div className="transcript-md">
              {cleanSegments.map((seg, idx) => (
                <div key={idx} className="fade-in" style={{
                  display: 'flex', gap: 10, padding: '8px 0',
                  borderBottom: idx < cleanSegments.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
                  fontSize: 13, lineHeight: 1.65,
                }}>
                  <span style={{
                    fontSize: 10, color: 'rgba(29,29,31,0.5)',
                    fontFamily: 'SF Mono, Monaco, monospace',
                    flexShrink: 0, paddingTop: 2, minWidth: 90,
                  }}>
                    {fmtTime(seg.start)}–{fmtTime(seg.end)}
                  </span>
                  <span style={{ color: 'rgba(29,29,31,0.92)' }}>{seg.text}</span>
                </div>
              ))}
            </div>
          )}

          {transcriptImages.length > 0 && !isEditing && (
            <div style={{
              marginTop: 16,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 10,
            }}>
              {transcriptImages.map((img) => (
                <div key={img.id} style={{
                  position: 'relative', borderRadius: 8, overflow: 'hidden',
                  border: '0.5px solid rgba(0,0,0,0.06)',
                }}>
                  <img src={img.url} alt={img.caption || ''} style={{
                    width: '100%', height: 100, objectFit: 'cover', display: 'block',
                  }} />
                  <button onClick={() => deleteImage(img.id)} style={{
                    position: 'absolute', top: 4, right: 4,
                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                    border: 'none', borderRadius: '50%',
                    width: 22, height: 22, fontSize: 12,
                    cursor: 'pointer', lineHeight: 1,
                  }} title="Delete">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* RAW TRANSCRIPT */}
      <div style={{
        background: 'rgba(0,0,0,0.02)', borderRadius: 14, padding: 18, marginTop: cleanSegments.length > 0 ? 12 : 18,
        border: '0.5px solid rgba(0,0,0,0.06)', minHeight: 200,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.5)',
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            📝 {lang === 'bm' ? (cleanSegments.length > 0 ? 'Transkrip Asal (Live)' : 'Transkrip') : (cleanSegments.length > 0 ? 'Raw Transcript (Live)' : 'Transcript')}
          </div>
          {cleanSegments.length > 0 && (
            <span style={{ fontSize: 10, color: 'rgba(29,29,31,0.4)' }}>
              {lang === 'bm' ? 'Live preview' : 'Live preview'}
            </span>
          )}
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
              <div key={l.id} className="fade-in" style={{
                padding: '4px 0', fontSize: 13,
                color: cleanSegments.length > 0 ? 'rgba(29,29,31,0.55)' : 'rgba(29,29,31,0.85)',
                lineHeight: 1.75,
              }}>
                - {l.text}
                <span style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', marginLeft: 6 }}>
                  {l.t ? `[${secondsToClock(l.t)}]` : ''}{langInfo && ` ${langInfo.flag}`}
                </span>
              </div>
            )
          })}
          {interim && (
            <div style={{ color: 'rgba(29,29,31,0.5)', fontStyle: 'italic', padding: '4px 0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span>{interim}</span>
              <span className="cc-cloud-cursor" aria-hidden="true">
                <span className="cc-cloud-puff cc-puff-1" />
                <span className="cc-cloud-puff cc-puff-2" />
                <span className="cc-cloud-puff cc-puff-3" />
              </span>
            </div>
          )}
          {recording && !interim && lines.length > 0 && (
            <div style={{ padding: '4px 0' }}>
              <span className="cc-cloud-cursor" aria-hidden="true">
                <span className="cc-cloud-puff cc-puff-1" />
                <span className="cc-cloud-puff cc-puff-2" />
                <span className="cc-cloud-puff cc-puff-3" />
              </span>
            </div>
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
        <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f', letterSpacing: '-0.01em' }}>{status}</div>
        {subStatus && (
          <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.5)', marginTop: 2 }}>{subStatus}</div>
        )}
      </div>
      <style jsx>{`
        @keyframes cc-simple-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
