"use client";

import Link from "next/link";
import { useState } from "react";

type Lang = "en" | "bm" | "zh" | "ta";

/* ─────────────────────────────────────────────
   TRANSLATIONS
   ───────────────────────────────────────────── */
const T = {
  eyebrow: {
    en: "Campus Ambassador Program",
    bm: "Program Ambassador Kampus",
    zh: "校园大使计划",
    ta: "கேம்பஸ் அம்பாசிடர் திட்டம்",
  },
  h1a: {
    en: "Become an Ambassador.",
    bm: "Jadi Ambassador.",
    zh: "成为大使。",
    ta: "அம்பாசிடராகுங்கள்.",
  },
  h1b: {
    en: "Win a MacBook.",
    bm: "Menang MacBook.",
    zh: "赢得 MacBook。",
    ta: "MacBook வெல்லுங்கள்.",
  },
  body: {
    en: "Share your personalised 50% off promo code, earn 1% commission on every successful referral, and compete to win a MacBook Neo at the end of each month.",
    bm: "Kongsi kod promo 50% off peribadi anda, jana komisen 1% bagi setiap rujukan berjaya, dan bersaing untuk memenangi MacBook Neo setiap hujung bulan.",
    zh: "分享您专属的 50% 折扣优惠码，每次成功推荐可赚取 1% 佣金，并参与每月 MacBook Neo 的赢取竞赛。",
    ta: "உங்கள் தனிப்பட்ட 50% தள்ளுபடி promo code ஐ பகிர்ந்து, ஒவ்வொரு வெற்றிகரமான பரிந்துரையிலும் 1% கமிஷன் சம்பாதியுங்கள், மேலும் ஒவ்வொரு மாதமும் MacBook Neo வெல்லும் போட்டியில் பங்கேற்கலாம்.",
  },
  cta: {
    en: "Register Now",
    bm: "Daftar Sekarang",
    zh: "立即注册",
    ta: "இப்போது பதிவு செய்யுங்கள்",
  },
  reqTitle: {
    en: "Eligibility Requirements",
    bm: "Syarat Kelayakan",
    zh: "资格要求",
    ta: "தகுதி தேவைகள்",
  },
  req1Label: {
    en: "Students only",
    bm: "Pelajar sahaja",
    zh: "仅限学生",
    ta: "மாணவர்கள் மட்டும்",
  },
  req1Desc: {
    en: "Must be an active student at a recognised public or private university or college (IPT / IPTS).",
    bm: "Mesti merupakan pelajar aktif di IPT atau IPTS yang diiktiraf (universiti atau kolej awam / swasta).",
    zh: "必须是公认公立或私立大学或学院（IPT / IPTS）的在籍学生。",
    ta: "அங்கீகரிக்கப்பட்ட பொது அல்லது தனியார் பல்கலைக்கழகம் அல்லது கல்லூரியில் (IPT / IPTS) செயலில் உள்ள மாணவராக இருக்க வேண்டும்.",
  },
  req2Label: {
    en: "Active paid plan required",
    bm: "Perlu plan berbayar aktif",
    zh: "需要有效付费套餐",
    ta: "செயலில் உள்ள கட்டண திட்டம் தேவை",
  },
  req2Desc: {
    en: "You must hold an active Student PRO, Monthly, or Yearly plan. Free and Day Pass plans are not eligible.",
    bm: "Anda perlu mempunyai plan Student PRO, Bulanan, atau Tahunan yang aktif. Plan Percuma dan Day Pass tidak layak.",
    zh: "您必须持有有效的学生 PRO、月度或年度套餐。免费和日通票套餐不符合资格。",
    ta: "நீங்கள் செயலில் உள்ள Student PRO, மாதாந்திர, அல்லது வருடாந்திர திட்டம் வைத்திருக்க வேண்டும். Free மற்றும் Day Pass திட்டங்கள் தகுதியற்றவை.",
  },
};

const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "bm", label: "BM" },
  { code: "zh", label: "中文" },
  { code: "ta", label: "தமிழ்" },
];

/* ─────────────────────────────────────────────
   PAGE COMPONENT
   ───────────────────────────────────────────── */
