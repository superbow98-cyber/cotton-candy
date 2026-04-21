'use client'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Logo from '@/components/ui/Logo'
import LangToggle from '@/components/ui/LangToggle'
import { useLang } from '@/lib/i18n/LangProvider'
import { s, PLANS } from '@/types'

export default function Home() {
  const { t } = useLang()
  return (
    <div style={{ background: s.cream, minHeight: '100vh' }}>
      {/* NAV */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px clamp(16px, 5vw, 48px)',
        maxWidth: 1200, margin: '0 auto',
      }}>
        <Logo />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <a href="#features" style={{ fontSize: 14, color: s.gray }}>{t('navFeatures')}</a>
          <a href="#pricing" style={{ fontSize: 14, color: s.gray }}>{t('navPricing')}</a>
          <LangToggle compact />
          <Link href="/login"><Button variant="outline" size="sm">{t('navLogin')}</Button></Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        padding: 'clamp(40px, 8vw, 110px) clamp(16px, 5vw, 48px) 60px',
        maxWidth: 1100, margin: '0 auto', textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block', fontSize: 13, fontWeight: 700,
          background: s.soft, color: s.primaryDark,
          padding: '6px 14px', borderRadius: 999, marginBottom: 20,
        }}>✨ {t('heroKicker')}</div>
        <h1 style={{
          fontFamily: 'Georgia, serif',
          fontSize: 'clamp(34px, 6vw, 68px)',
          lineHeight: 1.08,
          color: s.dark,
          margin: '0 0 22px',
          fontWeight: 700,
          letterSpacing: -1,
        }}>
          {t('tagline')}
        </h1>
        <p style={{
          fontSize: 'clamp(15px, 2vw, 19px)',
          color: s.gray, maxWidth: 680, margin: '0 auto 34px',
          lineHeight: 1.6,
        }}>
          {t('heroSub')}
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/login"><Button size="lg">🎙️ {t('heroCta')}</Button></Link>
          <Link href="#pricing"><Button variant="ghost" size="lg">{t('navPricing')}</Button></Link>
        </div>
        <p style={{ marginTop: 18, fontSize: 13, color: s.gray }}>{t('heroNote')}</p>

        {/* preview card */}
        <div className="float" style={{
          marginTop: 60, maxWidth: 780, marginLeft: 'auto', marginRight: 'auto',
          background: '#fff', borderRadius: 24,
          boxShadow: '0 20px 60px rgba(255,143,168,0.22)',
          border: `1px solid ${s.border}`, padding: 28, textAlign: 'left',
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffbbbb' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffe5a3' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#baeacd' }} />
          </div>
          <div style={{ fontSize: 14, color: s.gray, marginBottom: 6 }}>Biology — Chapter 3: Mitosis</div>
          <div className="transcript-md">
            <div><span className="topic">## 00:02:14 — Phases of mitosis</span></div>
            <div>- Prophase: chromatin condenses, spindle forms</div>
            <div>- Metaphase: chromosomes align at the equator</div>
            <div>- Anaphase: <span className="star">⭐</span> sister chromatids separate</div>
            <div>- Telophase: nuclear envelopes reform</div>
            <div style={{ marginTop: 10 }}><span className="topic">## 00:08:31 — Cancer connection</span></div>
            <div>- Uncontrolled mitosis → tumour formation</div>
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" style={{ padding: '70px clamp(16px, 5vw, 48px)', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(26px, 4vw, 42px)', textAlign: 'center', marginBottom: 40 }}>
          {t('howTitle')}
        </h2>
        <div style={{ display: 'grid', gap: 22, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
          {([
            { n: 1, icon: '🎙️', title: t('howStep1Title'), body: t('howStep1') },
            { n: 2, icon: '📝', title: t('howStep2Title'), body: t('howStep2') },
            { n: 3, icon: '📘', title: t('howStep3Title'), body: t('howStep3') },
          ]).map((x) => (
            <div key={x.n} style={{
              background: '#fff', borderRadius: 20, padding: 26,
              border: `1px solid ${s.border}`,
              boxShadow: '0 6px 20px rgba(255,143,168,0.08)',
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: 14,
                background: s.soft, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 24, marginBottom: 14,
              }}>{x.icon}</div>
              <div style={{ fontSize: 12, color: s.primaryDark, fontWeight: 700, marginBottom: 6 }}>STEP 0{x.n}</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 20 }}>{x.title}</h3>
              <p style={{ margin: 0, color: s.gray, fontSize: 14, lineHeight: 1.6 }}>{x.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" style={{ padding: '70px clamp(16px, 5vw, 48px)', maxWidth: 1100, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(26px, 4vw, 42px)', textAlign: 'center', marginBottom: 40 }}>
          {t('featuresTitle')}
        </h2>
        <div style={{ display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          {(['feat1','feat2','feat3','feat4','feat5','feat6'] as const).map((k, i) => (
            <div key={k} style={{
              background: '#fff', borderRadius: 16, padding: 20,
              border: `1px solid ${s.border}`,
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <div style={{
                flexShrink: 0, width: 32, height: 32, borderRadius: 10,
                background: s.primary, color: s.dark, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14,
              }}>{i + 1}</div>
              <div style={{ fontSize: 14, color: s.dark, lineHeight: 1.55 }}>{t(k as any)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '70px clamp(16px, 5vw, 48px) 100px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(26px, 4vw, 42px)', textAlign: 'center', marginBottom: 10 }}>
          {t('pricingTitle')}
        </h2>
        <p style={{ textAlign: 'center', color: s.gray, marginBottom: 40 }}>{t('pricingSub')}</p>
        <div style={{ display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
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
                padding: 26,
                position: 'relative',
                transform: featured ? 'translateY(-6px)' : 'none',
                boxShadow: featured ? '0 20px 40px rgba(255,143,168,0.25)' : '0 6px 16px rgba(255,143,168,0.08)',
              }}>
                {featured && (
                  <span style={{
                    position: 'absolute', top: -14, right: 18,
                    background: s.dark, color: '#fff',
                    padding: '4px 12px', borderRadius: 999,
                    fontSize: 11, fontWeight: 700,
                  }}>★ popular</span>
                )}
                <div style={{ fontSize: 15, fontWeight: 700, color: s.dark }}>{label}</div>
                <div style={{ fontSize: 34, fontWeight: 800, margin: '8px 0', fontFamily: 'Georgia, serif' }}>
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
                  <Button variant={featured ? 'dark' : 'primary'} size="md" className="w-full">
                    {t('choosePlan')}
                  </Button>
                </Link>
              </div>
            )
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        padding: '40px clamp(16px, 5vw, 48px)',
        borderTop: `1px solid ${s.border}`,
        background: s.soft,
        textAlign: 'center',
        color: s.gray, fontSize: 13,
      }}>
        <Logo size={26} />
        <p style={{ margin: '14px 0 6px' }}>{t('footerSlogan')}</p>
        <p style={{ margin: 0 }}>© {new Date().getFullYear()} Cotton Candy</p>
      </footer>
    </div>
  )
}
