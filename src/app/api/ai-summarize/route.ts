import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { callAI, buildSystemPrompt, type AIProvider } from '@/lib/ai-providers'
import { getRecordingTypeMeta } from '@/lib/recording-types'
import { logUsage } from '@/lib/usage-logger'
import { calcLLMCost } from '@/lib/usage-pricing'

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

    const [{ data: lecture }, { data: profile }] = await Promise.all([
      supabase.from('lectures').select('*').eq('id', lectureId).eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('ai_provider').eq('id', user.id).maybeSingle(),
    ])

    if (!lecture) return NextResponse.json({ error: 'lecture not found' }, { status: 404 })

    const transcript = (lecture.transcript_md || '').replace(/^-\s*/gm, '').trim()
    if (!transcript || transcript.length < 30) {
      return NextResponse.json({ error: 'transcript too short to summarize' }, { status: 400 })
    }

    // Get recording type meta — drives sections + system prompt
    const typeMeta = getRecordingTypeMeta(lecture.recording_type || 'lecture')
    const systemPrompt = buildSystemPrompt(typeMeta.sections, typeMeta.systemPromptHint)

    const truncated = transcript.slice(0, 32000)
    const userMessage = `Recording type: ${typeMeta.label.en}
Duration: ${Math.round((lecture.duration_seconds || 0) / 60)} min

NOTE: Generate inferredTitle from transcript content. Ignore any user metadata.

RAW TRANSCRIPT:
${truncated}`

    const provider: AIProvider = requestedProvider
      || (lecture.ai_provider as AIProvider)
      || (profile?.ai_provider as AIProvider)
      || 'auto'

    const { result, usedProvider, fellBack } = await callAI(provider, userMessage, systemPrompt)

    // v58.1: Auto-update lecture title from AI inference if user didn't customize
    const userTitle = (lecture.title || '').trim()
    const isDefaultTitle = !userTitle ||
      userTitle === 'Untitled' ||
      userTitle === 'New lecture' ||
      userTitle === 'New Lecture' ||
      userTitle.toLowerCase().startsWith('untitled') ||
      /^lecture \d+$/i.test(userTitle) ||
      /^recording \d+$/i.test(userTitle)

    const updatePayload: any = {
      summary: JSON.stringify(result),
      keywords: result.topics || [],
      updated_at: new Date().toISOString(),
    }

    if (isDefaultTitle && result.inferredTitle && result.inferredTitle.length > 2) {
      updatePayload.title = result.inferredTitle
      console.log(`[ai-summarize] Auto-titled lecture: "${result.inferredTitle}"`)
    }

    await supabase.from('lectures').update(updatePayload).eq('id', lectureId)

    // v52: Log usage cost
    try {
      // Estimate tokens (rough: 1 token ≈ 4 chars for Latin)
      const inputChars = (userMessage?.length || 0) + (systemPrompt?.length || 0)
      const outputChars = JSON.stringify(result).length
      const inputTokens = Math.ceil(inputChars / 4)
      const outputTokens = Math.ceil(outputChars / 4)

      const serviceMap: Record<string, 'gemini_flash' | 'gemini_flash_lite' | 'xai_grok'> = {
        'gemini-flash': 'gemini_flash',
        'gemini-flash-lite': 'gemini_flash_lite',
        'groq': 'gemini_flash',  // groq llama3 — approx Gemini cost
        'xai': 'xai_grok',
      }
      const serviceKey = serviceMap[usedProvider as string] || 'gemini_flash'
      const cost = calcLLMCost(serviceKey as any, inputTokens, outputTokens)

      await logUsage({
        userId: user.id,
        service: serviceKey,
        operation: 'summarize',
        units: inputTokens + outputTokens,
        unit_type: 'tokens',
        cost_usd: cost,
        lecture_id: lectureId,
        metadata: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          provider: usedProvider,
          fell_back: fellBack,
        },
      })
    } catch (logErr) {
      console.error('[ai-summarize] usage log failed (non-fatal):', logErr)
    }

    return NextResponse.json({
      ok: true,
      data: result,
      usedProvider,
      fellBack,
      requestedProvider: provider,
      recordingType: typeMeta.id,
    })
  } catch (e: any) {
    console.error('ai-summarize error:', e)
    return NextResponse.json({ error: e.message || 'unknown error' }, { status: 502 })
  }
}
