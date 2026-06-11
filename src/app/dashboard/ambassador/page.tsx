'use client'
// src/app/dashboard/ambassador/page.tsx

import { useEffect, useState, useRef } from 'react'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/lib/i18n/LangProvider'
import { useTheme } from '@/lib/theme/ThemeProvider'

interface Commission {
  id: string
  amount_paid_myr: number
  commission_myr: number
  created_at: string
}

interface LeaderboardEntry {
  user_id: string
  full_name: string | null
  promo_code: string
  referral_count: number
  commission_total: number
}

interface AmbassadorData {
  promo_code: string | null
  commission_total: number
  user_count: number
  is_ambassador: boolean
  has_active_plan: boolean
}
interface Withdrawal {
  id: string
  amount_myr: number
  bank_name: string
  account_number: string
  account_name: string
  status: 'pending' | 'approved' | 'transferred'
  requested_at: string
}
const MACBOOK_TARGET = 200

// ─── CSS keyframes injected once ─────────────────────────────────────────────
const AMBASSADOR_STYLES = `
@keyframes amb-fadeSlideUp {
  from { opacity:0; transform:translateY(10px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes amb-perkIn {
  from { opacity:0; transform:translateY(8px) scale(0.97); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}
@keyframes amb-btnShimmer {
  0%   { background-position:-200% center; }
  100% { background-position:200% center; }
}
@keyframes amb-perkShimmer {
  0%   { transform:translateX(-100%) skewX(-12deg); }
  100% { transform:translateX(300%) skewX(-12deg); }
}
@keyframes amb-shake {
  0%,100% { transform:translateX(0); }
  15%  { transform:translateX(-6px); }
  30%  { transform:translateX(6px); }
  45%  { transform:translateX(-4px); }
  60%  { transform:translateX(4px); }
  75%  { transform:translateX(-2px); }
  90%  { transform:translateX(2px); }
}
@keyframes amb-errorIn {
  from { opacity:0; transform:translateY(-6px) scale(0.97); max-height:0; }
  to   { opacity:1; transform:translateY(0) scale(1); max-height:120px; }
}
@keyframes amb-pulse {
  0%,100% { box-shadow:0 0 0 0 rgba(220,60,60,0); }
  50%      { box-shadow:0 0 0 4px rgba(220,60,60,0.18); }
}
@keyframes amb-shimmerSlide {
  0%   { transform:translateX(-100%); }
  100% { transform:translateX(200%); }
}
@keyframes amb-verifyIn {
  from { opacity:0; transform:translateY(6px) scale(0.98); }
  to   { opacity:1; transform:translateY(0) scale(1); }
}

.amb-card { animation: amb-fadeSlideUp 0.55s cubic-bezier(0.22,1,0.36,1) both; }

.amb-perk-card {
  background:rgba(235,235,235,0.18);
  border:0.5px solid rgba(255,255,255,0.28);
  border-radius:12px; padding:16px 10px;
  opacity:0;
  animation: amb-perkIn 0.5s cubic-bezier(0.22,1,0.36,1) forwards;
  transition: background 0.2s, border-color 0.2s, transform 0.2s;
  position:relative; overflow:hidden;
}
.amb-perk-card::after {
  content:'';
  position:absolute; top:0; left:0;
  width:40%; height:100%;
  background:linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
  transform:translateX(-100%) skewX(-12deg);
}
.amb-perk-card:hover::after { animation: amb-perkShimmer 0.65s cubic-bezier(0.22,1,0.36,1) forwards; }
.amb-perk-card:hover { background:rgba(245,245,245,0.26); border-color:rgba(255,255,255,0.42); transform:translateY(-2px); }
.amb-perk-card:nth-child(1) { animation-delay:0.15s; }
.amb-perk-card:nth-child(2) { animation-delay:0.25s; }
.amb-perk-card:nth-child(3) { animation-delay:0.35s; }

.amb-elig-row {
  display:flex; align-items:center; gap:7px;
  margin-bottom:16px; justify-content:center;
  animation: amb-fadeSlideUp 0.5s 0.4s cubic-bezier(0.22,1,0.36,1) both;
}

.amb-cta-wrap {
  animation: amb-fadeSlideUp 0.5s 0.5s cubic-bezier(0.22,1,0.36,1) both;
  display:flex; flex-direction:column; align-items:center;
  width:100%;
}

.amb-cta-btn {
  display:inline-block; width:100%;
  padding:13px 32px; border-radius:12px;
  font-size:15px; font-weight:700; letter-spacing:-0.02em;
  border:none; cursor:pointer;
  font-family:-apple-system,'Helvetica Neue',sans-serif;
  position:relative; overflow:hidden;
  transition: transform 0.15s cubic-bezier(0.22,1,0.36,1), opacity 0.15s, background 0.3s, color 0.3s;
  background:#fff; color:#1d1d1f; white-space:nowrap;
}
.amb-cta-btn::after {
  content:'';
  position:absolute; inset:0;
  background:linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.55) 50%, transparent 60%);
  background-size:200% 100%; background-position:200% center;
}
.amb-cta-btn:hover::after  { animation: amb-btnShimmer 0.55s cubic-bezier(0.22,1,0.36,1) forwards; }
.amb-cta-btn:hover  { transform:scale(1.012); }
.amb-cta-btn:active { transform:scale(0.985); opacity:0.85; }
.amb-cta-btn.amb-btn-disabled {
  background:rgba(255,255,255,0.12); color:rgba(255,255,255,0.25); cursor:not-allowed;
}
.amb-cta-btn.amb-btn-disabled::after { display:none; }
.amb-cta-btn.amb-btn-error {
  background:rgba(210,50,50,0.9); color:#fff;
  animation: amb-shake 0.45s cubic-bezier(0.22,1,0.36,1), amb-pulse 0.6s 0.45s ease-out;
}
.amb-cta-btn.amb-btn-error::after { display:none; }
.amb-cta-btn.amb-btn-loading { opacity:0.6; cursor:not-allowed; pointer-events:none; }

.amb-error-banner {
  display:none; width:100%;
  background:rgba(180,30,30,0.18);
  border:0.5px solid rgba(220,80,80,0.45);
  border-radius:10px; padding:12px 14px; margin-top:10px; overflow:hidden;
  text-align:left;
}
.amb-error-banner.amb-show { display:block; animation: amb-errorIn 0.4s cubic-bezier(0.22,1,0.36,1) both; }

.amb-plans-link {
  display:inline-flex; align-items:center; gap:4px; margin-top:14px;
  font-size:13px; color:rgba(255,255,255,0.4); text-decoration:none;
  font-family:-apple-system,'Helvetica Neue',sans-serif; transition:color 0.2s;
}
.amb-plans-link:hover { color:rgba(255,255,255,0.7); }

.amb-sharekit-btn {
  display:inline-flex; align-items:center; gap:6px;
  padding:9px 16px; border-radius:9px;
  font-size:13px; font-weight:500; cursor:pointer;
  border:none; transition: all 0.18s ease;
  font-family:-apple-system,'Helvetica Neue',sans-serif;
}
.amb-sharekit-btn:hover { transform:translateY(-1px); }
.amb-sharekit-btn:active { transform:scale(0.97); }

.amb-step-row {
  display:flex; align-items:flex-start; gap:12px;
  padding:10px 0;
  border-bottom:0.5px solid rgba(0,0,0,0.05);
  animation: amb-fadeSlideUp 0.4s cubic-bezier(0.22,1,0.36,1) both;
}
.amb-step-row:last-child { border-bottom:none; }

.amb-canvas-shimmer {
  position:relative; overflow:hidden;
}
.amb-canvas-shimmer::after {
  content:'';
  position:absolute; inset:0;
  background:linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%);
  transform:translateX(-100%);
  animation: amb-shimmerSlide 2s ease-in-out infinite;
}

.amb-tpl-card {
  background: rgba(0,0,0,0.025);
  border: 0.5px solid rgba(0,0,0,0.07);
  border-radius: 10px;
  padding: 12px 14px;
  transition: background 0.15s, border-color 0.15s;
  cursor: default;
}
.amb-tpl-card:hover {
  background: rgba(0,0,0,0.045);
  border-color: rgba(0,0,0,0.11);
}

.amb-tpl-scroll::-webkit-scrollbar { width: 3px; }
.amb-tpl-scroll::-webkit-scrollbar-track { background: transparent; }
.amb-tpl-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 99px; }

/* ── Verify slot ── */
.amb-verify-slot {
  width:100%; margin-top:14px;
  animation: amb-verifyIn 0.4s 0.55s cubic-bezier(0.22,1,0.36,1) both;
}
.amb-verify-inner {
  background:rgba(255,255,255,0.07);
  border:0.5px solid rgba(255,255,255,0.18);
  border-radius:12px;
  padding:14px 16px;
  text-align:left;
}
.amb-verify-label {
  font-size:11px; font-weight:600; letter-spacing:0.06em; text-transform:uppercase;
  color:rgba(255,255,255,0.38); margin-bottom:12px;
  font-family:-apple-system,'Helvetica Neue',sans-serif;
}
.amb-verify-option {
  display:flex; align-items:flex-start; gap:10px;
  padding:10px 12px; border-radius:9px;
  border:0.5px solid rgba(255,255,255,0.10);
  background:rgba(255,255,255,0.04);
  margin-bottom:8px; cursor:pointer;
  transition: background 0.18s, border-color 0.18s;
}
.amb-verify-option:last-child { margin-bottom:0; }
.amb-verify-option:hover { background:rgba(255,255,255,0.09); border-color:rgba(255,255,255,0.22); }
.amb-verify-option.amb-verify-active {
  background:rgba(255,255,255,0.12);
  border-color:rgba(255,255,255,0.35);
}
.amb-verify-radio {
  width:16px; height:16px; border-radius:50%; flex-shrink:0; margin-top:1px;
  border:1.5px solid rgba(255,255,255,0.30);
  display:flex; align-items:center; justify-content:center;
  transition: border-color 0.18s, background 0.18s;
}
.amb-verify-active .amb-verify-radio {
  border-color:#fff;
  background:rgba(255,255,255,0.15);
}
.amb-verify-radio-dot {
  width:7px; height:7px; border-radius:50%;
  background:#fff; opacity:0;
  transition: opacity 0.15s;
}
.amb-verify-active .amb-verify-radio-dot { opacity:1; }
.amb-verify-text-wrap { flex:1; min-width:0; }
.amb-verify-title {
  font-size:13px; font-weight:600; color:rgba(255,255,255,0.88);
  font-family:-apple-system,'Helvetica Neue',sans-serif;
  margin-bottom:2px;
}
.amb-verify-desc {
  font-size:11.5px; color:rgba(255,255,255,0.42); line-height:1.5;
  font-family:-apple-system,'Helvetica Neue',sans-serif;
}

/* Email input inside verify slot */
.amb-verify-email-wrap {
  margin-top:10px;
  animation: amb-verifyIn 0.3s cubic-bezier(0.22,1,0.36,1) both;
}
.amb-verify-email-input {
  width:100%; box-sizing:border-box;
  padding:10px 12px; border-radius:8px;
  background:rgba(255,255,255,0.08);
  border:0.5px solid rgba(255,255,255,0.18);
  color:#fff; font-size:13px;
  font-family:-apple-system,'Helvetica Neue',sans-serif;
  outline:none; transition: border-color 0.18s, background 0.18s;
}
.amb-verify-email-input::placeholder { color:rgba(255,255,255,0.28); }
.amb-verify-email-input:focus { border-color:rgba(255,255,255,0.45); background:rgba(255,255,255,0.12); }
.amb-verify-badge {
  display:inline-flex; align-items:center; gap:5px;
  margin-top:8px; padding:5px 10px; border-radius:6px;
  font-size:11.5px; font-weight:600;
  font-family:-apple-system,'Helvetica Neue',sans-serif;
  animation: amb-verifyIn 0.3s cubic-bezier(0.22,1,0.36,1) both;
}
.amb-verify-badge.amb-badge-ipt {
  background:rgba(80,220,130,0.15);
  border:0.5px solid rgba(80,220,130,0.4);
  color:rgba(100,230,150,0.95);
}
.amb-verify-badge.amb-badge-invalid {
  background:rgba(220,80,80,0.12);
  border:0.5px solid rgba(220,80,80,0.35);
  color:rgba(255,140,140,0.9);
}
.amb-verify-badge.amb-badge-warn {
  background:rgba(240,160,40,0.13);
  border:0.5px solid rgba(240,160,40,0.38);
  color:rgba(255,200,80,0.95);
}

/* Creator expand area */
.amb-verify-creator-wrap {
  margin-top:10px;
  animation: amb-verifyIn 0.3s cubic-bezier(0.22,1,0.36,1) both;
  display:flex; flex-direction:column; gap:8px;
}
.amb-verify-creator-row {
  display:flex; gap:7px; align-items:center;
}
.amb-verify-creator-select {
  flex-shrink:0; padding:9px 10px; border-radius:8px;
  background:rgba(255,255,255,0.08);
  border:0.5px solid rgba(255,255,255,0.18);
  color:#fff; font-size:12px;
  font-family:-apple-system,'Helvetica Neue',sans-serif;
  outline:none; cursor:pointer;
  transition: border-color 0.18s, background 0.18s;
  appearance:none; -webkit-appearance:none;
}
.amb-verify-creator-select:focus { border-color:rgba(255,255,255,0.45); background:rgba(255,255,255,0.12); }
.amb-verify-creator-select option { background:#1a1a2e; color:#fff; }
.amb-verify-email-input.amb-creator-link-input { margin-top:0; }
.amb-verify-follower-input {
  width:100%; box-sizing:border-box;
  padding:10px 12px; border-radius:8px;
  background:rgba(255,255,255,0.08);
  border:0.5px solid rgba(255,255,255,0.18);
  color:#fff; font-size:13px;
  font-family:-apple-system,'Helvetica Neue',sans-serif;
  outline:none; transition: border-color 0.18s, background 0.18s;
}
.amb-verify-follower-input::placeholder { color:rgba(255,255,255,0.28); }
.amb-verify-follower-input:focus { border-color:rgba(255,255,255,0.45); background:rgba(255,255,255,0.12); }
`

