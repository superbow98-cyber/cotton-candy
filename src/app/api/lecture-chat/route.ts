// src/app/api/lecture-chat/route.ts
// NEW — Ask Lecture chat endpoint
// Groq primary (llama-3.3-70b-versatile, 128k ctx) → DeepSeek V3 fallback
// Pro only gate is enforced client-side; server double-checks plan from Supabase

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { question, transcript_md, summary, lectureId } = await req.json()

    if (!question?.trim()) {
      return new Response(JSON.stringify({ error: 'Soalan kosong.' }), { status: 400 })
    }

    // ── Plan gate (server-side double-check) ──────────────────────────────────
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, plan_expires_at')
      .eq('id', user.id)
      .single()

    const proPlan = ['month', 'year', 'student_pro']
    const hasActivePlan =
      profile &&
      proPlan.includes(profile.plan) &&
      profile.plan_expires_at &&
      new Date(profile.plan_expires_at) > new Date()

    if (!hasActivePlan) {
      return new Response(
        JSON.stringify({ error: 'Upgrade ke plan PRO untuk guna Ask Lecture.' }),
        { status: 403 }
      )
    }

    // ── Build context ─────────────────────────────────────────────────────────
    const context = [
      summary ? `== RINGKASAN ==\n${summary}` : '',
      transcript_md ? `== TRANSCRIPT ==\n${transcript_md}` : '',
    ]
      .filter(Boolean)
      .join('\n\n')

    if (!context.trim()) {
      return new Response(
        JSON.stringify({ error: 'Tiada transcript atau ringkasan untuk dirujuk.' }),
        { status: 400 }
      )
    }

    const systemPrompt = `Kau adalah pembantu belajar untuk pelajar universiti Malaysia.
Jawab soalan pelajar HANYA berdasarkan transcript dan ringkasan kuliah yang diberikan di bawah.
Jangan gunakan pengetahuan luar — kalau jawapan tak ada dalam transcript, cakap terus "Tak ada dalam transcript ini."
Jawab dalam bahasa yang sama seperti soalan pelajar (BM atau EN).
Ringkas tapi lengkap. Kalau ada formula atau istilah teknikal, sertakan.

CRITICAL OVERRIDE: Jawab HANYA dari bahan di bawah. Tiada maklumat luar.

${context}`

    // ── Try Groq first ────────────────────────────────────────────────────────
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: question },
            ],
            stream: true,
            max_tokens: 1024,
            temperature: 0.3,
          }),
        })

        if (groqRes.ok && groqRes.body) {
          return streamOpenAIResponse(groqRes.body)
        }
        console.warn('[lecture-chat] Groq failed, status:', groqRes.status)
      } catch (e) {
        console.warn('[lecture-chat] Groq error:', e)
      }
    }

    // ── Fallback: DeepSeek V3 ─────────────────────────────────────────────────
    const deepseekKey = process.env.DEEPSEEK_API_KEY
    if (!deepseekKey) {
      return new Response(
        JSON.stringify({ error: 'AI service tidak tersedia sekarang.' }),
        { status: 503 }
      )
    }

    const dsRes = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${deepseekKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
        stream: true,
        max_tokens: 1024,
        temperature: 0.3,
      }),
    })

    if (!dsRes.ok || !dsRes.body) {
      const err = await dsRes.text()
      console.error('[lecture-chat] DeepSeek error:', err)
      return new Response(
        JSON.stringify({ error: 'AI service tidak tersedia sekarang.' }),
        { status: 503 }
      )
    }

    return streamOpenAIResponse(dsRes.body)
  } catch (err) {
    console.error('[lecture-chat] Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Ralat tidak dijangka. Cuba lagi.' }),
      { status: 500 }
    )
  }
}

// ── Helper: pipe OpenAI-compatible SSE stream ─────────────────────────────────
function streamOpenAIResponse(body: ReadableStream<Uint8Array>) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const readable = new ReadableStream({
    async start(controller) {
      const reader = body.getReader()
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const data = trimmed.slice(5).trim()
            if (data === '[DONE]') {
              controller.enqueue(encoder.encode('data: [DONE]\n\n'))
              controller.close()
              return
            }
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content
              if (delta) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
              }
            } catch {
              // skip malformed chunk
            }
          }
        }
      } finally {
        reader.releaseLock()
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
