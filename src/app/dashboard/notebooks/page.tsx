'use client'
import { useEffect, useMemo, useState } from 'react'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { type Notebook, type Lecture, PLANS } from '@/types'
import { lectureToPdf, lectureToMarkdown, downloadText } from '@/lib/export'
import { Icon } from '@/components/ui/Icon'

// Pastel gradient cover by subject keyword
const subjectCover = (subject: string | null | undefined): string => {
  const s = (subject || '').toLowerCase()
  if (/bio|biolog/.test(s)) return 'linear-gradient(135deg, #E8F5E9, #C8E6C9)'
  if (/chem|kimia/.test(s)) return 'linear-gradient(135deg, #FFF3E0, #FFE0B2)'
  if (/phys|fizik/.test(s)) return 'linear-gradient(135deg, #E3F2FD, #BBDEFB)'
  if (/math|matem/.test(s)) return 'linear-gradient(135deg, #F3E5F5, #E1BEE7)'
  if (/hist|sejarah/.test(s)) return 'linear-gradient(135deg, #FFEBEE, #FFCDD2)'
  if (/geo|geogr/.test(s)) return 'linear-gradient(135deg, #E0F7FA, #B2EBF2)'
  return 'linear-gradient(135deg, #F5F5F7, #E8E8EA)'
}

