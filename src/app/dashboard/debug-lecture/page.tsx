'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Lecture = {
  id: string
  title: string
  created_at: string
  duration_seconds: number
  status: string
}

export default function DebugLecturePage() {
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [diagnostic, setDiagnostic] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data } = await sb.from('lectures')
        .select('id, title, created_at, duration_seconds, status')
        .order('created_at', { ascending: false })
        .limit(20)
      if (data) setLectures(data as Lecture[])
    })()
  }, [])

  const runDiagnostic = async (lectureId: string) => {
    setSelectedId(lectureId)
    setLoading(true)
    setError(null)
    setDiagnostic(null)
    try {
      const res = await fetch(`/api/debug-lecture/${lectureId}`)
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed')
      } else {
        setDiagnostic(data)
      }
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      maxWidth: 900, margin: '24px auto', padding: '0 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    }}>
      <div style={{
        background: '#fff', border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 12, padding: 20, marginBottom: 16,
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 8 }}>
          🔍 Lecture Diagnostic
        </h1>
        <p style={{ fontSize: 12, color: '#666', marginBottom: 16, lineHeight: 1.5 }}>
          Inspect transcript edit + append behavior. Pick lecture below to analyze segments, sources, gaps, and edit detection.
        </p>

        <div style={{ marginBottom: 12, fontSize: 12, color: '#666' }}>
          Recent lectures ({lectures.length}):
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {lectures.map(l => (
            <button
              key={l.id}
              onClick={() => runDiagnostic(l.id)}
              style={{
                background: selectedId === l.id ? '#993556' : '#f5f5f5',
                color: selectedId === l.id ? '#fff' : '#333',
                border: 'none',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: 12,
                textAlign: 'left',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ fontWeight: 500 }}>{l.title}</div>
              <div style={{ fontSize: 10, opacity: 0.7, marginTop: 2 }}>
                {new Date(l.created_at).toLocaleString('en-MY')} · {Math.floor((l.duration_seconds || 0) / 60)} min · {l.status}
              </div>
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ background: '#fff', padding: 20, borderRadius: 12, textAlign: 'center', color: '#666' }}>
          Loading diagnostic...
        </div>
      )}

      {error && (
        <div style={{ background: '#fde8e8', color: '#b42929', padding: 16, borderRadius: 12 }}>
          ⚠ {error}
        </div>
      )}

      {diagnostic && (
        <div style={{
          background: '#0d1117', color: '#c9d1d9',
          borderRadius: 12, padding: 16,
          fontFamily: 'SF Mono, Consolas, monospace',
          fontSize: 11, lineHeight: 1.6,
        }}>
          {/* Quick summary */}
          <div style={{
            background: '#161b22',
            padding: 12, borderRadius: 8,
            marginBottom: 12,
            color: '#fff',
          }}>
            <div style={{ color: '#58a6ff', fontWeight: 600, marginBottom: 8 }}>
              📊 QUICK SUMMARY
            </div>
            <div>Title: <span style={{ color: '#3fb950' }}>{diagnostic.lecture.title}</span></div>
            <div>Segments: <span style={{ color: '#3fb950' }}>{diagnostic.summary.total_segments}</span></div>
            <div>Sources: <span style={{ color: diagnostic.summary.has_multiple_sources ? '#d29922' : '#3fb950' }}>
              {diagnostic.summary.unique_sources.join(', ')}
            </span> {diagnostic.summary.has_multiple_sources && <span style={{color:'#d29922'}}>⚠ multi-source!</span>}</div>
            <div>Length ratio MD/segments: <span style={{
              color: diagnostic.transcript.possible_edit_detected ? '#d29922' : '#3fb950'
            }}>{diagnostic.transcript.length_ratio_md_to_segments}</span>
            {diagnostic.transcript.possible_edit_detected && <span style={{color:'#d29922'}}> ⚠ edit detected</span>}</div>
            <div style={{ fontSize: 10, color: '#8b949e', marginTop: 4 }}>
              {diagnostic.transcript.note}
            </div>
          </div>

          {/* Issues */}
          {diagnostic.summary.issues.length > 0 && (
            <div style={{
              background: 'rgba(248, 81, 73, 0.1)',
              border: '1px solid #f85149',
              padding: 12, borderRadius: 8, marginBottom: 12,
            }}>
              <div style={{ color: '#f85149', fontWeight: 600, marginBottom: 6 }}>
                ⚠ {diagnostic.summary.issues.length} ISSUE(S) FOUND
              </div>
              {diagnostic.summary.issues.map((iss: any, i: number) => (
                <div key={i} style={{ marginBottom: 4, fontSize: 10 }}>
                  <span style={{ color: '#f85149' }}>[{iss.type}]</span>{' '}
                  {iss.between} → {iss.and} = <strong>{iss.amount}</strong>
                </div>
              ))}
            </div>
          )}

          {/* Time coverage */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ color: '#d29922', fontWeight: 600, marginBottom: 4 }}>
              ⏱ TIME COVERAGE
            </div>
            <div>Total audio: {diagnostic.summary.time_coverage.total_audio_duration}s</div>
            <div>Covered by segments: {diagnostic.summary.time_coverage.covered}s</div>
            {diagnostic.summary.time_coverage.uncovered > 5 && (
              <div style={{ color: '#f85149' }}>
                ⚠ Uncovered: {diagnostic.summary.time_coverage.uncovered}s (missing transcript!)
              </div>
            )}
          </div>

          {/* All segments */}
          <details>
            <summary style={{ cursor: 'pointer', color: '#58a6ff', marginBottom: 8 }}>
              ▸ ALL SEGMENTS ({diagnostic.segments.length})
            </summary>
            <div style={{
              maxHeight: 400, overflow: 'auto',
              background: '#161b22', padding: 10, borderRadius: 6, marginTop: 8,
            }}>
              {diagnostic.segments.map((s: any) => (
                <div key={s.index} style={{
                  marginBottom: 8, paddingBottom: 8,
                  borderBottom: '1px solid #30363d',
                }}>
                  <div style={{ color: '#8b949e' }}>
                    #{s.index} | {s.start}s → {s.end}s ({s.duration}s)
                    {' | '}<span style={{ color: s.source.includes('whisper') ? '#d29922' : '#3fb950' }}>{s.source}</span>
                    {' | '}{s.language}
                    {s.edited && <span style={{ color: '#f85149' }}> | EDITED</span>}
                  </div>
                  <div style={{ color: '#c9d1d9', marginTop: 2 }}>
                    "{s.text_preview}{s.text_length > 80 ? '...' : ''}"
                  </div>
                  <div style={{ color: '#6e7681', fontSize: 9 }}>
                    {s.text_length} chars · {s.created_at}
                  </div>
                </div>
              ))}
            </div>
          </details>

          {/* Raw JSON */}
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: 'pointer', color: '#8b949e' }}>
              ▸ Raw JSON (all data)
            </summary>
            <pre style={{
              background: '#161b22', padding: 10, borderRadius: 6,
              marginTop: 8, fontSize: 10, overflow: 'auto', maxHeight: 400,
            }}>
              {JSON.stringify(diagnostic, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  )
}
