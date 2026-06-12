import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// ─── Types ─────────────────────────────────────────────────────────────────────
interface Flashcard {
  question: string
  options: [string, string, string, string]
  answer: number   // index 0-3
  explanation: string
}

interface ActionItem {
  task: string
  category: 'follow-up' | 'assignment' | 'reminder' | 'resource'
  priority: 'high' | 'medium' | 'low'
  done: boolean
}

// ─── Route Handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get user role + learning style
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', user.id)
      .maybeSingle()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // Gate: require paid plan
    const isPaid = profile.plan !== 'free' &&
      profile.plan_expires_at &&
      new Date(profile.plan_expires_at) > new Date()

    if (!isPaid) {
      return NextResponse.json({ error: 'Paid plan required' }, { status: 403 })
    }

    const { lectureId } = await req.json()
    if (!lectureId) return NextResponse.json({ error: 'lectureId required' }, { status: 400 })

    // Get lecture transcript
    const { data: lecture } = await supabase
      .from('lectures')
      .select('id, title, transcript_md, raw_transcript_md, summary, flashcards_json')
      .eq('id', lectureId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!lecture) return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })

    // Return cached if exists
    if (lecture.flashcards_json) {
      return NextResponse.json({ data: lecture.flashcards_json, cached: true })
    }

    // Best available transcript
    const transcript = lecture.transcript_md || lecture.raw_transcript_md || ''
    const summaryText = lecture.summary
      ? (typeof lecture.summary === 'string'
          ? lecture.summary
          : JSON.stringify(lecture.summary))
      : ''

    const contentForAI = `LECTURE TITLE: ${lecture.title || 'Untitled'}\n\n${summaryText ? `SUMMARY:\n${summaryText}\n\n` : ''}TRANSCRIPT:\n${transcript}`.slice(0, 12000)

    if (!contentForAI.trim()) {
      return NextResponse.json({ error: 'No transcript available' }, { status: 422 })
    }

    const isStudent = true  // default student until Learning Style migration is run

    // ── Build AI prompt ────────────────────────────────────────────────────────
    const systemPrompt = isStudent
      ? `You are an educational assistant. Generate exactly 8 multiple-choice flashcards from the lecture content.
Return ONLY a valid JSON array — no markdown, no explanation, no preamble.
Each item: { "question": string, "options": [string, string, string, string], "answer": number (0-3), "explanation": string }
Rules:
- Questions must test understanding, not memorisation of exact words
- Wrong options must be plausible (not obviously wrong)
- Explanations must be 1-2 sentences explaining WHY the answer is correct
- Mix difficulty: 2 easy, 4 medium, 2 hard`
      : `You are an academic assistant. Extract action items from this lecture content for the lecturer.
Return ONLY a valid JSON array — no markdown, no explanation, no preamble.
Each item: { "task": string, "category": "follow-up"|"assignment"|"reminder"|"resource", "priority": "high"|"medium"|"low", "done": false }
Rules:
- Extract 6-12 realistic action items
- "follow-up" = things to clarify or revisit with students
- "assignment" = tasks to set for students
- "reminder" = administrative or prep tasks
- "resource" = materials to prepare or share`

    // ── Call DeepSeek V3 via Groq ──────────────────────────────────────────────
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) return NextResponse.json({ error: 'AI not configured' }, { status: 500 })

    const aiRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: contentForAI },
        ],
        temperature: 0.4,
        max_tokens: 3000,
      }),
    })

    if (!aiRes.ok) {
      const err = await aiRes.text()
      console.error('[generate-flashcards] AI error:', err)
      return NextResponse.json({ error: 'AI generation failed' }, { status: 500 })
    }

    const aiJson = await aiRes.json()
    const rawText = aiJson.choices?.[0]?.message?.content ?? ''

    // ── Parse AI response ──────────────────────────────────────────────────────
    let parsed: Flashcard[] | ActionItem[]
    try {
      const clean = rawText.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
      if (!Array.isArray(parsed)) throw new Error('Not an array')
    } catch (e) {
      console.error('[generate-flashcards] Parse error:', e, rawText.slice(0, 200))
      return NextResponse.json({ error: 'AI returned invalid format' }, { status: 500 })
    }

    // ── Cache in DB ────────────────────────────────────────────────────────────
    const cachePayload = {
      type: isStudent ? 'flashcards' : 'action_items',
      items: parsed,
      generatedAt: new Date().toISOString(),
    }

    await supabase
      .from('lectures')
      .update({ flashcards_json: cachePayload })
      .eq('id', lectureId)

    return NextResponse.json({ data: cachePayload, cached: false })

  } catch (err) {
    console.error('[generate-flashcards] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
