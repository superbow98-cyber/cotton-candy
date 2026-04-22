'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/i18n/LangProvider'
import { createClient } from '@/lib/supabase/client'
import { PLANS } from '@/types'
import { RECORDING_TYPES, type RecordingType } from '@/lib/recording-types'
import { Icon } from '@/components/ui/Icon'

// Type icons map
const TYPE_ICONS: Record<RecordingType, JSX.Element> = {
  lecture: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  meeting: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  sv: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>,
  postmortem: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"/><path d="M7 14l4-4 4 4 5-5"/></svg>,
  interview: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>,
  custom: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
}

// Field defined OUTSIDE parent to avoid losing input focus on re-render
function Field({
  label, value, onChange, placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{
        display: 'block',
        fontSize: 11.5, fontWeight: 500,
        color: 'rgba(29,29,31,0.55)',
        marginBottom: 6,
      }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '10px 14px',
          background: '#f5f5f7',
          border: '0.5px solid rgba(0,0,0,0.08)',
          borderRadius: 10, fontSize: 13.5,
          color: '#1d1d1f',
          fontFamily: 'inherit', outline: 'none',
          transition: 'all 0.15s',
        }}
        onFocus={(e) => {
          e.target.style.background = '#fff'
          e.target.style.borderColor = 'rgba(29,29,31,0.4)'
        }}
        onBlur={(e) => {
          e.target.style.background = '#f5f5f7'
          e.target.style.borderColor = 'rgba(0,0,0,0.08)'
        }}
      />
      {hint && (
        <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  )
}