// ─── Content templates generator ─────────────────────────────────────────────
function getTemplates(code: string) {
  const link = 'cottoncandy-s.com'
  const fullLink = 'https://cottoncandy-s.com'
  return [
    {
      tag: 'Informal Ad',
      tagColor: '#FF6B9D',
      title: 'FOMO hook',
      platform: 'Threads · Instagram',
      content: `korang masih type nota sendiri masa lecturer cakap?? 😭

bro aku dah upgrade. Cotton Candy — rakam kuliah, dia auto buat nota sendiri. topik, key points, formula — siap dalam saat.

guna code ${code} dapat 50% off 🍬
${fullLink}`,
    },
    {
      tag: 'Function',
      tagColor: '#A855F7',
      title: 'What it does',
      platform: 'WhatsApp Status · Telegram',
      content: `Cotton Candy buat apa sebenarnya?

🎙 Rakam kuliah dalam bahasa apa pun
📝 Live transcript keluar masa kau cakap
🤖 AI (Gemini / GPT / Claude) summarize terus
📄 Export jadi PDF nota cantik

semua dalam satu app. dari RM8 je.
code ${code} → 50% off`,
    },
    {
      tag: 'Tutorial',
      tagColor: '#00C9A7',
      title: 'Step-by-step',
      platform: 'TikTok caption · Reels',
      content: `cara aku buat nota kuliah dalam 30 saat 👇

1️⃣ buka Cotton Candy
2️⃣ tekan rekod — cakap je macam biasa
3️⃣ habis kuliah → tekan Finish
4️⃣ AI auto susun nota — topik, points, formula
5️⃣ export PDF → terus boleh study

code ${code} → 50% off masa checkout
${fullLink}`,
    },
    {
      tag: 'Viral',
      tagColor: '#F59E0B',
      title: 'Student pain point',
      platform: 'Twitter/X · Threads',
      content: `POV: kau nod-nod faham dalam kelas tapi nota kosong

padahal solution dah ada 😭
Cotton Candy rakam + AI buat nota sendiri. kau duduk je.

cuba free dulu → ${link}
nak 50% off guna code ${code}`,
    },
    {
      tag: 'Informal Ad',
      tagColor: '#FF6B9D',
      title: 'Bahasa rojak',
      platform: 'WhatsApp · Instagram',
      content: `weh serious best gila app ni

aku rakam kuliah biochem tadi (lecturer cakap laju gila) — dalam 10 saat dah dapat nota lengkap. formula pun ada sekali. tak tipu.

nama dia Cotton Candy 🍬
${link} — guna code ${code} 50% off`,
    },
    {
      tag: 'Spotlight',
      tagColor: '#3B82F6',
      title: 'Multilingual flex',
      platform: 'LinkedIn · Facebook',
      content: `lecturer kau cakap BI campur BM campur istilah teknikal?

Cotton Candy faham semua tu. rojak pun okay. auto detect bahasa + 500+ science terms built-in.

nota kau nanti clean, organised, siap nak exam.
${fullLink}
guna ${code} → 50% off mana-mana plan`,
    },
    {
      tag: 'Viral',
      tagColor: '#F59E0B',
      title: 'Before / After',
      platform: 'Threads · TikTok',
      content: `before Cotton Candy:
❌ tulis nota sendiri
❌ terlepas info penting
❌ habis kuliah penat gila

after Cotton Candy:
✅ rakam je
✅ AI buat nota
✅ boleh fokus dengar

50% off → code ${code}
${link}`,
    },
    {
      tag: 'Soft Sell',
      tagColor: '#10B981',
      title: 'Genuine rec',
      platform: 'WhatsApp Status · Story',
      content: `aku tak selalu recommend apps tapi yang ni lain sikit

Cotton Candy — rakam kuliah, dapat nota AI. dah 2 minggu guna, serious jimat masa study. ada export PDF, ada mind map auto.

kalau nak cuba → ${link}
code ${code} untuk 50% off (valid semua plan)`,
    },
    {
      tag: 'One-liner',
      tagColor: '#8B5CF6',
      title: 'Short & punchy',
      platform: 'Instagram caption · Bio link',
      content: `nota kuliah dalam saat. bukan tipu.

🍬 Cotton Candy — record → AI notes → PDF
${link}

code ${code} → 50% off`,
    },
    {
      tag: 'Story',
      tagColor: '#EC4899',
      title: 'Personal story',
      platform: 'Instagram Story text · Threads',
      content: `okay cerita sikit —

sem ni aku amik 5 subjek. nota memang tak kejar dah. then kawan suggest Cotton Candy.

sekarang aku just rakam je semua kuliah. app buat semua kerja — transcript, nota, export PDF. AI pilihan ada Gemini, Claude, GPT.

kalau kau pun overwhelmed → try la
${fullLink}
code ${code} → 50% off`,
    },
  ]
}