export default function AmbassadorPage() {
  const [lang, setLang] = useState<Lang>("bm");

  return (
    <main
      style={{
        minHeight: "100vh",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        overflow: "hidden",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
        WebkitFontSmoothing: "antialiased",
        letterSpacing: "-0.02em",
      }}
    >
      {/* ── Background image ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url(/ambassador-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
      />

      {/* ── Dark overlay ── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.52)",
          zIndex: 1,
        }}
      />

      {/* ── Language pill — position: absolute (NOT fixed) ── */}
      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          borderRadius: 100,
          padding: "3px 4px",
          gap: 2,
          border: "0.5px solid rgba(255,255,255,0.22)",
        }}
      >
        {LANG_OPTIONS.map(({ code, label }) => (
          <button
            key={code}
            onClick={() => setLang(code)}
            style={{
              padding: "4px 11px",
              borderRadius: 100,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: lang === code ? 600 : 400,
              background:
                lang === code ? "rgba(255,255,255,0.92)" : "transparent",
              color:
                lang === code ? "#1d1d1f" : "rgba(255,255,255,0.7)",
              boxShadow:
                lang === code ? "0 1px 4px rgba(0,0,0,0.18)" : "none",
              transition: "all 0.18s ease",
              lineHeight: 1.4,
              whiteSpace: "nowrap",
              fontFamily:
                code === "ta"
                  ? '"Noto Sans Tamil", system-ui, sans-serif'
                  : "inherit",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Main content ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          padding: "80px 24px 60px",
          maxWidth: 580,
          width: "100%",
        }}
      >
        {/* Eyebrow */}
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.06em",
            color: "rgba(255,180,200,0.9)",
            marginBottom: 14,
            textTransform: "uppercase",
            whiteSpace: "nowrap",
          }}
        >
          {T.eyebrow[lang]}
        </p>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(28px, 5.5vw, 64px)",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "#fff",
            marginBottom: 18,
            textTransform: "uppercase",
            wordBreak: "keep-all",
            overflowWrap: "break-word",
          }}
        >
          {T.h1a[lang]}
          <br />
          {T.h1b[lang]}
        </h1>

        {/* Body */}
        <p
          style={{
            fontSize: "clamp(15px, 2vw, 17px)",
            fontWeight: 300,
            color: "rgba(255,255,255,0.72)",
            lineHeight: 1.7,
            marginBottom: 36,
            maxWidth: 440,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {T.body[lang]}
        </p>

        {/* ── Eligibility card ── */}
        <div
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "0.5px solid rgba(255,255,255,0.18)",
            borderRadius: 18,
            padding: "20px 24px",
            marginBottom: 32,
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            textAlign: "left",
          }}
        >
          {/* Card header */}
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: "rgba(255,180,200,0.85)",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            {T.reqTitle[lang]}
          </p>

          {/* Req 1 — Student only */}
          <div
            style={{
              display: "flex",
              gap: 14,
              marginBottom: 16,
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.12)",
                border: "0.5px solid rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Graduation cap icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z" />
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
              </svg>
            </div>
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  marginBottom: 3,
                  letterSpacing: "-0.01em",
                }}
              >
                {T.req1Label[lang]}
              </p>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.55,
                }}
              >
                {T.req1Desc[lang]}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div
            style={{
              height: "0.5px",
              background: "rgba(255,255,255,0.12)",
              marginBottom: 16,
            }}
          />

          {/* Req 2 — Active plan */}
          <div
            style={{ display: "flex", gap: 14, alignItems: "flex-start" }}
          >
            <div
              style={{
                flexShrink: 0,
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.12)",
                border: "0.5px solid rgba(255,255,255,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {/* Shield + check icon */}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(255,255,255,0.9)"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <path d="M9 12l2 2 4-4" />
              </svg>
            </div>
            <div>
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#fff",
                  marginBottom: 3,
                  letterSpacing: "-0.01em",
                }}
              >
                {T.req2Label[lang]}
              </p>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 300,
                  color: "rgba(255,255,255,0.65)",
                  lineHeight: 1.55,
                  marginBottom: 10,
                }}
              >
                {T.req2Desc[lang]}
              </p>

              {/* Plan pills */}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {["Student PRO", "Monthly", "Yearly"].map((plan) => (
                  <span
                    key={plan}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      padding: "4px 10px",
                      background: "rgba(255,255,255,0.13)",
                      border: "0.5px solid rgba(255,255,255,0.28)",
                      borderRadius: 100,
                      fontSize: 11,
                      fontWeight: 500,
                      color: "rgba(255,255,255,0.9)",
                      backdropFilter: "blur(4px)",
                    }}
                  >
                    <span
                      style={{
                        width: 5,
                        height: 5,
                        borderRadius: "50%",
                        background: "#4ade80",
                        flexShrink: 0,
                      }}
                    />
                    {plan}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── CTA button ── */}
        <Link
          href="/dashboard/ambassador"
          style={{
            display: "inline-block",
            background: "#fff",
            color: "#1d1d1f",
            fontSize: 15,
            fontWeight: 600,
            padding: "13px 32px",
            borderRadius: 980,
            textDecoration: "none",
            letterSpacing: "-0.03em",
          }}
        >
          {T.cta[lang]}
        </Link>
      </div>
    </main>
  );
}
