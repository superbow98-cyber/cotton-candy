// src/app/api/live-transcribe/route.ts
// Live transcript endpoint — Groq Whisper sahaja, ringan, tanpa Soniox/waterfall
// Dipanggil setiap ~10s chunk semasa recording berlangsung
// TIDAK mengganggu /api/transcribe (clean transcript post-processing)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30
export const dynamic = 'force-dynamic'

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const MODEL = 'whisper-large-v3-turbo'

// Whisper hallucination filter — output biasa bila audio sunyi/noise
// Sumber: penelitian hallucination Whisper (arXiv:2501.11378)
const HALLUCINATION_BLOCKLIST = new Set([
  'you', 'thank you', 'thanks', 'thank you.', 'thanks.',
  'bye', 'bye.', 'goodbye', 'goodbye.',
  'please subscribe', 'subscribe', 'like and subscribe',
  'subtitles by', 'transcribed by', 'translated by',
  'www.', '.com', '.net', '.org',
  'amara.org', 'subbed by',
  '...', '….', '. . .', '- - -',
  'uh', 'um', 'uh.', 'um.',
])

function isHallucination(text: string): boolean {
  const trimmed = text.trim().toLowerCase()
  if (trimmed.length === 0) return true
  if (HALLUCINATION_BLOCKLIST.has(trimmed)) return true
  // Terlalu pendek (1-2 char) — likely noise
  if (trimmed.replace(/[^a-z0-9\u4e00-\u9fff\u0600-\u06ff]/g, '').length < 2) return true
  // Repeating pattern — "ha ha ha ha" atau "okay okay okay"
  const words = trimmed.split(/\s+/)
  if (words.length >= 4) {
    const unique = new Set(words)
    if (unique.size === 1) return true // semua word sama
  }
  return false
}

export async function POST(req: NextRequest) {
  try {
    // Auth check — pastikan user sah
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) {
      return NextResponse.json({ error: 'Groq not configured' }, { status: 503 })
    }

    const form = await req.formData()
    const audio = form.get('audio') as File | null
    if (!audio || audio.size < 100) {
      // Chunk terlalu kecil — skip silently
      return NextResponse.json({ text: '', skipped: true })
    }

    // Max 10MB per chunk (10s audio jauh lebih kecil dari ni)
    if (audio.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Chunk too large' }, { status: 413 })
    }

    const langParam = (form.get('language') as string | null)?.toLowerCase()
    const validLangs = ['ms', 'en', 'zh', 'ta']
    const useLanguageHint = langParam && validLangs.includes(langParam)

    const audioMime = (audio as any).type || 'audio/webm'
    const audioExt = audioMime.includes('mp4') ? 'mp4'
                   : audioMime.includes('mpeg') ? 'mp3'
                   : audioMime.includes('ogg') ? 'ogg'
                   : audioMime.includes('wav') ? 'wav'
                   : 'webm'

    // Prompt ikut bahasa — bantu Whisper context
    // AFTER
const contextParam = (form.get('context') as string | null) || ''

const basePrompt = langParam === 'ms'
  ? "Rakaman kuliah dalam Bahasa Melayu. Pelajar universiti Malaysia. Perkataan biasa: saya, awak, kita, yang, dengan, untuk, sebab, lepas, ni, macam, boleh, tak, lah."
  : langParam === 'en'
    ? "Speech recording from a Malaysian student. Educational content in English."
    : langParam === 'zh'
      ? "普通话录音。学生课堂讲课内容。"
      : langParam === 'ta'
        ? "மலேசிய மாணவர் பேச்சு பதிவு."
        : "Malaysian student. Natural rojak BM + English. Common: yang, dengan, tu, je, kan, lah, dia, saya, kita, ada, untuk, sebab, lepas, ni, macam, boleh, tak."

const prompt = contextParam
  ? `${basePrompt} Sambungan: ...${contextParam}`
  : basePrompt

    const groqForm = new FormData()
    groqForm.append('file', audio, `chunk.${audioExt}`)
    groqForm.append('model', MODEL)
    groqForm.append('response_format', 'json')
    groqForm.append('prompt', prompt)
    groqForm.append('temperature', '0.1')
    if (useLanguageHint && langParam) {
      groqForm.append('language', langParam)
    }

    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqKey}` },
      body: groqForm,
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => 'unknown')
      console.error(`[live-transcribe] Groq failed (${groqRes.status}): ${errText.slice(0, 200)}`)
      return NextResponse.json({ error: `Groq error ${groqRes.status}` }, { status: groqRes.status })
    }

    const data = await groqRes.json()
    const rawText = (data.text || '').trim()

    // Filter hallucination — jangan append teks palsu ke live transcript
    if (isHallucination(rawText)) {
      console.log(`[live-transcribe] Hallucination filtered: "${rawText}"`)
      return NextResponse.json({ text: '', filtered: true })
    }

    console.log(`[live-transcribe] Groq OK | lang: ${langParam || 'auto'} | chars: ${rawText.length}`)
    return NextResponse.json({ text: rawText })

  } catch (e: any) {
    console.error('[live-transcribe] Error:', e)
    return NextResponse.json({ error: e.message || 'Live transcribe failed' }, { status: 500 })
  }
}
