'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { type Lecture, type Profile, PLANS } from '@/types'

export default function DashboardHome() {
  const { t } = useLang()
  const { tokens: s } = useTheme()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [lectures, setLectures] = useState<Lecture[]>([])
  const [stats, setStats] = useState({ mins: 0, count: 0, words: 0 })

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (prof) setProfile(prof as Profile)
      const { data: lect } = await sb.from('lectures').select('*')
        .eq('user_id', user.id).order('created_at', { ascending: false }).limit(8)
      setLectures((lect || []) as Lecture[])
      const weekAgo = new Date(Date.now() - 7*24*3600*1000).toISOString()
      const { data: weekLect } = await sb.from('lectures').select('duration_seconds, word_count')
        .eq('user_id', user.id).gte('created_at', weekAgo)
      const mins = Math.round((weekLect || []).reduce((a: number, l: any) => a + (l.duration_seconds || 0), 0) / 60)
      const words = (weekLect || []).reduce((a: number, l: any) => a + (l.word_count || 0), 0)
      setStats({ mins, count: weekLect?.length || 0, words })
    })()
  }, [])

  const plan = profile?.plan ? PLANS[profile.plan] : PLANS.free

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 30 }}>
        <div>
          <p style={{ margin: 0, color: s.gray, fontSize: 14 }}>{t('homeHi')}{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''} ✨</p>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(26px, 4vw, 36px)', margin: '4px 0 0' }}>
            {t('homeToday')}
          </h1>
        </div>
        <Link href="/dashboard/lectures/new">
          <Button size="lg">🎙️ {t('homeNewLecture')}</Button>
        </Link>
      </div>

      <div style={{
        display: 'grid', gap: 14,
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        marginBottom: 30,
      }}>
        {[
          { k: stats.count, l: t('homeLecturesCount'), icon: '🎙️' },
          { k: stats.mins,  l: t('homeMinutes'), icon: '⏱️' },
          { k: stats.words, l: t('homeWords'), icon: '📝' },
          { k: plan.name,   l: t('setPlan'), icon: '⭐' },
        ].map((x, i) => (
          <div key={i} style={{
            background: '#fff', padding: 18, borderRadius: 18,
            border: `1px solid ${s.border}`,
          }}>
            <div style={{ fontSize: 22, marginBottom: 4 }}>{x.icon}</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'Georgia, serif' }}>{x.k}</div>
            <div style={{ fontSize: 12, color: s.gray }}>{x.l}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 18, margin: '20px 0 14px' }}>{t('homeRecent')}</h2>
      {lectures.length === 0 ? (
        <div style={{
          background: '#fff', padding: 36, borderRadius: 20,
          border: `2px dashed ${s.border}`, textAlign: 'center', color: s.gray,
        }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📝</div>
          {t('homeNoLectures')}
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 10, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {lectures.map((l) => (
            <Link key={l.id} href={`/dashboard/lectures/${l.id}`} style={{
              background: '#fff', padding: 18, borderRadius: 16,
              border: `1px solid ${s.border}`, display: 'block',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{l.title}</div>
              <div style={{ fontSize: 12, color: s.gray }}>
                {l.subject && <>{l.subject} · </>}
                {new Date(l.created_at).toLocaleDateString()}
              </div>
              <div style={{ fontSize: 11, color: s.gray, marginTop: 8 }}>
                {Math.round((l.duration_seconds || 0) / 60)} min · {l.word_count || 0} words
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
