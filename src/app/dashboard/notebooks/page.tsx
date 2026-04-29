'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { type Notebook, type Lecture, PLANS } from '@/types'

const subjectCover = (subject: string | null | undefined): string => {
  const s = (subject || '').toLowerCase()
  if (/bio|biolog/.test(s)) return 'linear-gradient(135deg, #1B5E20, #4CAF50)'
  if (/chem|kimia/.test(s)) return 'linear-gradient(135deg, #BF360C, #FF7043)'
  if (/phys|fizik/.test(s)) return 'linear-gradient(135deg, #0D47A1, #42A5F5)'
  if (/math|matem/.test(s)) return 'linear-gradient(135deg, #4A148C, #8E24AA)'
  if (/hist|sejarah/.test(s)) return 'linear-gradient(135deg, #4E342E, #8D6E63)'
  if (/geo|geogr/.test(s)) return 'linear-gradient(135deg, #006064, #26C6DA)'
  return 'linear-gradient(135deg, #424242, #757575)'
}

const subjectIcon = (subject: string | null | undefined): string => {
  const s = (subject || '').toLowerCase()
  if (/bio|biolog/.test(s)) return '🧬'
  if (/chem|kimia/.test(s)) return '⚗️'
  if (/phys|fizik/.test(s)) return '⚛️'
  if (/math|matem/.test(s)) return '📐'
  if (/hist|sejarah/.test(s)) return '📜'
  if (/geo|geogr/.test(s)) return '🌏'
  return '📓'
}

