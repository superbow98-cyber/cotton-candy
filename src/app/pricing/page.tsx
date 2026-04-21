'use client'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'
import LangToggle from '@/components/ui/LangToggle'
import { useLang } from '@/lib/i18n/LangProvider'
import { s, PLANS } from '@/types'

export default function PricingPage() {
  const { t } = useLang()
  return (
    <div style={{ minHeight: '100vh', background: s.cream }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px clamp(16px, 5vw, 48px)', maxWidth: 1200, margin: '0 auto',
      }}>
        <Link href="/"><Logo /></Link>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <LangToggle compact />
          <Link href="/login"><Button variant="outline" size="sm">{t('navLogin')}</Button></Link>
        </div>
      </nav>

      <section style={{ padding: '60px clamp(16px, 5vw, 48px) 100px', maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(30px, 5vw, 48px)', textAlign: 'center', margin: '0 0 10px' }}>
          {t('pricingTitle')}
        </h1>
        <p style={{ textAlign: 'center', color: s.gray, marginBottom: 40 }}>{t('pricingSub')}</p>

        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
          {(['free','day','month','year'] as const).map((plan) => {
            const p = PLANS[plan]
            const label = plan === 'free' ? t('planFree') : plan === 'day' ? t('planDay') : plan === 'month' ? t('planMonth') : t('planYear')
            const per = plan === 'month' ? t('perMonth') : plan === 'year' ? t('perYear') : plan === 'day' ? t('perDay') : ''
            const featured = plan === 'month'
            return (
              <div key={plan} style={{
                background: featured ? s.primary : '#fff',
                border: `2px solid ${featured ? s.primaryDark : s.border}`,
                borderRadius: 22,
                padding: 28,
                position: 'relative',
                transform: featured ? 'translateY(-6px)' : 'none',
                boxShadow: featured ? '0 20px 40px rgba(255,143,168,0.25)' : '0 6px 16px rgba(255,143,168,0.08)',
              }}>
                {featured && (
                  <span style={{
                    position: 'absolute', top: -14, right: 18,
                    background: s.dark, color: '#fff',
                    padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                  }}>★ popular</span>
                )}
                <div style={{ fontSize: 15, fontWeight: 700, color: s.dark }}>{label}</div>
                <div style={{ fontSize: 36, fontWeight: 800, margin: '8px 0', fontFamily: 'Georgia, serif' }}>
                  RM{p.priceRM}<span style={{ fontSize: 14, fontWeight: 500, color: s.gray }}>{per}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 22px', fontSize: 13, color: featured ? s.dark : s.gray, lineHeight: 1.9 }}>
                  <li>✓ {t('pf_lectures', { n: p.lectureLimit === 9999 ? '∞' : p.lectureLimit })}</li>
                  <li>✓ {t('pf_minutes', { n: p.minutesPerLecture })}</li>
                  <li>✓ {t('pf_notebooks', { n: p.notebookLimit === 9999 ? '∞' : p.notebookLimit })}</li>
                  <li>✓ {t('pf_md')}</li>
                  <li>✓ {t('pf_pdf')}</li>
                  {p.aiSummary ? <li>✓ {t('pf_ai')}</li> : <li style={{ opacity: 0.5 }}>— {t('pf_ai')}</li>}
                  {p.watermark ? <li style={{ opacity: 0.7 }}>{t('pf_water')}</li> : <li>✓ {t('pf_nowater')}</li>}
                </ul>
                <Link href={plan === 'free' ? '/login' : `/checkout?plan=${plan}`}>
                  <Button variant={featured ? 'dark' : 'primary'} size="md" style={{ width: '100%' }}>
                    {t('choosePlan')}
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
