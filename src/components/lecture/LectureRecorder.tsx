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
  const [recLang, setRecLang] = useState<string>('en-US')

  const recRef = useRef<any>(null)
  const startRef = useRef<number>(0)
  const accumRef = useRef<number>(0)
  const tickRef = useRef<any>(null)
  const recLangRef = useRef<string>('en-US')
  const lectureRef = useRef<Lecture | null>(null)

  // Load preferred recording language
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved && RECOGNITION_LANGS.some(l => l.code === saved)) {
        setRecLang(saved)
        recLangRef.current = saved
      } else {
        const initial = lang === 'bm' ? 'ms-MY' : 'en-US'
        setRecLang(initial)
        recLangRef.current = initial
      }
    } catch {
      const initial = lang === 'bm' ? 'ms-MY' : 'en-US'
      setRecLang(initial)
      recLangRef.current = initial
    }
  }, [lang])

  // Load lecture data
  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('lectures').select('*').eq('id', id).maybeSingle()
      if (!data) { router.replace('/dashboard/lectures'); return }
      const lec = data as Lecture
      setLecture(lec)
      lectureRef.current = lec
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
          if (parsed && typeof parsed === 'object' && 'topics' in parsed) {
            setAiResult(parsed as AISummary)
          }
        } catch {}
      }
      const { data: prof } = await sb.from('profiles').select('plan').eq('id', user.id).maybeSingle()
      setPlan((prof?.plan || 'free') as keyof typeof PLANS)
    })()
  }, [id, router])

  // Keyboard shortcuts for language swap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
      const key = e.key.toLowerCase()
      const match = RECOGNITION_LANGS.find(l => l.key === key)
      if (match) {
        e.preventDefault()
        swapLanguage(match.code)
      }
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
          const subjectHint = detectSubject(
            lectureRef.current?.title || '',
            lectureRef.current?.subject || ''
          ) ?? undefined
          const corrected = correctScientificTerms(finalText.trim(), subjectHint)
          setLines((prev) => [...prev, {
            id: `l${Date.now()}${Math.random()}`,
            t: now,
            text: corrected,
            lang: recLangRef.current,
          }])
          setInterim('')
        } else {
          setInterim(interimText)
        }
      }
      r.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') setPermission(false)
      }
      r.onend = () => {
        if (recRef.current && recording) {
          try { r.start() } catch {}
        }
      }
      r.start()
      return r
    } catch {
      setSupported(false)
      return null
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
    setRecLang(newCode)
    recLangRef.current = newCode
    try { localStorage.setItem(STORAGE_KEY, newCode) } catch {}
    if (recording && recRef.current) {
      stopRecognition()
      setTimeout(() => {
        recRef.current = startRecognition(newCode)
      }, 120)
    }
  }

  const toggle = () => {
    if (recording) {
      stopRecognition()
      accumRef.current = accumRef.current + Math.floor((Date.now() - startRef.current) / 1000)
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      setRecording(false)
    } else {
      setAiResult(null) // clear previous summary if re-recording
      setAiError(null)
      startRef.current = Date.now()
      recRef.current = startRecognition(recLangRef.current)
      tickRef.current = setInterval(() => {
        setElapsed(accumRef.current + Math.floor((Date.now() - startRef.current) / 1000))
      }, 500)
      setRecording(true)
    }
  }

  // Autosave during recording
  useEffect(() => {
    if (!recording) return
    const h = setInterval(() => save(false), 15000)
    return () => clearInterval(h)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, lines, elapsed])

  const linesToMd = (ll: Line[]) =>
    ll.map((l) => `- ${l.text}`).join('\n')

  const save = async (finish: boolean) => {
    if (!lecture) return
    setSaving(true)
    try {
      const md = linesToMd(lines)
      const wordCount = md.replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean).length
      const keywords = extractKeywords(md, 12)
      const sb = createClient()
      await sb.from('lectures').update({
        transcript_md: md, word_count: wordCount,
        duration_seconds: elapsed, keywords,
        status: finish ? 'finished' : 'recording',
        ended_at: finish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('id', lecture.id)
      const updated = { ...lecture, transcript_md: md, keywords, word_count: wordCount, duration_seconds: elapsed }
      setLecture(updated)
      lectureRef.current = updated
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const runAI = async () => {
    if (!lecture) return
    setAiProcessing(true)
    setAiError(null)
    try {
      const res = await fetch('/api/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lectureId: lecture.id }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        setAiError(json.error || 'AI processing failed')
      } else {
        setAiResult(json.data as AISummary)
      }
    } catch (e: any) {
      setAiError(e.message || 'Network error')
    } finally {
      setAiProcessing(false)
    }
  }

  const finishLecture = async () => {
    if (recording) {
      stopRecognition()
      accumRef.current = accumRef.current + Math.floor((Date.now() - startRef.current) / 1000)
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      setRecording(false)
    }
    await save(true)
    await runAI()
  }

  const exportMd = () => {
    if (!lecture) return
    let md = lectureToMarkdown({ ...lecture, transcript_md: linesToMd(lines) })
    if (aiResult) {
      md = buildRichMarkdown(lecture, linesToMd(lines), aiResult)
    }
    downloadText(`${(lecture.title || 'lecture').replace(/[^\w-]+/g, '_')}.md`, md, 'text/markdown')
  }

  const exportPdf = () => {
    if (!lecture) return
    const lec = {
      ...lecture,
      transcript_md: aiResult
        ? buildRichMarkdown(lecture, linesToMd(lines), aiResult)
        : linesToMd(lines),
    }
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
            <strong style={{ color: s.dark, marginLeft: 6 }}>
              {currentLang.flag} {currentLang.sub}
            </strong>
          </span>
          <span style={{ fontSize: 10, opacity: 0.7 }}>
            {detectedSubject && (
              <span style={{
                background: s.soft, color: s.primaryDark,
                padding: '2px 6px', borderRadius: 4, marginRight: 6,
                fontWeight: 600,
              }}>
                ✨ {lang === 'bm' ? 'Kamus' : 'Dict'}: {detectedSubject}
              </span>
            )}
            {lang === 'bm' ? 'Tukar bila pensyarah swap bahasa' : 'Switch when lecturer swaps language'}
            {' · '}shortcut: E/M/C/T/A/I
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

      {/* RECORDER CARD — clean, minimal, no tag buttons */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={toggle}
              className={recording ? 'pulse-rec' : ''}
              disabled={!supported || aiProcessing}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: recording ? '#D94A4A' : s.primary,
                border: `3px solid ${recording ? '#B33535' : s.primaryDark}`,
                cursor: (!supported || aiProcessing) ? 'not-allowed' : 'pointer',
                color: '#fff', fontSize: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {recording ? '■' : '●'}
            </button>
            <div>
              <div style={{ fontSize: 30, fontFamily: 'Georgia, serif', fontWeight: 700, lineHeight: 1 }}>
                {secondsToClock(elapsed)}
              </div>
              <div style={{ fontSize: 12, color: s.gray, marginTop: 4 }}>
                {recording
                  ? <>🔴 {t('recListening')} · {currentLang.flag} <strong>{currentLang.sub}</strong></>
                  : t('recDuration')
                } · {wordCount} {t('recWords')}
              </div>
            </div>
          </div>

          <Button
            size="md"
            variant="dark"
            onClick={finishLecture}
            disabled={saving || aiProcessing || (!recording && lines.length === 0)}
          >
            {aiProcessing
              ? (lang === 'bm' ? '🤖 AI sedang susun…' : '🤖 AI organizing…')
              : `✓ ${t('recStop')}`
            }
          </Button>
        </div>
      </div>

      {/* AI PROCESSING STATE */}
      {aiProcessing && (
        <div className="fade-in" style={{
          background: s.soft, padding: 20, borderRadius: 18,
          border: `2px dashed ${s.primaryDark}`, marginBottom: 14,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🤖</div>
          <div style={{ fontWeight: 700, color: s.dark, marginBottom: 4 }}>
            {lang === 'bm' ? 'AI sedang menyusun nota anda…' : 'AI is organizing your notes…'}
          </div>
          <div style={{ fontSize: 12, color: s.gray }}>
            {lang === 'bm'
              ? 'Biasanya 10-20 saat. Sedang extract topik, key points, formula, soalan, dan ringkasan.'
              : 'Usually 10-20 seconds. Extracting topics, key points, formulas, questions, and summary.'}
          </div>
        </div>
      )}

      {/* AI ERROR STATE */}
      {aiError && !aiProcessing && (
        <div style={{
          background: '#FDE8E8', padding: 14, borderRadius: 14,
          border: '1px solid #F4B4B4', marginBottom: 14,
          fontSize: 13, color: '#B94141',
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
          >
            {lang === 'bm' ? 'Cuba lagi' : 'Retry'}
          </button>
        </div>
      )}

      {/* AI RESULT — organized sections */}
      {aiResult && !aiProcessing && (
        <div className="fade-in" style={{ marginBottom: 14 }}>
          {aiResult.summary && (
            <Section icon="✨" title={lang === 'bm' ? 'Ringkasan (TL;DR)' : 'Summary (TL;DR)'} s={s}>
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
            <Section icon="📐" title={lang === 'bm' ? 'Formula / Fakta penting' : 'Formulas / Key facts'} s={s}>
              <ul style={{ margin: 0, paddingLeft: 24, lineHeight: 1.8, fontFamily: 'Georgia, serif' }}>
                {aiResult.formulas.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </Section>
          )}
          {aiResult.questions?.length > 0 && (
            <Section icon="❓" title={lang === 'bm' ? 'Soalan dibangkit' : 'Questions raised'} s={s}>
              <ul style={{ margin: 0, paddingLeft: 24, lineHeight: 1.8 }}>
                {aiResult.questions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </Section>
          )}
        </div>
      )}

      {/* RAW TRANSCRIPT */}
      <div style={{
        background: '#fff', padding: 22, borderRadius: 20,
        border: `1px solid ${s.border}`, minHeight: 200,
      }}>
        <div style={{ fontSize: 11, color: s.gray, letterSpacing: 1, marginBottom: 12 }}>
          📝 {lang === 'bm' ? 'TRANSKRIP MENTAH' : 'RAW TRANSCRIPT'}
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
            <div style={{ color: s.gray, fontStyle: 'italic', padding: '4px 0' }}>
              {interim}…
            </div>
          )}
        </div>
      </div>

      {/* Manual AI retry button (when not processing and no result yet but has transcript) */}
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

// ------- Sub-components -------
function Section({ icon, title, children, s }: {
  icon: string
  title: string
  children: React.ReactNode
  s: any
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

// ------- Rich markdown builder (for export) -------
function buildRichMarkdown(lecture: Lecture, transcript: string, ai: AISummary): string {
  const lines: string[] = []
  lines.push(`# ${lecture.title}`, '')
  if (lecture.subject)  lines.push(`**Subject:** ${lecture.subject}  `)
  if (lecture.lecturer) lines.push(`**Lecturer:** ${lecture.lecturer}  `)
  if (lecture.location) lines.push(`**Location:** ${lecture.location}  `)
  lines.push(`**Date:** ${new Date(lecture.started_at).toLocaleString()}  `)
  lines.push(`**Duration:** ${Math.round((lecture.duration_seconds || 0) / 60)} min  `)
  lines.push('')
  if (ai.summary) {
    lines.push('## ✨ Summary', '', ai.summary, '')
  }
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
    lines.push('## 📐 Formulas / Key facts', '')
    ai.formulas.forEach((f) => lines.push(`- ${f}`))
    lines.push('')
  }
  if (ai.questions?.length) {
    lines.push('## ❓ Questions raised', '')
    ai.questions.forEach((q) => lines.push(`- ${q}`))
    lines.push('')
  }
  lines.push('---', '', '## 📝 Raw transcript', '', transcript || '_No transcript_', '')
  lines.push('---', '', '_Generated by Cotton Candy 🍭_')
  return lines.join('\n')
}
