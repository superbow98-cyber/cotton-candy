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

    // --- ROUTING DECISION (v53) ---
    // Soniox: best for BM, Rojak, code-switching
    // Whisper Turbo: fast & cheap for explicit EN/zh/ta
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

        console.log(`[transcribe] v53 Soniox done. detected: ${result.language}, chars: ${result.text.length}`)

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

    const whisperPrompt = "Speech recording from a Malaysian speaker. Audio is clear and educational."

    const groqForm = new FormData()
    groqForm.append('file', audio, 'audio.webm')
    groqForm.append('model', MODEL_TURBO)
    groqForm.append('response_format', 'verbose_json')
    groqForm.append('prompt', whisperPrompt)
    groqForm.append('temperature', '0.0')
    if (useLanguageHint) {
      groqForm.append('language', langParam!)
    }

    console.log(`[transcribe] v53 Whisper Turbo | language: ${useLanguageHint ? langParam : 'auto'}`)

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
        const cost = calcWhisperCost('groq_whisper_turbo', audioSeconds)
        await logUsage({
          userId: user.id,
          service: 'groq_whisper_turbo',
          operation: 'transcribe',
          units: audioSeconds,
          unit_type: 'audio_seconds',
          cost_usd: cost,
          metadata: {
            language: data.language || 'auto',
            user_picked: useLanguageHint ? langParam : 'auto',
            model: MODEL_TURBO,
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
