'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { type Lecture } from '@/types'

export default function LecturesList() {
  const { t } = useLang()
  const { tokens: s } = useTheme()
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data } = await sb.from('lectures').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false })
      setLectures((data || []) as Lecture[])
      setLoading(false)

      const channel = sb.channel('lectures-list')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'lectures', filter: `user_id=eq.${user.id}` },
          async () => {
            const { data: fresh } = await sb.from('lectures').select('*')
              .eq('user_id', user.id).order('created_at', { ascending: false })
            setLectures((fresh || []) as Lecture[])
          }
        ).subscribe()
      return () => { sb.removeChannel(channel) }
    })()
  }, [])

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(24px, 4vw, 34px)', margin: 0 }}>
          {t('lecturesTitle')}
        </h1>
        <Link href="/dashboard/lectures/new"><Button size="md">➕ {t('lecturesNew')}</Button></Link>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: s.gray }}>{t('loading')}</div>
      ) : lectures.length === 0 ? (
        <div style={{
          background: '#fff', padding: 36, borderRadius: 20,
          border: `2px dashed ${s.border}`, textAlign: 'center', color: s.gray,
        }}>
          <div style={{ fontSize: 42, marginBottom: 12 }}>🎙️</div>
          <p style={{ margin: 0 }}>{t('lecturesEmpty')}</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {lectures.map((l) => (
            <div key={l.id} style={{
              background: '#fff', padding: 18, borderRadius: 16,
              border: `1px solid ${s.border}`,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: 10,
            }}>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>{l.title}</div>
                <div style={{ fontSize: 12, color: s.gray }}>
                  {l.subject && <>{l.subject} · </>}
                  {new Date(l.created_at).toLocaleString()} ·{' '}
                  {Math.round((l.duration_seconds || 0) / 60)} min ·{' '}
                  {l.word_count || 0} words
                </div>
              </div>
              <Link href={`/dashboard/lectures/${l.id}`}>
                <Button size="sm" variant="outline">{t('lecturesOpen')} →</Button>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
