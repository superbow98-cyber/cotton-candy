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

  const toggle = () => {
    if (recording) {
      stopRecognition()
      accumRef.current = accumRef.current + Math.floor((Date.now() - startRef.current) / 1000)
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      setRecording(false)
    } else {
      setAiResult(null); setAiError(null)
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
    setAiProcessing(true); setAiError(null); setAiUsedProvider(null)
    try {
      const res = await fetch('/api/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId: lecture.id, provider: aiProvider }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) setAiError(json.error || 'AI processing failed')
      else { setAiResult(json.data as AISummary); setAiUsedProvider(json.usedProvider || null) }
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
    // Show loader INSTANTLY before save() so user sees feedback
    setAiResult(null)
    setAiError(null)
    setAiUsedProvider(null)
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
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(22px, 4vw, 32px)', margin: 0 }}>{lecture.title}</h1>
          <div style={{ fontSize: 12, color: s.gray, marginTop: 4 }}>
            {lecture.subject} {lecture.lecturer && `· ${lecture.lecturer}`} {lecture.location && `· ${lecture.location}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="outline" size="sm" onClick={exportMd}>⬇ .md</Button>
          <Button variant="outline" size="sm" onClick={exportPdf}>⬇ .pdf</Button>
        </div>
      </div>

      {/* LANGUAGE SWITCHER */}
      <div style={{
        background: '#fff', padding: '12px 16px', borderRadius: 16,
        border: `1px solid ${s.border}`, marginBottom: 14,
      }}>
        <div style={{
          fontSize: 11, color: s.gray, marginBottom: 8, letterSpacing: 0.5,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 6,
        }}>
          <span>
            🎤 {lang === 'bm' ? 'BAHASA SEDANG DENGAR' : 'LISTENING LANGUAGE'}:
            <strong style={{ color: s.dark, marginLeft: 6 }}>{currentLang.flag} {currentLang.sub}</strong>
          </span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>
            {detectedSubject && (
              <span style={{
                background: s.soft, color: s.primaryDark,
                padding: '2px 6px', borderRadius: 4, marginRight: 6, fontWeight: 600,
              }}>
                ✨ {lang === 'bm' ? 'Kamus' : 'Dict'}: {detectedSubject}
              </span>
            )}
            shortcut: E/M/C/T/A/I
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {RECOGNITION_LANGS.map((l) => {
            const active = l.code === recLang
            return (
              <button
                key={l.code}
                onClick={() => swapLanguage(l.code)}
                title={`${l.sub} (${l.key.toUpperCase()})`}
                style={{
                  background: active ? s.primary : s.soft,
                  color: active ? s.dark : s.gray,
                  border: `1.5px solid ${active ? s.primaryDark : s.border}`,
                  borderRadius: 999, padding: '6px 12px',
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  cursor: 'pointer', transition: 'all 0.1s',
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                }}
              >
                <span style={{ fontSize: 14 }}>{l.flag}</span>
                <span>{l.label}</span>
              </button>
            )
          })}
        </div>
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
                  fontSize: 28, fontFamily: 'Georgia, serif', fontWeight: 700, lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {secondsToClock(elapsed)}
                </div>
                <div style={{ fontSize: 11, color: s.gray, marginTop: 4 }}>
                  {recording
                    ? <>🔴 {t('recListening')} · {currentLang.flag} {currentLang.sub}</>
                    : t('recDuration')
                  } · {wordCount} {t('recWords')}
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
          {aiUsedProvider && (
            <div style={{
              fontSize: 11, color: s.gray, textAlign: 'right', marginBottom: 6, opacity: 0.7,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5,
            }}>
              {lang === 'bm' ? '✨ Disusun oleh' : '✨ Organized by'}: <strong>{aiUsedProvider}</strong>
            </div>
          )}
          {aiResult.summary && (
            <Section icon="✨" title={lang === 'bm' ? 'Ringkasan' : 'Summary'} s={s}>
              <p style={{ margin: 0, lineHeight: 1.7, fontSize: 15 }}>{aiResult.summary}</p>
            </Section>
          )}
          {aiResult.topics?.length > 0 && (
            <Section icon="📌" title={lang === 'bm' ? 'Topik diliputi' : 'Topics covered'} s={s}>
              <ol style={{ margin: 0, paddingLeft: 24, lineHeight: 2 }}>
                {aiResult.topics.map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </Section>
          )}
          {aiResult.keyPoints?.length > 0 && (
            <Section icon="🔑" title={lang === 'bm' ? 'Key points' : 'Key points'} s={s}>
              <ul style={{ margin: 0, paddingLeft: 24, lineHeight: 1.8 }}>
                {aiResult.keyPoints.map((k, i) => <li key={i}>{k}</li>)}
              </ul>
            </Section>
          )}
          {aiResult.formulas?.length > 0 && (
            <Section icon="📐" title={lang === 'bm' ? 'Formula' : 'Formulas'} s={s}>
              <ul style={{ margin: 0, paddingLeft: 24, lineHeight: 1.8, fontFamily: 'Georgia, serif' }}>
                {aiResult.formulas.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </Section>
          )}
          {aiResult.questions?.length > 0 && (
            <Section icon="❓" title={lang === 'bm' ? 'Soalan' : 'Questions'} s={s}>
              <ul style={{ margin: 0, paddingLeft: 24, lineHeight: 1.8 }}>
                {aiResult.questions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </Section>
          )}
        </div>
      )}

      </div>{/* end AI SECTION wrapper */}

      {/* RAW TRANSCRIPT */}
      <div style={{
        background: '#fff', padding: 22, borderRadius: 20,
        border: `1px solid ${s.border}`, minHeight: 200,
      }}>
        <div style={{ fontSize: 11, color: s.gray, letterSpacing: 1, marginBottom: 12 }}>
          📝 {lang === 'bm' ? 'TRANSKRIP' : 'TRANSCRIPT'}
        </div>
        {lines.length === 0 && !interim && (
          <div style={{ color: s.gray, fontStyle: 'italic', padding: 20, textAlign: 'center' }}>
            {recording ? '…' : t('recStart')}
          </div>
        )}
        <div className="transcript-md">
          {lines.map((l) => {
            const langInfo = l.lang ? RECOGNITION_LANGS.find(x => x.code === l.lang) : null
            return (
              <div key={l.id} className="fade-in" style={{ padding: '4px 0' }}>
                - {l.text}
                <span style={{ fontSize: 11, color: s.gray, marginLeft: 6 }}>
                  {l.t ? `[${secondsToClock(l.t)}]` : ''}{langInfo && ` ${langInfo.flag}`}
                </span>
              </div>
            )
          })}
          {interim && (
            <div style={{ color: s.gray, fontStyle: 'italic', padding: '4px 0' }}>{interim}…</div>
          )}
        </div>
      </div>

      {!aiProcessing && !aiResult && !recording && lines.length > 0 && !aiError && (
        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <Button onClick={runAI} variant="outline">
            🤖 {lang === 'bm' ? 'Susun nota dengan AI' : 'Organize with AI'}
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
      background: '#fff', padding: 20, borderRadius: 18,
      border: `1px solid ${s.border}`, marginBottom: 12,
    }}>
      <h3 style={{
        fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 700,
        margin: '0 0 12px', color: s.dark,
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
