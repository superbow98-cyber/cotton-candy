'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LangProvider'

export default function Home() {
  const { t, lang } = useLang()
  const L = (en: string, bm: string) => lang === 'bm' ? bm : en

  return (
    <div style={{
      background: '#fff',
      color: '#1d1d1f',
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
      WebkitFontSmoothing: 'antialiased',
      letterSpacing: '-0.02em',
    }}>
      {/* NAV */}
      <nav style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px clamp(16px, 4vw, 32px)',
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'saturate(180%) blur(20px)',
        WebkitBackdropFilter: 'saturate(180%) blur(20px)',
        borderBottom: '0.5px solid rgba(0, 0, 0, 0.06)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 500, fontSize: 15 }}>
          <span style={{
            width: 22, height: 22, borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 28%, #FFCFDB 0%, #FF8FA8 55%, #E56A88 100%)',
          }} />
          Cotton Candy
        </div>
        <div className="hidden md:flex" style={{ gap: 28, fontSize: 13, color: 'rgba(29,29,31,0.75)' }}>
          <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>{L('Features', 'Ciri-ciri')}</a>
          <a href="#ai" style={{ color: 'inherit', textDecoration: 'none' }}>{L('AI models', 'Model AI')}</a>
          <a href="#pricing" style={{ color: 'inherit', textDecoration: 'none' }}>{L('Pricing', 'Harga')}</a>
        </div>
        <Link href="/login" style={{
          padding: '7px 16px', borderRadius: 100,
          background: '#1d1d1f', color: '#fff',
          fontSize: 13, fontWeight: 500,
          textDecoration: 'none', letterSpacing: '-0.05em',
        }}>
          {L('Start free', 'Mula percuma')}
        </Link>
      </nav>

      {/* HERO */}
      <section style={{
        padding: 'clamp(56px, 9vw, 90px) 20px 50px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #FFFBFC 0%, #FFF5F7 30%, #F8F4FF 70%, #F0F8FF 100%)',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 13px',
          background: 'rgba(255, 110, 170, 0.1)',
          border: '0.5px solid rgba(255, 110, 170, 0.25)',
          borderRadius: 100,
          fontSize: 12, fontWeight: 500,
          color: '#D4537E',
          marginBottom: 20,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6B9D' }} />
          {L('New · Pick your AI brain per lecture', 'Baharu · Pilih AI setiap kuliah')}
        </div>

        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 52px)',
          fontWeight: 600,
          lineHeight: 1.04,
          letterSpacing: '-0.03em',
          color: '#1d1d1f',
          margin: '0 0 14px',
        }}>
          {L('Record lectures.', 'Rakam kuliah.')}<br/>
          {L('Watch them grow into', 'Tonton ia berubah jadi')}
        </h1>

        {/* EXPANDING COTTON CANDY WORDMARK */}
        <div style={{
          display: 'inline-flex', alignItems: 'baseline',
          background: 'linear-gradient(135deg, #FF6B9D 0%, #C471F5 50%, #5A8FF5 100%)',
          WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 0.9,
          margin: '10px 0 18px',
          flexWrap: 'wrap', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 'clamp(20px, 2.5vw, 28px)' }}>c</span>
          <span style={{ fontSize: 'clamp(24px, 3.2vw, 34px)' }}>o</span>
          <span style={{ fontSize: 'clamp(28px, 4vw, 42px)' }}>t</span>
          <span style={{ fontSize: 'clamp(32px, 5vw, 52px)' }}>t</span>
          <span style={{ fontSize: 'clamp(38px, 6vw, 62px)' }}>o</span>
          <span style={{ fontSize: 'clamp(44px, 7vw, 70px)' }}>n</span>
          <span style={{ width: 'clamp(8px, 1.5vw, 14px)', display: 'inline-block' }}></span>
          <span style={{ fontSize: 'clamp(48px, 8vw, 76px)' }}>c</span>
          <span style={{ fontSize: 'clamp(52px, 9vw, 82px)' }}>a</span>
          <span style={{ fontSize: 'clamp(56px, 10vw, 86px)' }}>n</span>
          <span style={{ fontSize: 'clamp(60px, 10.5vw, 90px)' }}>d</span>
          <span style={{ fontSize: 'clamp(62px, 11vw, 94px)', fontWeight: 800 }}>y</span>
        </div>

        <p style={{
          fontSize: 'clamp(16px, 2.2vw, 19px)',
          fontWeight: 400,
          color: 'rgba(29,29,31,0.72)',
          maxWidth: 580, margin: '0 auto 32px',
          lineHeight: 1.45, letterSpacing: '-0.01em',
        }}>
          {L(
            'Speak in any language. Get clean, AI-organized study notes with topics, key points, formulas, and a summary. All in one tap.',
            'Bercakap dalam apa-apa bahasa. Dapat nota tersusun dengan AI — topik, key points, formula, ringkasan. Satu tap sahaja.'
          )}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/login" style={{
            padding: '13px 28px', borderRadius: 100,
            background: '#1d1d1f', color: '#fff',
            fontSize: 14, fontWeight: 500, letterSpacing: '-0.05em',
            textDecoration: 'none',
          }}>
            {L('Get Cotton Candy free', 'Dapatkan percuma')}
          </Link>
          <a href="#ai" style={{
            padding: '13px 24px', borderRadius: 100,
            background: 'rgba(255,255,255,0.9)',
            border: '0.5px solid rgba(0,0,0,0.14)',
            color: '#1d1d1f',
            fontSize: 14, fontWeight: 500, letterSpacing: '-0.05em',
            textDecoration: 'none',
          }}>
            {L('See it work →', 'Lihat ia berfungsi →')}
          </a>
        </div>
      </section>

      {/* ANIMATED DEMO SECTION */}
      <DemoSection lang={lang} />

      {/* AI MODELS SECTION */}
      <section id="ai" style={{ padding: '80px 20px', textAlign: 'center', maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#5A8FF5', marginBottom: 10 }}>
          {L('Four AI brains. One tap.', 'Empat AI. Satu tap.')}
        </div>
        <h2 style={{
          fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 600,
          lineHeight: 1.08, color: '#1d1d1f',
          maxWidth: 680, margin: '0 auto 14px',
          letterSpacing: '-0.03em',
        }}>
          {L('Pick the thinker that fits the lecture.', 'Pilih AI yang sesuai dengan kuliah anda.')}
        </h2>
        <p style={{
          fontSize: 'clamp(15px, 2vw, 18px)', fontWeight: 400,
          color: 'rgba(29,29,31,0.65)',
          maxWidth: 560, margin: '0 auto 44px',
          lineHeight: 1.5, letterSpacing: '-0.01em',
        }}>
          {L(
            'Every lecture is different. So we let you choose which AI organizes your notes. Switch instantly, any time.',
            'Setiap kuliah berbeza. Jadi kami beri anda pilih AI mana yang susun nota. Tukar bila-bila masa.'
          )}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14, maxWidth: 960, margin: '0 auto',
        }}>
          <AICard
            eyebrow={L('Deep thinker', 'Pemikir mendalam')}
            name="Gemini 2.5 Flash"
            desc={L(
              'Handles the longest lectures, the deepest topics, the messiest code-switched rojak. The smart default.',
              'Kendalikan kuliah panjang, topik dalam, rojak bercampur. Pilihan bijak sebagai default.'
            )}
            isDefault
            logoBg="linear-gradient(135deg, #4285F4 0%, #9168C0 50%, #EA4335 100%)"
            logoSvg={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                <path d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z" />
              </svg>
            }
          />
          <AICard
            eyebrow={L('Bulletproof', 'Tahan lasak')}
            name="Auto"
            desc={L(
              'Always picks the best brain available. If one is busy, another steps in. Your notes never wait.',
              'Sentiasa pilih AI terbaik yang ada. Kalau satu sibuk, yang lain gantikan. Nota tak pernah tunggu.'
            )}
            logoBg="linear-gradient(135deg, #FFB7C5, #D4537E)"
            logoSvg={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#4B1528" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 2l4 4-4 4" /><path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                <path d="M7 22l-4-4 4-4" /><path d="M21 13v1a4 4 0 0 1-4 4H3" />
              </svg>
            }
          />
          <AICard
            eyebrow={L('Fast thinker', 'Pantas')}
            name="Groq · Llama 3.3 70B"
            desc={L(
              'Lightning-fast inference. Perfect for dense technical lectures where sharp reasoning matters.',
              'Inferens sangat pantas. Sempurna untuk kuliah teknikal padat yang perlu penaakulan tajam.'
            )}
            logoBg="linear-gradient(180deg, #FF5D3A, #E23A20)"
            logoSvg={
              <svg width="22" height="22" viewBox="0 0 32 32" fill="#fff">
                <path d="M16 3C8.8 3 3 8.8 3 16s5.8 13 13 13 13-5.8 13-13S23.2 3 16 3zm0 20c-3.9 0-7-3.1-7-7s3.1-7 7-7 7 3.1 7 7-3.1 7-7 7z" />
                <circle cx="16" cy="16" r="3.5" />
              </svg>
            }
          />
          <AICard
            eyebrow={L('Quick & light', 'Ringkas & pantas')}
            name="Gemini 2.5 Flash-Lite"
            desc={L(
              'Built for daily tutorials, short recaps, quick study sessions. Nimble by design.',
              'Dibina untuk tutorial harian, ringkasan pendek, sesi cepat. Ringan dan pantas.'
            )}
            logoBg="linear-gradient(135deg, #4796E3, #34A853)"
            logoSvg={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
              </svg>
            }
          />
        </div>
      </section>

      {/* FEATURE STRIP */}
      <section id="features" style={{
        background: 'linear-gradient(180deg, #F6F4FF 0%, #EDF2FF 100%)',
        padding: '80px 20px', textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#5A8FF5', marginBottom: 10 }}>
          {L("What's in the box", 'Apa yang ada')}
        </div>
        <h2 style={{
          fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 600,
          lineHeight: 1.08, color: '#1d1d1f',
          maxWidth: 680, margin: '0 auto 36px',
          letterSpacing: '-0.03em',
        }}>
          {L('Built for how Malaysians study.', 'Dibina untuk cara pelajar Malaysia.')}
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10, maxWidth: 1000, margin: '0 auto',
        }}>
          <Feature
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#5A8FF5" strokeWidth="2" strokeLinecap="round"><path d="M12 1v3m0 16v3M4.22 4.22l2.12 2.12m11.32 11.32l2.12 2.12M1 12h3m16 0h3" /><circle cx="12" cy="12" r="4" /></svg>}
            title={L('Rojak-ready', 'Rojak-ready')}
            desc={L('Switch between EN, BM, Chinese, Tamil, Arabic mid-sentence. One tap.', 'Tukar antara EN, BM, Cina, Tamil, Arab di tengah ayat. Satu tap.')}
          />
          <Feature
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#5A8FF5" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8m8 4H8" /></svg>}
            title={L('AI that organizes', 'AI yang menyusun')}
            desc={L('Topics, key points, formulas, questions, summary — built automatically.', 'Topik, key points, formula, soalan, ringkasan — tersusun automatik.')}
          />
          <Feature
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#5A8FF5" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>}
            title={L('Science-smart', 'Pintar sains')}
            desc={L('500+ scientific terms auto-corrected. "My toe corner dia" → Mitochondria.', '500+ istilah sains auto-betul. "My toe corner dia" → Mitochondria.')}
          />
          <Feature
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="#5A8FF5" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>}
            title={L('Export anywhere', 'Eksport ke mana-mana')}
            desc={L('Download as .md or .pdf with theme colors. Shareable instantly.', 'Muat turun .md atau .pdf dengan warna tema. Kongsi serta-merta.')}
          />
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" style={{ padding: '72px 20px 50px', background: '#fafafa' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#5A8FF5', marginBottom: 10 }}>
            {L('Simple pricing', 'Harga mudah')}
          </div>
          <h2 style={{
            fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 600,
            lineHeight: 1.08, color: '#1d1d1f',
            textAlign: 'center', maxWidth: 680, margin: '0 auto 10px',
            letterSpacing: '-0.03em',
          }}>
            {L('Free to try.', 'Percuma untuk cuba.')}<br />
            {L('One-time payment when you need more.', 'Bayar sekali bila perlu lebih.')}
          </h2>
          <p style={{
            textAlign: 'center', fontSize: 'clamp(14px, 2vw, 16px)',
            color: 'rgba(29,29,31,0.6)', maxWidth: 520, margin: '0 auto 12px',
            lineHeight: 1.5,
          }}>
            {L('No subscriptions. No auto-renewals. Pay once, use fully.', 'Tiada langganan. Tiada auto-renew. Bayar sekali, guna sepenuhnya.')}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', margin: '0 auto 44px' }}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '7px 16px',
              background: '#fff',
              border: '0.5px solid rgba(90, 143, 245, 0.25)',
              borderRadius: 100,
              fontSize: 12.5, fontWeight: 500, color: '#5A8FF5',
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" /></svg>
              {L('One-time payment · No recurring charges', 'Bayar sekali · Tiada caj berulang')}
            </span>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
          }} className="cc-price-grid">
            <PricingCard
              name="Free" amount="0"
              period={L('Forever', 'Selamanya')}
              tagline={L('Try it risk-free.', 'Cuba tanpa risiko.')}
              features={[
                L('3 lectures total', '3 kuliah jumlah'),
                L('60 min per lecture', '60 min setiap kuliah'),
                L('All 4 AI models', 'Semua 4 model AI'),
                L('Export .md / .pdf', 'Eksport .md / .pdf'),
              ]}
              ctaText={L('Start free', 'Mula percuma')}
              ctaHref="/login" variant="free"
            />
            <PricingCard
              name="Day Pass" amount="7"
              period={L('One day · Pay once', 'Satu hari · Bayar sekali')}
              tagline={L('Perfect for exam crunch.', 'Sempurna untuk minggu peperiksaan.')}
              features={[
                L('10 lectures in 24h', '10 kuliah dalam 24 jam'),
                L('180 min per lecture', '180 min setiap kuliah'),
                L('Priority AI access', 'Akses AI keutamaan'),
                L('All features unlocked', 'Semua ciri dibuka'),
              ]}
              ctaText={L('Buy Day Pass', 'Beli Day Pass')}
              ctaHref="/checkout?plan=day" variant="standard"
            />
            <PricingCard
              name="Monthly" amount="19"
              period={L('30 days · Pay once', '30 hari · Bayar sekali')}
              tagline={L('The sweet spot.', 'Pilihan terbaik.')}
              features={[
                L('100 lectures / month', '100 kuliah / bulan'),
                L('240 min per lecture', '240 min setiap kuliah'),
                L('No watermark on PDF', 'Tiada watermark pada PDF'),
                L('Priority AI access', 'Akses AI keutamaan'),
              ]}
              ctaText={L('Buy Monthly', 'Beli Bulanan')}
              ctaHref="/checkout?plan=month" variant="featured"
              badge={L('Most popular', 'Paling popular')}
            />
            <PricingCard
              name="Yearly" amount="149"
              period={L('365 days · Pay once', '365 hari · Bayar sekali')}
              tagline={L('Best value. Full year.', 'Nilai terbaik. Setahun penuh.')}
              features={[
                L('Unlimited lectures', 'Kuliah tanpa had'),
                L('480 min per lecture', '480 min setiap kuliah'),
                L('No watermark on PDF', 'Tiada watermark pada PDF'),
                L('Priority AI access', 'Akses AI keutamaan'),
              ]}
              ctaText={L('Buy Yearly', 'Beli Tahunan')}
              ctaHref="/checkout?plan=year" variant="standard"
              saveTag="SAVE 35%"
            />
          </div>

          <p style={{
            textAlign: 'center', marginTop: 32, fontSize: 12,
            color: 'rgba(29,29,31,0.45)',
          }}>
            {L(
              'Every plan is a one-time payment. No subscriptions. No auto-renewals.',
              'Setiap pelan adalah bayaran sekali. Tiada langganan. Tiada auto-renew.'
            )}
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        textAlign: 'center', padding: '40px 20px 30px',
        fontSize: 12, color: 'rgba(29,29,31,0.5)',
        borderTop: '0.5px solid rgba(0,0,0,0.06)',
        background: '#fff',
      }}>
        <div style={{ marginBottom: 12 }}>
          {L('Made in Malaysia', 'Dibuat di Malaysia')} · Cotton Candy 🍭
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
          <Link href="/privacy" style={{ color: 'rgba(29,29,31,0.45)', textDecoration: 'none', fontSize: 12 }}>
            Privacy Policy
          </Link>
          <span style={{ color: 'rgba(29,29,31,0.2)' }}>|</span>
          <Link href="/terms" style={{ color: 'rgba(29,29,31,0.45)', textDecoration: 'none', fontSize: 12 }}>
            Terms of Service
          </Link>
          <span style={{ color: 'rgba(29,29,31,0.2)' }}>|</span>
          <a href="mailto:parcellomalaysia@gmail.com" style={{ color: 'rgba(29,29,31,0.45)', textDecoration: 'none', fontSize: 12 }}>
            Contact
          </a>
        </div>
      </footer>

      <style jsx>{`
        @media (max-width: 900px) {
          :global(.cc-price-grid) { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 500px) {
          :global(.cc-price-grid) { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

// ===== SUBCOMPONENTS =====

function AICard({ eyebrow, name, desc, isDefault, logoBg, logoSvg }: {
  eyebrow: string; name: string; desc: string; isDefault?: boolean;
  logoBg: string; logoSvg: React.ReactNode;
}) {
  return (
    <div style={{
      background: isDefault ? 'linear-gradient(180deg, #fff 0%, #FFF9FB 100%)' : '#fff',
      border: `0.5px solid ${isDefault ? 'rgba(255, 110, 170, 0.4)' : 'rgba(0,0,0,0.08)'}`,
      borderRadius: 20, padding: '22px 20px',
      textAlign: 'left',
      transition: 'transform 0.25s, box-shadow 0.25s',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: logoBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 16,
        boxShadow: '0 2px 6px rgba(0,0,0,0.1), inset 0 0.5px 0 rgba(255,255,255,0.4)',
      }}>
        {logoSvg}
      </div>
      <div style={{
        fontSize: 11, fontWeight: 600,
        color: 'rgba(29,29,31,0.5)',
        letterSpacing: '0.4px', textTransform: 'uppercase',
        marginBottom: 5,
      }}>{eyebrow}</div>
      <div style={{
        fontSize: 17, fontWeight: 600, color: '#1d1d1f',
        marginBottom: 6, letterSpacing: '-0.015em', lineHeight: 1.25,
      }}>
        {name}
        {isDefault && (
          <span style={{
            display: 'inline-block',
            padding: '2px 9px',
            background: 'rgba(255, 110, 170, 0.12)',
            color: '#D4537E', borderRadius: 100,
            fontSize: 10, fontWeight: 600,
            letterSpacing: '0.3px', marginLeft: 8,
            verticalAlign: 'middle',
          }}>DEFAULT</span>
        )}
      </div>
      <div style={{
        fontSize: 13, fontWeight: 400,
        color: 'rgba(29,29,31,0.65)',
        lineHeight: 1.5, letterSpacing: '-0.005em',
      }}>{desc}</div>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 18, padding: '22px 18px',
      textAlign: 'left', border: '0.5px solid rgba(0,0,0,0.04)',
    }}>
      <div style={{
        width: 36, height: 36,
        background: 'linear-gradient(135deg, #FFE5EC, #E5F0FF)',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 14,
      }}>
        <div style={{ width: 18, height: 18, display: 'flex' }}>{icon}</div>
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', marginBottom: 4, letterSpacing: '-0.015em' }}>
        {title}
      </div>
      <div style={{ fontSize: 12.5, color: 'rgba(29,29,31,0.6)', lineHeight: 1.5 }}>
        {desc}
      </div>
    </div>
  )
}

function PricingCard({
  name, amount, period, tagline, features, ctaText, ctaHref, variant, badge, saveTag,
}: {
  name: string; amount: string; period: string; tagline: string;
  features: string[]; ctaText: string; ctaHref: string;
  variant: 'free' | 'standard' | 'featured';
  badge?: string; saveTag?: string;
}) {
  const isFeatured = variant === 'featured'
  const isFree = variant === 'free'

  return (
    <div style={{
      background: isFeatured ? 'linear-gradient(180deg, #1d1d1f 0%, #000 100%)' : '#fff',
      color: isFeatured ? '#fff' : '#1d1d1f',
      border: isFeatured ? 'none' : '0.5px solid rgba(0,0,0,0.08)',
      borderRadius: 22, padding: '28px 22px 24px',
      textAlign: 'left', position: 'relative',
      display: 'flex', flexDirection: 'column', minHeight: 420,
      boxShadow: isFeatured ? '0 20px 50px rgba(29,29,31,0.35)' : 'none',
      transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s',
    }}>
      {badge && (
        <span style={{
          position: 'absolute', top: -10, left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #FF6B9D, #C471F5)',
          color: '#fff', fontSize: 10.5, fontWeight: 600,
          padding: '5px 14px', borderRadius: 100,
          letterSpacing: '0.4px', textTransform: 'uppercase',
          boxShadow: '0 4px 12px rgba(196, 113, 245, 0.35)',
          whiteSpace: 'nowrap',
        }}>{badge}</span>
      )}
      <div style={{ fontSize: 14, fontWeight: 500, color: isFeatured ? 'rgba(255,255,255,0.55)' : 'rgba(29,29,31,0.6)', marginBottom: 8 }}>{name}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <span style={{ fontSize: 17, fontWeight: 500, color: isFeatured ? 'rgba(255,255,255,0.6)' : 'rgba(29,29,31,0.55)' }}>RM</span>
        <span style={{ fontSize: 54, fontWeight: 700, color: isFeatured ? '#fff' : '#1d1d1f', letterSpacing: '-0.035em', lineHeight: 1 }}>{amount}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 400, color: isFeatured ? 'rgba(255,255,255,0.55)' : 'rgba(29,29,31,0.5)', marginBottom: 4 }}>
        {period}
        {saveTag && (
          <span style={{ display: 'inline-block', marginLeft: 6, fontSize: 10.5, fontWeight: 600, padding: '2px 8px', background: 'rgba(52, 168, 83, 0.1)', color: '#2C8545', borderRadius: 100, verticalAlign: 'middle' }}>{saveTag}</span>
        )}
      </div>
      <div style={{ fontSize: 13, fontWeight: 500, color: isFeatured ? '#FF8FBA' : '#5A8FF5', margin: '12px 0 16px', minHeight: 18 }}>{tagline}</div>
      <div style={{ height: 0.5, background: isFeatured ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)', margin: '4px 0 16px' }} />
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', fontSize: 13, color: isFeatured ? 'rgba(255,255,255,0.85)' : 'rgba(29,29,31,0.8)', lineHeight: 1.9, flex: 1 }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 0' }}>
            <span style={{ flexShrink: 0, width: 16, height: 16, borderRadius: '50%', background: isFeatured ? 'rgba(255, 139, 186, 0.18)' : 'rgba(90, 143, 245, 0.12)', color: isFeatured ? '#FF8FBA' : '#5A8FF5', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, marginTop: 4 }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link href={ctaHref} style={{ display: 'block', textAlign: 'center', padding: 13, background: isFeatured ? '#fff' : (isFree ? '#fff' : '#1d1d1f'), color: isFeatured ? '#1d1d1f' : (isFree ? '#1d1d1f' : '#fff'), border: isFree ? '0.5px solid rgba(0,0,0,0.14)' : 'none', borderRadius: 100, fontSize: 13.5, fontWeight: 500, textDecoration: 'none', letterSpacing: '-0.01em' }}>
        {ctaText}
      </Link>
    </div>
  )
}

// ============ ANIMATED DEMO SECTION ============
function DemoSection({ lang }: { lang: string }) {
  const L = (en: string, bm: string) => lang === 'bm' ? bm : en
  const [step, setStep] = useState(1)
  const [seconds, setSeconds] = useState(258)
  const [words, setWords] = useState(142)
  const [nbCount, setNbCount] = useState(12)
  const autoTimerRef = useRef<any>(null)
  const tickerRef = useRef<any>(null)
  const wordTickerRef = useRef<any>(null)

  useEffect(() => {
    autoTimerRef.current = setInterval(() => { setStep((s) => (s >= 3 ? 1 : s + 1)) }, 5500)
    return () => clearInterval(autoTimerRef.current)
  }, [])

  useEffect(() => {
    if (step === 1) {
      tickerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      wordTickerRef.current = setInterval(() => { setWords((w) => w + 2 + Math.floor(Math.random() * 3)) }, 1200)
    }
    if (step === 3) {
      setNbCount(12)
      const t1 = setTimeout(() => setNbCount(13), 600)
      const t2 = setTimeout(() => setNbCount(14), 1300)
      const t3 = setTimeout(() => setNbCount(15), 2000)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current)
      if (wordTickerRef.current) clearInterval(wordTickerRef.current)
    }
  }, [step])

  const pad = (n: number) => (n < 10 ? '0' + n : '' + n)
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const sec = seconds % 60

  const onChipClick = (n: number) => {
    clearInterval(autoTimerRef.current)
    setStep(n)
    autoTimerRef.current = setInterval(() => { setStep((s) => (s >= 3 ? 1 : s + 1)) }, 5500)
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '10px 18px 10px 12px',
    background: active ? '#1d1d1f' : '#fff',
    border: `0.5px solid ${active ? '#1d1d1f' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: 100, fontSize: 13, fontWeight: 500,
    color: active ? '#fff' : 'rgba(29,29,31,0.55)',
    cursor: 'pointer', transition: 'all 0.25s', letterSpacing: '-0.01em',
    boxShadow: active ? '0 4px 14px rgba(29,29,31,0.2)' : 'none',
  })
  const chipNumStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, borderRadius: '50%', fontSize: 11, fontWeight: 700,
    background: active ? 'rgba(255,255,255,0.2)' : 'rgba(90,143,245,0.12)',
    color: active ? '#fff' : '#5A8FF5',
  })

  return (
    <section style={{ background: 'linear-gradient(180deg, #fff 0%, #FAFAFB 100%)', padding: '80px 20px', textAlign: 'center' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#5A8FF5', marginBottom: 10 }}>
          {L('See it in action', 'Lihat ia berfungsi')}
        </div>
        <h2 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 600, lineHeight: 1.08, letterSpacing: '-0.03em', margin: '0 0 14px' }}>
          {L('From voice to organized notes', 'Dari suara kepada nota tersusun')}<br />
          {L('in three taps.', 'dalam tiga tap.')}
        </h2>
        <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', fontWeight: 400, color: 'rgba(29,29,31,0.65)', maxWidth: 560, margin: '0 auto 60px', lineHeight: 1.5, letterSpacing: '-0.01em' }}>
          {L('Watch how Cotton Candy turns a messy bilingual lecture into clean study notes — then files them into a notebook. No clicking. No typing.', 'Lihat bagaimana Cotton Candy tukar kuliah rojak jadi nota tersusun — kemudian simpan ke notebook. Tanpa klik. Tanpa taip.')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginBottom: 30, flexWrap: 'wrap' }}>
          <button onClick={() => onChipClick(1)} style={chipStyle(step === 1)}><span style={chipNumStyle(step === 1)}>1</span>{L('Record lecture', 'Rakam kuliah')}</button>
          <button onClick={() => onChipClick(2)} style={chipStyle(step === 2)}><span style={chipNumStyle(step === 2)}>2</span>{L('AI organizes', 'AI menyusun')}</button>
          <button onClick={() => onChipClick(3)} style={chipStyle(step === 3)}><span style={chipNumStyle(step === 3)}>3</span>{L('Save to notebook', 'Simpan ke notebook')}</button>
        </div>
        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{ background: '#f2f2f4', borderRadius: 28, padding: 14, boxShadow: '0 30px 80px rgba(29,29,31,0.12), 0 10px 30px rgba(29,29,31,0.08)', border: '0.5px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', gap: 6, padding: '0 8px 12px' }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF6B6B' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#FFD166' }} />
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#06D6A0' }} />
            </div>
            <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', minHeight: 400, position: 'relative' }}>
              {step === 1 && <Step1 lang={lang} h={h} m={m} sec={sec} pad={pad} words={words} />}
              {step === 2 && <Step2 lang={lang} />}
              {step === 3 && <Step3 lang={lang} nbCount={nbCount} />}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @keyframes cc-demo-pulse { 0% { opacity: 0.8; transform: scale(1); } 100% { opacity: 0; transform: scale(1.5); } }
        @keyframes cc-demo-blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0.35; } }
        @keyframes cc-demo-typein { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cc-demo-spin { to { transform: rotate(360deg); } }
        @keyframes cc-demo-fadeup { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cc-demo-fly { 0% { transform: translateX(0) scale(1); opacity: 1; } 50% { transform: translateX(50%) scale(0.9); opacity: 0.7; } 100% { transform: translateX(calc(100% + 14px)) scale(0.85); opacity: 0; } }
      `}</style>
    </section>
  )
}

function Step1({ lang, h, m, sec, pad, words }: { lang: string; h: number; m: number; sec: number; pad: (n: number) => string; words: number }) {
  const L = (en: string, bm: string) => lang === 'bm' ? bm : en
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 2, textAlign: 'left' }}>Biology — Mitosis</div>
      <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)', marginBottom: 18, textAlign: 'left' }}>Dr. Aziz · Hall B · 🇲🇾 {L('Malay', 'Melayu')}</div>
      <div style={{ background: '#FFFBFC', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 18, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, textAlign: 'left' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'radial-gradient(circle at 30% 28%, #FFCFDB, #FF8FA8 55%, #E56A88)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
          <span style={{ width: 10, height: 10, background: '#fff', borderRadius: '50%' }} />
          <span style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2px solid rgba(255,143,168,0.5)', animation: 'cc-demo-pulse 2s ease-out infinite' }} />
          <span style={{ position: 'absolute', inset: -6, borderRadius: '50%', border: '2px solid rgba(255,143,168,0.5)', animation: 'cc-demo-pulse 2s ease-out infinite', animationDelay: '1s' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 28, fontWeight: 300, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
            <span>{pad(h)}</span><span style={{ animation: 'cc-demo-blink 1s steps(1) infinite' }}>:</span><span>{pad(m)}</span><span style={{ animation: 'cc-demo-blink 1s steps(1) infinite' }}>:</span><span>{pad(sec)}</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.5)', marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E53935', animation: 'cc-demo-blink 1s steps(1) infinite' }} />
            {L('Listening', 'Mendengar')} · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{words}</span> {L('words', 'patah')}
          </div>
        </div>
      </div>
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.05)', borderRadius: 14, padding: '16px 18px', minHeight: 180, textAlign: 'left', fontSize: 13, color: 'rgba(29,29,31,0.85)', lineHeight: 1.8 }}>
        <div style={{ fontSize: 10, color: 'rgba(29,29,31,0.4)', letterSpacing: 0.8, marginBottom: 8 }}>📝 {L('TRANSCRIPT (live)', 'TRANSKRIP (langsung)')}</div>
        {[
          { text: '- OK students, today kita akan belajar tentang mitosis.', flag: '🇲🇾', delay: 0.3 },
          { text: '- Mitosis is the process where a cell divides into two identical daughter cells.', flag: '🇬🇧', delay: 1.2 },
          { text: '- Ada empat fasa — prophase, metaphase, anaphase, telophase.', flag: '🇲🇾', delay: 2.2 },
          { text: '- Any questions about chromosome alignment?', flag: '🇬🇧', delay: 3.2 },
        ].map((row, i) => (
          <div key={i} style={{ opacity: 0, animation: 'cc-demo-typein 0.5s ease-out forwards', animationDelay: `${row.delay}s` }}>
            {row.text} <span style={{ opacity: 0.6, fontSize: 12 }}>{row.flag}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Step2({ lang }: { lang: string }) {
  const L = (en: string, bm: string) => lang === 'bm' ? bm : en
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 2, textAlign: 'left' }}>Biology — Mitosis</div>
      <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)', marginBottom: 18, textAlign: 'left' }}>{L('AI organizing your notes…', 'AI menyusun nota anda…')}</div>
      <div style={{ textAlign: 'center', padding: '30px 0 22px', border: '2px dashed rgba(212,83,126,0.35)', borderRadius: 16, background: 'linear-gradient(180deg, #FFFBFC, #FFF5F7)', marginBottom: 14 }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'conic-gradient(from 0deg, #FF6B9D, #C471F5, #5A8FF5, #FF6B9D)', margin: '0 auto 12px', animation: 'cc-demo-spin 2.5s linear infinite', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 38, height: 38, background: '#FFFBFC', borderRadius: '50%' }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 3 }}>{L('Gemini 2.5 Flash is thinking', 'Gemini 2.5 Flash sedang berfikir')}</div>
        <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.5)' }}>{L('Extracting topics · key points · formulas · summary', 'Extract topik · key points · formula · ringkasan')}</div>
      </div>
      {[
        { t: `✨ ${L('Summary', 'Ringkasan')}`, b: L('Class covered mitosis — the 4-phase process of cell division that produces two genetically identical daughter cells.', 'Kelas membincangkan mitosis — proses pembahagian sel 4-fasa yang menghasilkan dua sel anak yang identikal.'), delay: 0.4 },
        { t: `📌 ${L('Topics covered', 'Topik diliputi')}`, b: '1. Introduction to cell division · 2. Four phases of mitosis · 3. Chromosome alignment', delay: 0.8 },
        { t: `🔑 ${L('Key points', 'Key points')}`, b: L('Mitosis produces 2 identical daughter cells · Four phases: prophase, metaphase, anaphase, telophase · Chromatids separate during anaphase.', 'Mitosis menghasilkan 2 sel anak identikal · Empat fasa: prophase, metaphase, anaphase, telophase · Chromatid berpisah semasa anaphase.'), delay: 1.2 },
      ].map((card, i) => (
        <div key={i} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 14, padding: '14px 16px', textAlign: 'left', marginBottom: 8, opacity: 0, animation: 'cc-demo-fadeup 0.5s ease-out forwards', animationDelay: `${card.delay}s` }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 4, letterSpacing: '-0.01em' }}>{card.t}</div>
          <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.65)', lineHeight: 1.55 }}>{card.b}</div>
        </div>
      ))}
    </div>
  )
}

function Step3({ lang, nbCount }: { lang: string; nbCount: number }) {
  const L = (en: string, bm: string) => lang === 'bm' ? bm : en
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 2, textAlign: 'left' }}>{L('Add to notebook', 'Tambah ke notebook')}</div>
      <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)', marginBottom: 18, textAlign: 'left' }}>{L('Organize by subject or semester', 'Susun ikut subjek atau semester')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, height: 330 }}>
        <div style={{ background: '#FAFAFB', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 14, padding: 14, textAlign: 'left', overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.5)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{L('Recent lectures', 'Kuliah terkini')}</div>
          {[
            { title: 'Biology — Mitosis', meta: `18 ${L('min · 4 topics', 'min · 4 topik')}`, d: 0.3 },
            { title: 'Biology — Meiosis', meta: `22 ${L('min · 6 topics', 'min · 6 topik')}`, d: 1.0 },
            { title: 'Biology — DNA',     meta: `30 ${L('min · 8 topics', 'min · 8 topik')}`, d: 1.7 },
          ].map((lec, i) => (
            <div key={i} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.05)', borderRadius: 10, padding: '8px 10px', marginBottom: 6, fontSize: 12, animation: 'cc-demo-fly 2s ease-in-out forwards', animationDelay: `${lec.d}s` }}>
              <div style={{ fontWeight: 500, color: '#1d1d1f', marginBottom: 1 }}>{lec.title}</div>
              <div style={{ fontSize: 10, color: 'rgba(29,29,31,0.5)' }}>{lec.meta}</div>
            </div>
          ))}
        </div>
        <div style={{ background: '#FAFAFB', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 14, padding: 14, textAlign: 'left', overflow: 'hidden' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.5)', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>{L('Notebook', 'Notebook')}</div>
          <div style={{ background: 'linear-gradient(135deg, #FFE5EC, #E5F0FF)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>📘</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.015em' }}>Biology Sem 2</div>
            <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.6)', marginTop: 2 }}>
              <span style={{ fontWeight: 700, color: '#5A8FF5' }}>{nbCount}</span> {L('lectures · exam-ready', 'kuliah · siap ujian')}
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(29,29,31,0.45)', marginTop: 14, textAlign: 'center' }}>{L('Export whole notebook as one PDF', 'Eksport semua notebook sebagai satu PDF')}</div>
        </div>
      </div>
    </div>
  )
}
