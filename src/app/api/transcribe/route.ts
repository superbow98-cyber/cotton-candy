// src/app/api/transcribe/route.ts
// v58 — Optimized for Rojak: Soniox (Rojak) → Deepgram (pure BM) → Whisper (fallback)
<<<<<<< HEAD
// Audio NEVER persisted. Max file: 100MB
=======
// Audio NEVER persisted.
>>>>>>> 3821864634a2fe39951ebe16ecaf649ba3995f0c

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAudioCap } from '@/lib/audio-usage'
import { type Plan } from '@/types'
import { logUsage } from '@/lib/usage-logger'
import { calcWhisperCost, calcSonioxCost } from '@/lib/usage-pricing'
import { transcribeWithSoniox } from '@/lib/soniox'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const MODEL_TURBO = 'whisper-large-v3-turbo'

const VALID_LANGS = ['ms', 'en', 'zh', 'ta'] as const

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
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

    if (audio.size > 100 * 1024 * 1024) {
      return NextResponse.json({ error: 'Audio too large.' }, { status: 413 })
    }

    const langParam = (form.get('language') as string | null)?.toLowerCase()
    const useLanguageHint = langParam && (VALID_LANGS as readonly string[]).includes(langParam)

    const isMalay = useLanguageHint && langParam === 'ms'
    const isAutoRojak = !useLanguageHint  // User didn't specify → assume Rojak
    const usePureBM = isMalay  // User explicitly picked BM

    const audioMime = (audio as any).type || 'audio/webm'
    const audioExt = audioMime.includes('mp4') ? 'mp4'
                   : audioMime.includes('mpeg') ? 'mp3'
                   : audioMime.includes('ogg') ? 'ogg'
                   : audioMime.includes('wav') ? 'wav'
                   : 'webm'

    // Helper: update usage + log
    const updateUsage = async (audioSeconds: number, provider: string, detectedLang: string) => {
      if (audioSeconds <= 0) return
      await sb.from('profiles')
        .update({ audio_seconds_used: (profile?.audio_seconds_used || 0) + audioSeconds })
        .eq('id', user.id)
      try {
        const cost = provider === 'deepgram'
          ? audioSeconds * 0.0000983
          : provider === 'soniox'
            ? calcSonioxCost('async', audioSeconds)
            : calcWhisperCost('groq_whisper_turbo' as any, audioSeconds)
        await logUsage({
          userId: user.id,
          service: 'soniox_async' as any,
          operation: 'transcribe',
          units: audioSeconds,
          unit_type: 'audio_seconds',
          cost_usd: cost,
          metadata: { language: detectedLang, user_picked: useLanguageHint ? langParam : 'auto', provider },
        })
      } catch (logErr) {
        console.error('[transcribe] usage log failed (non-fatal):', logErr)
      }
    }

    // ===== ENGINE 1: SONIOX (PRIMARY for Rojak/Auto) =====
    if (isAutoRojak) {
      try {
        const filename = `audio.${audioExt}`
        console.log(`[transcribe] Soniox (Rojak) | ${filename} | ${audioMime} | ${audio.size}B`)
        const languageHints = ['ms', 'en']  // BM + English for Rojak
        const context = "Malaysian student. Natural rojak BM + English. Phrases: 'okay so kita', 'lepas tu', 'macam ni', 'lah', 'lor', 'dapat', 'boleh'."
        const result = await transcribeWithSoniox(audio, filename, { languageHints, context })
        console.log(`[transcribe] Soniox done | detected: ${result.language} | chars: ${result.text.length} | ${result.audioSeconds}s`)
        if (!result.text || result.text.trim().length < 3) throw new Error('Soniox empty result')
        const audioSeconds = result.audioSeconds
        await updateUsage(audioSeconds, 'soniox', result.language)
        const newUsage = (profile?.audio_seconds_used || 0) + audioSeconds
        const newCheck = checkAudioCap(plan, newUsage, profile?.audio_reset_at || null, profile?.plan_upgraded_at || null)
        return NextResponse.json({
          text: result.text,
          segments: result.tokens.length > 0 ? [{ start: 0, end: audioSeconds, text: result.text }] : [],
          language: result.language,
          audioSeconds,
          usage: newCheck,
          provider: 'soniox',
        })
      } catch (sonioxErr: any) {
        console.error('[transcribe] Soniox (Rojak) failed, fallback to Whisper:', sonioxErr.message)
        // Fall through to Whisper last resort
      }
    }

    // ===== ENGINE 2: DEEPGRAM (PRIMARY for pure BM only) =====
    if (usePureBM) {
      const deepgramKey = process.env.DEEPGRAM_API_KEY
      if (deepgramKey) {
        try {
          console.log(`[transcribe] Deepgram (pure BM) | lang: ms | mime: ${audioMime} | ${audio.size}B`)
          const dgUrl = `https://api.deepgram.com/v1/listen?model=nova-2&language=ms&punctuate=true&smart_format=true`
          const audioBuffer = await audio.arrayBuffer()
          const dgRes = await fetch(dgUrl, {
            method: 'POST',
            headers: { 'Authorization': `Token ${deepgramKey}`, 'Content-Type': audioMime },
            body: audioBuffer,
          })
          if (!dgRes.ok) {
            const errText = await dgRes.text().catch(() => 'unknown')
            throw new Error(`Deepgram HTTP ${dgRes.status}: ${errText.slice(0, 200)}`)
          }
          const dgData = await dgRes.json()
          const transcript = dgData?.results?.channels?.[0]?.alternatives?.[0]?.transcript || ''
          const dgDuration = dgData?.metadata?.duration || 0
          const audioSeconds = Math.ceil(dgDuration)
          const detectedLang = dgData?.results?.channels?.[0]?.detected_language || 'ms'
          console.log(`[transcribe] Deepgram done | detected: ${detectedLang} | chars: ${transcript.length} | ${dgDuration}s`)
          if (!transcript || transcript.trim().length < 3) throw new Error('Deepgram empty result')
          await updateUsage(audioSeconds, 'deepgram', detectedLang)
          const newUsage = (profile?.audio_seconds_used || 0) + audioSeconds
          const newCheck = checkAudioCap(plan, newUsage, profile?.audio_reset_at || null, profile?.plan_upgraded_at || null)
          return NextResponse.json({
            text: transcript,
            segments: [{ start: 0, end: audioSeconds, text: transcript }],
            language: detectedLang,
            audioSeconds,
            usage: newCheck,
            provider: 'deepgram',
          })
        } catch (deepgramErr: any) {
          console.error('[transcribe] Deepgram (pure BM) failed, fallback to Whisper:', deepgramErr.message)
        }
      } else {
        console.warn('[transcribe] DEEPGRAM_API_KEY not set, skipping Deepgram')
      }
    }

    // ===== ENGINE 3: WHISPER (EN/zh/ta OR last resort) =====
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured.' }, { status: 500 })
    }

    let whisperPrompt: string
    if (usePureBM) {
      whisperPrompt = "Rakaman dalam Bahasa Melayu rasmi. Pelajar atau profesional Malaysia. Perkataan biasa: saya, awak, dia, kita, yang, dengan, untuk, sebab, lepas, kemudian."
    } else if (isAutoRojak) {
      whisperPrompt = "Malaysian student speaking natural rojak (Malay + English). Common: yang, dengan, tu, je, kan, lah, dia, saya, kita, ada, untuk, sebab, lepas, ni, macam, boleh, tak."
    } else {
      whisperPrompt = "Speech recording from a Malaysian speaker. Audio is clear and educational."
    }

    const groqForm = new FormData()
    groqForm.append('file', audio, `audio.${audioExt}`)
    groqForm.append('model', MODEL_TURBO)
    groqForm.append('response_format', 'verbose_json')
    groqForm.append('prompt', whisperPrompt)
    groqForm.append('temperature', '0.0')
    if (useLanguageHint) groqForm.append('language', langParam!)

    console.log(`[transcribe] Whisper Turbo${usePureBM ? ' (BM fallback)' : isAutoRojak ? ' (Rojak fallback)' : ''} | lang: ${useLanguageHint ? langParam : 'auto'}`)

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
    console.log(`[transcribe] Whisper done | detected: ${data.language} | chars: ${(data.text || '').length}`)

    const audioSeconds = Math.ceil(
      data.duration || (data.segments?.[data.segments.length - 1]?.end || 0) || 0
    )
    await updateUsage(audioSeconds, 'whisper_turbo', data.language || 'auto')
    const newUsage = (profile?.audio_seconds_used || 0) + audioSeconds
    const newCheck = checkAudioCap(plan, newUsage, profile?.audio_reset_at || null, profile?.plan_upgraded_at || null)

    return NextResponse.json({
      text: data.text || '',
      segments: data.segments || [],
      language: data.language || 'auto',
      audioSeconds,
      usage: newCheck,
      provider: 'whisper_turbo',
    })
  } catch (e: any) {
    console.error('[transcribe] Error:', e)
    return NextResponse.json({ error: e.message || 'Transcribe failed' }, { status: 500 })
  }
}
