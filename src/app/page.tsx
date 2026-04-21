'use client'
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
          {/* Gemini Flash — DEFAULT */}
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

          {/* One-time pill */}
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

          {/* Symmetrical 4-col grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 14,
          }} className="cc-price-grid">
            <PricingCard
              name="Free"
              amount="0"
              period={L('Forever', 'Selamanya')}
              tagline={L('Try it risk-free.', 'Cuba tanpa risiko.')}
              features={[
                L('3 lectures total', '3 kuliah jumlah'),
                L('60 min per lecture', '60 min setiap kuliah'),
                L('All 4 AI models', 'Semua 4 model AI'),
                L('Export .md / .pdf', 'Eksport .md / .pdf'),
              ]}
              ctaText={L('Start free', 'Mula percuma')}
              ctaHref="/login"
              variant="free"
            />
            <PricingCard
              name="Day Pass"
              amount="7"
              period={L('One day · Pay once', 'Satu hari · Bayar sekali')}
              tagline={L('Perfect for exam crunch.', 'Sempurna untuk minggu peperiksaan.')}
              features={[
                L('10 lectures in 24h', '10 kuliah dalam 24 jam'),
                L('180 min per lecture', '180 min setiap kuliah'),
                L('Priority AI access', 'Akses AI keutamaan'),
                L('All features unlocked', 'Semua ciri dibuka'),
              ]}
              ctaText={L('Buy Day Pass', 'Beli Day Pass')}
              ctaHref="/checkout?plan=day"
              variant="standard"
            />
            <PricingCard
              name="Monthly"
              amount="19"
              period={L('30 days · Pay once', '30 hari · Bayar sekali')}
              tagline={L('The sweet spot.', 'Pilihan terbaik.')}
              features={[
                L('100 lectures / month', '100 kuliah / bulan'),
                L('240 min per lecture', '240 min setiap kuliah'),
                L('No watermark on PDF', 'Tiada watermark pada PDF'),
                L('Priority AI access', 'Akses AI keutamaan'),
              ]}
              ctaText={L('Buy Monthly', 'Beli Bulanan')}
              ctaHref="/checkout?plan=month"
              variant="featured"
              badge={L('Most popular', 'Paling popular')}
            />
            <PricingCard
              name="Yearly"
              amount="149"
              period={L('365 days · Pay once', '365 hari · Bayar sekali')}
              tagline={L('Best value. Full year.', 'Nilai terbaik. Setahun penuh.')}
              features={[
                L('Unlimited lectures', 'Kuliah tanpa had'),
                L('480 min per lecture', '480 min setiap kuliah'),
                L('No watermark on PDF', 'Tiada watermark pada PDF'),
                L('Priority AI access', 'Akses AI keutamaan'),
              ]}
              ctaText={L('Buy Yearly', 'Beli Tahunan')}
              ctaHref="/checkout?plan=year"
              variant="standard"
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
        {L('Made in Malaysia', 'Dibuat di Malaysia')} · Cotton Candy 🍭
      </footer>

      {/* Responsive tweaks for pricing grid */}
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
      background: isFeatured
        ? 'linear-gradient(180deg, #1d1d1f 0%, #000 100%)'
        : '#fff',
      color: isFeatured ? '#fff' : '#1d1d1f',
      border: isFeatured ? 'none' : '0.5px solid rgba(0,0,0,0.08)',
      borderRadius: 22,
      padding: '28px 22px 24px',
      textAlign: 'left',
      position: 'relative',
      display: 'flex', flexDirection: 'column',
      minHeight: 420,
      boxShadow: isFeatured ? '0 20px 50px rgba(29,29,31,0.35)' : 'none',
      transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s',
    }}>
      {badge && (
        <span style={{
          position: 'absolute', top: -10, left: '50%',
          transform: 'translateX(-50%)',
          background: 'linear-gradient(135deg, #FF6B9D, #C471F5)',
          color: '#fff',
          fontSize: 10.5, fontWeight: 600,
          padding: '5px 14px', borderRadius: 100,
          letterSpacing: '0.4px', textTransform: 'uppercase',
          boxShadow: '0 4px 12px rgba(196, 113, 245, 0.35)',
          whiteSpace: 'nowrap',
        }}>{badge}</span>
      )}

      <div style={{
        fontSize: 14, fontWeight: 500,
        color: isFeatured ? 'rgba(255,255,255,0.55)' : 'rgba(29,29,31,0.6)',
        marginBottom: 8,
      }}>{name}</div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <span style={{
          fontSize: 17, fontWeight: 500,
          color: isFeatured ? 'rgba(255,255,255,0.6)' : 'rgba(29,29,31,0.55)',
        }}>RM</span>
        <span style={{
          fontSize: 54, fontWeight: 700,
          color: isFeatured ? '#fff' : '#1d1d1f',
          letterSpacing: '-0.035em', lineHeight: 1,
        }}>{amount}</span>
      </div>

      <div style={{
        fontSize: 13, fontWeight: 400,
        color: isFeatured ? 'rgba(255,255,255,0.55)' : 'rgba(29,29,31,0.5)',
        marginBottom: 4,
      }}>
        {period}
        {saveTag && (
          <span style={{
            display: 'inline-block', marginLeft: 6,
            fontSize: 10.5, fontWeight: 600,
            padding: '2px 8px',
            background: 'rgba(52, 168, 83, 0.1)',
            color: '#2C8545', borderRadius: 100,
            verticalAlign: 'middle',
          }}>{saveTag}</span>
        )}
      </div>

      <div style={{
        fontSize: 13, fontWeight: 500,
        color: isFeatured ? '#FF8FBA' : '#5A8FF5',
        margin: '12px 0 16px', minHeight: 18,
      }}>{tagline}</div>

      <div style={{
        height: 0.5,
        background: isFeatured ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
        margin: '4px 0 16px',
      }} />

      <ul style={{
        listStyle: 'none', padding: 0, margin: '0 0 20px',
        fontSize: 13,
        color: isFeatured ? 'rgba(255,255,255,0.85)' : 'rgba(29,29,31,0.8)',
        lineHeight: 1.9, flex: 1,
      }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 0' }}>
            <span style={{
              flexShrink: 0, width: 16, height: 16, borderRadius: '50%',
              background: isFeatured ? 'rgba(255, 139, 186, 0.18)' : 'rgba(90, 143, 245, 0.12)',
              color: isFeatured ? '#FF8FBA' : '#5A8FF5',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, marginTop: 4,
            }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link href={ctaHref} style={{
        display: 'block', textAlign: 'center', padding: 13,
        background: isFeatured ? '#fff' : (isFree ? '#fff' : '#1d1d1f'),
        color: isFeatured ? '#1d1d1f' : (isFree ? '#1d1d1f' : '#fff'),
        border: isFree ? '0.5px solid rgba(0,0,0,0.14)' : 'none',
        borderRadius: 100,
        fontSize: 13.5, fontWeight: 500,
        textDecoration: 'none', letterSpacing: '-0.01em',
      }}>
        {ctaText}
      </Link>
    </div>
  )
}