export default function NotebooksPage() {
  const { lang } = useLang()
  const { tokens: s } = useTheme()
  const [notebooks, setNotebooks] = useState<Notebook[]>([])
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [limitError, setLimitError] = useState<string | null>(null)
  const [userPlan, setUserPlan] = useState<keyof typeof PLANS>('free')

  const [dragLectureId, setDragLectureId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [moveMenuFor, setMoveMenuFor] = useState<string | null>(null)

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
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return

    const limit = PLANS[userPlan].notebookLimit
    if (notebooks.length >= limit) {
      setLimitError(lang === 'bm'
        ? `Had buku nota dicapai (${limit}). Naik tahap untuk lebih.`
        : `Notebook limit reached (${limit}). Upgrade for more.`)
      return
    }
    setLimitError(null)

    let coverImageUrl: string | null = null
    let coverPhotographerName: string | null = null
    let coverPhotographerLink: string | null = null
    try {
      const searchQuery = subject.trim() || name.trim()
      const imgRes = await fetch(`/api/unsplash?q=${encodeURIComponent(searchQuery)}`)
      if (imgRes.ok) {
        const imgData = await imgRes.json()
        if (imgData.image) {
          coverImageUrl = imgData.image.url
          coverPhotographerName = imgData.image.photographer?.name || null
          coverPhotographerLink = imgData.image.photographer?.link || null
        }
      }
    } catch {}

    const { data, error } = await sb.from('notebooks').insert({
      user_id: user.id,
      title: name.trim(),
      subject: subject.trim() || null,
      color: '#FF8FA8',
      lecture_ids: [],
      cover_image_url: coverImageUrl,
      cover_photographer_name: coverPhotographerName,
      cover_photographer_link: coverPhotographerLink,
    }).select().maybeSingle()
    if (error) { console.error(error); return }
    if (data) setNotebooks([data as Notebook, ...notebooks])
    setName(''); setSubject(''); setCreating(false)
  }

  const moveLecture = async (lectureId: string, notebookId: string | null) => {
    const sb = createClient()
    const { error } = await sb.from('lectures').update({ notebook_id: notebookId }).eq('id', lectureId)
    if (error) { console.error(error); return }
    setLectures(lectures.map(l => l.id === lectureId ? { ...l, notebook_id: notebookId } : l))
    setMoveMenuFor(null)
  }

  const onDragStart = (e: React.DragEvent, lectureId: string) => {
    setDragLectureId(lectureId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', lectureId)
  }
  const onDragEnd = () => {
    setDragLectureId(null)
    setDropTargetId(null)
  }
  const onDragOver = (e: React.DragEvent, notebookId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetId(notebookId)
  }
  const onDragLeave = () => setDropTargetId(null)
  const onDrop = (e: React.DragEvent, notebookId: string) => {
    e.preventDefault()
    const lectureId = e.dataTransfer.getData('text/plain')
    if (lectureId) moveLecture(lectureId, notebookId)
    setDragLectureId(null)
    setDropTargetId(null)
  }

  const notebookById = useMemo(() => {
    const m = new Map<string, Notebook>()
    notebooks.forEach(n => m.set(n.id, n))
    return m
  }, [notebooks])

  const limit = PLANS[userPlan].notebookLimit

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px' }}>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.025em', margin: 0 }}>
            {lang === 'bm' ? 'Buku Nota' : 'Notebooks'}
          </h1>
          <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.55)', marginTop: 2 }}>
            {notebooks.length} / {limit} · {PLANS[userPlan].name}
          </div>
        </div>
        <button
          onClick={() => setCreating(!creating)}
          style={{
            padding: '8px 16px',
            background: '#1d1d1f', color: '#fff',
            border: 'none', borderRadius: 100,
            fontSize: 12, fontWeight: 500,
            cursor: 'pointer',
          }}
        >+ {lang === 'bm' ? 'Baru' : 'New'}</button>
      </div>

      {limitError && (
        <div style={{
          padding: '10px 14px', marginBottom: 12,
          background: 'rgba(255, 200, 100, 0.1)',
          border: '0.5px solid rgba(255, 200, 100, 0.3)',
          borderRadius: 10,
          fontSize: 12, color: '#8a6d0f',
        }}>{limitError}</div>
      )}

      {creating && (
        <div style={{
          background: '#fff', padding: 16, borderRadius: 12,
          border: '0.5px solid rgba(0,0,0,0.08)', marginBottom: 16,
        }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={lang === 'bm' ? 'Nama buku nota' : 'Notebook name'}
            style={{
              width: '100%', padding: '10px 12px', marginBottom: 8,
              border: '0.5px solid rgba(0,0,0,0.14)', borderRadius: 8,
              fontSize: 13, color: '#1d1d1f', outline: 'none',
            }}
          />
          <input
            value={subject}
            onChange={e => setSubject(e.target.value)}
            placeholder={lang === 'bm' ? 'Subjek (e.g. Biology)' : 'Subject (e.g. Biology)'}
            style={{
              width: '100%', padding: '10px 12px', marginBottom: 12,
              border: '0.5px solid rgba(0,0,0,0.14)', borderRadius: 8,
              fontSize: 13, color: '#1d1d1f', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={create} style={{
              padding: '8px 14px', background: '#1d1d1f', color: '#fff',
              border: 'none', borderRadius: 100, fontSize: 12, cursor: 'pointer',
            }}>{lang === 'bm' ? 'Cipta' : 'Create'}</button>
            <button onClick={() => { setCreating(false); setName(''); setSubject('') }} style={{
              padding: '8px 14px', background: '#fff', color: '#1d1d1f',
              border: '0.5px solid rgba(0,0,0,0.14)', borderRadius: 100, fontSize: 12, cursor: 'pointer',
            }}>{lang === 'bm' ? 'Batal' : 'Cancel'}</button>
          </div>
        </div>
      )}

      <div className="notebooks-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 240px) 1fr',
        gap: 16,
      }}>

        <div>
          <div style={{
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'rgba(29,29,31,0.45)',
            marginBottom: 8,
          }}>
            {lang === 'bm' ? 'Buku Nota' : 'Notebooks'}
          </div>

          {notebooks.length === 0 && !creating && (
            <div style={{
              padding: 16, textAlign: 'center',
              background: '#fafafa', borderRadius: 10,
              border: '1px dashed rgba(0,0,0,0.1)',
              fontSize: 12, color: 'rgba(29,29,31,0.5)',
            }}>
              {lang === 'bm' ? 'Tiada buku nota lagi' : 'No notebooks yet'}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {notebooks.map(nb => {
              const lectureCount = lectures.filter(l => l.notebook_id === nb.id).length
              const isDropTarget = dropTargetId === nb.id

              return (
                <Link
                  key={nb.id}
                  href={`/dashboard/notebooks/${nb.id}`}
                  onDragOver={(e) => onDragOver(e, nb.id)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, nb.id)}
                  style={{
                    background: isDropTarget ? 'rgba(90, 143, 245, 0.08)' : '#fff',
                    border: isDropTarget ? '2px dashed #5A8FF5' : '0.5px solid rgba(0,0,0,0.08)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    textDecoration: 'none',
                    display: 'block',
                    transition: 'border 0.1s, background 0.1s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {nb.cover_image_url ? (
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: `url(${nb.cover_image_url}) center / cover`,
                        flexShrink: 0,
                      }} />
                    ) : (
                      <div style={{
                        width: 32, height: 32, borderRadius: 8,
                        background: subjectCover(nb.subject || nb.title),
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, flexShrink: 0,
                      }}>{subjectIcon(nb.subject || nb.title)}</div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: 500, color: '#1d1d1f',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{nb.title}</div>
                      <div style={{ fontSize: 11, color: isDropTarget ? '#5A8FF5' : 'rgba(29,29,31,0.55)' }}>
                        {isDropTarget
                          ? (lang === 'bm' ? 'Lepaskan untuk tambah ↓' : 'Drop to add ↓')
                          : `${lectureCount} ${lang === 'bm' ? 'rakaman' : (lectureCount === 1 ? 'lecture' : 'lectures')}`}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <div>
          <div style={{
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.06em', color: 'rgba(29,29,31,0.45)',
            marginBottom: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>{lang === 'bm' ? 'Semua Rakaman · seret untuk tambah' : 'All Recordings · drag to add'}</span>
            <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>
              {lectures.length}
            </span>
          </div>

          {lectures.length === 0 && (
            <div style={{
              padding: 24, textAlign: 'center',
              background: '#fafafa', borderRadius: 10,
              border: '1px dashed rgba(0,0,0,0.1)',
              fontSize: 12, color: 'rgba(29,29,31,0.5)',
            }}>
              {lang === 'bm' ? 'Belum ada rakaman' : 'No recordings yet'}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {lectures.map(lec => {
              const inNotebook = lec.notebook_id ? notebookById.get(lec.notebook_id) : null
              const isDragging = dragLectureId === lec.id

              return (
                <div
                  key={lec.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, lec.id)}
                  onDragEnd={onDragEnd}
                  style={{
                    background: '#fff',
                    border: isDragging ? '2px solid #5A8FF5' : '0.5px solid rgba(0,0,0,0.08)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: 'grab',
                    opacity: isDragging ? 0.6 : 1,
                    transform: isDragging ? 'rotate(-1deg)' : 'none',
                    transition: 'opacity 0.1s, transform 0.1s',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{
                      fontSize: 14, color: 'rgba(29,29,31,0.4)',
                      cursor: 'grab', flexShrink: 0,
                    }}>⋮⋮</span>

                    <Link
                      href={`/dashboard/lectures/${lec.id}`}
                      style={{
                        flex: 1, minWidth: 0, textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      <div style={{
                        fontSize: 13, color: '#1d1d1f', fontWeight: 500,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{lec.title || (lang === 'bm' ? 'Tiada tajuk' : 'Untitled')}</div>
                      <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.5)' }}>
                        {lec.duration_seconds
                          ? `${Math.round(lec.duration_seconds / 60)} min · ${new Date(lec.created_at).toLocaleDateString()}`
                          : new Date(lec.created_at).toLocaleDateString()}
                      </div>
                    </Link>

                    {inNotebook ? (
                      <span style={{
                        fontSize: 10, padding: '2px 8px',
                        background: 'rgba(52, 168, 83, 0.1)',
                        color: '#2C8545',
                        borderRadius: 100,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                        maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{inNotebook.title}</span>
                    ) : (
                      <span style={{
                        fontSize: 10, padding: '2px 8px',
                        background: 'rgba(0,0,0,0.04)',
                        color: 'rgba(29,29,31,0.5)',
                        borderRadius: 100,
                        flexShrink: 0,
                      }}>{lang === 'bm' ? 'Tiada' : 'Unsorted'}</span>
                    )}

                    <button
                      onClick={(e) => { e.preventDefault(); setMoveMenuFor(moveMenuFor === lec.id ? null : lec.id) }}
                      style={{
                        background: 'transparent', border: 'none', padding: 4,
                        cursor: 'pointer', fontSize: 14, color: 'rgba(29,29,31,0.5)',
                        flexShrink: 0,
                      }}
                      aria-label="Move to notebook"
                    >⋯</button>
                  </div>

                  {moveMenuFor === lec.id && (
                    <div style={{
                      marginTop: 8, padding: 8,
                      background: '#fafafa', borderRadius: 8,
                      border: '0.5px solid rgba(0,0,0,0.08)',
                    }}>
                      <div style={{
                        fontSize: 10, fontWeight: 600,
                        color: 'rgba(29,29,31,0.5)',
                        textTransform: 'uppercase', letterSpacing: '0.05em',
                        marginBottom: 6,
                      }}>{lang === 'bm' ? 'Pindah ke buku nota' : 'Move to notebook'}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {lec.notebook_id && (
                          <button onClick={() => moveLecture(lec.id, null)} style={moveMenuButtonStyle}>
                            ✕ {lang === 'bm' ? 'Buang dari buku nota' : 'Remove from notebook'}
                          </button>
                        )}
                        {notebooks.map(nb => (
                          <button
                            key={nb.id}
                            onClick={() => moveLecture(lec.id, nb.id)}
                            disabled={lec.notebook_id === nb.id}
                            style={{
                              ...moveMenuButtonStyle,
                              background: lec.notebook_id === nb.id ? '#1d1d1f' : '#fff',
                              color: lec.notebook_id === nb.id ? '#fff' : '#1d1d1f',
                            }}
                          >
                            {subjectIcon(nb.subject || nb.title)} {nb.title}
                            {lec.notebook_id === nb.id && ' ✓'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          :global(.notebooks-grid) {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  )
}

const moveMenuButtonStyle: React.CSSProperties = {
  display: 'block',
  width: '100%',
  padding: '6px 10px',
  background: '#fff',
  color: '#1d1d1f',
  border: '0.5px solid rgba(0,0,0,0.08)',
  borderRadius: 6,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
}
