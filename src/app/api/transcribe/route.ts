// src/app/api/transcribe/route.ts
// POST audio blob → check cap → Whisper → track usage. Audio NEVER persisted.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAudioCap } from '@/lib/audio-usage'
import { type Plan } from '@/types'

export const runtime = 'nodejs'
export const maxDuration = 60
export const dynamic = 'force-dynamic'

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const MODEL = 'whisper-large-v3'

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
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
      }, { status: 402 })  // 402 Payment Required
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

    // --- WHISPER CALL ---
    const groqForm = new FormData()
    groqForm.append('file', audio, 'audio.webm')
    groqForm.append('model', MODEL)
    groqForm.append('response_format', 'verbose_json')

    const groqRes = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: groqForm,
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      console.error('[transcribe] Groq error:', groqRes.status, errText)
      return NextResponse.json({
        error: `Whisper failed (${groqRes.status})`,
        detail: errText.slice(0, 500),
      }, { status: groqRes.status })
    }

    const data = await groqRes.json()

    // --- TRACK USAGE ---
    // Use Whisper's returned duration (most accurate). Fallback to last segment end.
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

    // Recalculate usage for response
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
    console.error('[transcribe] Unexpected:', e)
    return NextResponse.json({
      error: e.message || 'Transcribe failed',
    }, { status: 500 })
  }
}
