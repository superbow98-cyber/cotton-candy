// src/app/api/transcribe/route.ts
// 3-tier STT chain with AUTO-DETECT language (same behavior across all providers).
// Audio NEVER persisted.
//
// STT Chain:
//   1st: Groq Whisper Turbo    (RM 0.19/hr) — cheapest primary
//   2nd: Grok STT (xAI)         (RM 0.47/hr) — highest accuracy fallback
//   3rd: Groq Whisper v3        (RM 0.53/hr) — most proven last resort
//
// ALL 3 use AUTO-DETECT language (no explicit language param).

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAudioCap } from '@/lib/audio-usage'
import { type Plan } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

type Provider = 'groq-whisper-turbo' | 'grok-stt' | 'groq-whisper-v3'

interface STTResult {
  text: string
  duration: number
  language: string
  segments?: any[]
  usedProvider: Provider
  usedFallback: boolean
}

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const GROK_URL = 'https://api.x.ai/v1/stt'

/**
 * Try 3 STT providers in order, return first success.
 * ALL providers auto-detect language (no explicit param).
 */
async function transcribeWithFallback(audio: File): Promise<STTResult> {
  const groqKey = process.env.GROQ_API_KEY
  const xaiKey = process.env.XAI_API_KEY
  const attempts: string[] = []

  // === 1st: Groq Whisper Turbo (cheapest) ===
  if (groqKey) {
    try {
      const result = await callGroq(audio, groqKey, 'whisper-large-v3-turbo')
      return { ...result, usedProvider: 'groq-whisper-turbo', usedFallback: false }
    } catch (err: any) {
      console.warn('[STT] Turbo failed, trying Grok STT:', err.message)
      attempts.push(`Turbo: ${err.message}`)
    }
  }

  // === 2nd: Grok STT (xAI) ===
  if (xaiKey) {
    try {
      const result = await callGrokSTT(audio, xaiKey)
      return { ...result, usedProvider: 'grok-stt', usedFallback: true }
    } catch (err: any) {
      console.warn('[STT] Grok STT failed, trying Whisper v3:', err.message)
      attempts.push(`Grok: ${err.message}`)
    }
  }

  // === 3rd: Groq Whisper v3 (most proven) ===
  if (groqKey) {
    try {
      const result = await callGroq(audio, groqKey, 'whisper-large-v3')
      return { ...result, usedProvider: 'groq-whisper-v3', usedFallback: true }
    } catch (err: any) {
      attempts.push(`v3: ${err.message}`)
    }
  }

  throw new Error(`All STT providers failed. Attempts: ${attempts.join(' | ')}`)
}

/**
 * Groq Whisper — auto-detect language.
 * Shared for Turbo + v3.
 */
async function callGroq(
  audio: File,
  apiKey: string,
  model: string,
): Promise<Omit<STTResult, 'usedProvider' | 'usedFallback'>> {
  const form = new FormData()
  form.append('file', audio, 'audio.webm')
  form.append('model', model)
  // AUTO-DETECT: no language param passed
  form.append('response_format', 'verbose_json')

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown')
    throw new Error(`Groq ${model} ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  return {
    text: data.text || '',
    duration: Math.ceil(
      data.duration
      || (data.segments?.[data.segments.length - 1]?.end || 0)
      || 0
    ),
    language: data.language || 'auto',
    segments: data.segments || [],
  }
}

/**
 * Grok STT — auto-detect language (25+ langs supported).
 */
async function callGrokSTT(
  audio: File,
  apiKey: string,
): Promise<Omit<STTResult, 'usedProvider' | 'usedFallback'>> {
  const form = new FormData()
  form.append('file', audio, 'audio.webm')
  form.append('model', 'grok-stt')
  // AUTO-DETECT: no language param passed
  form.append('format', 'json')

  const res = await fetch(GROK_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown')
    throw new Error(`Grok STT ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  return {
    text: data.text || '',
    duration: Math.ceil(data.duration || 0),
    language: data.language || 'auto',
    segments: data.segments || [],
  }
}

// ============================================================
// MAIN HANDLER
// ============================================================

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

    // Parse audio
    const form = await req.formData()
    const audio = form.get('audio') as File | null
    if (!audio) {
      return NextResponse.json({ error: 'No audio file in request' }, { status: 400 })
    }

    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json({
        error: 'Audio chunk too large. Please chunk on client side.',
      }, { status: 413 })
    }

    // --- TRANSCRIBE WITH 3-TIER FALLBACK (auto-detect language) ---
    let sttResult: STTResult
    try {
      sttResult = await transcribeWithFallback(audio)
      console.log(`[transcribe] Used: ${sttResult.usedProvider}, detected: ${sttResult.language}, chars: ${sttResult.text.length}`)
    } catch (err: any) {
      console.error('[transcribe] All STT providers failed:', err.message)
      return NextResponse.json({
        error: `Transcription failed. Please try again.`,
        detail: err.message.slice(0, 500),
      }, { status: 502 })
    }

    // --- TRACK USAGE ---
    const audioSeconds = sttResult.duration
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
      text: sttResult.text,
      segments: sttResult.segments,
      language: sttResult.language,
      audioSeconds,
      usage: newCheck,
      usedProvider: sttResult.usedProvider,
      usedFallback: sttResult.usedFallback,
    })
  } catch (e: any) {
    console.error('[transcribe] Unexpected:', e)
    return NextResponse.json({
      error: e.message || 'Transcribe failed',
    }, { status: 500 })
  }
}
