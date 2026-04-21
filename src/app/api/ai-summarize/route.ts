import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// Groq API — free tier, fast, reliable
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.3-70b-versatile'

type AIResult = {
  topics: string[]
  keyPoints: string[]
  formulas: string[]
  questions: string[]
  summary: string
}

const SYSTEM_PROMPT = `You are a helpful assistant that organizes raw lecture transcripts into clean study notes.

Input: a messy, live-transcribed lecture in any mix of English, Bahasa Malaysia, Chinese, Tamil, or Arabic.

Output: STRICT JSON with this exact schema (no markdown, no extra text, just valid JSON):
{
  "topics": ["topic 1", "topic 2", ...],
  "keyPoints": ["key point 1", "key point 2", ...],
  "formulas": ["formula or important fact 1", ...],
  "questions": ["question raised in class 1", ...],
  "summary": "2-3 sentence TL;DR of the whole lecture in the primary language used."
}

Rules:
- "topics": 3-8 main topics covered, short phrases (2-6 words each)
- "keyPoints": 5-15 critical points students must remember, complete short sentences
- "formulas": mathematical formulas, chemical equations, dates, numbers, laws (empty array if none)
- "questions": questions asked BY STUDENTS or posed by lecturer for students to think about (empty array if none)
- "summary": 2-3 sentences, same primary language as the lecture (if BM → write BM, if EN → write EN)
- If the transcript is very short (<100 words), fill with best-effort even if arrays have fewer items
- DO NOT invent facts not in the transcript. If transcript is gibberish/too short, return empty arrays and a note in summary like "Lecture too short to summarize properly."
- Fix scientific terms that look misspelled from speech recognition (e.g. "my toe corner dia" → "Mitochondria")
- Respond ONLY with the JSON object. No prose. No markdown fences. No explanations.`

export async function POST(req: Request) {
  try {
    const { lectureId } = await req.json() as { lectureId: string }
    if (!lectureId) return NextResponse.json({ error: 'lectureId required' }, { status: 400 })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

    // Fetch lecture + verify ownership
    const { data: lecture } = await supabase
      .from('lectures')
      .select('*')
      .eq('id', lectureId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!lecture) return NextResponse.json({ error: 'lecture not found' }, { status: 404 })

    const transcript = (lecture.transcript_md || '').replace(/^-\s*/gm, '').trim()
    if (!transcript || transcript.length < 30) {
      return NextResponse.json({ error: 'transcript too short to summarize' }, { status: 400 })
    }

    // Truncate to ~8k tokens (rough: 32k chars) — Groq Llama 3.3 context window is 128k
    const truncated = transcript.slice(0, 32000)

    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        error: 'GROQ_API_KEY not configured. Set it in Vercel env vars.',
      }, { status: 500 })
    }

    const userMessage = `Lecture title: ${lecture.title || 'Untitled'}
Subject: ${lecture.subject || 'Unknown'}
Duration: ${Math.round((lecture.duration_seconds || 0) / 60)} min

RAW TRANSCRIPT:
${truncated}`

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Groq error:', res.status, errText)
      return NextResponse.json(
        { error: `AI service error (${res.status}). Please retry in a moment.` },
        { status: 502 }
      )
    }

    const json = await res.json()
    const content = json?.choices?.[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'AI returned empty response' }, { status: 502 })
    }

    // Parse AI output
    let parsed: AIResult
    try {
      parsed = JSON.parse(content)
    } catch {
      console.error('Failed to parse AI JSON:', content.slice(0, 500))
      return NextResponse.json({ error: 'AI response malformed' }, { status: 502 })
    }

    // Validate + defaults
    const safe: AIResult = {
      topics:    Array.isArray(parsed.topics)    ? parsed.topics.slice(0, 12)    : [],
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 20) : [],
      formulas:  Array.isArray(parsed.formulas)  ? parsed.formulas.slice(0, 12)  : [],
      questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 10) : [],
      summary:   typeof parsed.summary === 'string' ? parsed.summary.slice(0, 1200) : '',
    }

    // Persist to lecture.summary (JSON stringified) and keywords
    await supabase
      .from('lectures')
      .update({
        summary: JSON.stringify(safe),
        keywords: safe.topics,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lectureId)

    return NextResponse.json({ ok: true, data: safe })
  } catch (e: any) {
    console.error('ai-summarize error:', e)
    return NextResponse.json({ error: e.message || 'unknown error' }, { status: 500 })
  }
}
