// src/app/api/transcribe/route.ts
// v61 — Cost optimized: Soniox → AssemblyAI → Whisper/Groq → Deepgram (last resort)
// Audio NEVER persisted. Max file: 100MB

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAudioCap } from '@/lib/audio-usage'
import { type Plan } from '@/types'
import { logUsage } from '@/lib/usage-logger'
import { calcWhisperCost, calcSonioxCost } from '@/lib/usage-pricing'
import { transcribeWithSoniox } from '@/lib/soniox'

export const runtime = 'nodejs'
export const maxDuration = 120  // v61: increased for AssemblyAI polling (up to 50s poll + upload overhead)
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
    const isEnglish = useLanguageHint && langParam === 'en'

    // Language hints for Soniox
    const sonioxLangHints = isMalay ? ['ms'] : isEnglish ? ['en'] : ['ms', 'en']
    const sonioxContext = isMalay
      ? "Malaysian speaker. Bahasa Melayu rasmi atau formal."
      : isEnglish
        ? "English speaker. Clear academic or professional speech."
        : "Malaysian student. Natural rojak BM + English. Phrases: 'okay so kita', 'lepas tu', 'macam ni', 'lah', 'boleh'."

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
        const cost = provider === 'assemblyai'
          ? audioSeconds * 0.0000417          // $0.15/hr
          : provider === 'deepgram'
            ? audioSeconds * 0.0001278        // $0.46/hr
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

    // Helper: build usage response
    const buildUsageCheck = (audioSeconds: number) => {
      const newUsage = (profile?.audio_seconds_used || 0) + audioSeconds
      return checkAudioCap(plan, newUsage, profile?.audio_reset_at || null, profile?.plan_upgraded_at || null)
    }

    // ===== ENGINE 1: SONIOX (PRIMARY — ALL languages) =====
    try {
      const filename = `audio.${audioExt}`
      console.log(`[transcribe] Soniox (primary) | hints: ${sonioxLangHints.join('+')} | ${filename} | ${audioMime} | ${audio.size}B`)
      const result = await transcribeWithSoniox(audio, filename, {
        languageHints: sonioxLangHints,
        context: sonioxContext,
      })
      console.log(`[transcribe] Soniox done | detected: ${result.language} | chars: ${result.text.length} | ${result.audioSeconds}s`)
      if (!result.text || result.text.trim().length < 3) throw new Error('Soniox empty result')
      const audioSeconds = result.audioSeconds
      await updateUsage(audioSeconds, 'soniox', result.language)
      return NextResponse.json({
        text: result.text,
        segments: result.tokens.length > 0 ? [{ start: 0, end: audioSeconds, text: result.text }] : [],
        language: result.language,
        audioSeconds,
        usage: buildUsageCheck(audioSeconds),
        provider: 'soniox',
      })
    } catch (sonioxErr: any) {
      console.error('[transcribe] Soniox failed, fallback to AssemblyAI:', sonioxErr.message)
    }

    // ===== ENGINE 2: ASSEMBLYAI (FALLBACK) =====
    const assemblyKey = process.env.ASSEMBLYAI_API_KEY
    if (assemblyKey) {
      try {
        console.log(`[transcribe] AssemblyAI (fallback) | lang: ${langParam || 'auto'} | ${audioMime} | ${audio.size}B`)

        // Step 1: Upload audio
        const audioBuffer = await audio.arrayBuffer()
        const uploadRes = await fetch('https://api.assemblyai.com/v2/upload', {
          method: 'POST',
          headers: {
            'Authorization': assemblyKey,
            'Content-Type': 'application/octet-stream',
          },
          body: audioBuffer,
        })
        if (!uploadRes.ok) {
          const errText = await uploadRes.text().catch(() => 'unknown')
          throw new Error(`AssemblyAI upload failed (${uploadRes.status}): ${errText.slice(0, 200)}`)
        }
        const { upload_url } = await uploadRes.json()

        // Step 2: Request transcription
        const transcriptBody: Record<string, any> = {
          audio_url: upload_url,
          speech_models: ['universal-3-pro', 'universal-2'],
          punctuate: true,
          format_text: true,
        }
        if (isMalay) transcriptBody.language_code = 'ms'
        else if (isEnglish) transcriptBody.language_code = 'en'
        else transcriptBody.language_detection = true

        const transcriptRes = await fetch('https://api.assemblyai.com/v2/transcript', {
          method: 'POST',
          headers: {
            'Authorization': assemblyKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transcriptBody),
        })
        if (!transcriptRes.ok) {
          const errText = await transcriptRes.text().catch(() => 'unknown')
          throw new Error(`AssemblyAI transcript request failed (${transcriptRes.status}): ${errText.slice(0, 200)}`)
        }
        const { id: transcriptId } = await transcriptRes.json()

        // Step 3: Poll for completion (max 90s, poll every 3s = 30 attempts)
        let transcript = ''
        let detectedLang = langParam || 'auto'
        let audioDuration = 0
        for (let attempt = 0; attempt < 30; attempt++) {
          await new Promise(r => setTimeout(r, 3000))
          const pollRes = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
            headers: { 'Authorization': assemblyKey },
          })
          if (!pollRes.ok) throw new Error(`AssemblyAI poll failed (${pollRes.status})`)
          const pollData = await pollRes.json()
          if (pollData.status === 'completed') {
            transcript = pollData.text || ''
            detectedLang = pollData.language_code || detectedLang
            audioDuration = Math.ceil(pollData.audio_duration || 0)
            break
          } else if (pollData.status === 'error') {
            throw new Error(`AssemblyAI error: ${pollData.error}`)
          }
          console.log(`[transcribe] AssemblyAI polling... ${attempt + 1}/30 | ${pollData.status}`)
        }

        if (!transcript || transcript.trim().length < 3) throw new Error('AssemblyAI empty result')
        console.log(`[transcribe] AssemblyAI done | detected: ${detectedLang} | chars: ${transcript.length} | ${audioDuration}s`)
        await updateUsage(audioDuration, 'assemblyai', detectedLang)
        return NextResponse.json({
          text: transcript,
          segments: [{ start: 0, end: audioDuration, text: transcript }],
          language: detectedLang,
          audioSeconds: audioDuration,
          usage: buildUsageCheck(audioDuration),
          provider: 'assemblyai',
        })
      } catch (assemblyErr: any) {
        console.error('[transcribe] AssemblyAI failed, fallback to Whisper:', assemblyErr.message)
      }
    } else {
      console.warn('[transcribe] ASSEMBLYAI_API_KEY not set, skipping AssemblyAI')
    }

    // ===== ENGINE 3: WHISPER/GROQ (LAST RESORT) =====
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      try {
        const whisperPrompt = isMalay
          ? "Rakaman dalam Bahasa Melayu rasmi. Pelajar atau profesional Malaysia. Perkataan biasa: saya, awak, dia, kita, yang, dengan, untuk, sebab, lepas, kemudian."
          : isEnglish
            ? "Speech recording from a Malaysian speaker. Audio is clear and educational."
            : "Malaysian student speaking natural rojak (Malay + English). Common: yang, dengan, tu, je, kan, lah, dia, saya, kita, ada, untuk, sebab, lepas, ni, macam, boleh, tak."

        const groqForm = new FormData()
        groqForm.append('file', audio, `audio.${audioExt}`)
        groqForm.append('model', MODEL_TURBO)
        groqForm.append('response_format', 'verbose_json')
        groqForm.append('prompt', whisperPrompt)
        groqForm.append('temperature', '0.0')
        if (useLanguageHint) groqForm.append('language', langParam!)

        console.log(`[transcribe] Whisper Turbo (last resort) | lang: ${useLanguageHint ? langParam : 'auto'}`)

        const groqRes = await fetch(GROQ_URL, {
          method: 'POST',
          headers: { Authorization: `Bearer ${groqKey}` },
          body: groqForm,
        })

        if (!groqRes.ok) {
          const errText = await groqRes.text().catch(() => 'unknown')
          throw new Error(`Whisper failed (${groqRes.status}): ${errText.slice(0, 200)}`)
        }

        const data = await groqRes.json()
        console.log(`[transcribe] Whisper done | detected: ${data.language} | chars: ${(data.text || '').length}`)
        const audioSeconds = Math.ceil(
          data.duration || (data.segments?.[data.segments.length - 1]?.end || 0) || 0
        )
        await updateUsage(audioSeconds, 'whisper_turbo', data.language || 'auto')
        return NextResponse.json({
          text: data.text || '',
          segments: data.segments || [],
          language: data.language || 'auto',
          audioSeconds,
          usage: buildUsageCheck(audioSeconds),
          provider: 'whisper_turbo',
        })
      } catch (whisperErr: any) {
        console.error('[transcribe] Whisper failed, fallback to Deepgram:', whisperErr.message)
      }
    } else {
      console.warn('[transcribe] GROQ_API_KEY not set, skipping Whisper')
    }

    // ===== ENGINE 4: DEEPGRAM (EMERGENCY LAST RESORT) =====
    const deepgramKey = process.env.DEEPGRAM_API_KEY
    if (deepgramKey) {
      try {
        const dgLang = isMalay ? 'ms' : isEnglish ? 'en' : 'ms'
        console.log(`[transcribe] Deepgram (emergency) | lang: ${dgLang} | ${audioMime} | ${audio.size}B`)
        const dgUrl = `https://api.deepgram.com/v1/listen?model=nova-2&language=${dgLang}&punctuate=true&smart_format=true`
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
        const detectedLang = dgData?.results?.channels?.[0]?.detected_language || dgLang
        console.log(`[transcribe] Deepgram done | detected: ${detectedLang} | chars: ${transcript.length} | ${dgDuration}s`)
        if (!transcript || transcript.trim().length < 3) throw new Error('Deepgram empty result')
        await updateUsage(audioSeconds, 'deepgram', detectedLang)
        return NextResponse.json({
          text: transcript,
          segments: [{ start: 0, end: audioSeconds, text: transcript }],
          language: detectedLang,
          audioSeconds,
          usage: buildUsageCheck(audioSeconds),
          provider: 'deepgram',
        })
      } catch (deepgramErr: any) {
        console.error('[transcribe] Deepgram failed:', deepgramErr.message)
      }
    } else {
      console.warn('[transcribe] DEEPGRAM_API_KEY not set, skipping Deepgram')
    }

    // All engines failed
    return NextResponse.json({ error: 'All transcription engines failed. Please try again.' }, { status: 502 })

  } catch (e: any) {
    console.error('[transcribe] Error:', e)
    return NextResponse.json({ error: e.message || 'Transcribe failed' }, { status: 500 })
  }
}
