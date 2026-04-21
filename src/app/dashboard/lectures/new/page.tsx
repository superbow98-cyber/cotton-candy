'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/lib/i18n/LangProvider'
import { createClient } from '@/lib/supabase/client'
import { PLANS } from '@/types'
import { Icon } from '@/components/ui/Icon'

// Field defined OUTSIDE parent to avoid losing input focus on re-render
function Field({
  label, value, onChange, placeholder, hint,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; hint?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block',
        fontSize: 11.5, fontWeight: 500,
        color: 'rgba(29,29,31,0.55)',
        letterSpacing: '-0.005em', marginBottom: 6,
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
          color: '#1d1d1f', letterSpacing: '-0.005em',
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
  const { t, lang } = useLang()
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [lecturer, setLecturer] = useState('')
  const [location, setLocation] = useState('')
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const start = async () => {
    setLoading(true)
    setErr(null)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('not signed in')

      const { data: prof } = await sb.from('profiles').select('plan, plan_upgraded_at').eq('id', user.id).maybeSingle()
      const plan = (prof?.plan || 'free') as keyof typeof PLANS
      const limits = PLANS[plan]
      let query = sb.from('lectures').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      if (plan !== 'free' && prof?.plan_upgraded_at) {
        query = query.gte('created_at', prof.plan_upgraded_at)
      }
      const { count } = await query
      if ((count ?? 0) >= limits.lectureLimit) {
        setErr(t('limitReached'))
        setLoading(false)
        return
      }

      const { data, error } = await sb.from('lectures').insert({
        user_id: user.id,
        title: title.trim() || 'Untitled Lecture',
        subject: subject.trim() || null,
        lecturer: lecturer.trim() || null,
        location: location.trim() || null,
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
    <div style={{ maxWidth: 560, margin: '0 auto' }}>
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
            ? 'Isi sedikit butiran, kemudian mula rakam.'
            : 'Fill in a few details, then start recording.'}
        </div>
      </div>

      {/* FORM CARD */}
      <div style={{
        background: '#fff',
        border: '0.5px solid rgba(0,0,0,0.06)',
        borderRadius: 14,
        padding: '22px 24px',
      }}>
        <Field
          label={lang === 'bm' ? 'Tajuk' : 'Title'}
          value={title}
          onChange={setTitle}
          placeholder={lang === 'bm' ? 'Biologi — Mitosis' : 'Biology — Mitosis'}
        />
        <Field
          label={lang === 'bm' ? 'Subjek' : 'Subject'}
          value={subject}
          onChange={setSubject}
          placeholder={lang === 'bm' ? 'Biologi / Kimia / Fizik' : 'Biology / Chemistry / Physics'}
          hint={lang === 'bm'
            ? 'Membantu kamus saintifik faham istilah yang betul.'
            : 'Helps our scientific dictionary understand the right terms.'}
        />
        <Field
          label={lang === 'bm' ? 'Pensyarah (pilihan)' : 'Lecturer (optional)'}
          value={lecturer}
          onChange={setLecturer}
          placeholder="Dr. Aziz"
        />
        <Field
          label={lang === 'bm' ? 'Lokasi (pilihan)' : 'Location (optional)'}
          value={location}
          onChange={setLocation}
          placeholder={lang === 'bm' ? 'Dewan B' : 'Hall B'}
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
