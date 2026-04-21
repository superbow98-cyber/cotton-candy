'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/Button'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { PLANS } from '@/types'
import type { ThemeTokens } from '@/types'

// ----- Field component DEFINED OUTSIDE parent (critical!) -----
function Field({
  label,
  value,
  onChange,
  placeholder,
  tokens,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  tokens: ThemeTokens
}) {
  return (
    <div>
      <label style={{
        fontSize: 12, color: tokens.gray, fontWeight: 600,
        display: 'block', marginBottom: 4,
      }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%', padding: '12px 14px',
          borderRadius: 12, border: `1.5px solid ${tokens.border}`,
          fontSize: 15, background: tokens.soft, outline: 'none',
        }}
        onFocus={(e) => (e.target.style.borderColor = tokens.primaryDark)}
        onBlur={(e) => (e.target.style.borderColor = tokens.border)}
      />
    </div>
  )
}

export default function NewLecture() {
  const { t, lang } = useLang()
  const { tokens: s } = useTheme()
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
      <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(24px, 4vw, 32px)', marginBottom: 24 }}>
        {t('newTitle')}
      </h1>

      <div style={{
        background: '#fff', padding: 24, borderRadius: 22,
        border: `1px solid ${s.border}`, display: 'flex', flexDirection: 'column', gap: 14,
      }}>
        <Field label={t('newTitle')}    value={title}    onChange={setTitle}    placeholder={t('newPlaceholder')} tokens={s} />
        <Field label={t('newSubject')}  value={subject}  onChange={setSubject}  placeholder="Biology / Maths / …" tokens={s} />
        <Field label={t('newLecturer')} value={lecturer} onChange={setLecturer} placeholder="Dr. …" tokens={s} />
        <Field label={t('newLocation')} value={location} onChange={setLocation} placeholder="Hall A / Lab 3 / …" tokens={s} />

        {err && <p style={{ color: '#d66', fontSize: 13, margin: 0 }}>{err}</p>}

        <Button size="lg" onClick={start} disabled={loading}>
          {loading ? t('loading') : `🎙️ ${t('newStart')}`}
        </Button>
      </div>
    </div>
  )
}
