'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LangProvider'

export default function Home() {
  const { t, lang, setLang } = useLang()
  const L = (en: string, bm: string, zh?: string, ta?: string) => {
    if (lang === 'bm') return bm
    if (lang === 'zh' && zh) return zh
    if (lang === 'ta' && ta) return ta
    return en
  }

  const langOptions: { code: string; label: string }[] = [
    { code: 'en', label: 'EN' },
    { code: 'bm', label: 'BM' },
    { code: 'zh', label: '中文' },
    { code: 'ta', label: 'தமிழ்' },
  ]

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
        <div style={{ display: 'flex', alignItems: 'center' }}>
  <img
    src="/cc-logo.png"
    alt="Cotton Candy"
    style={{
      height: 36,
      width: 36,
      borderRadius: 10,
      objectFit: 'contain',
    }}
  />
</div>

        <div className="hidden md:flex" style={{ gap: 28, fontSize: 13, color: 'rgba(29,29,31,0.75)' }}>
          <a href="#features" style={{ color: 'inherit', textDecoration: 'none' }}>
            {L('Features', 'Ciri-ciri', '功能', 'அம்சங்கள்')}
          </a>
          <a href="#ai" style={{ color: 'inherit', textDecoration: 'none' }}>
            {L('AI models', 'Model AI', 'AI 模型', 'AI மாடல்கள்')}
          </a>
          <Link href="/ambassador" style={{ color: 'inherit', textDecoration: 'none' }}>
            {L('Ambassador', 'Ambassador', '大使计划', 'அம்பாசிடர்')}
          </Link>
          <a href="#pricing" style={{ color: 'inherit', textDecoration: 'none' }}>
            {L('Pricing', 'Harga', '价格', 'விலை')}
          </a>
        </div>

        {/* RIGHT SIDE: Language Toggle + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Language Toggle Pill */}
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'rgba(0,0,0,0.04)',
            borderRadius: 100,
            padding: '3px 4px',
            gap: 2,
            border: '0.5px solid rgba(0,0,0,0.07)',
          }}>
            {langOptions.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => setLang(code as any)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 100,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: lang === code ? 600 : 400,
                  background: lang === code
                    ? '#fff'
                    : 'transparent',
                  color: lang === code
                    ? '#1d1d1f'
                    : 'rgba(29,29,31,0.5)',
                  boxShadow: lang === code
                    ? '0 1px 4px rgba(0,0,0,0.10)'
                    : 'none',
                  transition: 'all 0.18s ease',
                  letterSpacing: code === 'zh' || code === 'ta' ? '0' : '-0.02em',
                  lineHeight: 1.4,
                  fontFamily: code === 'ta'
                    ? '"Noto Sans Tamil", system-ui, sans-serif'
                    : 'inherit',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <Link href="/login" style={{
            padding: '7px 16px', borderRadius: 100,
            background: '#1d1d1f', color: '#fff',
            fontSize: 13, fontWeight: 500,
            textDecoration: 'none', letterSpacing: '-0.05em',
          }}>
            {L('Start free', 'Mula percuma', '免费开始', 'இலவசமாக தொடங்கு')}
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section style={{
        padding: 'clamp(56px, 9vw, 90px) 20px 50px',
        textAlign: 'center',
        background: 'linear-gradient(180deg, #FFFBFC 0%, #FFF5F7 30%, #F8F4FF 70%, #F0F8FF 100%)',
      }}>
        <div style={{
  display: 'inline-flex', alignItems: 'center', gap: 6,
  fontSize: 12, fontWeight: 500,
  color: '#D4537E',
  marginBottom: 20,
}}>
  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6B9D', flexShrink: 0 }} />
  {L(
    'New · Pick your AI brain per lecture',
    'Baharu · Pilih AI setiap kuliah',
    '全新 · 每堂课选择你的 AI',
    'புதியது · ஒவ்வொரு வகுப்பிற்கும் AI தேர்வு'
  )}
</div>
        <h1 style={{
          fontSize: 'clamp(32px, 6vw, 52px)',
          fontWeight: 600,
          lineHeight: 1.04,
          letterSpacing: '-0.03em',
          color: '#1d1d1f',
          margin: '0 0 14px',
        }}>
          {L('Record', 'Rakam', '录制', 'பதிவு செய்')} <WordRotator
            words={
              lang === 'bm'
                ? ['kuliah', 'mesyuarat', 'perjumpaan']
                : lang === 'zh'
                ? ['讲座', '会议', '聚会']
                : lang === 'ta'
                ? ['விரிவுரைகள்', 'கூட்டங்கள்', 'சந்திப்புகள்']
                : ['lectures', 'meetings', 'gatherings']
            }
            interval={2500}
          />.<br/>
          {L(
            'Watch them grow into',
            'Tonton ia berubah jadi',
            '看它们变成',
            'அவை மாறுவதை பாருங்கள்'
          )}
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
            'Bercakap dalam apa-apa bahasa. Dapat nota tersusun dengan AI — topik, key points, formula, ringkasan. Satu tap sahaja.',
            '用任何语言说话，获得 AI 整理的学习笔记——主题、要点、公式和摘要。只需一键。',
            'எந்த மொழியிலும் பேசுங்கள். AI ஒழுங்கமைத்த குறிப்புகள் — தலைப்புகள், முக்கிய புள்ளிகள், சூத்திரங்கள், சுருக்கம். ஒரே தட்டில்.'
          )}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/login" style={{
            padding: '13px 28px', borderRadius: 100,
            background: '#1d1d1f', color: '#fff',
            fontSize: 14, fontWeight: 500, letterSpacing: '-0.05em',
            textDecoration: 'none',
          }}>
            {L('Get Cotton Candy free', 'Dapatkan percuma', '免费获取', 'இலவசமாக பெறுங்கள்')}
          </Link>
          <a href="#ai" style={{
            padding: '13px 24px', borderRadius: 100,
            background: 'rgba(255,255,255,0.9)',
            border: '0.5px solid rgba(0,0,0,0.14)',
            color: '#1d1d1f',
            fontSize: 14, fontWeight: 500, letterSpacing: '-0.05em',
            textDecoration: 'none',
          }}>
            {L('See it work →', 'Lihat ia berfungsi →', '查看效果 →', 'பார்க்கவும் →')}
          </a>
        </div>
      </section>

      {/* ANIMATED DEMO SECTION */}
      <DemoSection lang={lang} />

      {/* AI MODELS SECTION */}
      <section id="ai" style={{ padding: '80px 20px', textAlign: 'center', maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#5A8FF5', marginBottom: 10 }}>
          {L('Six AI brains. One tap.', 'Enam AI. Satu tap.', '六个 AI 大脑，一键切换。', 'ஆறு AI மூளைகள். ஒரே தட்டு.')}
        </div>
        <h2 style={{
          fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 600,
          lineHeight: 1.08, color: '#1d1d1f',
          maxWidth: 680, margin: '0 auto 14px',
          letterSpacing: '-0.03em',
        }}>
          {L(
            'Pick the thinker that fits the lecture.',
            'Pilih AI yang sesuai dengan kuliah anda.',
            '选择适合课堂的 AI。',
            'விரிவுரைக்கு ஏற்ற AI தேர்ந்தெடுங்கள்.'
          )}
        </h2>
        <p style={{
          fontSize: 'clamp(15px, 2vw, 18px)', fontWeight: 400,
          color: 'rgba(29,29,31,0.65)',
          maxWidth: 560, margin: '0 auto 44px',
          lineHeight: 1.5, letterSpacing: '-0.01em',
        }}>
          {L(
            'Every lecture is different. So we let you choose which AI organizes your notes. Switch instantly, any time.',
            'Setiap kuliah berbeza. Jadi kami beri anda pilih AI mana yang susun nota. Tukar bila-bila masa.',
            '每堂课都不同，所以我们让你选择哪个 AI 来整理笔记。随时切换。',
            'ஒவ்வொரு வகுப்பும் வேறுபட்டது. எந்த AI குறிப்புகளை ஒழுங்கமைக்கும் என தேர்வு செய்யுங்கள். எப்போதும் மாற்றலாம்.'
          )}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 14, maxWidth: 960, margin: '0 auto',
        }}>
          {/* DeepSeek V3 — DEFAULT */}
          <AICard
            eyebrow={L('Deep thinker', 'Pemikir mendalam', '深度思考者', 'ஆழமான சிந்தனையாளர்')}
            name="DeepSeek V3"
            desc={L(
              'Handles the longest lectures, the deepest topics, the messiest code-switched rojak. The smart default.',
              'Kendalikan kuliah panjang, topik dalam, rojak bercampur. Pilihan bijak sebagai default.',
              '处理最长的讲座、最深的主题、最混乱的语码转换。智能默认选择。',
              'நீண்ட விரிவுரைகள், ஆழமான தலைப்புகள் கையாளும். இயல்புநிலை தேர்வு.'
            )}
            isDefault
            logoBg="#ECEEF8"
            logoSvg={
              <img
                src="/deepseek-logo.svg"
                width={34}
                height={34}
                alt="DeepSeek"
                style={{ objectFit: 'contain' }}
              />
            }
          />
          <AICard
            eyebrow={L('Bulletproof', 'Tahan lasak', '坚不可摧', 'தடையற்றது')}
            name="Auto"
            desc={L(
              'Always picks the best brain available. If one is busy, another steps in. Your notes never wait.',
              'Sentiasa pilih AI terbaik yang ada. Kalau satu sibuk, yang lain gantikan. Nota tak pernah tunggu.',
              '始终选择最佳 AI。一个忙碌时，另一个接手。你的笔记从不等待。',
              'எப்போதும் சிறந்த AI தேர்வு செய்யும். ஒன்று பிஸியாக இருந்தால் மற்றொன்று வரும்.'
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
            eyebrow={L('Fast thinker', 'Pantas', '快速思考', 'வேகமான சிந்தனை')}
            name="Groq · Llama 3.3 70B"
            desc={L(
              'Lightning-fast inference. Perfect for dense technical lectures where sharp reasoning matters.',
              'Inferens sangat pantas. Sempurna untuk kuliah teknikal padat yang perlu penaakulan tajam.',
              '极速推理。适合需要敏锐逻辑的密集技术讲座。',
              'மின்னல் வேக அனுமானம். தொழில்நுட்ப விரிவுரைகளுக்கு சரியானது.'
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
            eyebrow={L('Quick & light', 'Ringkas & pantas', '轻快灵活', 'விரைவு & எளிமை')}
            name="Gemini 2.5 Flash-Lite"
            desc={L(
              'Built for daily tutorials, short recaps, quick study sessions. Nimble by design.',
              'Dibina untuk tutorial harian, ringkasan pendek, sesi cepat. Ringan dan pantas.',
              '专为日常教程、简短回顾、快速学习而设计。轻盈灵活。',
              'தினசரி பயிற்சிகள், குறுகிய திரும்பிப் பார்ப்புகளுக்கு கட்டமைக்கப்பட்டது.'
            )}
            logoBg="linear-gradient(135deg, #4796E3, #34A853)"
            logoSvg={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                <path d="M13 2L3 14h8l-1 8 10-12h-8l1-8z" />
              </svg>
            }
          />
          <AICard
            eyebrow={L('Reliable & sharp', 'Konsisten & tepat', '可靠且精准', 'நம்பகமான & கூர்மையான')}
            name="GPT-4o mini"
            desc={L(
              "OpenAI's efficient model. Consistent, accurate, great for structured notes and summaries.",
              'Model OpenAI yang cekap. Konsisten, tepat, bagus untuk nota tersusun.',
              'OpenAI 的高效模型。一致、准确，适合结构化笔记和摘要。',
              'OpenAI இன் திறமையான மாடல். சீரான, துல்லியமான, கட்டமைக்கப்பட்ட குறிப்புகளுக்கு சிறந்தது.'
            )}
            logoBg="#000"
            logoSvg={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff">
                <path d="M22.289 9.94a5.998 5.998 0 0 0-.515-4.926 6.065 6.065 0 0 0-6.525-2.908A5.998 5.998 0 0 0 10.724 0a6.064 6.064 0 0 0-5.781 4.202 5.998 5.998 0 0 0-4.002 2.91 6.065 6.065 0 0 0 .747 7.11 5.998 5.998 0 0 0 .515 4.926 6.065 6.065 0 0 0 6.525 2.908A5.997 5.997 0 0 0 13.276 24a6.064 6.064 0 0 0 5.782-4.202 5.998 5.998 0 0 0 4.001-2.91 6.065 6.065 0 0 0-.77-6.948zM13.276 22.4a4.49 4.49 0 0 1-2.882-1.041l.142-.08 4.783-2.762a.78.78 0 0 0 .396-.68v-6.747l2.023 1.168a.072.072 0 0 1 .04.057v5.585a4.505 4.505 0 0 1-4.502 4.5zm-9.684-4.131a4.49 4.49 0 0 1-.537-3.018l.142.085 4.783 2.762a.779.779 0 0 0 .785 0l5.843-3.373v2.335a.072.072 0 0 1-.029.063l-4.836 2.791a4.504 4.504 0 0 1-6.151-1.645zm-1.261-10.46a4.489 4.489 0 0 1 2.347-1.975V11.5a.769.769 0 0 0 .389.678l5.82 3.361-2.023 1.168a.073.073 0 0 1-.071 0L4.009 13.9a4.505 4.505 0 0 1-.678-6.091zm16.614 3.864l-5.843-3.375 2.023-1.167a.072.072 0 0 1 .071 0l4.783 2.762a4.502 4.502 0 0 1-.696 8.124V12.35a.77.77 0 0 0-.338-.677zm2.014-3.025l-.142-.085-4.783-2.762a.779.779 0 0 0-.785 0L9.406 9.974V7.639a.072.072 0 0 1 .029-.063l4.836-2.79a4.503 4.503 0 0 1 6.688 4.664zm-12.664 4.161L6.272 11.64a.072.072 0 0 1-.04-.057V5.999a4.503 4.503 0 0 1 7.384-3.458l-.142.08-4.783 2.762a.779.779 0 0 0-.396.68zm1.098-2.366l2.602-1.502 2.603 1.5v3l-2.603 1.5-2.602-1.5z"/>
              </svg>
            }
          />
          <AICard
            eyebrow={L('Nuanced & fast', 'Bernuansa & pantas', '细腻且快速', 'நுணுக்கமான & வேகமான')}
            name="Claude Haiku 3.5"
            desc={L(
              "Anthropic's nimble model. Exceptional at nuanced understanding and natural-sounding notes.",
              'Model Anthropic yang pantas. Cemerlang dalam pemahaman bernuansa dan nota yang terasa semula jadi.',
              'Anthropic 的轻量模型。擅长细腻理解和自然流畅的笔记。',
              'Anthropic இன் வேகமான மாடல். நுணுக்கமான புரிதல் மற்றும் இயற்கையான குறிப்புகளில் சிறந்தது.'
            )}
            logoBg="#DA7756"
            logoSvg={
              <svg width="22" height="22" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <line x1="50" y1="5" x2="50" y2="95" stroke="white" strokeWidth="12" strokeLinecap="round"/>
                <line x1="5" y1="50" x2="95" y2="50" stroke="white" strokeWidth="12" strokeLinecap="round"/>
                <line x1="15" y1="15" x2="85" y2="85" stroke="white" strokeWidth="12" strokeLinecap="round"/>
                <line x1="85" y1="15" x2="15" y2="85" stroke="white" strokeWidth="12" strokeLinecap="round"/>
              </svg>
            }
          />
        </div>
      </section>

      {/* ── FEATURES SECTION ── */}
      <section id="features" style={{
        background: 'linear-gradient(180deg, #F6F4FF 0%, #EDF2FF 100%)',
        padding: '80px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#5A8FF5', marginBottom: 10 }}>
          {L("What's in the box", 'Apa yang ada', '功能一览', 'என்ன உள்ளது')}
        </div>
        <h2 style={{
          fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 600,
          lineHeight: 1.08, color: '#1d1d1f',
          maxWidth: 680, margin: '0 auto 36px',
          letterSpacing: '-0.03em',
        }}>
          {L(
            'Built for how Malaysians study.',
            'Dibina untuk cara pelajar Malaysia.',
            '专为马来西亚学生打造。',
            'மலேசியர்கள் படிக்கும் முறைக்காக கட்டமைக்கப்பட்டது.'
          )}
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 10, maxWidth: 1000, margin: '0 auto',
        }}>
          {[
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A8FF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                  <path d="M2 12h20" />
                </svg>
              ),
              titleEn: 'Rojak-ready', titleBm: 'Rojak-ready', titleZh: '混合语言', titleTa: 'மொழி கலவை',
              descEn: 'Switch between EN, BM, Chinese, Tamil, Arabic mid-sentence. One tap.',
              descBm: 'Tukar antara EN, BM, Cina, Tamil, Arab di tengah ayat. Satu tap.',
              descZh: '在英语、马来语、中文、泰米尔语、阿拉伯语之间随意切换。一键完成。',
              descTa: 'ஆங்கிலம், BM, சீனம், தமிழ், அரபிக்கு இடையே மாறுங்கள். ஒரே தட்டு.',
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A8FF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6" />
                  <path d="M16 13H8m8 4H8" />
                </svg>
              ),
              titleEn: 'AI that organizes', titleBm: 'AI yang menyusun', titleZh: 'AI 自动整理', titleTa: 'AI ஒழுங்கமைக்கும்',
              descEn: 'Topics, key points, formulas, questions, summary — built automatically.',
              descBm: 'Topik, key points, formula, soalan, ringkasan — tersusun automatik.',
              descZh: '主题、要点、公式、问题、摘要——全部自动生成。',
              descTa: 'தலைப்புகள், முக்கிய புள்ளிகள், சூத்திரங்கள், கேள்விகள் — தானாகவே உருவாகும்.',
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A8FF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
              ),
              titleEn: 'Science-smart', titleBm: 'Pintar sains', titleZh: '科学术语智能识别', titleTa: 'அறிவியல் புத்திசாலி',
              descEn: '500+ scientific terms auto-corrected. "My toe corner dia" → Mitochondria.',
              descBm: '500+ istilah sains auto-betul. "My toe corner dia" → Mitochondria.',
              descZh: '500+ 科学术语自动纠正。"迷托康德里亚" → Mitochondria。',
              descTa: '500+ அறிவியல் சொற்கள் தானாக சரிசெய்யப்படும். "மை டோ கார்னர் டியா" → Mitochondria.',
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A8FF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              ),
              titleEn: 'Export anywhere', titleBm: 'Eksport ke mana-mana', titleZh: '随处导出', titleTa: 'எங்கும் ஏற்றுமதி',
              descEn: 'Download as .md or .pdf with theme colors. Shareable instantly.',
              descBm: 'Muat turun .md atau .pdf dengan warna tema. Kongsi serta-merta.',
              descZh: '以 .md 或 .pdf 格式下载，带主题颜色。即时分享。',
              descTa: '.md அல்லது .pdf ஆக பதிவிறக்குங்கள். உடனடியாக பகிரலாம்.',
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A8FF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ),
              titleEn: 'AI Hearing', titleBm: 'AI Hearing', titleZh: 'AI 听力', titleTa: 'AI கேட்கும் திறன்',
              descEn: "Powered by Deepgram, Soniox & Whisper. Best-in-class STT that hears every word — even your lecturer's accent.",
              descBm: 'Dikuasakan oleh Deepgram, Soniox & Whisper. STT terbaik yang dengar setiap patah kata — termasuk loghat pensyarah.',
              descZh: '由 Deepgram、Soniox & Whisper 驱动。顶级语音识别，听清每一个字——包括讲师的口音。',
              descTa: 'Deepgram, Soniox & Whisper ஆல் இயங்குகிறது. ஒவ்வொரு வார்த்தையும் கேட்கும் சிறந்த STT.',
            },
            {
              icon: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#5A8FF5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="3" />
                  <circle cx="3" cy="6" r="2" /><line x1="5" y1="6" x2="9" y2="11" />
                  <circle cx="21" cy="6" r="2" /><line x1="19" y1="6" x2="15" y2="11" />
                  <circle cx="3" cy="18" r="2" /><line x1="5" y1="18" x2="9" y2="13" />
                  <circle cx="21" cy="18" r="2" /><line x1="19" y1="18" x2="15" y2="13" />
                  <circle cx="12" cy="2" r="2" /><line x1="12" y1="4" x2="12" y2="9" />
                </svg>
              ),
              titleEn: 'Mind Map', titleBm: 'Mind Map', titleZh: '思维导图', titleTa: 'மனத் திட்டம்',
              descEn: 'Auto-generated visual mind map from your lecture. See the whole topic at a glance — no drawing needed.',
              descBm: 'Mind map visual auto-dijana dari kuliah anda. Lihat keseluruhan topik sekilas pandang — tanpa melukis.',
              descZh: '从讲座自动生成可视化思维导图。一目了然，无需手绘。',
              descTa: 'உங்கள் விரிவுரையிலிருந்து மனத் திட்டம் தானாக உருவாகும். வரைய வேண்டாம்.',
            },
          ].map((f, i) => (
            <div key={i} style={{
              background: '#fff',
              borderRadius: 0,
              padding: '22px 18px',
              textAlign: 'left',
              border: '0.5px solid rgba(0,0,0,0.10)',
            }}>
              <div style={{
                width: 36, height: 36,
                background: 'linear-gradient(135deg, #FFE5EC, #E5F0FF)',
                borderRadius: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 14,
              }}>
                {f.icon}
              </div>
              <div style={{
                fontSize: 15, fontWeight: 600, color: '#1d1d1f',
                marginBottom: 4, letterSpacing: '-0.015em',
              }}>
                {L(f.titleEn, f.titleBm, f.titleZh, f.titleTa)}
              </div>
              <div style={{
                fontSize: 12.5, color: 'rgba(29,29,31,0.6)', lineHeight: 1.5,
              }}>
                {L(f.descEn, f.descBm, f.descZh, f.descTa)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* AMBASSADOR */}
      <section style={{
        position: 'relative',
        padding: '100px 20px',
        textAlign: 'center',
        overflow: 'hidden',
        borderTop: '0.5px solid rgba(0,0,0,0.06)',
      }}>
        {/* Background image — full, no crop */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'url(/ambassador-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          backgroundRepeat: 'no-repeat',
        }} />
        {/* Dark overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.50)',
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,180,200,0.9)', marginBottom: 10 }}>
            {L('Campus Ambassador Program', 'Program Ambassador Kampus', '校园大使计划', 'கேம்பஸ் அம்பாசிடர் திட்டம்')}
          </div>
          <h2 style={{
            fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 700,
            lineHeight: 1.05, letterSpacing: '-0.03em',
            color: '#fff', margin: '0 0 20px',
            textTransform: 'uppercase',
          }}>
            {L(
              'GET INCOME AND WIN MACBOOK NEO EVERY MONTH',
              'DAPAT PENDAPATAN & MENANG MACBOOK NEO SETIAP BULAN',
              '赚取收入，每月赢得 MacBook Neo',
              'வருமானம் பெற்று ஒவ்வொரு மாதமும் MacBook Neo வெல்லுங்கள்'
            )}
          </h2>
          <div style={{
            display: 'flex', justifyContent: 'center', gap: 8,
            flexWrap: 'wrap', marginBottom: 32,
          }}>
            {[
              { en: '50% off for friends', bm: '50% off untuk kawan', zh: '朋友享 50% 折扣', ta: 'நண்பர்களுக்கு 50% தள்ளுபடி' },
              { en: '1% commission', bm: 'Komisen 1%', zh: '1% 佣金', ta: '1% கமிஷன்' },
              { en: 'Win MacBook Neo', bm: 'Menang MacBook Neo', zh: '赢 MacBook Neo', ta: 'MacBook Neo வெல்லுங்கள்' },
            ].map((pill, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px',
                background: 'rgba(255,255,255,0.15)',
                border: '0.5px solid rgba(255,255,255,0.35)',
                borderRadius: 100,
                fontSize: 13, fontWeight: 500, color: '#fff',
                backdropFilter: 'blur(8px)',
              }}>
                {L(pill.en, pill.bm, pill.zh, pill.ta)}
              </span>
            ))}
          </div>
          <Link href="/ambassador" style={{
            display: 'inline-block',
            padding: '13px 28px', borderRadius: 100,
            background: '#fff', color: '#1d1d1f',
            fontSize: 14, fontWeight: 600, letterSpacing: '-0.05em',
            textDecoration: 'none',
          }}>
            {L('Learn more →', 'Ketahui lebih →', '了解更多 →', 'மேலும் அறிக →')}
          </Link>
        </div>
      </section>
      
      {/* PRICING */}
      <section id="pricing" style={{ padding: '72px 20px 50px', background: '#fafafa' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 500, color: '#5A8FF5', marginBottom: 10 }}>
            {L('Simple pricing', 'Harga mudah', '简单定价', 'எளிய விலை')}
          </div>
          <h2 style={{
            fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 600,
            lineHeight: 1.08, color: '#1d1d1f',
            textAlign: 'center', maxWidth: 680, margin: '0 auto 10px',
            letterSpacing: '-0.03em',
          }}>
            {L('For class and meeting.', 'Untuk kelas dan mesyuarat.', '适用于课堂和会议。', 'வகுப்பு மற்றும் கூட்டங்களுக்கு.')}<br />
            {L('Same app, both audiences.', 'Satu app, dua audiens.', '同一应用，两类用户。', 'ஒரே ஆப், இரு பயனர்கள்.')}
          </h2>
          <p style={{
            textAlign: 'center', fontSize: 'clamp(14px, 2vw, 16px)',
            color: 'rgba(29,29,31,0.6)', maxWidth: 560, margin: '0 auto 12px',
            lineHeight: 1.5,
          }}>
            {L(
              'Built for students and working professionals. Record lectures, capture meetings, get AI-organized notes. One-time payment.',
              'Dibina untuk pelajar dan profesional. Rakam kuliah, tangkap mesyuarat, dapat nota tersusun AI. Bayar sekali sahaja.',
              '专为学生和职场人士设计。录制讲座，记录会议，获取 AI 整理的笔记。一次性付款。',
              'மாணவர்கள் மற்றும் தொழில் வல்லுநர்களுக்காக. விரிவுரைகள் பதிவு செய்யுங்கள், AI குறிப்புகள் பெறுங்கள். ஒரு முறை மட்டும் கட்டணம்.'
            )}
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
              {L(
                'One-time payment · No recurring charges',
                'Bayar sekali · Tiada caj berulang',
                '一次性付款 · 无循环收费',
                'ஒரு முறை கட்டணம் · மீண்டும் வசூல் இல்லை'
              )}
            </span>
          </div>

          {/* Symmetrical 5-col grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 14,
          }} className="cc-price-grid">
            <PricingCard
              name="Free"
              amount="0"
              period={L('Forever', 'Selamanya', '永久', 'என்றும்')}
              tagline={L('Try it risk-free.', 'Cuba tanpa risiko.', '零风险试用。', 'இலவசமாக முயற்சி செய்யுங்கள்.')}
              features={[
                L('1 recording / month', '1 rakaman / bulan', '每月 1 次录制', 'மாதம் 1 பதிவு'),
                L('15 min per recording', '15 min setiap rakaman', '每次 15 分钟', 'பதிவுக்கு 15 நிமிடம்'),
                L('All 6 recording types', 'Semua 6 jenis rakaman', '全部 6 种录制类型', 'அனைத்து 6 வகை பதிவுகள்'),
                L('Export .md / .pdf', 'Eksport .md / .pdf', '导出 .md / .pdf', '.md / .pdf ஏற்றுமதி'),
              ]}
              ctaText={L('Start free', 'Mula percuma', '免费开始', 'இலவசமாக தொடங்கு')}
              ctaHref="/login"
              variant="free"
            />
            <PricingCard
              name="Day Pass"
              amount="16"
              period={L('One day · Pay once', 'Satu hari · Bayar sekali', '一天 · 一次付款', 'ஒரு நாள் · ஒரு முறை கட்டணம்')}
              tagline={L('Perfect for exam week or sprint week.', 'Sempurna untuk minggu peperiksaan atau sprint.', '适合考试周或冲刺周。', 'தேர்வு வாரத்திற்கு சரியானது.')}
              features={[
                L('10 recordings in 24h', '10 rakaman dalam 24 jam', '24 小时内 10 次录制', '24 மணியில் 10 பதிவுகள்'),
                L('45 min per recording', '45 min setiap rakaman', '每次 45 分钟', 'பதிவுக்கு 45 நிமிடம்'),
                L('4 hours audio total', '4 jam audio jumlah', '共 4 小时音频', 'மொத்தம் 4 மணி நேர ஆடியோ'),
                L('No watermark on PDF', 'Tiada watermark pada PDF', 'PDF 无水印', 'PDF இல் வாட்டர்மார்க் இல்லை'),
              ]}
              ctaText={L('Buy Day Pass', 'Beli Day Pass', '购买日通票', 'நாள் பாஸ் வாங்கு')}
              ctaHref="/checkout?plan=day"
              variant="standard"
            />
            <PricingCard
              name={L('🎓 Student PRO', '🎓 Student PRO', '🎓 学生 PRO', '🎓 மாணவர் PRO')}
              amount="34"
              period={L('30 days · Pay once', '30 hari · Bayar sekali', '30 天 · 一次付款', '30 நாட்கள் · ஒரு முறை கட்டணம்')}
              tagline={L('Built for students. Affordable monthly access.', 'Untuk pelajar. Akses bulanan berpatutan.', '专为学生设计。实惠的月度访问。', 'மாணவர்களுக்காக. மலிவான மாதாந்திர அணுகல்.')}
              features={[
                L('20 recordings / month', '20 rakaman / bulan', '每月 20 次录制', 'மாதம் 20 பதிவுகள்'),
                L('45 min per recording', '45 min setiap rakaman', '每次 45 分钟', 'பதிவுக்கு 45 நிமிடம்'),
                L('15 hours audio total', '15 jam audio jumlah', '共 15 小时音频', 'மொத்தம் 15 மணி நேர ஆடியோ'),
                L('No watermark on PDF', 'Tiada watermark pada PDF', 'PDF 无水印', 'PDF இல் வாட்டர்மார்க் இல்லை'),
              ]}
              ctaText={L('Buy Student PRO', 'Beli Student PRO', '购买学生 PRO', 'மாணவர் PRO வாங்கு')}
              ctaHref="/checkout?plan=student_pro"
              variant="gold"
              badge={L('For students', 'Untuk pelajar', '学生专享', 'மாணவர்களுக்கு')}
            />
            <PricingCard
              name={L('Monthly', 'Bulanan', '月度', 'மாதாந்திரம்')}
              amount="50"
              period={L('30 days · Pay once', '30 hari · Bayar sekali', '30 天 · 一次付款', '30 நாட்கள் · ஒரு முறை கட்டணம்')}
              tagline={L('The sweet spot for students & teams.', 'Pilihan terbaik untuk pelajar & pasukan.', '学生和团队的最佳选择。', 'மாணவர்கள் & குழுக்களுக்கான சரியான தேர்வு.')}
              features={[
                L('30 recordings / month', '30 rakaman / bulan', '每月 30 次录制', 'மாதம் 30 பதிவுகள்'),
                L('60 min per recording', '60 min setiap rakaman', '每次 60 分钟', 'பதிவுக்கு 60 நிமிடம்'),
                L('12 hours audio total', '12 jam audio jumlah', '共 12 小时音频', 'மொத்தம் 12 மணி நேர ஆடியோ'),
                L('No watermark on PDF', 'Tiada watermark pada PDF', 'PDF 无水印', 'PDF இல் வாட்டர்மார்க் இல்லை'),
              ]}
              ctaText={L('Buy Monthly', 'Beli Bulanan', '购买月度', 'மாதாந்திரம் வாங்கு')}
              ctaHref="/checkout?plan=month"
              variant="featured"
              badge={L('Most popular', 'Paling popular', '最受欢迎', 'மிகவும் பிரபலமானது')}
            />
            <PricingCard
              name={L('Yearly', 'Tahunan', '年度', 'வருடாந்திரம்')}
              amount="200"
              period={L('365 days · Pay once', '365 hari · Bayar sekali', '365 天 · 一次付款', '365 நாட்கள் · ஒரு முறை கட்டணம்')}
              tagline={L('Best value. Full year of lectures & meetings.', 'Nilai terbaik. Setahun penuh kuliah & mesyuarat.', '最超值。全年讲座和会议。', 'சிறந்த மதிப்பு. முழு வருட விரிவுரைகள் & கூட்டங்கள்.')}
              features={[
                L('200 recordings / year', '200 rakaman / tahun', '每年 200 次录制', 'ஆண்டுக்கு 200 பதிவுகள்'),
                L('60 min per recording', '60 min setiap rakaman', '每次 60 分钟', 'பதிவுக்கு 60 நிமிடம்'),
                L('60 hours audio total', '60 jam audio jumlah', '共 60 小时音频', 'மொத்தம் 60 மணி நேர ஆடியோ'),
                L('No watermark on PDF', 'Tiada watermark pada PDF', 'PDF 无水印', 'PDF இல் வாட்டர்மார்க் இல்லை'),
              ]}
              ctaText={L('Buy Yearly', 'Beli Tahunan', '购买年度', 'வருடாந்திரம் வாங்கு')}
              ctaHref="/checkout?plan=year"
              variant="standard"
              saveTag="SAVE 33%"
            />
          </div>

          <p style={{
            textAlign: 'center', marginTop: 32, fontSize: 12,
            color: 'rgba(29,29,31,0.45)',
          }}>
            {L(
              'Every plan is a one-time payment. No subscriptions. No auto-renewals.',
              'Setiap pelan adalah bayaran sekali. Tiada langganan. Tiada auto-renew.',
              '每个计划均为一次性付款。无订阅。无自动续费。',
              'ஒவ்வொரு திட்டமும் ஒரு முறை கட்டணம். சந்தா இல்லை. தானியங்கி புதுப்பிப்பு இல்லை.'
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
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          gap: 16, flexWrap: 'wrap', marginBottom: 12,
        }}>
          <a href="/privacy" style={{
            color: 'rgba(29,29,31,0.7)', textDecoration: 'none',
            fontSize: 13, fontWeight: 500,
          }}>
            {L('Privacy Policy', 'Dasar Privasi', '隐私政策', 'தனியுரிமை கொள்கை')}
          </a>
          <span style={{ color: 'rgba(29,29,31,0.25)' }}>·</span>
          <a href="/terms" style={{
            color: 'rgba(29,29,31,0.7)', textDecoration: 'none',
            fontSize: 13, fontWeight: 500,
          }}>
            {L('Terms of Service', 'Terma Perkhidmatan', '服务条款', 'சேவை விதிமுறைகள்')}
          </a>
          <span style={{ color: 'rgba(29,29,31,0.25)' }}>·</span>
          <a href="mailto:superbow98@gmail.com" style={{
            color: 'rgba(29,29,31,0.7)', textDecoration: 'none',
            fontSize: 13, fontWeight: 500,
          }}>
            {L('Contact', 'Hubungi', '联系我们', 'தொடர்பு கொள்ளுங்கள்')}
          </a>
        </div>
        <div>
          {L('Made in Malaysia', 'Dibuat di Malaysia', '马来西亚制造', 'மலேசியாவில் தயாரிக்கப்பட்டது')} · Cotton Candy 🍭
        </div>
      </footer>

      {/* Responsive tweaks for pricing grid */}
      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.cc-price-grid) { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 720px) {
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

// Cycles through words with fade + slide-up animation (Apple-style).
function WordRotator({ words, interval = 2500 }: { words: string[]; interval?: number }) {
  const [i, setI] = useState(0)
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const switchWord = () => {
      setVisible(false)
      setTimeout(() => {
        setI((prev) => (prev + 1) % words.length)
        setVisible(true)
      }, 200)
    }
    const id = setInterval(switchWord, interval)
    return () => clearInterval(id)
  }, [words.length, interval])

  return (
    <span style={{
      display: 'inline-block',
      position: 'relative',
      verticalAlign: 'baseline',
      background: 'linear-gradient(135deg, #FF6B9D 0%, #C471F5 50%, #5A8FF5 100%)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      fontWeight: 700,
      transition: 'opacity 200ms ease-out, transform 200ms ease-out',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(-8px)',
      whiteSpace: 'nowrap',
    }}>
      {words[i]}
    </span>
  )
}

