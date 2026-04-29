'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useLang } from '@/lib/i18n/LangProvider'
import { createClient } from '@/lib/supabase/client'
import { type Notebook, type Lecture } from '@/types'

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

export default function NotebookDetailPage() {
  const { lang } = useLang()
  const params = useParams()
  const router = useRouter()
  const nbId = params.id as string

  const [notebook, setNotebook] = useState<Notebook | null>(null)
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [unsorted, setUnsorted] = useState<Lecture[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState('')

  const [dragLectureId, setDragLectureId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const load = async () => {
    setLoading(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return

    const [{ data: nb }, { data: inNotebook }, { data: notIn }] = await Promise.all([
      sb.from('notebooks').select('*').eq('id', nbId).eq('user_id', user.id).maybeSingle(),
      sb.from('lectures').select('*').eq('user_id', user.id).eq('notebook_id', nbId).order('created_at', { ascending: false }),
      sb.from('lectures').select('*').eq('user_id', user.id).is('notebook_id', null).order('created_at', { ascending: false }),
    ])

    if (!nb) {
      router.replace('/dashboard/notebooks')
      return
    }
    setNotebook(nb as Notebook)
    setEditTitle((nb as Notebook).title)
    setLectures((inNotebook || []) as Lecture[])
    setUnsorted((notIn || []) as Lecture[])
    setLoading(false)
  }

  useEffect(() => { load() }, [nbId])

  const totalDuration = lectures.reduce((sum, l) => sum + (l.duration_seconds || 0), 0)
  const hours = Math.floor(totalDuration / 3600)
  const mins = Math.floor((totalDuration % 3600) / 60)
  const durationLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`

  const moveLecture = async (lectureId: string, targetNbId: string | null) => {
    const sb = createClient()
    await sb.from('lectures').update({ notebook_id: targetNbId }).eq('id', lectureId)
    await load()
  }

  const renameNotebook = async () => {
    if (!editTitle.trim() || !notebook) return
    const sb = createClient()
    await sb.from('notebooks').update({ title: editTitle.trim() }).eq('id', notebook.id)
    setNotebook({ ...notebook, title: editTitle.trim() })
    setEditing(false)
  }

  const deleteNotebook = async () => {
    if (!notebook) return
    if (!confirm(lang === 'bm'
      ? `Padam buku nota "${notebook.title}"? Rakaman akan jadi tidak diisih (tidak dipadam).`
      : `Delete notebook "${notebook.title}"? Lectures will become unsorted (not deleted).`)) return
    const sb = createClient()
    // Set notebook_id to null for all lectures in this notebook
    await sb.from('lectures').update({ notebook_id: null }).eq('notebook_id', notebook.id)
    await sb.from('notebooks').delete().eq('id', notebook.id)
    router.replace('/dashboard/notebooks')
  }

  const onDragStart = (e: React.DragEvent, lectureId: string) => {
    setDragLectureId(lectureId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', lectureId)
  }
  const onDragEnd = () => setDragLectureId(null)
  const onDropToNotebook = (e: React.DragEvent) => {
    e.preventDefault()
    const lectureId = e.dataTransfer.getData('text/plain')
    if (lectureId && notebook) moveLecture(lectureId, notebook.id)
  }

  if (loading) {
    return <div style={{ padding: 20, textAlign: 'center', color: 'rgba(29,29,31,0.5)' }}>Loading…</div>
  }
  if (!notebook) return null

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>

      <Link href="/dashboard/notebooks" style={{
        fontSize: 12, color: 'rgba(29,29,31,0.6)',
        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
        marginBottom: 12,
      }}>
        ← {lang === 'bm' ? 'Buku Nota' : 'Notebooks'}
      </Link>

      <div style={{
        background: '#fff', borderRadius: 14,
        border: '0.5px solid rgba(0,0,0,0.08)',
        padding: 18, marginBottom: 16,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        {notebook.cover_image_url ? (
          <div style={{
            width: 60, height: 60, borderRadius: 12,
            background: `url(${notebook.cover_image_url}) center / cover`,
            flexShrink: 0,
          }} />
        ) : (
          <div style={{
            width: 60, height: 60, borderRadius: 12,
            background: subjectCover(notebook.subject || notebook.title),
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, flexShrink: 0,
          }}>{subjectIcon(notebook.subject || notebook.title)}</div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={renameNotebook}
              onKeyDown={e => e.key === 'Enter' && renameNotebook()}
              autoFocus
              style={{
                fontSize: 18, fontWeight: 500, color: '#1d1d1f',
                width: '100%', border: '0.5px solid rgba(0,0,0,0.14)', borderRadius: 6,
                padding: '4px 8px', outline: 'none', fontFamily: 'inherit',
              }}
            />
          ) : (
            <div onClick={() => setEditing(true)} style={{
              fontSize: 18, fontWeight: 500, color: '#1d1d1f',
              letterSpacing: '-0.02em', cursor: 'pointer',
            }}>{notebook.title}</div>
          )}
          <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.55)', marginTop: 2 }}>
            {lectures.length} {lang === 'bm' ? 'rakaman' : (lectures.length === 1 ? 'lecture' : 'lectures')}
            {totalDuration > 0 && ` · ${durationLabel}`}
          </div>
        </div>
        <button
          onClick={deleteNotebook}
          style={{
            padding: '6px 12px',
            background: '#fff', color: '#E24B4A',
            border: '0.5px solid rgba(226, 75, 74, 0.2)',
            borderRadius: 100, fontSize: 12, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >{lang === 'bm' ? 'Padam' : 'Delete'}</button>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
        onDrop={onDropToNotebook}
        style={{ marginBottom: 12 }}
      >
        <div style={{
          fontSize: 11, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          color: 'rgba(29,29,31,0.5)', marginBottom: 10,
        }}>
          {lang === 'bm' ? 'Rakaman dalam buku nota ini' : 'Lectures in this notebook'}
        </div>

        {lectures.length === 0 && (
          <div style={{
            padding: 24, textAlign: 'center',
            background: '#fafafa', borderRadius: 10,
            border: '1px dashed rgba(0,0,0,0.1)',
            fontSize: 12, color: 'rgba(29,29,31,0.5)',
          }}>
            {lang === 'bm'
              ? 'Tiada rakaman lagi. Seret rakaman dari bawah untuk tambah.'
              : 'No lectures yet. Drag from below to add.'}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {lectures.map((lec, i) => (
            <div
              key={lec.id}
              draggable
              onDragStart={(e) => onDragStart(e, lec.id)}
              onDragEnd={onDragEnd}
              style={{
                background: '#fff', borderRadius: 10,
                border: dragLectureId === lec.id ? '2px solid #5A8FF5' : '0.5px solid rgba(0,0,0,0.08)',
                padding: '12px 14px',
                opacity: dragLectureId === lec.id ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{
                  fontSize: 13, fontWeight: 500,
                  color: 'rgba(29,29,31,0.4)', minWidth: 18,
                }}>{i + 1}.</span>

                <Link
                  href={`/dashboard/lectures/${lec.id}`}
                  style={{ flex: 1, minWidth: 0, textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>
                    {lec.title || (lang === 'bm' ? 'Tiada tajuk' : 'Untitled')}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.55)', marginTop: 2 }}>
                    {lec.duration_seconds ? `${Math.round(lec.duration_seconds / 60)} min` : '—'}
                    {lec.word_count ? ` · ${(lec.word_count / 1000).toFixed(1)}k words` : ''}
                    {' · '}{new Date(lec.created_at).toLocaleDateString()}
                  </div>
                </Link>

                <button
                  onClick={() => moveLecture(lec.id, null)}
                  style={{
                    padding: '4px 10px', background: '#fff',
                    border: '0.5px solid rgba(0,0,0,0.08)',
                    borderRadius: 100, fontSize: 11,
                    color: 'rgba(29,29,31,0.6)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                  title={lang === 'bm' ? 'Buang dari buku nota' : 'Remove from notebook'}
                >✕</button>

                <span style={{ fontSize: 11, color: 'rgba(29,29,31,0.4)' }}>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {unsorted.length > 0 && (
        <>
          <button
            onClick={() => setShowAdd(!showAdd)}
            style={{
              padding: '8px 14px', marginTop: 8,
              background: '#fff', color: '#1d1d1f',
              border: '0.5px solid rgba(0,0,0,0.14)',
              borderRadius: 100, fontSize: 12, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {showAdd
              ? (lang === 'bm' ? 'Tutup' : 'Close')
              : `+ ${lang === 'bm' ? 'Tambah rakaman tidak diisih' : 'Add unsorted lectures'} (${unsorted.length})`}
          </button>

          {showAdd && (
            <div style={{
              marginTop: 12, padding: 12,
              background: '#fafafa', borderRadius: 10,
              border: '0.5px solid rgba(0,0,0,0.08)',
            }}>
              <div style={{
                fontSize: 11, fontWeight: 600,
                textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'rgba(29,29,31,0.5)', marginBottom: 8,
              }}>
                {lang === 'bm' ? 'Rakaman tidak diisih' : 'Unsorted lectures'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {unsorted.map(lec => (
                  <div key={lec.id} style={{
                    background: '#fff', borderRadius: 8,
                    border: '0.5px solid rgba(0,0,0,0.08)',
                    padding: '10px 12px',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, color: '#1d1d1f', fontWeight: 500,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{lec.title || 'Untitled'}</div>
                      <div style={{ fontSize: 10, color: 'rgba(29,29,31,0.5)' }}>
                        {lec.duration_seconds ? `${Math.round(lec.duration_seconds / 60)} min` : '—'}
                        {' · '}{new Date(lec.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => moveLecture(lec.id, notebook.id)}
                      style={{
                        padding: '4px 10px', background: '#1d1d1f',
                        color: '#fff', border: 'none',
                        borderRadius: 100, fontSize: 11,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >+ {lang === 'bm' ? 'Tambah' : 'Add'}</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