// ─── Generate dark-professional promo card ────────────────────────────────────
async function generatePromoCard(promoCode: string): Promise<string> {
  const W = 1080
  const H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#0A0A10'
  ctx.fillRect(0, 0, W, H)

  for (let y = 0; y < H; y += 3) {
    ctx.fillStyle = 'rgba(255,255,255,0.012)'
    ctx.fillRect(0, y, W, 1)
  }

  const glowTeal = ctx.createRadialGradient(900, 140, 0, 900, 140, 420)
  glowTeal.addColorStop(0, 'rgba(0,210,160,0.13)')
  glowTeal.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glowTeal
  ctx.fillRect(0, 0, W, H)

  const glowPurple = ctx.createRadialGradient(120, 900, 0, 120, 900, 380)
  glowPurple.addColorStop(0, 'rgba(168,85,247,0.14)')
  glowPurple.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = glowPurple
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(255,255,255,0.025)'
  ctx.lineWidth = 0.5
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  const pillBg = ctx.createLinearGradient(72, 60, 72 + 220, 60)
  pillBg.addColorStop(0, 'rgba(255,255,255,0.07)')
  pillBg.addColorStop(1, 'rgba(255,255,255,0.03)')
  ctx.fillStyle = pillBg
  roundRect(ctx, 72, 56, 220, 48, 14)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'
  ctx.lineWidth = 0.75
  roundRect(ctx, 72, 56, 220, 48, 14)
  ctx.stroke()

  const logoSize = 36
  const logoX = 82
  const logoY = 62
  const logoBg = ctx.createLinearGradient(logoX, logoY, logoX + logoSize, logoY + logoSize)
  logoBg.addColorStop(0, '#FF6B9D')
  logoBg.addColorStop(1, '#C471F5')
  ctx.fillStyle = logoBg
  roundRect(ctx, logoX, logoY, logoSize, logoSize, 9)
  ctx.fill()

  ctx.font = '700 18px -apple-system, "SF Pro Display", Helvetica, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.textAlign = 'center'
  ctx.fillText('cc', logoX + logoSize / 2, logoY + 24)
  ctx.textAlign = 'left'

  ctx.font = '500 18px -apple-system, Helvetica, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.88)'
  ctx.fillText('Cotton Candy', 127, 86)

  ctx.font = '400 13px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.28)'
  ctx.textAlign = 'right'
  ctx.fillText('AMBASSADOR', W - 72, 86)
  ctx.textAlign = 'left'

  ctx.font = '700 11px monospace'
  ctx.fillStyle = 'rgba(0,210,160,0.75)'
  ctx.fillText('// EXCLUSIVE OFFER', 72, 164)

  ctx.strokeStyle = 'rgba(0,210,160,0.2)'
  ctx.lineWidth = 0.75
  ctx.beginPath(); ctx.moveTo(72, 172); ctx.lineTo(340, 172); ctx.stroke()

  ctx.font = '800 96px -apple-system, "SF Pro Display", Helvetica, sans-serif'
  ctx.fillStyle = '#FFFFFF'
  ctx.fillText('Get', 72, 280)

  const grad1 = ctx.createLinearGradient(72, 260, 72 + 520, 260)
  grad1.addColorStop(0, '#00D2A0')
  grad1.addColorStop(0.5, '#A855F7')
  grad1.addColorStop(1, '#F472B6')
  ctx.font = '800 96px -apple-system, "SF Pro Display", Helvetica, sans-serif'
  ctx.fillStyle = grad1
  ctx.fillText('50% OFF', 72, 380)

  ctx.font = '700 72px -apple-system, "SF Pro Display", Helvetica, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.90)'
  ctx.fillText('any paid plan.', 72, 466)

  ctx.font = '400 18px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.fillText('AI Lecture Recorder  ·  Malaysian Students', 72, 510)

  const cardX = 72, cardY = 540, cardW = W - 144, cardH = 172
  ctx.fillStyle = 'rgba(255,255,255,0.045)'
  roundRect(ctx, cardX, cardY, cardW, cardH, 16)
  ctx.fill()
  ctx.strokeStyle = 'rgba(255,255,255,0.09)'
  ctx.lineWidth = 0.75
  roundRect(ctx, cardX, cardY, cardW, cardH, 16)
  ctx.stroke()

  ctx.font = '600 11px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.32)'
  ctx.fillText('WHAT IS COTTON CANDY?', cardX + 28, cardY + 36)

  ctx.strokeStyle = 'rgba(255,255,255,0.07)'
  ctx.lineWidth = 0.5
  ctx.beginPath(); ctx.moveTo(cardX + 28, cardY + 48); ctx.lineTo(cardX + cardW - 28, cardY + 48); ctx.stroke()

  const features = [
    { icon: '🎙', title: 'Record any lecture', desc: 'Live transcript as you speak' },
    { icon: '🤖', title: 'AI summarises it', desc: 'Topics, key points & formulas' },
    { icon: '📄', title: 'Export PDF notes', desc: 'Done in seconds, share instantly' },
  ]
  const featureColW = cardW / 3
  features.forEach((f, i) => {
    const fx = cardX + i * featureColW + 28
    ctx.font = '22px serif'
    ctx.textAlign = 'left'
    ctx.fillText(f.icon, fx, cardY + 82)

    const featGrad = ctx.createLinearGradient(fx, 0, fx + 200, 0)
    featGrad.addColorStop(0, '#00D2A0')
    featGrad.addColorStop(1, '#A855F7')
    ctx.font = '700 15px -apple-system, "SF Pro Display", Helvetica, sans-serif'
    ctx.fillStyle = featGrad
    ctx.fillText(f.title, fx, cardY + 112)

    ctx.font = '400 12px -apple-system, Helvetica, sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.42)'
    ctx.fillText(f.desc, fx, cardY + 132)

    if (i < 2) {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(cardX + (i + 1) * featureColW, cardY + 56)
      ctx.lineTo(cardX + (i + 1) * featureColW, cardY + cardH - 16)
      ctx.stroke()
    }
  })
  ctx.textAlign = 'left'

  const pcY = 748
  const pcBg = ctx.createLinearGradient(72, pcY, W - 72, pcY)
  pcBg.addColorStop(0, 'rgba(168,85,247,0.18)')
  pcBg.addColorStop(0.5, 'rgba(200,100,255,0.22)')
  pcBg.addColorStop(1, 'rgba(244,114,182,0.16)')
  ctx.fillStyle = pcBg
  roundRect(ctx, 72, pcY, W - 144, 128, 18)
  ctx.fill()
  ctx.strokeStyle = 'rgba(200,100,255,0.55)'
  ctx.lineWidth = 1
  roundRect(ctx, 72, pcY, W - 144, 128, 18)
  ctx.stroke()

  ctx.font = '800 13px monospace'
  ctx.fillStyle = '#00D2A0'
  ctx.textAlign = 'center'
  ctx.fillText('▸  USE CODE  ◂', W / 2, pcY + 38)

  ctx.font = `900 72px -apple-system, "SF Pro Display", Helvetica, sans-serif`
  ctx.fillStyle = '#FFFFFF'
  ctx.shadowColor = 'rgba(200,100,255,0.6)'
  ctx.shadowBlur = 32
  ctx.fillText(promoCode, W / 2, pcY + 105)
  ctx.shadowBlur = 0
  ctx.textAlign = 'left'

  const bottomY = H - 52
  const qrSize = 90
  const qrX = W - 72 - qrSize
  const qrY = bottomY - qrSize - 20

  ctx.fillStyle = '#FFFFFF'
  roundRect(ctx, qrX - 6, qrY - 6, qrSize + 12, qrSize + 18, 8)
  ctx.fill()

  const qrCanvas = document.createElement('canvas')
  await QRCode.toCanvas(qrCanvas, 'https://cottoncandy-s.com', {
    width: qrSize,
    margin: 1,
    color: { dark: '#0A0A10', light: '#FFFFFF' },
  })
  ctx.drawImage(qrCanvas, qrX, qrY)

  ctx.font = '500 9px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  ctx.textAlign = 'center'
  ctx.fillText('SCAN ME', qrX + qrSize / 2, qrY + qrSize + 14)
  ctx.textAlign = 'left'

  ctx.font = '400 16px monospace'
  ctx.fillStyle = 'rgba(255,255,255,0.30)'
  ctx.fillText('cottoncandy-s.com', 72, bottomY - 36)

  const tagGrad = ctx.createLinearGradient(72, 0, 500, 0)
  tagGrad.addColorStop(0, '#00D2A0')
  tagGrad.addColorStop(1, '#F472B6')
  ctx.font = '600 13px monospace'
  ctx.fillStyle = tagGrad
  ctx.fillText('Record  ·  Transcribe  ·  Summarise', 72, bottomY - 16)

  ctx.strokeStyle = 'rgba(255,255,255,0.06)'
  ctx.lineWidth = 0.75
  ctx.beginPath(); ctx.moveTo(72, bottomY - 52); ctx.lineTo(W - 72, bottomY - 52); ctx.stroke()

  return canvas.toDataURL('image/png')
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

// ─── IPT email domain check ───────────────────────────────────────────────────
// Catches *.edu.my and common Malaysian IPT domains
const IPT_DOMAINS = ['.edu.my', '.uitm.edu.my', '.um.edu.my', '.utm.edu.my', '.upm.edu.my', '.usm.edu.my', '.ukm.edu.my', '.uiam.edu.my', '.unimas.edu.my', '.uum.edu.my', '.umt.edu.my', '.upsi.edu.my', '.uthm.edu.my', '.unimap.edu.my', '.uni.edu.my', '.unikl.edu.my', '.mmu.edu.my', '.taylor.edu.my', '.sunway.edu.my', '.help.edu.my', '.apu.edu.my']

function isIptEmail(email: string): boolean {
  const lower = email.toLowerCase().trim()
  if (!lower.includes('@')) return false
  const domain = lower.split('@')[1] || ''
  return IPT_DOMAINS.some(d => domain === d.replace(/^\./, '') || domain.endsWith(d))
}

export default function AmbassadorDashboard() {
  const { lang } = useLang()
  const { tokens: s } = useTheme()
  const [data, setData] = useState<AmbassadorData | null>(null)
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState(false)
  const [copied, setCopied] = useState(false)
  const [btnError, setBtnError] = useState(false)
  const [showErrBanner, setShowErrBanner] = useState(false)
  const [showPlansLink, setShowPlansLink] = useState(false)
  const [promoCardUrl, setPromoCardUrl] = useState<string | null>(null)
  const [generatingCard, setGeneratingCard] = useState(false)
  const [shareKitOpen, setShareKitOpen] = useState(false)
  const [copiedTemplate, setCopiedTemplate] = useState<number | null>(null)
  // ── Withdrawal state ──
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [showWithdrawModal, setShowWithdrawModal] = useState(false)
  const [withdrawForm, setWithdrawForm] = useState({ bank_name: '', account_number: '', account_name: '' })
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false)
  const [withdrawDone, setWithdrawDone] = useState(false)

  // ── Verify slot state ──
  const [verifyMode, setVerifyMode] = useState<'ipt' | 'creator' | null>(null)
  const [iptEmail, setIptEmail] = useState('')
  const [iptVerified, setIptVerified] = useState(false)
  const [creatorPlatform, setCreatorPlatform] = useState('instagram')
  const [creatorLink, setCreatorLink] = useState('')
  const [creatorFollowers, setCreatorFollowers] = useState('')

  const errTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const bm = lang === 'bm'

  const MIN_FOLLOWERS = 10000
  const creatorFollowerNum = parseInt(creatorFollowers.replace(/[^0-9]/g, ''), 10) || 0
  const creatorLinkFilled = creatorLink.trim().length > 5
  const creatorVerified = creatorLinkFilled && creatorFollowerNum >= MIN_FOLLOWERS

  const isVerified = (verifyMode === 'ipt' && iptVerified) || (verifyMode === 'creator' && creatorVerified)

  useEffect(() => {
    const id = 'amb-reg-styles'
    if (!document.getElementById(id)) {
      const el = document.createElement('style')
      el.id = id
      el.textContent = AMBASSADOR_STYLES
      document.head.appendChild(el)
    }
    return () => {
      if (errTimerRef.current) clearTimeout(errTimerRef.current)
    }
  }, [])

  useEffect(() => { load() }, [])

  // Live-check IPT email as user types
  useEffect(() => {
    setIptVerified(isIptEmail(iptEmail))
  }, [iptEmail])

  async function load() {
    setLoading(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return

      const { data: prof } = await sb
        .from('profiles')
        .select('ambassador_promo_code, ambassador_commission_total, ambassador_user_count, plan, plan_expires_at')
        .eq('id', user.id)
        .maybeSingle()

      const eligiblePlans = ['student_pro', 'month', 'year']
      const now = new Date().toISOString()
      const hasActivePlan =
        eligiblePlans.includes(prof?.plan) &&
        prof?.plan_expires_at &&
        prof.plan_expires_at > now

      setData({
        promo_code: prof?.ambassador_promo_code || null,
        commission_total: prof?.ambassador_commission_total || 0,
        user_count: prof?.ambassador_user_count || 0,
        is_ambassador: !!(prof?.ambassador_promo_code),
        has_active_plan: !!hasActivePlan,
      })

      if (prof?.ambassador_promo_code) {
        const { data: comms } = await sb
          .from('ambassador_commissions')
          .select('id, amount_paid_myr, commission_myr, created_at')
          .eq('ambassador_user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        setCommissions(comms || [])

        const { data: lb } = await sb
          .from('ambassador_leaderboard')
          .select('*')
          .limit(10)
        setLeaderboard(lb || [])
        const { data: wd } = await sb
          .from('ambassador_withdrawals')
          .select('id, amount_myr, bank_name, account_number, account_name, status, requested_at')
          .eq('ambassador_user_id', user.id)
          .order('requested_at', { ascending: false })
          .limit(10)
        setWithdrawals(wd || [])
      }
    } finally {
      setLoading(false)
    }
  }

  async function registerAsAmbassador() {
    if (!data?.has_active_plan) {
      setBtnError(false)
      setShowErrBanner(false)
      setShowPlansLink(false)
      requestAnimationFrame(() => {
        setBtnError(true)
        setShowErrBanner(true)
        setShowPlansLink(true)
        if (errTimerRef.current) clearTimeout(errTimerRef.current)
        errTimerRef.current = setTimeout(() => setBtnError(false), 2200)
      })
      return
    }

    // Guard: must have completed verification
    if (!isVerified) {
      // Shake the verify slot to prompt user
      const slot = document.getElementById('amb-verify-slot')
      if (slot) {
        slot.style.animation = 'none'
        void slot.offsetWidth
        slot.style.animation = 'amb-shake 0.45s cubic-bezier(0.22,1,0.36,1)'
        setTimeout(() => { slot.style.animation = '' }, 500)
      }
      return
    }

    setRegistering(true)
    try {
      const body: Record<string, unknown> = {}
      if (verifyMode === 'creator') {
        body.verify_type = 'creator'
        body.creator_platform = creatorPlatform
        body.creator_link = creatorLink.trim()
        body.creator_followers = creatorFollowerNum
      } else {
        body.verify_type = 'ipt'
        body.ipt_email = iptEmail.trim()
      }
      const res = await fetch('/api/ambassador/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) await load()
    } finally {
      setRegistering(false)
    }
  }

  function copyCode() {
    if (!data?.promo_code) return
    navigator.clipboard.writeText(data.promo_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyTemplate(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopiedTemplate(idx)
    setTimeout(() => setCopiedTemplate(null), 2200)
  }
  async function submitWithdrawal() {
    if (!withdrawForm.bank_name.trim() || !withdrawForm.account_number.trim() || !withdrawForm.account_name.trim()) return
    if ((data?.commission_total || 0) < 10) return
    setWithdrawSubmitting(true)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      const { error } = await sb.from('ambassador_withdrawals').insert({
        ambassador_user_id: user.id,
        amount_myr: data!.commission_total,
        bank_name: withdrawForm.bank_name.trim(),
        account_number: withdrawForm.account_number.trim(),
        account_name: withdrawForm.account_name.trim(),
      })
      if (!error) {
        setWithdrawDone(true)
        setWithdrawForm({ bank_name: '', account_number: '', account_name: '' })
        await load()
        setTimeout(() => { setShowWithdrawModal(false); setWithdrawDone(false) }, 2200)
      }
    } finally {
      setWithdrawSubmitting(false)
    }
  }

  async function handleGenerateCard() {
    if (!data?.promo_code) return
    setGeneratingCard(true)
    try {
      const url = await generatePromoCard(data.promo_code)
      setPromoCardUrl(url)
    } finally {
      setGeneratingCard(false)
    }
  }

  function downloadCard() {
    if (!promoCardUrl || !data?.promo_code) return
    const a = document.createElement('a')
    a.href = promoCardUrl
    a.download = `cottoncandy-${data.promo_code.toLowerCase()}.png`
    a.click()
  }

  const macbookProgress = Math.min((data?.user_count || 0) / MACBOOK_TARGET * 100, 100)
  const myRank = leaderboard.findIndex(e => e.promo_code === data?.promo_code) + 1

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${s.primary}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  // ─── REGISTRATION CARD ────────────────────────────────────────────────────
  if (!data?.is_ambassador) {
    const hasPlan = !!data?.has_active_plan
   const btnClass = [
  'amb-cta-btn',
  btnError ? 'amb-btn-error' : '',
  registering ? 'amb-btn-loading' : '',
].filter(Boolean).join(' ')

    const btnLabel = registering
      ? (bm ? 'Mendaftar…' : 'Registering…')
      : btnError
        ? (bm ? 'Plan aktif diperlukan' : 'Active plan required')
        : (bm ? 'Daftar sebagai ambassador' : 'Register as ambassador')

    // Email input badge
    const emailTouched = iptEmail.trim().length > 0
    const showIptBadge = verifyMode === 'ipt' && emailTouched
    const iptBadgeClass = iptVerified ? 'amb-verify-badge amb-badge-ipt' : 'amb-verify-badge amb-badge-invalid'
    const iptBadgeText = iptVerified
      ? (bm ? '✓ Email IPT disahkan' : '✓ IPT student verified')
      : (bm ? 'Email IPT tidak dikenali — cuba semak semula' : 'IPT email not recognised — please double-check')

    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 0' }}>
        <div className="amb-card" style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', textAlign: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: "#111 url('/ambassador-reg-bg.jpg') center top / cover no-repeat", zIndex: 0 }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.58)', zIndex: 1 }} />
          <div style={{ position: 'relative', zIndex: 2, padding: '44px 36px 36px' }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#E8873A', fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
              {bm ? 'Program Ambassador Kampus' : 'Campus ambassador program'}
            </p>
            <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.15, color: '#fff', fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
              {bm ? <>Jadi Ambassador<br />CottonCandy</> : <>Become a CottonCandy<br />ambassador</>}
            </h2>
            <p style={{ margin: '0 auto 32px', maxWidth: 380, fontSize: 14, fontWeight: 300, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
              {bm
                ? 'Kongsi kod promo unik kau. Dapat komisen 1% setiap kali kawan kau subscribe. Menang leaderboard + 200 users = MacBook.'
                : 'Share your unique promo code. Earn 1% commission every time someone subscribes. Top leaderboard at 200 users wins a MacBook.'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 24 }}>
              <div className="amb-perk-card">
                <div style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 14l2 2 4-4" /><path d="M3 6h18M3 12h18M3 18h18" /><path d="M12 3a9 9 0 1 0 0 18A9 9 0 0 0 12 3z" /></svg>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', marginBottom: 3, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>50% off</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>{bm ? 'untuk setiap kawan' : 'for every friend'}</div>
              </div>
              <div className="amb-perk-card">
                <div style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M14.8 9A2 2 0 0 0 13 8h-2a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4h-2a2 2 0 0 1-1.8-1M12 7v1m0 8v1" /></svg>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', marginBottom: 3, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>{bm ? 'Komisen 1%' : '1% commission'}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>{bm ? 'setiap sale' : 'per sale'}</div>
              </div>
              <div className="amb-perk-card">
                <div style={{ color: 'rgba(255,255,255,0.9)', marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 20h8M12 18v2" /></svg>
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', marginBottom: 3, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>MacBook</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>#1 + 200 users</div>
              </div>
            </div>
            <div className="amb-elig-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={hasPlan ? 'rgba(100,220,130,0.85)' : 'rgba(255,200,80,0.85)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {hasPlan ? (<><circle cx="12" cy="12" r="10" /><path d="M9 12l2 2 4-4" /></>) : (<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>)}
              </svg>
              <p style={{ margin: 0, fontSize: 12.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
                {hasPlan
                  ? (bm ? 'Plan aktif — kau layak daftar sebagai ambassador.' : 'Active plan detected — you are eligible to register.')
                  : (bm ? 'Perlu plan aktif (Student PRO / Monthly / Yearly) untuk jadi ambassador.' : 'Requires an active plan — Student PRO, Monthly, or Yearly — to register.')}
              </p>
            </div>

            {/* ── CTA button ── */}
            <div className="amb-cta-wrap">
              <button className={btnClass} onClick={registerAsAmbassador} disabled={registering}>{btnLabel}</button>
              <div className={`amb-error-banner${showErrBanner ? ' amb-show' : ''}`}>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'rgba(255,160,160,0.95)', fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>{bm ? 'Plan aktif diperlukan' : 'Active plan required'}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
                   {bm
                     ? 'Program ambassador eksklusif untuk ahli berbayar. Upgrade plan kau untuk akses.'
                     : 'Ambassador program is exclusive to paid members. Upgrade your plan to unlock access.'}
                </p>
                </div>
              {showPlansLink && (
                <a href="/pricing" className="amb-plans-link">
                  {bm ? 'Lihat plan' : 'View plans'}
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                </a>
              )}

              {/* ── VERIFY SLOT — appears below the register button ── */}
              <div className="amb-verify-slot" id="amb-verify-slot">
                <div className="amb-verify-inner">
                  <div className="amb-verify-label">
                    {bm ? 'Sahkan identiti kau' : 'Verify your identity'}
                  </div>

                  {/* Option 1: IPT student */}
                  <div
                    className={`amb-verify-option${verifyMode === 'ipt' ? ' amb-verify-active' : ''}`}
                    onClick={() => setVerifyMode(verifyMode === 'ipt' ? null : 'ipt')}
                    role="radio"
                    aria-checked={verifyMode === 'ipt'}
                  >
                    <div className="amb-verify-radio">
                      <div className="amb-verify-radio-dot" />
                    </div>
                    <div className="amb-verify-text-wrap">
                      <div className="amb-verify-title">
                        {bm ? 'Saya pelajar IPT/IPTS' : 'I am an IPT/IPTS student'}
                      </div>
                      <div className="amb-verify-desc">
                        {bm
                           ? 'Masukkan email universiti kau'
                           : 'Enter your university email'}
                      </div>

                      {/* Email input — shown when IPT selected */}
                      {verifyMode === 'ipt' && (
                        <div className="amb-verify-email-wrap" onClick={e => e.stopPropagation()}>
                          <input
                            className="amb-verify-email-input"
                            type="email"
                            placeholder={bm ? 'cth: nama@student.university.my' : 'e.g. name@student.university.my'}
                            value={iptEmail}
                            onChange={e => setIptEmail(e.target.value)}
                            autoFocus
                          />
                          {showIptBadge && (
                            <div className={iptBadgeClass}>
                              {iptVerified
                                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                              }
                              {iptBadgeText}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Option 2: Content Creator */}
                  <div
                    className={`amb-verify-option${verifyMode === 'creator' ? ' amb-verify-active' : ''}`}
                    onClick={() => setVerifyMode(verifyMode === 'creator' ? null : 'creator')}
                    role="radio"
                    aria-checked={verifyMode === 'creator'}
                  >
                    <div className="amb-verify-radio">
                      <div className="amb-verify-radio-dot" />
                    </div>
                    <div className="amb-verify-text-wrap">
                      <div className="amb-verify-title">
                       {bm ? 'Saya content creator' : 'I am a content creator'}
                      </div>
                      <div className="amb-verify-desc">
                        {bm
                          ? 'Instagram, TikTok, YouTube, Facebook, atau Threads'
                          : 'Instagram, TikTok, YouTube, Facebook, or Threads'}
                      </div>

                      {verifyMode === 'creator' && (
                        <div className="amb-verify-creator-wrap" onClick={e => e.stopPropagation()}>
                          {/* Platform + profile link row */}
                          <div className="amb-verify-creator-row">
                            <select
                              className="amb-verify-creator-select"
                              value={creatorPlatform}
                              onChange={e => setCreatorPlatform(e.target.value)}
                            >
                              <option value="instagram">Instagram</option>
                              <option value="tiktok">TikTok</option>
                              <option value="youtube">YouTube</option>
                              <option value="facebook">Facebook</option>
                              <option value="threads">Threads</option>
                            </select>
                            <input
                              className="amb-verify-email-input amb-creator-link-input"
                              style={{ flex: 1 }}
                              type="url"
                              placeholder={bm ? 'Link profil kau' : 'Your profile link'}
                              value={creatorLink}
                              onChange={e => setCreatorLink(e.target.value)}
                              autoFocus
                            />
                          </div>
                          {/* Follower count */}
                          <input
                            className="amb-verify-follower-input"
                            type="number"
                            min="0"
                            placeholder={bm ? 'Bilangan followers / subscribers' : 'Number of followers / subscribers'}
                            value={creatorFollowers}
                            onChange={e => setCreatorFollowers(e.target.value)}
                          />
                          {/* Status badge */}
                          {creatorFollowers.trim().length > 0 && creatorLinkFilled && (
                            <div className={`amb-verify-badge ${creatorVerified ? 'amb-badge-ipt' : 'amb-badge-warn'}`}>
                              {creatorVerified
                                ? <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                : <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                              }
                              {creatorVerified
                                ? (bm ? `✓ Layak — ${creatorFollowerNum.toLocaleString()} followers` : `✓ Eligible — ${creatorFollowerNum.toLocaleString()} followers`)
                                : (bm ? 'Bilangan tidak mencukupi untuk layak' : 'Follower count not sufficient to qualify')}
                            </div>
                          )}
                          {creatorFollowers.trim().length > 0 && !creatorLinkFilled && (
                            <div className="amb-verify-badge amb-badge-warn">
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                              {bm ? 'Link profil diperlukan' : 'Profile link is required'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* ── END VERIFY SLOT ── */}

            </div>
          </div>
        </div>
      </div>
    )
  }
// ─── PLAN EXPIRED — show warning instead of dashboard ────────────────────
if (data.is_ambassador && !data.has_active_plan) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '48px 0' }}>
      <div className="amb-card" style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ position: 'absolute', inset: 0, background: "#111 url('/ambassador-reg-bg.jpg') center top / cover no-repeat", zIndex: 0 }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1 }} />
        <div style={{ position: 'relative', zIndex: 2, padding: '44px 36px 36px' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(220,80,80,0.18)', border: '0.5px solid rgba(220,80,80,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,120,120,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#E8873A', fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
            {bm ? 'Status Ambassador' : 'Ambassador Status'}
          </p>
          <h2 style={{ margin: '0 0 12px', fontSize: 24, fontWeight: 600, letterSpacing: '-0.025em', lineHeight: 1.2, color: '#fff', fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
            {bm ? 'Plan kau dah tamat' : 'Your plan has expired'}
          </h2>
          <p style={{ margin: '0 auto 32px', maxWidth: 360, fontSize: 14, fontWeight: 300, color: 'rgba(255,255,255,0.6)', lineHeight: 1.65, fontFamily: "-apple-system,'Helvetica Neue',sans-serif" }}>
            {bm
              ? <>Kod promo kau <span style={{ color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}>{data.promo_code}</span> masih wujud. Renew plan kau untuk kekalkan status ambassador dan terus dapat komisen.</>
              : <>Your promo code <span style={{ color: '#fff', fontWeight: 600, fontFamily: 'monospace' }}>{data.promo_code}</span> still exists. Renew your plan to keep your ambassador status and continue earning commissions.</>}
          </p>
          <a href="/pricing" style={{
            display: 'inline-block', padding: '13px 32px', borderRadius: 12,
            background: '#fff', color: '#1d1d1f',
            fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em',
            textDecoration: 'none', fontFamily: "-apple-system,'Helvetica Neue',sans-serif",
          }}>
            {bm ? 'Renew plan' : 'Renew plan'}
          </a>
        </div>
      </div>
    </div>
  )
}

  // ─── AMBASSADOR DASHBOARD ─────────────────────────────────────────────────
  const templates = getTemplates(data.promo_code!)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>
          🍬 {bm ? 'Dashboard Ambassador' : 'Ambassador Dashboard'}
        </h1>
        <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.5)' }}>
          {bm ? 'Jejak komisen dan prestasi kod promosi kau.' : 'Track your commissions and promo code performance.'}
        </div>
      </div>

      {/* Promo code card */}
      <div style={{ background: '#fff', border: `1.5px solid ${s.border}`, borderRadius: 14, padding: '20px 20px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>
            {bm ? 'Kod promosi kau' : 'Your promo code'}
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: '0.04em', color: '#1d1d1f', fontFamily: 'monospace' }}>
            {data.promo_code}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)', marginTop: 4 }}>
            {bm ? 'Bagi kod ni — kawan dapat 50% off' : 'Share this — friends get 50% off'}
          </div>
        </div>
        <button onClick={copyCode} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 9, background: copied ? '#e6f4eb' : s.soft, border: `0.5px solid ${copied ? '#7AB883' : s.border}`, color: copied ? '#2d6a40' : '#1d1d1f', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
          {copied ? '✓' : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
          )}
          {copied ? (bm ? 'Disalin!' : 'Copied!') : (bm ? 'Salin kod' : 'Copy code')}
        </button>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10, marginBottom: 14 }}>
        <StatCard label={bm ? 'Pengguna bulan ini' : 'Users this month'} value={data.user_count} sub={`/ ${MACBOOK_TARGET} ${bm ? 'untuk MacBook' : 'for MacBook'}`} />
        <StatCard label={bm ? 'Jumlah komisen' : 'Total commission'} value={`RM ${data.commission_total.toFixed(2)}`} sub={bm ? 'terkumpul' : 'earned'} />
        <StatCard label={bm ? 'Ranking bulan ini' : 'This month rank'} value={myRank > 0 ? `#${myRank}` : '—'} sub={bm ? 'dalam leaderboard' : 'on leaderboard'} />

        {/* Share Kit card */}
        <div
          onClick={() => setShareKitOpen(o => !o)}
          style={{
            background: shareKitOpen ? 'linear-gradient(135deg, #fff5f8, #f5f0ff)' : '#fff',
            border: `0.5px solid ${shareKitOpen ? 'rgba(196,113,245,0.3)' : 'rgba(0,0,0,0.06)'}`,
            borderRadius: 12, padding: '14px 16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(29,29,31,0.55)', marginBottom: 6 }}>
            {bm ? 'Alat Kongsi' : 'Share Kit'}
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.025em', lineHeight: 1 }}>
            {shareKitOpen ? '▲' : '▼'}
          </div>
          <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', marginTop: 4 }}>
            {shareKitOpen ? (bm ? 'Tutup' : 'Close') : (bm ? 'Promo card + konten' : 'Promo card + content')}
          </div>
        </div>
      </div>

      {/* Share Kit expanded */}
      {shareKitOpen && (
        <div style={{
          background: '#fff',
          border: '0.5px solid rgba(0,0,0,0.07)',
          borderRadius: 14,
          padding: '24px 24px',
          marginBottom: 14,
          animation: 'amb-fadeSlideUp 0.35s cubic-bezier(0.22,1,0.36,1) both',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 20 }}>
            🎨 {bm ? 'Alat Kongsi' : 'Share Kit'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

            {/* LEFT: Promo card generator */}
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 4, letterSpacing: '-0.01em' }}>
                📸 {bm ? 'Promo Card kau' : 'Your Promo Card'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)', marginBottom: 14, lineHeight: 1.5 }}>
                {bm
                  ? `Auto-generate gambar 1080×1080 dengan kod ${data.promo_code} kau. Share terus ke Instagram, WhatsApp, TikTok.`
                  : `Auto-generates a 1080×1080 image with your ${data.promo_code} code. Share directly to Instagram, WhatsApp, TikTok.`}
              </div>

              {promoCardUrl ? (
                <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', marginBottom: 12, aspectRatio: '1/1' }}>
                  <img src={promoCardUrl} alt="Promo card" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </div>
              ) : (
                <div style={{
                  aspectRatio: '1/1',
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(0,200,160,0.08), rgba(168,85,247,0.08), rgba(244,114,182,0.08))',
                  border: '1px dashed rgba(168,85,247,0.25)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 8, marginBottom: 12,
                  color: 'rgba(29,29,31,0.35)',
                  fontSize: 12,
                }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.4 }}>
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  {bm ? 'Preview akan muncul di sini' : 'Preview appears here'}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  className="amb-sharekit-btn"
                  onClick={handleGenerateCard}
                  disabled={generatingCard}
                  style={{
                    background: generatingCard ? 'rgba(0,0,0,0.05)' : 'linear-gradient(135deg, #0A0A10, #1a0a2e)',
                    color: generatingCard ? 'rgba(29,29,31,0.4)' : '#fff',
                    border: '0.5px solid rgba(168,85,247,0.4)',
                    flex: 1,
                  }}
                >
                  {generatingCard ? (
                    <><span style={{ width: 12, height: 12, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} />{bm ? 'Menjana…' : 'Generating…'}</>
                  ) : (
                    <>{promoCardUrl ? (bm ? '↺ Jana semula' : '↺ Regenerate') : (bm ? '✦ Jana kad promo' : '✦ Generate promo card')}</>
                  )}
                </button>
                {promoCardUrl && (
                  <button
                    className="amb-sharekit-btn"
                    onClick={downloadCard}
                    style={{ background: '#f0f0f2', color: '#1d1d1f' }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {bm ? 'Download PNG' : 'Download PNG'}
                  </button>
                )}
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            </div>

            {/* RIGHT: Content templates */}
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f', marginBottom: 4, letterSpacing: '-0.01em' }}>
                ✍️ {bm ? 'Template Konten Siap Copy' : 'Ready-to-Copy Content Templates'}
              </div>
              <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)', marginBottom: 14, lineHeight: 1.5 }}>
                {bm
                  ? `10 caption dah siap tulis — dah ada kod ${data.promo_code} kau. Copy terus ke Threads, IG, WhatsApp, TikTok.`
                  : `10 captions pre-written with your ${data.promo_code} code inside. Copy straight to Threads, IG, WhatsApp, TikTok.`}
              </div>

              {/* Scrollable template list */}
              <div
                className="amb-tpl-scroll"
                style={{
                  display: 'flex', flexDirection: 'column', gap: 8,
                  maxHeight: 460, overflowY: 'auto', paddingRight: 4,
                }}
              >
                {templates.map((tpl, i) => (
                  <div
                    key={i}
                    className="amb-tpl-card"
                    style={{ animation: `amb-fadeSlideUp 0.35s ${i * 0.04}s cubic-bezier(0.22,1,0.36,1) both` }}
                  >
                    {/* Header row: tag + title + copy button */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7, gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden' }}>
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
                          textTransform: 'uppercase',
                          background: `${tpl.tagColor}18`,
                          color: tpl.tagColor,
                          border: `0.5px solid ${tpl.tagColor}40`,
                          borderRadius: 5, padding: '2px 6px',
                          whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          {tpl.tag}
                        </span>
                        <span style={{
                          fontSize: 12, fontWeight: 600, color: '#1d1d1f',
                          letterSpacing: '-0.01em',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {tpl.title}
                        </span>
                      </div>
                      <button
                        onClick={() => copyTemplate(tpl.content, i)}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          padding: '4px 10px', borderRadius: 6,
                          fontSize: 11, fontWeight: 600, flexShrink: 0,
                          border: `0.5px solid ${copiedTemplate === i ? '#7AB883' : 'rgba(0,0,0,0.12)'}`,
                          background: copiedTemplate === i ? '#e6f4eb' : '#fff',
                          color: copiedTemplate === i ? '#2d6a40' : '#1d1d1f',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        {copiedTemplate === i ? (
                          <>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                            {bm ? 'Disalin!' : 'Copied!'}
                          </>
                        ) : (
                          <>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            Copy
                          </>
                        )}
                      </button>
                    </div>

                    {/* Platform badge */}
                    <div style={{ fontSize: 10, color: 'rgba(29,29,31,0.32)', marginBottom: 8, letterSpacing: '0.01em' }}>
                      📍 {tpl.platform}
                    </div>

                    {/* Content preview — fade bottom */}
                    <div style={{
                      fontSize: 11.5, color: 'rgba(29,29,31,0.62)',
                      lineHeight: 1.65, whiteSpace: 'pre-line',
                      maxHeight: 82, overflow: 'hidden',
                      maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
                      WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
                      fontFamily: "-apple-system,'Helvetica Neue',sans-serif",
                    }}>
                      {tpl.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Withdrawal section */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
              💸 {bm ? 'Pengeluaran Komisen' : 'Commission Withdrawal'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.025em', lineHeight: 1 }}>
              RM {(data?.commission_total || 0).toFixed(2)}
            </div>
            <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.45)', marginTop: 4 }}>
              {bm ? 'Minimum pengeluaran: RM10.00' : 'Minimum withdrawal: RM10.00'}
            </div>
          </div>
          <button
            onClick={() => setShowWithdrawModal(o => !o)}
            disabled={(data?.commission_total || 0) < 10}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 9,
              fontSize: 13, fontWeight: 600, cursor: (data?.commission_total || 0) < 10 ? 'not-allowed' : 'pointer',
              border: '0.5px solid rgba(0,0,0,0.12)',
              background: (data?.commission_total || 0) < 10 ? 'rgba(0,0,0,0.04)' : '#1d1d1f',
              color: (data?.commission_total || 0) < 10 ? 'rgba(29,29,31,0.3)' : '#fff',
              transition: 'all 0.18s ease',
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            {bm ? 'Isi Akaun Bank' : 'Fill Bank Account'}
          </button>
        </div>

        {/* Inline bank form */}
        {showWithdrawModal && (data?.commission_total || 0) >= 10 && (
          <div style={{
            background: 'rgba(0,0,0,0.025)', border: '0.5px solid rgba(0,0,0,0.08)',
            borderRadius: 12, padding: '18px 18px', marginBottom: 14,
            animation: 'amb-fadeSlideUp 0.3s cubic-bezier(0.22,1,0.36,1) both',
          }}>
            {withdrawDone ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e6f4eb', border: '0.5px solid #7AB883', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2d6a40" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#2d6a40' }}>{bm ? 'Permohonan dihantar!' : 'Request submitted!'}</div>
                  <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.5)' }}>{bm ? 'Admin akan proses dalam 1–3 hari bekerja.' : 'Admin will process within 1–3 working days.'}</div>
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
                  {bm ? 'Maklumat Akaun Bank' : 'Bank Account Details'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'bank_name', label: bm ? 'Nama Bank' : 'Bank Name', placeholder: bm ? 'cth: Maybank, CIMB, RHB…' : 'e.g. Maybank, CIMB, RHB…' },
                    { key: 'account_number', label: bm ? 'No. Akaun' : 'Account Number', placeholder: '1234567890' },
                    { key: 'account_name', label: bm ? 'Nama Akaun' : 'Account Name', placeholder: bm ? 'Nama penuh seperti dalam buku bank' : 'Full name as in bank book' },
                  ].map(field => (
                    <div key={field.key}>
                      <div style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(29,29,31,0.55)', marginBottom: 5 }}>{field.label}</div>
                      <input
                        type="text"
                        placeholder={field.placeholder}
                        value={withdrawForm[field.key as keyof typeof withdrawForm]}
                        onChange={e => setWithdrawForm(f => ({ ...f, [field.key]: e.target.value }))}
                        style={{
                          width: '100%', boxSizing: 'border-box',
                          padding: '9px 12px', borderRadius: 8,
                          border: '0.5px solid rgba(0,0,0,0.14)',
                          background: '#fff', fontSize: 13, color: '#1d1d1f',
                          outline: 'none', fontFamily: "-apple-system,'Helvetica Neue',sans-serif",
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                  <button
                    onClick={submitWithdrawal}
                    disabled={withdrawSubmitting || !withdrawForm.bank_name.trim() || !withdrawForm.account_number.trim() || !withdrawForm.account_name.trim()}
                    style={{
                      flex: 1, padding: '10px 16px', borderRadius: 9,
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      border: 'none',
                      background: withdrawSubmitting ? 'rgba(0,0,0,0.08)' : '#1d1d1f',
                      color: withdrawSubmitting ? 'rgba(29,29,31,0.35)' : '#fff',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    {withdrawSubmitting ? (bm ? 'Menghantar…' : 'Submitting…') : (bm ? 'Hantar Permohonan' : 'Submit Request')}
                  </button>
                  <button
                    onClick={() => setShowWithdrawModal(false)}
                    style={{
                      padding: '10px 16px', borderRadius: 9,
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      border: '0.5px solid rgba(0,0,0,0.12)',
                      background: '#fff', color: 'rgba(29,29,31,0.6)',
                    }}
                  >
                    {bm ? 'Batal' : 'Cancel'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Withdrawal history */}
        {withdrawals.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>
              {bm ? 'Sejarah Pengeluaran' : 'Withdrawal History'}
            </div>
            {withdrawals.map((w, i) => (
              <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.05)' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1d1d1f' }}>
                    RM {w.amount_myr.toFixed(2)} — {w.bank_name} {w.account_number}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)' }}>
                    {new Date(w.requested_at).toLocaleDateString(bm ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                  background: w.status === 'transferred' ? '#e6f4eb' : w.status === 'approved' ? '#e8f0fe' : 'rgba(240,160,40,0.12)',
                  color: w.status === 'transferred' ? '#2d6a40' : w.status === 'approved' ? '#1a56db' : '#b45309',
                  border: `0.5px solid ${w.status === 'transferred' ? '#7AB883' : w.status === 'approved' ? '#93b4f5' : 'rgba(240,160,40,0.4)'}`,
                }}>
                  {w.status === 'transferred' ? (bm ? '✓ Ditransfer' : '✓ Transferred') : w.status === 'approved' ? (bm ? '✓ Diluluskan' : '✓ Approved') : (bm ? '⏳ Pending' : '⏳ Pending')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MacBook progress */}
      <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '18px 20px', marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 6 }}>
            💻 {bm ? 'Progress MacBook' : 'MacBook Progress'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.5)' }}>
            {data.user_count} / {MACBOOK_TARGET} {bm ? 'pengguna' : 'users'}
          </div>
        </div>
        <div style={{ height: 10, background: '#f0f0f0', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 99, width: `${macbookProgress}%`, background: macbookProgress >= 100 ? 'linear-gradient(90deg, #7AB883, #4E9964)' : `linear-gradient(90deg, ${s.primary}, ${s.primaryDark})`, transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.45)', marginTop: 8 }}>
          {data.user_count >= MACBOOK_TARGET
            ? (bm ? '✓ Layak! Kena kekal #1 leaderboard hujung bulan untuk menang.' : '✓ Qualified! Stay #1 on the leaderboard by end of month to win.')
            : (bm
                ? `Perlu ${MACBOOK_TARGET - data.user_count} user lagi untuk layak — lepas tu siapa paling tinggi bulan ni menang MacBook`
                : `Need ${MACBOOK_TARGET - data.user_count} more users to qualify — then whoever's #1 at month end wins the MacBook`)}
        </div>
      </div>

      {/* Leaderboard + Commissions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            🏆 {bm ? 'Leaderboard bulan ini' : "This month's leaderboard"}
          </div>
          {leaderboard.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.4)', padding: '12px 0' }}>{bm ? 'Belum ada data.' : 'No data yet.'}</div>
          ) : leaderboard.map((entry, i) => {
            const isMe = entry.promo_code === data.promo_code
            return (
              <div key={entry.user_id} style={{ display: 'flex', alignItems: 'center', gap: 10, borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.05)', background: isMe ? s.soft : 'transparent', borderRadius: isMe ? 8 : 0, padding: isMe ? '9px 8px' : '9px 0', margin: isMe ? '2px -8px' : 0 }}>
                <div style={{ width: 22, textAlign: 'center', fontSize: i === 0 ? 16 : 12, fontWeight: 700, color: i === 0 ? '#E5B947' : i === 1 ? '#9E9E9E' : i === 2 ? '#CD7F32' : 'rgba(29,29,31,0.4)' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isMe ? 600 : 500, color: '#1d1d1f', letterSpacing: '-0.01em' }}>
                    {isMe ? (bm ? 'Kau' : 'You') : (entry.full_name?.split(' ')[0] || entry.promo_code)}
                    {isMe && <span style={{ fontSize: 10, marginLeft: 5, color: s.primaryDark }}>← you</span>}
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', fontFamily: 'monospace' }}>{entry.promo_code}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>{entry.referral_count}</div>
                  <div style={{ fontSize: 10.5, color: 'rgba(29,29,31,0.4)' }}>{bm ? 'user' : 'users'}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '18px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(29,29,31,0.45)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            💰 {bm ? 'Komisen terkini' : 'Recent commissions'}
          </div>
          {commissions.length === 0 ? (
            <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.4)', padding: '12px 0' }}>{bm ? 'Belum ada komisen. Kongsi kod kau!' : 'No commissions yet. Share your code!'}</div>
          ) : commissions.map((c, i) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderTop: i === 0 ? 'none' : '0.5px solid rgba(0,0,0,0.05)' }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: '#1d1d1f' }}>RM {c.amount_paid_myr.toFixed(2)} {bm ? 'dibayar' : 'paid'}</div>
                <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)' }}>
                  {new Date(c.created_at).toLocaleDateString(bm ? 'ms-MY' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#2d6a40', background: '#e6f4eb', borderRadius: 7, padding: '3px 9px' }}>
                +RM {c.commission_myr.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.06)', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 11.5, fontWeight: 500, color: 'rgba(29,29,31,0.55)', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.025em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.45)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}
