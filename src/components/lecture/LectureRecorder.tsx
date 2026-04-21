'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { type Lecture, type TimelineEntry, PLANS } from '@/types'
import { lectureToMarkdown, lectureToPdf, downloadText, extractKeywords, secondsToClock } from '@/lib/export'

type Line = { id: string; t: number; text: string; starred?: boolean; topic?: boolean; type?: TimelineEntry['type'] }

export default function LectureRecorder({ id }: { id: string }) {
  const { t, lang } = useLang()
  const { tokens: s } = useTheme()
  const router = useRouter()
  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [plan, setPlan] = useState<keyof typeof PLANS>('free')
  const [lines, setLines] = useState<Line[]>([])
  const [timeline, setTimeline] = useState<TimelineEntry[]>([])
  const [recording, setRecording] = useState(false)
  const [interim, setInterim] = useState('')
  const [elapsed, setElapsed] = useState(0)
  const [supported, setSupported] = useState(true)
  const [permission, setPermission] = useState(true)
  const [saving, setSaving] = useState(false)

  const recRef = useRef<any>(null)
  const startRef = useRef<number>(0)
  const accumRef = useRef<number>(0)
  const tickRef = useRef<any>(null)

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('lectures').select('*').eq('id', id).maybeSingle()
      if (!data) { router.replace('/dashboard/lectures'); return }
      const lec = data as Lecture
      setLecture(lec)
      if (lec.transcript_md) {
        const parsed: Line[] = []
        let idx = 0
        for (const raw of lec.transcript_md.split('\n')) {
          if (!raw.trim()) continue
          const isStar = raw.startsWith('- ⭐ ')
          const isTopic = raw.startsWith('## ')
          const text = raw.replace(/^- (⭐ )?/, '').replace(/^## \d\d:\d\d:\d\d — /, '').trim()
          parsed.push({ id: `r${idx++}`, t: 0, text, starred: isStar, topic: isTopic })
        }
        setLines(parsed)
      }
      setTimeline((lec.timeline as TimelineEntry[]) || [])
      setElapsed(lec.duration_seconds || 0)
      accumRef.current = lec.duration_seconds || 0
      const { data: prof } = await sb.from('profiles').select('plan').eq('id', user.id).maybeSingle()
      setPlan((prof?.plan || 'free') as keyof typeof PLANS)
    })()
  }, [id, router])

  const startRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { setSupported(false); return }
    try {
      const r = new SR()
      r.continuous = true
      r.interimResults = true
      r.lang = lang === 'bm' ? 'ms-MY' : 'en-US'
      r.onresult = (e: any) => {
        let finalText = '', interimText = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const chunk = e.results[i][0].transcript
          if (e.results[i].isFinal) finalText += chunk
          else interimText += chunk
        }
        if (finalText.trim()) {
          const now = Math.floor((Date.now() - startRef.current) / 1000) + accumRef.current
          setLines((prev) => [...prev, { id: `l${Date.now()}${Math.random()}`, t: now, text: finalText.trim() }])
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
      recRef.current = r
    } catch {
      setSupported(false)
    }
  }, [lang, recording])

  const stopRecognition = () => {
    if (recRef.current) {
      try { recRef.current.onend = null; recRef.current.stop() } catch {}
      recRef.current = null
    }
  }

  const toggle = () => {
    if (recording) {
      stopRecognition()
      accumRef.current = accumRef.current + Math.floor((Date.now() - startRef.current) / 1000)
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      setRecording(false)
    } else {
      startRef.current = Date.now()
      startRecognition()
      tickRef.current = setInterval(() => {
        setElapsed(accumRef.current + Math.floor((Date.now() - startRef.current) / 1000))
      }, 500)
      setRecording(true)
    }
  }

  const addMark = (type: TimelineEntry['type']) => {
    const last = lines[lines.length - 1]
    if (!last) return
    const entry: TimelineEntry = {
      t: secondsToClock(last.t),
      seconds: last.t,
      event: last.text.slice(0, 80),
      type,
    }
    setTimeline((prev) => [...prev, entry])
    if (type === 'topic' || type === 'note') {
      setLines((prev) => prev.map((l, i) => i === prev.length - 1
        ? { ...l, starred: type === 'note', topic: type === 'topic', type } : l))
    }
  }

  useEffect(() => {
    if (!recording) return
    const h = setInterval(() => save(false), 15000)
    return () => clearInterval(h)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording, lines, timeline, elapsed])

  const linesToMd = (ll: Line[]) => {
    const parts: string[] = []
    for (const l of ll) {
      if (l.topic) parts.push(`\n## ${secondsToClock(l.t)} — ${l.text}\n`)
      else if (l.starred) parts.push(`- ⭐ ${l.text}`)
      else parts.push(`- ${l.text}`)
    }
    return parts.join('\n')
  }

  const save = async (finish: boolean) => {
    if (!lecture) return
    setSaving(true)
    try {
      const md = linesToMd(lines)
      const wordCount = md.replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean).length
      const keywords = extractKeywords(md, 12)
      const sb = createClient()
      await sb.from('lectures').update({
        transcript_md: md, timeline, word_count: wordCount,
        duration_seconds: elapsed, keywords,
        status: finish ? 'finished' : 'recording',
        ended_at: finish ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      }).eq('id', lecture.id)
      setLecture({ ...lecture, transcript_md: md, timeline, keywords, word_count: wordCount, duration_seconds: elapsed })
    } catch (e) { console.error(e) }
    finally { setSaving(false) }
  }

  const finishLecture = async () => {
    if (recording) toggle()
    await save(true)
  }

  const exportMd = () => {
    if (!lecture) return
    const md = lectureToMarkdown({ ...lecture, transcript_md: linesToMd(lines), timeline })
    downloadText(`${(lecture.title || 'lecture').replace(/[^\w-]+/g, '_')}.md`, md, 'text/markdown')
  }
  const exportPdf = () => {
    if (!lecture) return
    lectureToPdf(
      { ...lecture, transcript_md: linesToMd(lines), timeline },
      { watermark: PLANS[plan].watermark, theme: s }
    )
  }

  if (!lecture) return <div style={{ color: s.gray, padding: 20 }}>{t('loading')}</div>

  const wordCount = linesToMd(lines).replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean).length

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

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button
              onClick={toggle}
              className={recording ? 'pulse-rec' : ''}
              disabled={!supported}
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: recording ? '#D94A4A' : s.primary,
                border: `3px solid ${recording ? '#B33535' : s.primaryDark}`,
                cursor: supported ? 'pointer' : 'not-allowed',
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
                {recording ? `🔴 ${t('recListening')}` : t('recDuration')} · {wordCount} {t('recWords')}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <Button variant="outline" size="sm" onClick={() => addMark('topic')}>📌 {t('recTopic')}</Button>
            <Button variant="outline" size="sm" onClick={() => addMark('note')}>⭐ {t('recStar')}</Button>
            <Button variant="outline" size="sm" onClick={() => addMark('formula')}>🔢 {t('recFormula')}</Button>
            <Button variant="outline" size="sm" onClick={() => addMark('question')}>❓ {t('recQuestion')}</Button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
          <Button size="md" variant="dark" onClick={finishLecture} disabled={saving}>
            ✓ {t('recStop')}
          </Button>
          <Button size="md" variant="ghost" onClick={() => save(false)} disabled={saving}>
            {saving ? t('loading') : '💾 ' + t('save')}
          </Button>
        </div>
      </div>

      <div style={{
        background: '#fff', padding: 22, borderRadius: 20,
        border: `1px solid ${s.border}`, minHeight: 300,
      }}>
        <div style={{ fontSize: 11, color: s.gray, letterSpacing: 1, marginBottom: 12 }}>TRANSCRIPT</div>
        {lines.length === 0 && !interim && (
          <div style={{ color: s.gray, fontStyle: 'italic', padding: 20, textAlign: 'center' }}>
            {recording ? '…' : t('recStart')}
          </div>
        )}
        <div className="transcript-md">
          {lines.map((l) => (
            <div key={l.id} className="fade-in" style={{
              padding: '4px 0',
              borderLeft: l.topic ? `3px solid ${s.primaryDark}` : l.starred ? `3px solid #f2b35a` : 'none',
              paddingLeft: (l.topic || l.starred) ? 12 : 0,
            }}>
              {l.topic ? (
                <span className="topic">## {secondsToClock(l.t)} — {l.text}</span>
              ) : l.starred ? (
                <><span className="star">⭐</span> {l.text} <span style={{ fontSize: 11, color: s.gray, marginLeft: 6 }}>[{secondsToClock(l.t)}]</span></>
              ) : (
                <>- {l.text} <span style={{ fontSize: 11, color: s.gray, marginLeft: 6 }}>[{secondsToClock(l.t)}]</span></>
              )}
            </div>
          ))}
          {interim && (
            <div style={{ color: s.gray, fontStyle: 'italic', padding: '4px 0' }}>
              {interim}…
            </div>
          )}
        </div>
      </div>

      {timeline.length > 0 && (
        <div style={{
          background: '#fff', padding: 22, borderRadius: 20,
          border: `1px solid ${s.border}`, marginTop: 14,
        }}>
          <div style={{ fontSize: 11, color: s.gray, letterSpacing: 1, marginBottom: 12 }}>TIMELINE</div>
          {timeline.map((e, i) => (
            <div key={i} style={{ padding: '6px 0', fontSize: 13 }}>
              <strong style={{ color: s.primaryDark, marginRight: 8 }}>{e.t}</strong>
              {e.type === 'formula' && '🔢 '}
              {e.type === 'question' && '❓ '}
              {e.type === 'example' && '💡 '}
              {e.type === 'note' && '⭐ '}
              {e.type === 'topic' && '📌 '}
              {e.event}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
