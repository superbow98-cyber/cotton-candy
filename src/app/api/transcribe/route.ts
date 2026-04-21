// src/app/api/transcribe/route.ts
// POST audio blob -> forward to Groq Whisper -> return transcript.
// Audio NEVER persisted. Blob exists only in serverless function memory for
// duration of the request, then garbage-collected.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'        // Need Node runtime for form parsing
export const maxDuration = 60          // Vercel max for Hobby plan
export const dynamic = 'force-dynamic' // No caching

const GROQ_URL = 'https://api.groq.com/openai/v1/audio/transcriptions'
const MODEL = 'whisper-large-v3' // Best accuracy, handles code-switching

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
    }

    // Parse incoming multipart form
    const form = await req.formData()
    const audio = form.get('audio') as File | null
    if (!audio) {
      return NextResponse.json({ error: 'No audio file in request' }, { status: 400 })
    }

    // Size check — Groq Whisper hard limit is 25MB per call
    if (audio.size > 25 * 1024 * 1024) {
      return NextResponse.json({
        error: 'Audio chunk too large. Please chunk on client side.',
      }, { status: 413 })
    }

    // Forward to Groq Whisper
    const groqForm = new FormData()
    groqForm.append('file', audio, 'audio.webm')
    groqForm.append('model', MODEL)
    groqForm.append('response_format', 'verbose_json')
    // No "language" param — let Whisper auto-detect for rojak handling

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
    // data.text = full transcript
    // data.segments = [{ start, end, text, language? }]
    // data.language = auto-detected primary language

    return NextResponse.json({
      text: data.text || '',
      segments: data.segments || [],
      language: data.language || 'auto',
    })
  } catch (e: any) {
    console.error('[transcribe] Unexpected:', e)
    return NextResponse.json({
      error: e.message || 'Transcribe failed',
    }, { status: 500 })
  }
}