export default function NotebooksPage() {
  const { lang } = useLang()
  const { tokens: s } = useTheme()
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [limitError, setLimitError] = useState<string | null>(null)
  const [userPlan, setUserPlan] = useState<keyof typeof PLANS>('free')

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
    setUserPlan((prof?.plan || 'free') as keyof typeof PLANS)
  }
  useEffect(() => { load() }, [])

  const create = async () => {
    if (!name.trim()) return
    setLimitError(null)

    // Enforce notebook limit
    const limit = PLANS[userPlan].notebookLimit
    if (notebooks.length >= limit) {
      setLimitError(
        lang === 'bm'
          ? `Had notebook tercapai (${limit}). Upgrade untuk lebih.`
          : `Notebook limit reached (${limit}). Upgrade for more.`
      )
      return
    }

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
    const next = has ? (nb.lecture_ids || []).filter((x) => x !== lectureId) : [...(nb.lecture_ids || []), lectureId]
    const sb = createClient()
    await sb.from('notebooks').update({ lecture_ids: next }).eq('id', nb.id)
    load()
  }

  const del = async (id: string) => {
    if (!confirm(lang === 'bm' ? 'Padam notebook ini?' : 'Delete this notebook?')) return
    const sb = createClient()
    await sb.from('notebooks').delete().eq('id', id)
    load()
  }

  const exportNotebook = async (nb: Notebook, format: 'md' | 'pdf') => {
    const nbLectures = lectures.filter((l) => nb.lecture_ids?.includes(l.id))
    if (nbLectures.length === 0) {
      alert(lang === 'bm' ? 'Notebook ini kosong.' : 'This notebook is empty.')
      return
    }
    if (format === 'md') {
      const md = nbLectures.map((l) => lectureToMarkdown(l)).join('\n\n---\n\n')
      downloadText(`${nb.title.replace(/[^\w-]+/g, '_')}.md`, md, 'text/markdown')
    } else {
      // Simple PDF for first lecture only — export each is cleaner
      for (const l of nbLectures) await lectureToPdf(l, { watermark: false, theme: s })
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: 12, marginBottom: 20, flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{
            margin: 0, fontSize: 22, fontWeight: 600,
            letterSpacing: '-0.025em', color: '#1d1d1f',
          }}>
            {lang === 'bm' ? 'Notebook' : 'Notebooks'}
          </h1>
          <div style={{ fontSize: 12.5, color: 'rgba(29,29,31,0.55)', marginTop: 2 }}>
            {lang === 'bm'
              ? 'Kumpul kuliah ikut subjek atau semester.'
              : 'Group lectures by subject, semester, or topic.'}
          </div>
        </div>
        {!creating && (
          <button onClick={() => setCreating(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 9,
            background: '#1d1d1f', color: '#fff',
            border: 'none', fontSize: 13, fontWeight: 500,
            letterSpacing: '-0.01em', cursor: 'pointer',
            fontFamily: 'inherit',
          }}>
            <Icon.Plus size={14} />
            {lang === 'bm' ? 'Notebook baru' : 'New notebook'}
          </button>
        )}
      </div>

      {/* CREATE FORM */}
      {creating && (
        <div style={{
          background: '#fff',
          border: '0.5px solid rgba(0,0,0,0.06)',
          borderRadius: 14, padding: '18px 20px',
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'bm' ? 'Nama notebook, contoh: Biologi Sem 2' : 'Notebook name, e.g., Biology Sem 2'}
              style={{
                flex: 1, minWidth: 200,
                padding: '10px 14px',
                background: '#f5f5f7',
                border: '0.5px solid rgba(0,0,0,0.08)',
                borderRadius: 10, fontSize: 13.5,
                color: '#1d1d1f', fontFamily: 'inherit', outline: 'none',
              }}
              autoFocus
            />
            <input
              value={subject} onChange={(e) => setSubject(e.target.value)}
              placeholder={lang === 'bm' ? 'Subjek (pilihan)' : 'Subject (optional)'}
              style={{
                flex: 1, minWidth: 160,
                padding: '10px 14px',
                background: '#f5f5f7',
                border: '0.5px solid rgba(0,0,0,0.08)',
                borderRadius: 10, fontSize: 13.5,
                color: '#1d1d1f', fontFamily: 'inherit', outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={create} style={{
              padding: '8px 14px', borderRadius: 9,
              background: '#1d1d1f', color: '#fff', border: 'none',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              {lang === 'bm' ? 'Cipta' : 'Create'}
            </button>
            <button onClick={() => { setCreating(false); setName(''); setSubject(''); setLimitError(null) }} style={{
              padding: '8px 14px', borderRadius: 9,
              background: '#fff', color: '#1d1d1f',
              border: '0.5px solid rgba(0,0,0,0.08)',
              fontSize: 13, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit',
            }}>
              {lang === 'bm' ? 'Batal' : 'Cancel'}
            </button>
          </div>
          {limitError && (
            <div style={{
              marginTop: 12,
              padding: '10px 12px',
              background: '#FEF3C7',
              color: '#92400E',
              border: '0.5px solid rgba(146, 64, 14, 0.2)',
              borderRadius: 10,
              fontSize: 12.5,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span>⚠️</span>
              <span>{limitError}</span>
              <a href="/#pricing" style={{
                marginLeft: 'auto', color: '#5A8FF5',
                fontWeight: 600, textDecoration: 'none',
              }}>
                {lang === 'bm' ? 'Upgrade →' : 'Upgrade →'}
              </a>
            </div>
          )}
        </div>
      )}

      {/* GRID */}
      <div style={{
        display: 'grid', gap: 12,
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
      }}>
        {notebooks.map((nb) => {
          const nbLectures = lectures.filter((l) => nb.lecture_ids?.includes(l.id))
          const totalMins = nbLectures.reduce((a, l) => a + Math.round((l.duration_seconds || 0) / 60), 0)
          const expanded = expandedId === nb.id
          return (
            <div key={nb.id} style={{
              background: '#fff',
              border: '0.5px solid rgba(0,0,0,0.06)',
              borderRadius: 14,
              padding: 16,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onClick={() => setExpandedId(expanded ? null : nb.id)}
            onMouseEnter={(e) => { if (!expanded) e.currentTarget.style.borderColor = 'rgba(0,0,0,0.14)' }}
            onMouseLeave={(e) => { if (!expanded) e.currentTarget.style.borderColor = 'rgba(0,0,0,0.06)' }}
            >
              {/* Cover */}
              <div style={{
                height: 80, borderRadius: 10, marginBottom: 12,
                background: subjectCover(nb.subject || nb.title),
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', top: 8, left: 8,
                  width: 18, height: 24,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                }} />
              </div>

              {/* Info */}
              <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.015em', marginBottom: 2, color: '#1d1d1f' }}>
                {nb.title}
              </div>
              <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.55)' }}>
                {nbLectures.length === 0
                  ? (lang === 'bm' ? 'Kosong · tap untuk isi' : 'Empty · tap to fill')
                  : `${nbLectures.length} ${lang === 'bm' ? 'kuliah' : 'lectures'} · ${totalMins} min`}
              </div>

              {/* Expanded state */}
              {expanded && (
                <div onClick={(e) => e.stopPropagation()} style={{
                  marginTop: 14, paddingTop: 14,
                  borderTop: '0.5px solid rgba(0,0,0,0.06)',
                }}>
                  {lectures.length === 0 ? (
                    <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)', textAlign: 'center', padding: 12 }}>
                      {lang === 'bm' ? 'Takda kuliah direkod lagi.' : 'No lectures recorded yet.'}
                    </div>
                  ) : (
                    <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
                      {lectures.slice(0, 20).map((l) => {
                        const included = nb.lecture_ids?.includes(l.id)
                        return (
                          <label key={l.id} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            padding: '6px 0', fontSize: 12,
                            cursor: 'pointer',
                            color: included ? '#1d1d1f' : 'rgba(29,29,31,0.6)',
                          }}>
                            <input
                              type="checkbox"
                              checked={included || false}
                              onChange={() => toggleLecture(nb, l.id)}
                              style={{ margin: 0, cursor: 'pointer' }}
                            />
                            <span style={{
                              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1,
                            }}>{l.title}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => exportNotebook(nb, 'md')} style={actionBtn}>
                      <Icon.Download size={11} /> .md
                    </button>
                    <button onClick={() => exportNotebook(nb, 'pdf')} style={actionBtn}>
                      <Icon.Download size={11} /> .pdf
                    </button>
                    <button onClick={() => del(nb.id)} style={{ ...actionBtn, color: '#c62828' }}>
                      <Icon.Trash size={11} /> {lang === 'bm' ? 'Padam' : 'Delete'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        })}

        {/* New notebook card (empty state tile) */}
        {!creating && (
          <button
            onClick={() => setCreating(true)}
            style={{
              background: 'rgba(0,0,0,0.02)',
              border: '1.5px dashed rgba(0,0,0,0.12)',
              borderRadius: 14, padding: '32px 16px',
              textAlign: 'center', cursor: 'pointer',
              transition: 'all 0.15s',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              minHeight: 165, fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.25)'
              e.currentTarget.style.background = 'rgba(0,0,0,0.04)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'rgba(0,0,0,0.12)'
              e.currentTarget.style.background = 'rgba(0,0,0,0.02)'
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: '#fff',
              border: '0.5px solid rgba(0,0,0,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 10, color: 'rgba(29,29,31,0.7)',
            }}>
              <Icon.Plus size={14} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f' }}>
              {lang === 'bm' ? 'Notebook baru' : 'New notebook'}
            </div>
          </button>
        )}
      </div>

      {notebooks.length === 0 && !creating && (
        <div style={{ marginTop: 16 }} />
      )}
    </div>
  )
}

const actionBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '5px 10px',
  background: '#fff',
  border: '0.5px solid rgba(0,0,0,0.08)',
  borderRadius: 7, fontSize: 11, fontWeight: 500,
  color: 'rgba(29,29,31,0.7)',
  cursor: 'pointer', fontFamily: 'inherit',
  letterSpacing: '-0.005em',
}