function PricingCard({
  name, amount, period, tagline, features, ctaText, ctaHref, variant, badge, saveTag,
}: {
  name: string; amount: string; period: string; tagline: string;
  features: string[]; ctaText: string; ctaHref: string;
  variant: 'free' | 'standard' | 'featured' | 'gold';
  badge?: string; saveTag?: string;
}) {
  const isFeatured = variant === 'featured'
  const isFree = variant === 'free'
  const isGold = variant === 'gold'
  const isDark = isFeatured || isGold

  return (
    <div style={{
      background: isFeatured
        ? 'linear-gradient(180deg, #1d1d1f 0%, #000 100%)'
        : isGold
          ? 'linear-gradient(135deg, #D4A94B 0%, #E8B347 50%, #C99830 100%)'
          : '#fff',
      color: isDark ? '#fff' : '#1d1d1f',
      border: isDark ? 'none' : '0.5px solid rgba(0,0,0,0.08)',
      borderRadius: 22,
      padding: '28px 22px 24px',
      textAlign: 'left',
      position: 'relative',
      display: 'flex', flexDirection: 'column',
      minHeight: 420,
      boxShadow: isFeatured
        ? '0 20px 50px rgba(29,29,31,0.35)'
        : isGold
          ? '0 20px 50px rgba(212, 169, 75, 0.35)'
          : 'none',
      transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s',
    }}>
      {badge && (
        <span style={{
          position: 'absolute', top: -10, left: '50%',
          transform: 'translateX(-50%)',
          background: isGold
            ? '#fff'
            : 'linear-gradient(135deg, #FF6B9D, #C471F5)',
          color: isGold ? '#C99830' : '#fff',
          fontSize: 10.5, fontWeight: 600,
          padding: '5px 14px', borderRadius: 100,
          letterSpacing: '0.4px', textTransform: 'uppercase',
          boxShadow: isGold
            ? '0 4px 12px rgba(201, 152, 48, 0.25)'
            : '0 4px 12px rgba(196, 113, 245, 0.35)',
          whiteSpace: 'nowrap',
          border: isGold ? '0.5px solid rgba(201, 152, 48, 0.2)' : 'none',
        }}>{badge}</span>
      )}

      <div style={{
        fontSize: 14, fontWeight: 500,
        color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(29,29,31,0.6)',
        marginBottom: 8,
      }}>{name}</div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
        <span style={{
          fontSize: 17, fontWeight: 500,
          color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(29,29,31,0.55)',
        }}>RM</span>
        <span style={{
          fontSize: 54, fontWeight: 700,
          color: isDark ? '#fff' : '#1d1d1f',
          letterSpacing: '-0.035em', lineHeight: 1,
        }}>{amount}</span>
      </div>

      <div style={{
        fontSize: 13, fontWeight: 400,
        color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(29,29,31,0.5)',
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
        color: isFeatured ? '#FF8FBA' : isGold ? 'rgba(255,255,255,0.95)' : '#5A8FF5',
        margin: '12px 0 16px', minHeight: 18,
      }}>{tagline}</div>

      <div style={{
        height: 0.5,
        background: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)',
        margin: '4px 0 16px',
      }} />

      <ul style={{
        listStyle: 'none', padding: 0, margin: '0 0 20px',
        fontSize: 13,
        color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(29,29,31,0.8)',
        lineHeight: 1.9, flex: 1,
      }}>
        {features.map((f, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 0' }}>
            <span style={{
              flexShrink: 0, width: 16, height: 16, borderRadius: '50%',
              background: isFeatured
                ? 'rgba(255, 139, 186, 0.18)'
                : isGold
                  ? 'rgba(255, 255, 255, 0.25)'
                  : 'rgba(90, 143, 245, 0.12)',
              color: isFeatured ? '#FF8FBA' : isGold ? '#fff' : '#5A8FF5',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, marginTop: 4,
            }}>✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <Link href={ctaHref} style={{
        display: 'block', textAlign: 'center', padding: 13,
        background: isFeatured ? '#fff' : isGold ? '#fff' : (isFree ? '#fff' : '#1d1d1f'),
        color: isFeatured ? '#1d1d1f' : isGold ? '#C99830' : (isFree ? '#1d1d1f' : '#fff'),
        border: isFree ? '0.5px solid rgba(0,0,0,0.14)' : 'none',
        borderRadius: 100,
        fontSize: 13.5, fontWeight: isGold ? 600 : 500,
        textDecoration: 'none', letterSpacing: '-0.01em',
      }}>
        {ctaText}
      </Link>
    </div>
  )
}

// ============ ANIMATED DEMO SECTION ============
function DemoSection({ lang }: { lang: string }) {
  const L = (en: string, bm: string, zh?: string, ta?: string) => {
    if (lang === 'bm') return bm
    if (lang === 'zh' && zh) return zh
    if (lang === 'ta' && ta) return ta
    return en
  }
  const [step, setStep] = useState(1)
  const [seconds, setSeconds] = useState(258)
  const [words, setWords] = useState(142)
  const [nbCount, setNbCount] = useState(12)
  const autoTimerRef = useRef<any>(null)
  const tickerRef = useRef<any>(null)
  const wordTickerRef = useRef<any>(null)

  useEffect(() => {
    autoTimerRef.current = setInterval(() => {
      setStep((s) => (s >= 3 ? 1 : s + 1))
    }, 5500)
    return () => clearInterval(autoTimerRef.current)
  }, [])

  useEffect(() => {
    if (step === 1) {
      tickerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
      wordTickerRef.current = setInterval(() => {
        setWords((w) => w + 2 + Math.floor(Math.random() * 3))
      }, 1200)
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
    autoTimerRef.current = setInterval(() => {
      setStep((s) => (s >= 3 ? 1 : s + 1))
    }, 5500)
  }

  const chipStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', gap: 8,
    padding: '10px 18px 10px 12px',
    background: active ? '#1d1d1f' : '#fff',
    border: `0.5px solid ${active ? '#1d1d1f' : 'rgba(0,0,0,0.08)'}`,
    borderRadius: 100,
    fontSize: 13, fontWeight: 500,
    color: active ? '#fff' : 'rgba(29,29,31,0.55)',
    cursor: 'pointer',
    transition: 'all 0.25s',
    letterSpacing: '-0.01em',
    boxShadow: active ? '0 4px 14px rgba(29,29,31,0.2)' : 'none',
  })
  const chipNumStyle = (active: boolean): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 22, height: 22, borderRadius: '50%',
    fontSize: 11, fontWeight: 700,
    background: active ? 'rgba(255,255,255,0.2)' : 'rgba(90,143,245,0.12)',
    color: active ? '#fff' : '#5A8FF5',
  })

  return (
    <section style={{
      background: 'linear-gradient(180deg, #fff 0%, #FAFAFB 100%)',
      padding: '80px 20px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#5A8FF5', marginBottom: 10 }}>
          {L('See it in action', 'Lihat ia berfungsi', '看看它如何运作', 'அது எப்படி வேலை செய்கிறது என பாருங்கள்')}
        </div>
        <h2 style={{
          fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 600,
          lineHeight: 1.08, letterSpacing: '-0.03em',
          margin: '0 0 14px',
        }}>
          {L('From voice to organized notes', 'Dari suara kepada nota tersusun', '从声音到整理好的笔记', 'குரலிலிருந்து ஒழுங்கமைக்கப்பட்ட குறிப்புகளுக்கு')}<br />
          {L('in three taps.', 'dalam tiga tap.', '只需三步。', 'மூன்று தட்டில்.')}
        </h2>
        <p style={{
          fontSize: 'clamp(15px, 2vw, 18px)', fontWeight: 400,
          color: 'rgba(29,29,31,0.65)',
          maxWidth: 560, margin: '0 auto 60px',
          lineHeight: 1.5, letterSpacing: '-0.01em',
        }}>
          {L(
            'Watch how Cotton Candy turns a messy bilingual lecture into clean study notes — then files them into a notebook. No clicking. No typing.',
            'Lihat bagaimana Cotton Candy tukar kuliah rojak jadi nota tersusun — kemudian simpan ke notebook. Tanpa klik. Tanpa taip.',
            '看 Cotton Candy 如何将混乱的双语讲座变成整洁的学习笔记——然后归档到笔记本。无需点击，无需打字。',
            'Cotton Candy எப்படி குழப்பமான இருமொழி விரிவுரையை தூய்மையான குறிப்புகளாக மாற்றுகிறது என்று பாருங்கள்.'
          )}
        </p>

        <div style={{
          display: 'flex', justifyContent: 'center',
          gap: 10, marginBottom: 30, flexWrap: 'wrap',
        }}>
          <button onClick={() => onChipClick(1)} style={chipStyle(step === 1)}>
            <span style={chipNumStyle(step === 1)}>1</span>
            {L('Record lecture', 'Rakam kuliah', '录制讲座', 'விரிவுரை பதிவு')}
          </button>
          <button onClick={() => onChipClick(2)} style={chipStyle(step === 2)}>
            <span style={chipNumStyle(step === 2)}>2</span>
            {L('AI organizes', 'AI menyusun', 'AI 整理', 'AI ஒழுங்கமைக்கும்')}
          </button>
          <button onClick={() => onChipClick(3)} style={chipStyle(step === 3)}>
            <span style={chipNumStyle(step === 3)}>3</span>
            {L('Save to notebook', 'Simpan ke notebook', '保存到笔记本', 'நோட்புக்கில் சேமி')}
          </button>
        </div>

        <div style={{ maxWidth: 780, margin: '0 auto' }}>
          <div style={{
            background: '#f2f2f4', borderRadius: 28, padding: 14,
            boxShadow: '0 30px 80px rgba(29,29,31,0.12), 0 10px 30px rgba(29,29,31,0.08)',
            border: '0.5px solid rgba(0,0,0,0.06)',
          }}>
            <div style={{
              background: '#fff', borderRadius: 16, overflow: 'hidden',
              minHeight: 400, position: 'relative',
            }}>
              {step === 1 && <Step1 lang={lang} h={h} m={m} sec={sec} pad={pad} words={words} />}
              {step === 2 && <Step2 lang={lang} />}
              {step === 3 && <Step3 lang={lang} nbCount={nbCount} />}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes cc-demo-pulse {
          0% { opacity: 0.8; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.5); }
        }
        @keyframes cc-demo-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0.35; }
        }
        @keyframes cc-demo-typein {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cc-demo-spin {
          to { transform: rotate(360deg); }
        }
        @keyframes cc-demo-fadeup {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cc-demo-fly {
          0%   { transform: translateX(0) scale(1); opacity: 1; }
          50%  { transform: translateX(50%) scale(0.9); opacity: 0.7; }
          100% { transform: translateX(calc(100% + 14px)) scale(0.85); opacity: 0; }
        }
      `}</style>
    </section>
  )
}

function Step1({ lang, h, m, sec, pad, words }: {
  lang: string; h: number; m: number; sec: number;
  pad: (n: number) => string; words: number
}) {
  const L = (en: string, bm: string, zh?: string, ta?: string) => {
    if (lang === 'bm') return bm
    if (lang === 'zh' && zh) return zh
    if (lang === 'ta' && ta) return ta
    return en
  }
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 2, textAlign: 'left' }}>
        Biology — Mitosis
      </div>
      <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)', marginBottom: 18, textAlign: 'left' }}>
        Dr. Aziz · Hall B · 🇲🇾 {L('Malay', 'Melayu', '马来语', 'மலாய்')}
      </div>
      <div style={{
        background: '#FFFBFC', border: '0.5px solid rgba(0,0,0,0.06)',
        borderRadius: 16, padding: 18,
        display: 'flex', alignItems: 'center', gap: 14,
        marginBottom: 14, textAlign: 'left',
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 28%, #FFCFDB, #FF8FA8 55%, #E56A88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, position: 'relative',
        }}>
          <span style={{ width: 10, height: 10, background: '#fff', borderRadius: '50%' }} />
          <span style={{
            position: 'absolute', inset: -6, borderRadius: '50%',
            border: '2px solid rgba(255,143,168,0.5)',
            animation: 'cc-demo-pulse 2s ease-out infinite',
          }} />
          <span style={{
            position: 'absolute', inset: -6, borderRadius: '50%',
            border: '2px solid rgba(255,143,168,0.5)',
            animation: 'cc-demo-pulse 2s ease-out infinite',
            animationDelay: '1s',
          }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 28, fontWeight: 300,
            letterSpacing: '-0.04em',
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}>
            <span>{pad(h)}</span>
            <span style={{ animation: 'cc-demo-blink 1s steps(1) infinite' }}>:</span>
            <span>{pad(m)}</span>
            <span style={{ animation: 'cc-demo-blink 1s steps(1) infinite' }}>:</span>
            <span>{pad(sec)}</span>
          </div>
          <div style={{
            fontSize: 11, color: 'rgba(29,29,31,0.5)', marginTop: 4,
            display: 'inline-flex', alignItems: 'center', gap: 5,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#E53935',
              animation: 'cc-demo-blink 1s steps(1) infinite',
            }} />
            {L('Listening', 'Mendengar', '正在聆听', 'கேட்கிறது')} · <span style={{ fontVariantNumeric: 'tabular-nums' }}>{words}</span> {L('words', 'patah', '字', 'வார்த்தைகள்')}
          </div>
        </div>
      </div>
      <div style={{
        background: '#fff', border: '0.5px solid rgba(0,0,0,0.05)',
        borderRadius: 14, padding: '16px 18px',
        minHeight: 180, textAlign: 'left',
        fontSize: 13, color: 'rgba(29,29,31,0.85)', lineHeight: 1.8,
      }}>
        <div style={{ fontSize: 10, color: 'rgba(29,29,31,0.4)', letterSpacing: 0.8, marginBottom: 8 }}>
          📝 {L('TRANSCRIPT (live)', 'TRANSKRIP (langsung)', '转录 (直播)', 'ஒலிப்பெயர்ப்பு (நேரடி)')}
        </div>
        {[
          { text: '- OK students, today kita akan belajar tentang mitosis.', flag: '🇲🇾', delay: 0.3 },
          { text: '- Mitosis is the process where a cell divides into two identical daughter cells.', flag: '🇬🇧', delay: 1.2 },
          { text: '- Ada empat fasa — prophase, metaphase, anaphase, telophase.', flag: '🇲🇾', delay: 2.2 },
          { text: '- Any questions about chromosome alignment?', flag: '🇬🇧', delay: 3.2 },
        ].map((row, i) => (
          <div key={i} style={{
            opacity: 0, animation: 'cc-demo-typein 0.5s ease-out forwards',
            animationDelay: `${row.delay}s`,
          }}>
            {row.text} <span style={{ opacity: 0.6, fontSize: 12 }}>{row.flag}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Step2({ lang }: { lang: string }) {
  const L = (en: string, bm: string, zh?: string, ta?: string) => {
    if (lang === 'bm') return bm
    if (lang === 'zh' && zh) return zh
    if (lang === 'ta' && ta) return ta
    return en
  }
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 2, textAlign: 'left' }}>
        Biology — Mitosis
      </div>
      <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)', marginBottom: 18, textAlign: 'left' }}>
        {L('AI organizing your notes…', 'AI menyusun nota anda…', 'AI 正在整理你的笔记…', 'AI உங்கள் குறிப்புகளை ஒழுங்கமைக்கிறது…')}
      </div>
      <div style={{
        textAlign: 'center', padding: '30px 0 22px',
        border: '2px dashed rgba(212,83,126,0.35)',
        borderRadius: 16,
        background: 'linear-gradient(180deg, #FFFBFC, #FFF5F7)',
        marginBottom: 14,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          background: 'conic-gradient(from 0deg, #FF6B9D, #C471F5, #5A8FF5, #FF6B9D)',
          margin: '0 auto 12px',
          animation: 'cc-demo-spin 2.5s linear infinite',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: 38, height: 38, background: '#FFFBFC', borderRadius: '50%' }} />
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 3 }}>
          {L('DeepSeek V3 is thinking', 'DeepSeek V3 sedang berfikir', 'DeepSeek V3 正在思考', 'DeepSeek V3 சிந்திக்கிறது')}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.5)' }}>
          {L(
            'Extracting topics · key points · formulas · summary',
            'Extract topik · key points · formula · ringkasan',
            '提取主题 · 要点 · 公式 · 摘要',
            'தலைப்புகள் · முக்கிய புள்ளிகள் · சூத்திரங்கள் · சுருக்கம் பிரிக்கிறது'
          )}
        </div>
      </div>
      {[
        {
          t: `✨ ${L('Summary', 'Ringkasan', '摘要', 'சுருக்கம்')}`,
          b: L(
            'Class covered mitosis — the 4-phase process of cell division that produces two genetically identical daughter cells.',
            'Kelas membincangkan mitosis — proses pembahagian sel 4-fasa yang menghasilkan dua sel anak yang identikal.',
            '课堂介绍了有丝分裂——产生两个基因相同子细胞的4阶段细胞分裂过程。',
            'வகுப்பு மைட்டோசிஸை உள்ளடக்கியது — 4-கட்ட செல் பிரிவு செயல்முறை.'
          ), delay: 0.4
        },
        {
          t: `📌 ${L('Topics covered', 'Topik diliputi', '涵盖主题', 'உள்ளடக்கிய தலைப்புகள்')}`,
          b: '1. Introduction to cell division · 2. Four phases of mitosis · 3. Chromosome alignment',
          delay: 0.8
        },
        {
          t: `🔑 ${L('Key points', 'Key points', '要点', 'முக்கிய புள்ளிகள்')}`,
          b: L(
            'Mitosis produces 2 identical daughter cells · Four phases: prophase, metaphase, anaphase, telophase · Chromatids separate during anaphase.',
            'Mitosis menghasilkan 2 sel anak identikal · Empat fasa: prophase, metaphase, anaphase, telophase · Chromatid berpisah semasa anaphase.',
            '有丝分裂产生2个相同子细胞 · 四个阶段：前期、中期、后期、末期 · 染色单体在后期分离。',
            'மைட்டோசிஸ் 2 ஒத்த செல்களை உருவாக்குகிறது · நான்கு கட்டங்கள்: prophase, metaphase, anaphase, telophase.'
          ), delay: 1.2
        },
      ].map((card, i) => (
        <div key={i} style={{
          background: '#fff', border: '0.5px solid rgba(0,0,0,0.06)',
          borderRadius: 14, padding: '14px 16px', textAlign: 'left',
          marginBottom: 8, opacity: 0,
          animation: 'cc-demo-fadeup 0.5s ease-out forwards',
          animationDelay: `${card.delay}s`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 4, letterSpacing: '-0.01em' }}>
            {card.t}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.65)', lineHeight: 1.55 }}>
            {card.b}
          </div>
        </div>
      ))}
    </div>
  )
}

function Step3({ lang, nbCount }: { lang: string; nbCount: number }) {
  const L = (en: string, bm: string, zh?: string, ta?: string) => {
    if (lang === 'bm') return bm
    if (lang === 'zh' && zh) return zh
    if (lang === 'ta' && ta) return ta
    return en
  }
  return (
    <div style={{ padding: '24px 28px' }}>
      <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 2, textAlign: 'left' }}>
        {L('Add to notebook', 'Tambah ke notebook', '添加到笔记本', 'நோட்புக்கில் சேர்')}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)', marginBottom: 18, textAlign: 'left' }}>
        {L('Organize by subject or semester', 'Susun ikut subjek atau semester', '按科目或学期整理', 'பாடம் அல்லது செமஸ்டரின்படி ஒழுங்கமைக்கவும்')}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, height: 330 }}>
        <div style={{
          background: '#FAFAFB', border: '0.5px solid rgba(0,0,0,0.06)',
          borderRadius: 14, padding: 14, textAlign: 'left', overflow: 'hidden',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.5)',
            letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10,
          }}>
            {L('Recent lectures', 'Kuliah terkini', '最近讲座', 'சமீபத்திய விரிவுரைகள்')}
          </div>
          {[
            { title: 'Biology — Mitosis', meta: `18 ${L('min · 4 topics', 'min · 4 topik', '分钟 · 4 个主题', 'நிமி · 4 தலைப்புகள்')}`, d: 0.3 },
            { title: 'Biology — Meiosis', meta: `22 ${L('min · 6 topics', 'min · 6 topik', '分钟 · 6 个主题', 'நிமி · 6 தலைப்புகள்')}`, d: 1.0 },
            { title: 'Biology — DNA',     meta: `30 ${L('min · 8 topics', 'min · 8 topik', '分钟 · 8 个主题', 'நிமி · 8 தலைப்புகள்')}`, d: 1.7 },
          ].map((lec, i) => (
            <div key={i} style={{
              background: '#fff', border: '0.5px solid rgba(0,0,0,0.05)',
              borderRadius: 10, padding: '8px 10px', marginBottom: 6, fontSize: 12,
              animation: 'cc-demo-fly 2s ease-in-out forwards',
              animationDelay: `${lec.d}s`,
            }}>
              <div style={{ fontWeight: 500, color: '#1d1d1f', marginBottom: 1 }}>{lec.title}</div>
              <div style={{ fontSize: 10, color: 'rgba(29,29,31,0.5)' }}>{lec.meta}</div>
            </div>
          ))}
        </div>
        <div style={{
          background: '#FAFAFB', border: '0.5px solid rgba(0,0,0,0.06)',
          borderRadius: 14, padding: 14, textAlign: 'left', overflow: 'hidden',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.5)',
            letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10,
          }}>
            {L('Notebook', 'Notebook', '笔记本', 'நோட்புக்')}
          </div>
          <div style={{ background: 'linear-gradient(135deg, #FFE5EC, #E5F0FF)', borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 28, marginBottom: 4 }}>📘</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.015em' }}>
              Biology Sem 2
            </div>
            <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.6)', marginTop: 2 }}>
              <span style={{ fontWeight: 700, color: '#5A8FF5' }}>{nbCount}</span> {L('lectures · exam-ready', 'kuliah · siap ujian', '讲座 · 备考就绪', 'விரிவுரைகள் · தேர்வுக்கு தயார்')}
            </div>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(29,29,31,0.45)', marginTop: 14, textAlign: 'center' }}>
            {L('Export whole notebook as one PDF', 'Eksport semua notebook sebagai satu PDF', '将整个笔记本导出为一个 PDF', 'முழு நோட்புக்கையும் ஒரு PDF ஆக ஏற்றுமதி செய்')}
          </div>
        </div>
      </div>
    </div>
  )
}
