import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callAI, type AIProvider } from '@/lib/ai-providers'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as { lectureId?: string; provider?: AIProvider }
    const { lectureId, provider: requestedProvider } = body
    if (!lectureId) return NextResponse.json({ error: 'lectureId required' }, { status: 400 })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

    // Fetch lecture + user preference
    const [{ data: lecture }, { data: profile }] = await Promise.all([
      supabase.from('lectures').select('*').eq('id', lectureId).eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('ai_provider').eq('id', user.id).maybeSingle(),
    ])

    if (!lecture) return NextResponse.json({ error: 'lecture not found' }, { status: 404 })

    const transcript = (lecture.transcript_md || '').replace(/^-\s*/gm, '').trim()
    if (!transcript || transcript.length < 30) {
      return NextResponse.json({ error: 'transcript too short to summarize' }, { status: 400 })
    }

    const truncated = transcript.slice(0, 32000)
    const userMessage = `Lecture title: ${lecture.title || 'Untitled'}
Subject: ${lecture.subject || 'Unknown'}
Duration: ${Math.round((lecture.duration_seconds || 0) / 60)} min

RAW TRANSCRIPT:
${truncated}`

    // Priority: request body > user profile > default 'auto'
    const provider: AIProvider = requestedProvider
      || (profile?.ai_provider as AIProvider)
      || 'auto'

    const { result, usedProvider } = await callAI(provider, userMessage)

    await supabase.from('lectures').update({
      summary: JSON.stringify(result),
      keywords: result.topics,
      updated_at: new Date().toISOString(),
    }).eq('id', lectureId)

    return NextResponse.json({ ok: true, data: result, usedProvider })
  } catch (e: any) {
    console.error('ai-summarize error:', e)
    return NextResponse.json({ error: e.message || 'unknown error' }, { status: 502 })
  }
}
