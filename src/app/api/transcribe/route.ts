// src/app/api/transcribe/route.ts
// v47 — Deep Malay detection: language-specific prompts + temperature 0.0 + word lists
// Research-backed: Whisper prompt = language model priming (rare words, vocabulary)
// Audio NEVER persisted.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAudioCap } from '@/lib/audio-usage'
import { type Plan } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const MODEL_TURBO = 'whisper-large-v3-turbo'  // fast, cheap, good for EN/rojak/auto
const MODEL_LARGE = 'whisper-large-v3'         // slower, better for pure BM

const VALID_LANGS = ['ms', 'en', 'zh', 'ta'] as const

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'GROQ_API_KEY not configured.',
      }, { status: 500 })
    }

    // --- CAP CHECK ---
    const { data: profile } = await sb.from('profiles')
      .select('plan, audio_seconds_used, audio_reset_at, plan_upgraded_at')
      .eq('id', user.id)
      .maybeSingle()

    const plan = (profile?.plan || 'free') as Plan
    const check = checkAudioCap(
      plan,
      profile?.audio_seconds_used || 0,
      profile?.audio_reset_at || null,
      profile?.plan_upgraded_at || null,
    )

    if (!check.allowed) {
      return NextResponse.json({
        error: check.reason || 'Audio cap reached',
        capReached: true,
        usage: check,
      }, { status: 402 })
    }

    // Parse audio + language
    const form = await req.formData()
    const audio = form.get('audio') as File | null
    if (!audio) {
      return NextResponse.json({ error: 'No audio file in request' }, { status: 400 })
    }

    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json({
        error: 'Audio too large.',
      }, { status: 413 })
    }

    // Get language from client (auto / ms / en / zh / ta)
    const langParam = (form.get('language') as string | null)?.toLowerCase()
    const useLanguageHint = langParam && (VALID_LANGS as readonly string[]).includes(langParam)

    // --- HYBRID STT MODEL SELECTION (v44.1) ---
    // Whisper Large v3 for: Malay (ms) + Auto/Rojak mode (no language hint)
    // Whisper Turbo for: explicit non-Malay (en, zh, ta) — fast & cheap
    const isMalay = useLanguageHint && langParam === 'ms'
    const isAutoRojak = !useLanguageHint
    const useV3 = isMalay || isAutoRojak
    const selectedModel = useV3 ? MODEL_LARGE : MODEL_TURBO

    // v47: Language-specific prompts (Whisper acts as language model — primes vocabulary)
    // Research: Including target-language word list in prompt significantly improves rare-word recognition
    let prompt: string
    if (isMalay) {
      // PURE BM prompt — deeper technical vocabulary + academic terms
      prompt = "Rakaman dalam Bahasa Melayu rasmi. Pelajar atau profesional Malaysia. " +
        "Perkataan biasa: saya, awak, dia, kita, mereka, ini, itu, yang, dengan, untuk, " +
        "sebab, lepas, kemudian, akhirnya, sebenarnya, maksudnya, contohnya, termasuk, " +
        "iaitu, manakala, walaupun, bagaimana, mengapa, semasa, selepas, sebelum. " +
        "Istilah akademik: pembahagian sel, fotosintesis, tindak balas, persamaan, " +
        "fungsi, teorem, hipotesis, kajian, eksperimen, penyelidikan, analisis, " +
        "kesimpulan, perlembagaan, kemerdekaan, ekonomi, masyarakat, kerajaan, " +
        "pembangunan, teknologi, sumber, pengaruh, kepentingan, kesan, faktor."
    } else if (isAutoRojak) {
      // ROJAK prompt — BM + EN mixed natural Malaysian speech
      prompt = "Malaysian student or professional speaking natural rojak (Malay + English mix). " +
        "Common Malay words: yang, dengan, tu, je, kan, lah, dia, saya, kita, ada, untuk, " +
        "sebab, lepas, ni, sini, mana, macam, boleh, tak, jangan, kalau, mesti, kena. " +
        "Common rojak phrases: 'so kita', 'lepas tu', 'macam ni', 'sebab tu', 'okay so', " +
        "'actually', 'basically', 'in other words', 'for example', 'in conclusion'. " +
        "Academic terms in BM: pembahagian sel, fotosintesis, persamaan, teorem, kajian."
    } else {
      // Other languages — generic prompt
      prompt = "Speech recording from a Malaysian speaker. Audio is clear and educational."
    }

    const groqForm = new FormData()
    groqForm.append('file', audio, 'audio.webm')
    groqForm.append('model', selectedModel)
    groqForm.append('response_format', 'verbose_json')
    groqForm.append('prompt', prompt)
    groqForm.append('temperature', '0.0')  // v47: deterministic, less hallucination
    if (useLanguageHint) {
      groqForm.append('language', langParam!)
    }

    console.log(`[transcribe] v47 deep-malay | model: ${selectedModel} | language: ${useLanguageHint ? langParam : 'auto'} | temp: 0.0`)

    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text().catch(() => 'unknown')
      console.error('[transcribe] Whisper error:', groqRes.status, errText)
      return NextResponse.json({
        error: `Transcription failed (${groqRes.status})`,
        detail: errText.slice(0, 500),
      }, { status: 502 })
    }

    const data = await groqRes.json()
    console.log(`[transcribe] Done. detected: ${data.language}, chars: ${(data.text || '').length}`)

    // --- TRACK USAGE ---
    const audioSeconds = Math.ceil(
      data.duration
      || (data.segments?.[data.segments.length - 1]?.end || 0)
      || 0
    )

    if (audioSeconds > 0) {
      await sb.from('profiles')
        .update({
          audio_seconds_used: (profile?.audio_seconds_used || 0) + audioSeconds,
        })
        .eq('id', user.id)
    }

    const newUsage = (profile?.audio_seconds_used || 0) + audioSeconds
    const newCheck = checkAudioCap(
      plan,
      newUsage,
      profile?.audio_reset_at || null,
      profile?.plan_upgraded_at || null,
    )

    return NextResponse.json({
      text: data.text || '',
      segments: data.segments || [],
      language: data.language || 'auto',
      audioSeconds,
      usage: newCheck,
    })
  } catch (e: any) {
    console.error('[transcribe] Error:', e)
    return NextResponse.json({
      error: e.message || 'Transcribe failed',
    }, { status: 500 })
  }
}
