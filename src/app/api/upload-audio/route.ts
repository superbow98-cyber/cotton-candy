// src/app/api/upload-audio/route.ts
// v61: Upload audio file (90 min max), redeem 1 credit, transcribe via Soniox/Whisper

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { transcribeWithSoniox } from '@/lib/soniox'
import { logUsage } from '@/lib/usage-logger'
import { calcSonioxCost, calcWhisperCost } from '@/lib/usage-pricing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300  // 5 minutes (Vercel Pro)

const MAX_FILE_SIZE = 200 * 1024 * 1024  // 200MB hard cap (90min @ ~30kbps mp3 = ~20MB; m4a uncompressed bigger)
const MAX_DURATION_SECONDS = 90 * 60  // 90 min cap
const ALLOWED_TYPES = [
  'audio/mpeg', 'audio/mp3',           // MP3
  'audio/mp4', 'audio/m4a', 'audio/x-m4a',  // M4A (iPhone Voice Memo)
  'audio/wav', 'audio/wave', 'audio/x-wav',
  'audio/webm', 'audio/ogg', 'audio/flac',
  'video/mp4', 'video/webm',  // accept video, extract audio server-side via Soniox/Whisper
]

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    // Check credit balance
    const { data: profile } = await sb.from('profiles')
      .select('upload_credits, plan, plan_expires_at')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Free tier blocked
    const isFree = profile.plan === 'free' ||
      (profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date())
    if (isFree) {
      return NextResponse.json({
        error: 'Upload feature available for paid plans only.',
        requiresUpgrade: true,
      }, { status: 402 })
    }

    if ((profile.upload_credits || 0) < 1) {
      return NextResponse.json({
        error: 'No upload credits remaining. Purchase credits to use this feature.',
        creditsRemaining: 0,
      }, { status: 402 })
    }

    // Parse multipart
    const form = await req.formData()
    const file = form.get('file') as File
    const title = String(form.get('title') || 'Uploaded recording').slice(0, 200)
    const language = String(form.get('language') || 'auto')

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: `Unsupported file type "${file.type}". Use MP3, M4A, WAV, WebM, OGG, FLAC, or MP4.`,
      }, { status: 400 })
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 200MB.`,
      }, { status: 400 })
    }
    if (file.size < 1024) {
      return NextResponse.json({ error: 'File too small.' }, { status: 400 })
    }

    console.log(`[upload-audio] user=${user.id} size=${file.size} type=${file.type} lang=${language}`)

    // Determine if Soniox path (BM/auto) or Whisper (English/zh/ta)
    const useSoniox = language === 'ms' || language === 'auto'
    const detectExt = (mime: string) => {
      if (mime.includes('mp4') || mime.includes('m4a')) return 'mp4'
      if (mime.includes('mp3') || mime.includes('mpeg')) return 'mp3'
      if (mime.includes('wav')) return 'wav'
      if (mime.includes('ogg')) return 'ogg'
      if (mime.includes('flac')) return 'flac'
      return 'webm'
    }
    const ext = detectExt(file.type)
    const filename = `audio.${ext}`

    let transcript = ''
    let detectedLang = language
    let audioSeconds = 0
    let usedService: 'soniox_async' | 'groq_whisper_turbo' = 'groq_whisper_turbo'

    if (useSoniox) {
      try {
        const result = await transcribeWithSoniox(file, filename, {
          languageHints: language === 'ms' ? ['ms'] : ['ms', 'en'],
          context: language === 'ms'
            ? 'Bahasa Melayu academic recording'
            : 'Malaysian student recording, BM + EN code-switching common',
        })

        if (result.text && result.text.trim().length >= 3) {
          transcript = result.text
          detectedLang = result.language || language
          audioSeconds = result.audioSeconds
          usedService = 'soniox_async'
        } else {
          throw new Error('Soniox empty result')
        }
      } catch (e: any) {
        console.warn('[upload-audio] Soniox failed, fallback Whisper:', e.message)
        // Fall through to Whisper
      }
    }

    // Whisper fallback / direct path
    if (!transcript) {
      const groqForm = new FormData()
      groqForm.append('file', file, filename)
      groqForm.append('model', 'whisper-large-v3-turbo')
      groqForm.append('response_format', 'verbose_json')
      if (language !== 'auto' && language !== 'ms') {
        groqForm.append('language', language)
      }
      groqForm.append('prompt', 'Speech recording. Audio is clear and educational.')

      const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}` },
        body: groqForm,
      })
      if (!groqRes.ok) {
        const errText = await groqRes.text()
        return NextResponse.json({
          error: `Transcription failed: ${groqRes.status}`,
          detail: errText.slice(0, 500),
        }, { status: 500 })
      }
      const data = await groqRes.json()
      transcript = data.text || ''
      detectedLang = data.language || language
      audioSeconds = Math.round(data.duration || 0)
      usedService = 'groq_whisper_turbo'
    }

    if (!transcript || transcript.length < 10) {
      return NextResponse.json({
        error: 'Could not extract transcript. Audio may be silent or corrupted.',
      }, { status: 422 })
    }

    // Cap audio duration tracked
    if (audioSeconds > MAX_DURATION_SECONDS) {
      console.warn(`[upload-audio] audio ${audioSeconds}s exceeds cap ${MAX_DURATION_SECONDS}s — truncated`)
      audioSeconds = MAX_DURATION_SECONDS
    }

    // Create lecture record
    const { data: lecture, error: lecErr } = await sb.from('lectures').insert({
      user_id: user.id,
      title,
      transcript_md: transcript,
      duration_seconds: audioSeconds,
      lang: 'en',
      source: 'upload',
      status: 'finished',
      started_at: new Date().toISOString(),
      ended_at: new Date().toISOString(),
      clean_segments: [{
        start: 0,
        end: audioSeconds,
        text: transcript,
        source: usedService,
        language: detectedLang,
        created_at: new Date().toISOString(),
      }],
    }).select('id').single()

    if (lecErr) {
      console.error('[upload-audio] insert lecture failed:', lecErr)
      return NextResponse.json({ error: 'Could not save lecture' }, { status: 500 })
    }

    // Redeem 1 credit
    const newBalance = (profile.upload_credits || 0) - 1
    await sb.from('profiles')
      .update({ upload_credits: newBalance })
      .eq('id', user.id)

    await sb.from('upload_credit_transactions').insert({
      user_id: user.id,
      type: 'redeem',
      delta: -1,
      balance_after: newBalance,
      lecture_id: lecture.id,
      metadata: {
        audio_seconds: audioSeconds,
        service: usedService,
        language: detectedLang,
      },
    })

    // Log cost
    try {
      const cost = usedService === 'soniox_async'
        ? calcSonioxCost('async', audioSeconds)
        : calcWhisperCost('groq_whisper_turbo', audioSeconds)
      await logUsage({
        userId: user.id,
        service: usedService as any,
        operation: 'transcribe',
        units: audioSeconds,
        unit_type: 'audio_seconds',
        cost_usd: cost,
        lecture_id: lecture.id,
        metadata: {
          language: detectedLang,
          source: 'upload',
        },
      })
    } catch (e) { console.warn('[upload-audio] cost log failed:', e) }

    return NextResponse.json({
      ok: true,
      lectureId: lecture.id,
      creditsRemaining: newBalance,
      audioSeconds,
      transcriptPreview: transcript.slice(0, 200),
      detectedLanguage: detectedLang,
    })
  } catch (e: any) {
    console.error('[upload-audio] error:', e)
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 })
  }
}
