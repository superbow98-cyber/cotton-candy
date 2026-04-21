'use client'
import { useEffect, useState } from 'react'
import Button from '@/components/ui/Button'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { type Notebook, type Lecture, PLANS } from '@/types'
import { lectureToPdf } from '@/lib/export'

export default function NotebooksPage() {
  const { t } = useLang()
  const { tokens: s } = useTheme()
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [plan, setPlan] = useState<keyof typeof PLANS>('free')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = async () => {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const [{ data: nb }, { data: lec }, { data: prof }] = await Promise.all([
      sb.from('notebooks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      sb.from('lectures').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      sb.from('profiles').select('plan').eq('id', user.id).maybeSingle(),
    ])
    setNotebooks((nb || []) as Notebook[])
    setLectures((lec || []) as Lecture[])
    setPlan((prof?.plan || 'free') as keyof typeof PLANS)
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!name.trim()) return
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    await sb.from('notebooks').insert({
      user_id: user.id,
      title: name.trim(),
      subject: subject.trim() || null,
      color: s.primary,
    })
    setName(''); setSubject(''); setCreating(false)
    load()
  }

  const toggleLecture = async (nb: Notebook, lectureId: string) => {
    const has = nb.lecture_ids?.includes(lectureId)
    const next = has ? nb.lecture_ids.filter((x) => x !== lectureId) : [...(nb.lecture_ids || []), lectureId]
    const sb = createClient()
    await sb.from('notebooks').update({ lecture_ids: next }).eq('id', nb.id)
    load()
  }

  const del = async (id: string) => {
    if (!confirm('Delete this notebook?')) return
    const sb = createClient()
    await sb.from('notebooks').delete().eq('id', id)
    load()
  }

  const exportAll = async (nb: Notebook) => {
    const inc = lectures.filter((l) => nb.lecture_ids?.includes(l.id))
    if (!inc.length) return alert('Add lectures to this notebook first.')
    for (const l of inc) {
      await lectureToPdf(l, { watermark: PLANS[plan].watermark, theme: s })
    }
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(24px, 4vw, 34px)', margin: 0 }}>{t('nbTitle')}</h1>
        <Button onClick={() => setCreating(!creating)}>➕ {t('nbNew')}</Button>
      </div>

      {creating && (
        <div className="fade-in" style={{
          background: '#fff', padding: 22, borderRadius: 20,
          border: `1px solid ${s.border}`, marginBottom: 18,
          display: 'grid', gap: 10,
        }}>
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder={t('nbName')}
            style={{ padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${s.border}`, fontSize: 15, outline: 'none', background: s.soft }}
          />
          <input
            value={subject} onChange={(e) => setSubject(e.target.value)}
            placeholder={t('nbSubject')}
            style={{ padding: '12px 14px', borderRadius: 12, border: `1.5px solid ${s.border}`, fontSize: 15, outline: 'none', background: s.soft }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <Button onClick={create}>{t('nbCreate')}</Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>{t('cancel')}</Button>
          </div>
        </div>
      )}

      {notebooks.length === 0 ? (
        <div style={{
          background: '#fff', padding: 36, borderRadius: 20,
          border: `2px dashed ${s.border}`, textAlign: 'center', color: s.gray,
        }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>📘</div>
          {t('nbEmpty')}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 14 }}>
          {notebooks.map((nb) => {
            const expanded = expandedId === nb.id
            const included = lectures.filter((l) => nb.lecture_ids?.includes(l.id))
            return (
              <div key={nb.id} style={{
                background: '#fff', borderRadius: 18,
                border: `1px solid ${s.border}`, overflow: 'hidden',
              }}>
                <div style={{
                  padding: 18, display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', flexWrap: 'wrap', gap: 10,
                  borderLeft: `6px solid ${nb.color || s.primary}`,
                }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{nb.title}</div>
                    <div style={{ fontSize: 12, color: s.gray, marginTop: 3 }}>
                      {nb.subject || '—'} · {included.length} lectures
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button variant="outline" size="sm" onClick={() => setExpandedId(expanded ? null : nb.id)}>
                      {expanded ? '▲' : '▼'} {t('nbAddLecture')}
                    </Button>
                    <Button size="sm" onClick={() => exportAll(nb)}>📘 {t('nbExport')}</Button>
                    <Button variant="ghost" size="sm" onClick={() => del(nb.id)}>🗑</Button>
                  </div>
                </div>
                {expanded && (
                  <div style={{ padding: 18, borderTop: `1px solid ${s.border}`, background: s.soft }}>
                    {lectures.length === 0 ? (
                      <p style={{ margin: 0, color: s.gray, fontSize: 13 }}>No lectures yet. Record one first.</p>
                    ) : lectures.map((l) => {
                      const on = nb.lecture_ids?.includes(l.id)
                      return (
                        <label key={l.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '6px 0', cursor: 'pointer', fontSize: 13,
                        }}>
                          <input
                            type="checkbox" checked={!!on}
                            onChange={() => toggleLecture(nb, l.id)}
                          />
                          <span style={{ fontWeight: on ? 700 : 500 }}>{l.title}</span>
                          <span style={{ color: s.gray, marginLeft: 'auto', fontSize: 11 }}>
                            {new Date(l.created_at).toLocaleDateString()}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
