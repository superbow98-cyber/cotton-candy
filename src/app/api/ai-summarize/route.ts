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
    const body = await req.json().catch(() => ({})) as { lectureId?: string; provider?: AIProvider; language?: string }
    const { lectureId, provider: requestedProvider, language } = body
    if (!lectureId) return NextResponse.json({ error: 'lectureId required' }, { status: 400 })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'not authenticated' }, { status: 401 })

    const [{ data: lecture }, { data: profile }] = await Promise.all([
      supabase.from('lectures').select('*').eq('id', lectureId).eq('user_id', user.id).maybeSingle(),
      supabase.from('profiles').select('plan, ai_provider').eq('id', user.id).maybeSingle(),
    ])

    if (!lecture) return NextResponse.json({ error: 'lecture not found' }, { status: 404 })

    const transcript = (lecture.transcript_md || '').replace(/^-\s*/gm, '').trim()
    if (!transcript || transcript.length < 30) {
      return NextResponse.json({ error: 'transcript too short to summarize' }, { status: 400 })
    }

    const typeMeta = getRecordingTypeMeta(lecture.recording_type || 'lecture')
    const systemPrompt = buildSystemPrompt(typeMeta.sections, typeMeta.systemPromptHint, language)

    const truncated = transcript.slice(0, 32000)
    const langInstruction = language === 'bm'
  ? 'WAJIB: Tulis SEMUA output dalam Bahasa Melayu sahaja. Setiap field JSON (summary, topics, keyPoints, formulas, questions) MESTI dalam BM. DILARANG guna English langsung.'
  : language === 'zh'
  ? '强制要求：所有JSON字段（summary, topics, keyPoints, formulas, questions）必须用简体中文。禁止使用英文或其他语言。'
  : language === 'ta'
  ? 'கட்டாயம்: summary, topics, keyPoints, formulas, questions உள்ளிட்ட அனைத்து JSON புலங்களும் தமிழில் மட்டுமே இருக்க வேண்டும். ஆங்கிலம் பயன்படுத்த தடை.'
  : 'REQUIRED: Write ALL JSON fields (summary, topics, keyPoints, formulas, questions) in English only.'

const userMessage = `${langInstruction}

Recording type: ${typeMeta.label.en}
Duration: ${Math.round((lecture.duration_seconds || 0) / 60)} min

NOTE: Generate inferredTitle from transcript content. Ignore any user metadata.

RAW TRANSCRIPT:
${truncated}

REMINDER: ${langInstruction}`

    const provider: AIProvider = requestedProvider
      || (lecture.ai_provider as AIProvider)
      || (profile?.ai_provider as AIProvider)
      || 'auto'

    // Pass plan to callAI — gates GPT + Claude for monthly/yearly only
    const plan = profile?.plan || 'free'
    const { result, usedProvider, fellBack } = await callAI(provider, userMessage, systemPrompt, plan)

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

    // Cache translation in language-specific column
    if (language === 'en') updatePayload.summary_en = JSON.stringify(result)
    else if (language === 'bm') updatePayload.summary_bm = JSON.stringify(result)
    else if (language === 'zh') updatePayload.summary_zh = JSON.stringify(result)
    else if (language === 'ta') updatePayload.summary_ta = JSON.stringify(result)
    else updatePayload.summary_en = JSON.stringify(result) // default = EN

    if (isDefaultTitle && result.inferredTitle && result.inferredTitle.length > 2) {
      updatePayload.title = result.inferredTitle
      console.log(`[ai-summarize] Auto-titled lecture: "${result.inferredTitle}"`)
    }

    await supabase.from('lectures').update(updatePayload).eq('id', lectureId)

    try {
      const inputChars = (userMessage?.length || 0) + (systemPrompt?.length || 0)
      const outputChars = JSON.stringify(result).length
      const inputTokens = Math.ceil(inputChars / 4)
      const outputTokens = Math.ceil(outputChars / 4)

      // ✅ SELEPAS
const serviceMap: Record<string, Parameters<typeof calcLLMCost>[0]> = {
  'deepseek':          'deepseek',
  'gemini-flash':      'deepseek',
  'gemini-flash-lite': 'gemini_flash_lite',
  'groq':              'groq',
  'gpt-4o-mini':       'gpt4o_mini',
  'claude-haiku':      'claude_haiku',
  'xai':               'xai_grok',
}
const serviceKey = serviceMap[usedProvider as string] || 'deepseek'
const cost = calcLLMCost(serviceKey, inputTokens, outputTokens)
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
          plan,
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