export default function NewLecture() {
  const { lang } = useLang()
  const router = useRouter()
  const [type, setType] = useState<RecordingType>('lecture')
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [lecturer, setLecturer] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // Field labels adapt to type
  const isMeeting = type === 'meeting' || type === 'sv'
  const isPostmortem = type === 'postmortem'
  const isInterview = type === 'interview'

  const labels = {
    title:    lang === 'bm' ? 'Tajuk' : 'Title',
    subject:  isMeeting    ? (lang === 'bm' ? 'Projek / Topik' : 'Project / Topic')
            : isPostmortem ? (lang === 'bm' ? 'Acara' : 'Event')
            : isInterview  ? (lang === 'bm' ? 'Tema' : 'Theme')
            : (lang === 'bm' ? 'Subjek' : 'Subject'),
    person:   isMeeting    ? (lang === 'bm' ? 'Hadirin (pilihan)' : 'Attendees (optional)')
            : isInterview  ? (lang === 'bm' ? 'Interviewee (pilihan)' : 'Interviewee (optional)')
            : (lang === 'bm' ? 'Pensyarah (pilihan)' : 'Lecturer (optional)'),
    location: lang === 'bm' ? 'Lokasi (pilihan)' : 'Location (optional)',
  }

  const start = async () => {
    setLoading(true)
    setErr(null)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('not signed in')

      // Check plan limits + audio cap
      const usageRes = await fetch('/api/usage')
      if (usageRes.ok) {
        const { usage } = await usageRes.json()
        if (usage && !usage.allowed) {
          setErr(
            lang === 'bm'
              ? `Had audio (${(usage.capSeconds / 3600).toFixed(1)} jam) tercapai. Upgrade untuk teruskan.`
              : `Audio cap (${(usage.capSeconds / 3600).toFixed(1)}h) reached. Upgrade to continue.`
          )
          setLoading(false)
          return
        }
      }

      const { data: prof } = await sb.from('profiles').select('plan, plan_upgraded_at').eq('id', user.id).maybeSingle()
      const plan = (prof?.plan || 'free') as keyof typeof PLANS
      const limits = PLANS[plan]
      let query = sb.from('lectures').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      if (plan !== 'free' && prof?.plan_upgraded_at) {
        query = query.gte('created_at', prof.plan_upgraded_at)
      }
      const { count } = await query
      if ((count ?? 0) >= limits.lectureLimit) {
        setErr(lang === 'bm' ? 'Had kuliah tercapai. Upgrade untuk teruskan.' : 'Lecture limit reached. Upgrade to continue.')
        setLoading(false)
        return
      }

      const { data, error } = await sb.from('lectures').insert({
        user_id: user.id,
        title: title.trim() || `Untitled ${type}`,
        subject: subject.trim() || null,
        lecturer: lecturer.trim() || null,
        location: location.trim() || null,
        recording_type: type,
        status: 'recording',
        lang,
      }).select('id').maybeSingle()
      if (error) throw error
      router.replace(`/dashboard/lectures/${data!.id}`)
    } catch (e: any) {
      setErr(e.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          margin: 0, fontSize: 22, fontWeight: 600,
          letterSpacing: '-0.025em', color: '#1d1d1f',
        }}>
          {lang === 'bm' ? 'Kuliah baru' : 'New lecture'}
        </h1>
        <div style={{ fontSize: 12.5, color: 'rgba(29,29,31,0.55)', marginTop: 2 }}>
          {lang === 'bm'
            ? 'Pilih jenis rakaman — AI akan susun nota mengikut jenis.'
            : "Pick what you're capturing — AI adapts notes accordingly."}
        </div>
      </div>

      {/* TYPE PICKER */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: 8, marginBottom: 20,
      }}>
        {RECORDING_TYPES.map((t) => {
          const active = t.id === type
          return (
            <button
              key={t.id}
              onClick={() => setType(t.id)}
              style={{
                background: active ? 'rgba(29,29,31,0.025)' : '#fff',
                border: active ? '1.5px solid #1d1d1f' : '0.5px solid rgba(0,0,0,0.08)',
                borderRadius: 12, padding: '12px',
                textAlign: 'left', cursor: 'pointer',
                position: 'relative',
                transition: 'all 0.15s',
                fontFamily: 'inherit',
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 7,
                background: t.bg,
                color: t.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 8,
              }}>
                <span style={{ width: 14, height: 14, display: 'inline-flex' }}>
                  {TYPE_ICONS[t.id]}
                </span>
              </div>
              <div style={{
                fontSize: 13, fontWeight: 600,
                letterSpacing: '-0.015em',
                color: '#1d1d1f', marginBottom: 1,
              }}>
                {t.label[lang as 'en' | 'bm'] || t.label.en}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.55)', lineHeight: 1.35 }}>
                {t.desc[lang as 'en' | 'bm'] || t.desc.en}
              </div>
              {active && (
                <span style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#1d1d1f', color: '#fff',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M20 6L9 17l-5-5"/></svg>
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* FORM */}
      <div style={{
        background: '#fff',
        border: '0.5px solid rgba(0,0,0,0.06)',
        borderRadius: 14, padding: '22px 24px',
      }}>
        <Field label={labels.title}    value={title}    onChange={setTitle}
          placeholder={
            type === 'meeting'    ? 'Q4 Strategy Sync' :
            type === 'sv'         ? (lang === 'bm' ? 'SV Meeting — Bab 3' : 'SV Meeting — Chapter 3') :
            type === 'postmortem' ? (lang === 'bm' ? 'Postmortem — Career Fair' : 'Postmortem — Career Fair') :
            type === 'interview'  ? (lang === 'bm' ? 'Temubual dengan Dr. X' : 'Interview with Dr. X') :
            type === 'custom'     ? (lang === 'bm' ? 'Sesi rakaman' : 'Recording session') :
            'Biology — Mitosis'
          }
        />
        <Field label={labels.subject}  value={subject}  onChange={setSubject}
          placeholder={type === 'meeting' ? 'Engineering · Q4' : 'Biology'}
          hint={type === 'lecture' ? (lang === 'bm' ? 'Membantu kamus saintifik faham istilah.' : 'Helps the scientific dictionary understand terms.') : undefined}
        />
        <Field label={labels.person}   value={lecturer} onChange={setLecturer}
          placeholder={
            type === 'meeting' ? 'Sarah, Kumar +4' :
            type === 'interview' ? 'Dr. Aziz' :
            'Dr. Aziz'
          }
        />
        <Field label={labels.location} value={location} onChange={setLocation}
          placeholder={type === 'meeting' ? 'Zoom · Bilik 3.2' : 'Hall B'}
        />

        {err && (
          <div style={{
            padding: '10px 12px', marginBottom: 12,
            background: '#fff5f5',
            border: '0.5px solid rgba(229, 57, 53, 0.3)',
            borderRadius: 9,
            color: '#c62828', fontSize: 12.5,
          }}>
            {err}
          </div>
        )}

        <button
          onClick={start}
          disabled={loading}
          style={{
            width: '100%',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            padding: 12,
            background: '#1d1d1f', color: '#fff',
            border: 'none', borderRadius: 10,
            fontSize: 13.5, fontWeight: 500,
            letterSpacing: '-0.01em',
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontFamily: 'inherit',
            transition: 'background 0.15s',
            marginTop: 4,
          }}
          onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = '#000' }}
          onMouseLeave={(e) => { if (!loading) e.currentTarget.style.background = '#1d1d1f' }}
        >
          <Icon.Mic size={15} />
          {loading
            ? (lang === 'bm' ? 'Memulakan…' : 'Starting…')
            : (lang === 'bm' ? 'Mula rakam' : 'Start recording')}
        </button>
      </div>
    </div>
  )
}
