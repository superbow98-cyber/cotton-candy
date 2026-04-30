// src/app/api/transcribe/route.ts
// v53 — Hybrid: Soniox for BM/Rojak (best accuracy), Whisper Turbo for EN/zh/ta (fast & cheap)
// Audio NEVER persisted.

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
const MODEL_LARGE = 'whisper-large-v3'  // v56.2: better for BM/Rojak

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

    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json({
        error: 'Audio too large.',
      }, { status: 413 })
    }

    const langParam = (form.get('language') as string | null)?.toLowerCase()
    const useLanguageHint = langParam && (VALID_LANGS as readonly string[]).includes(langParam)

    // v56.6: Soniox for BM/Rojak (best Malaysian accuracy + code-switching)
    //        Whisper Turbo for EN/zh/ta (fast)
    const isMalay = useLanguageHint && langParam === 'ms'
    const isAutoRojak = !useLanguageHint
    const useSoniox = isMalay || isAutoRojak

    if (useSoniox) {
      // ===== SONIOX PATH =====
      console.log(`[transcribe] v53 Soniox | language hint: ${isMalay ? 'ms' : 'auto-rojak'}`)

      const languageHints = isMalay ? ['ms'] : ['ms', 'en']
      const context = isMalay
        ? "Malaysian speaker. Bahasa Melayu rasmi atau formal. " +
          "Topics: pendidikan, pelajaran, pembahagian sel, fotosintesis, persamaan, " +
          "perlembagaan, kemerdekaan, ekonomi, kerajaan, pembangunan, teknologi."
        : "Malaysian student or professional. Natural rojak (BM + English code-switching). " +
          "Common phrases: 'okay so kita', 'lepas tu', 'macam ni', 'sebab tu'. " +
          "Topics: lectures, education, technology, business, science."

      try {
        const result = await transcribeWithSoniox(audio, 'audio.webm', {
          languageHints,
          context,
        })

        console.log(`[transcribe] v56.7 Soniox done. detected: ${result.language}, chars: ${result.text.length}, tokens: ${result.tokens.length}`)

        // v56.7: If Soniox returns empty/very short, fall through to Whisper
        if (!result.text || result.text.trim().length < 3) {
          console.warn(`[transcribe] Soniox returned empty/short result, falling back to Whisper`)
          throw new Error('Soniox empty result')
        }

        const audioSeconds = result.audioSeconds

        if (audioSeconds > 0) {
          await sb.from('profiles')
            .update({
              audio_seconds_used: (profile?.audio_seconds_used || 0) + audioSeconds,
            })
            .eq('id', user.id)

          try {
            const cost = calcSonioxCost('async', audioSeconds)
            await logUsage({
              userId: user.id,
              service: 'soniox_async' as any,
              operation: 'transcribe',
              units: audioSeconds,
              unit_type: 'audio_seconds',
              cost_usd: cost,
              metadata: {
                language: result.language,
                user_picked: useLanguageHint ? langParam : 'auto',
                token_count: result.tokens.length,
              },
            })
          } catch (logErr) {
            console.error('[transcribe] usage log failed (non-fatal):', logErr)
          }
        }

        const newUsage = (profile?.audio_seconds_used || 0) + audioSeconds
        const newCheck = checkAudioCap(
          plan,
          newUsage,
          profile?.audio_reset_at || null,
          profile?.plan_upgraded_at || null,
        )

        const segments = result.tokens.length > 0 ? [{
          start: 0,
          end: audioSeconds,
          text: result.text,
        }] : []

        return NextResponse.json({
          text: result.text,
          segments,
          language: result.language,
          audioSeconds,
          usage: newCheck,
          provider: 'soniox',
        })
      } catch (sonioxErr: any) {
        console.error('[transcribe] Soniox failed, fallback to Whisper:', sonioxErr.message)
        // Fall through to Whisper Turbo as backup
      }
    }

    // ===== WHISPER TURBO PATH (for EN/zh/ta OR Soniox fallback) =====
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'GROQ_API_KEY not configured.',
      }, { status: 500 })
    }

    // v56.2: Language-specific Whisper prompts (since Soniox disabled)
    let whisperPrompt: string
    if (isMalay) {
      whisperPrompt = "Rakaman dalam Bahasa Melayu rasmi. Pelajar atau profesional Malaysia. " +
        "Perkataan biasa: saya, awak, dia, kita, mereka, ini, itu, yang, dengan, untuk, " +
        "sebab, lepas, kemudian, akhirnya, sebenarnya, maksudnya, contohnya, termasuk. " +
        "Istilah akademik: pembahagian sel, fotosintesis, persamaan, fungsi, teorem, " +
        "kajian, eksperimen, perlembagaan, kemerdekaan, ekonomi, kerajaan, pembangunan."
    } else if (isAutoRojak) {
      whisperPrompt = "Malaysian student or professional speaking natural rojak (Malay + English mix). " +
        "Common Malay: yang, dengan, tu, je, kan, lah, dia, saya, kita, ada, untuk, " +
        "sebab, lepas, ni, macam, boleh, tak, kalau, mesti, kena. " +
        "Common phrases: 'so kita', 'lepas tu', 'macam ni', 'okay so', 'actually'."
    } else {
      whisperPrompt = "Speech recording from a Malaysian speaker. Audio is clear and educational."
    }

    // v56.5: BM/Rojak → Whisper Large v3 (better BM accuracy)
    //        EN/zh/ta → Whisper Turbo (fast)
    // v56.8: Whisper Turbo untuk SEMUA (laju + murah)
    // BM/Rojak utama Soniox, fallback Turbo (Whisper v3 pun lemah BM, so guna Turbo je)
    const useV3 = false
    const selectedModel = MODEL_TURBO

    const groqForm = new FormData()
    groqForm.append('file', audio, 'audio.webm')
    groqForm.append('model', selectedModel)
    groqForm.append('response_format', 'verbose_json')
    groqForm.append('prompt', whisperPrompt)
    groqForm.append('temperature', '0.0')
    if (useLanguageHint) {
      groqForm.append('language', langParam!)
    }

    console.log(`[transcribe] v56.8 Whisper Turbo${isMalay || isAutoRojak ? ' (Soniox fallback)' : ''} | language: ${useLanguageHint ? langParam : 'auto'}`)

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
    console.log(`[transcribe] Whisper done. detected: ${data.language}, chars: ${(data.text || '').length}`)

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

      try {
        const serviceKey = useV3 ? 'groq_whisper_v3' : 'groq_whisper_turbo'
        const cost = calcWhisperCost(serviceKey as any, audioSeconds)
        await logUsage({
          userId: user.id,
          service: serviceKey as any,
          operation: 'transcribe',
          units: audioSeconds,
          unit_type: 'audio_seconds',
          cost_usd: cost,
          metadata: {
            language: data.language || 'auto',
            user_picked: useLanguageHint ? langParam : 'auto',
            model: selectedModel,
          },
        })
      } catch (logErr) {
        console.error('[transcribe] usage log failed (non-fatal):', logErr)
      }
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
      provider: 'whisper_turbo',
    })
  } catch (e: any) {
    console.error('[transcribe] Error:', e)
    return NextResponse.json({
      error: e.message || 'Transcribe failed',
    }, { status: 500 })
  }
}
