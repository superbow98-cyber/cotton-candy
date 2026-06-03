"use client";

import Link from "next/link";
import { useState } from "react";

type Lang = "en" | "bm" | "zh" | "ta";

const T = {
  eyebrow: {
    en: "Campus Ambassador Program",
    bm: "Program Ambassador Kampus",
    zh: "校园大使计划",
    ta: "கேம்பஸ் அம்பாசிடர் திட்டம்",
  },
  h1a: { en: "Become an Ambassador.", bm: "Jadi Ambassador.", zh: "成为大使。", ta: "அம்பாசிடராகுங்கள்." },
  h1b: { en: "Win a MacBook.", bm: "Menang MacBook.", zh: "赢得 MacBook。", ta: "MacBook வெல்லுங்கள்." },
  body: {
    en: (
      <>
        Get a <strong>50% off package</strong>, earn <strong>1% commission</strong> on every payment, and stand a chance to win a <strong>MacBook Neo</strong> when you promote your promo code.
      </>
    ),
    bm: (
      <>
        Dapat <strong>pakej 50% off</strong>, jana <strong>komisen 1%</strong> setiap payment, dan berpeluang menang <strong>MacBook Neo</strong> bila promote promo code kau.
      </>
    ),
    zh: (
      <>
        获得 <strong>50% 折扣套餐</strong>，每笔付款赚取 <strong>1% 佣金</strong>，并有机会在推广你的优惠码时赢得 <strong>MacBook Neo</strong>。
      </>
    ),
    ta: (
      <>
        <strong>50% தள்ளுபடி தொகுப்பு</strong> பெறுங்கள், ஒவ்வொரு கட்டணத்திலும் <strong>1% கமிஷன்</strong> சம்பாதியுங்கள், மற்றும் உங்கள் promo code ஐ பிரச்சாரம் செய்வதன் மூலம் <strong>MacBook Neo</strong> வெல்லும் வாய்ப்பு பெறுங்கள்.
      </>
    ),
  },
  cta: { en: "Register Now", bm: "Daftar Sekarang", zh: "立即注册", ta: "இப்போது பதிவு செய்யுங்கள்" },
  reqTitle: {
    en: "Eligibility Requirements",
    bm: "Syarat Kelayakan",
    zh: "资格要求",
    ta: "தகுதி தேவைகள்",
  },
  req1Label: { en: "Students only", bm: "Pelajar sahaja", zh: "仅限学生", ta: "மாணவர்கள் மட்டும்" },
  req1Desc: {
    en: "Must be an active student at a recognised IPT or IPTS (public or private university/college).",
    bm: "Mesti pelajar aktif di IPT atau IPTS yang diiktiraf (universiti/kolej awam atau swasta).",
    zh: "必须是公认 IPT 或 IPTS（公立或私立大学/学院）的在籍学生。",
    ta: "அங்கீகரிக்கப்பட்ட IPT அல்லது IPTS (பொது அல்லது தனியார் பல்கலைக்கழகம்/கல்லூரி) இல் செயலில் உள்ள மாணவராக இருக்க வேண்டும்.",
  },
  req2Label: { en: "Active paid plan", bm: "Plan aktif berbayar", zh: "有效付费套餐", ta: "செயலில் உள்ள கட்டண திட்டம்" },
  req2Desc: {
    en: "Must hold an active Student PRO, Monthly, or Yearly plan. Free and Day Pass plans are not eligible.",
    bm: "Mesti ada plan Student PRO, Bulanan, atau Tahunan yang aktif. Plan Free dan Day Pass tidak layak.",
    zh: "必须持有有效的学生 PRO、月度或年度套餐。免费和日通票套餐不符合资格。",
    ta: "செயலில் உள்ள Student PRO, மாதாந்திர, அல்லது வருடாந்திர திட்டம் வைத்திருக்க வேண்டும். Free மற்றும் Day Pass திட்டங்கள் தகுதியற்றவை.",
  },
};

const L = (key: keyof typeof T, lang: Lang): any => (T[key] as any)[lang];

const LANG_OPTIONS: { code: Lang; label: string }[] = [
  { code: "en", label: "EN" },
  { code: "bm", label: "BM" },
  { code: "zh", label: "中文" },
  { code: "ta", label: "தமிழ்" },
];

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
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", system-ui, sans-serif',
        WebkitFontSmoothing: "antialiased",
        letterSpacing: "-0.02em",
      }}
    >
      {/* Background — same as landing page ambassador section */}
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

      {/* Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.52)",
          zIndex: 1,
        }}
      />

      {/* Language pill — top right */}
      <div
        style={{
          position: "fixed",
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
              background: lang === code ? "rgba(255,255,255,0.92)" : "transparent",
              color: lang === code ? "#1d1d1f" : "rgba(255,255,255,0.7)",
              boxShadow: lang === code ? "0 1px 4px rgba(0,0,0,0.18)" : "none",
              transition: "all 0.18s ease",
              letterSpacing: code === "zh" || code === "ta" ? "0" : "-0.02em",
              lineHeight: 1.4,
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

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          padding: "40px 24px 60px",
          maxWidth: 580,
          width: "100%",
        }}
      >
        {/* Eyebrow */}
        <p
          style={{
            fontSize: 13,
            fontWeight: 500,
            letterSpacing: "0.05em",
            color: "rgba(255,180,200,0.9)",
            marginBottom: 16,
            textTransform: "uppercase",
          }}
        >
          {L("eyebrow", lang)}
        </p>

        {/* Headline */}
        <h1
          style={{
            fontSize: "clamp(36px, 6vw, 64px)",
            fontWeight: 700,
            lineHeight: 1.07,
            letterSpacing: "-0.03em",
            color: "#fff",
            marginBottom: 18,
            textTransform: "uppercase",
          }}
        >
          {L("h1a", lang)}
          <br />
          {L("h1b", lang)}
        </h1>

        {/* Body */}
        <p
          style={{
            fontSize: "clamp(15px, 2vw, 17px)",
            fontWeight: 300,
            color: "rgba(255,255,255,0.72)",
            lineHeight: 1.65,
            marginBottom: 36,
            maxWidth: 440,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {L("body", lang)}
        </p>

        {/* Eligibility card */}
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
            {L("reqTitle", lang)}
          </p>

          {/* Req 1 — IPT/IPTS */}
          <div style={{ display: "flex", gap: 14, marginBottom: 16, alignItems: "flex-start" }}>
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 10v6M2 10l10-5 10 5-10 5-10-5z"/>
                <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 3, letterSpacing: "-0.01em" }}>
                {L("req1Label", lang)}
              </p>
              <p style={{ fontSize: 13, fontWeight: 300, color: "rgba(255,255,255,0.65)", lineHeight: 1.55 }}>
                {L("req1Desc", lang)}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: "0.5px", background: "rgba(255,255,255,0.12)", marginBottom: 16 }} />

          {/* Req 2 — Active plan */}
          <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
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
              {/* Shield / verified icon */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <path d="M9 12l2 2 4-4"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 3, letterSpacing: "-0.01em" }}>
                {L("req2Label", lang)}
              </p>
              <p style={{ fontSize: 13, fontWeight: 300, color: "rgba(255,255,255,0.65)", lineHeight: 1.55, marginBottom: 10 }}>
                {L("req2Desc", lang)}
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
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", flexShrink: 0 }} />
                    {plan}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Link
          href="/login"
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
          {L("cta", lang)}
        </Link>
      </div>
    </main>
  );
}
