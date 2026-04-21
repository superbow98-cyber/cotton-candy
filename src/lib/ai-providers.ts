// ============================================================
// Cotton Candy — Multi-provider AI abstraction
// Supported: Groq (Llama 3.3 70B), Gemini 2.5 Flash, Gemini Flash-Lite
// Auto mode: try Groq → Gemini Flash → Gemini Flash-Lite
// ============================================================

export type AIProvider = 'groq' | 'gemini-flash' | 'gemini-flash-lite' | 'auto'

export type AISummary = {
  topics: string[]
  keyPoints: string[]
  formulas: string[]
  questions: string[]
  summary: string
}

export const PROVIDER_META: Record<Exclude<AIProvider, 'auto'>, {
  label: string
  icon: string
  desc: string
  descBm: string
  rpd: number
  model: string
}> = {
  'groq': {
    label: 'Groq Llama 3.3 70B',
    icon: '🚀',
    desc: 'Fastest · 1,000/day · Best overall quality',
    descBm: 'Pantas · 1,000/hari · Kualiti terbaik',
    rpd: 1000,
    model: 'llama-3.3-70b-versatile',
  },
  'gemini-flash': {
    label: 'Gemini 2.5 Flash',
    icon: '💎',
    desc: 'Excellent · 250/day · Long context (1M)',
    descBm: 'Hebat · 250/hari · Context panjang (1M)',
    rpd: 250,
    model: 'gemini-2.5-flash',
  },
  'gemini-flash-lite': {
    label: 'Gemini 2.5 Flash-Lite',
    icon: '⚡',
    desc: 'High volume · 1,000/day · Simple & fast',
    descBm: 'Volume tinggi · 1,000/hari · Ringkas',
    rpd: 1000,
    model: 'gemini-2.5-flash-lite',
  },
}

export const SYSTEM_PROMPT = `You are a helpful assistant that organizes raw lecture transcripts into clean study notes.

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

function validateResult(raw: any): AISummary {
  return {
    topics:    Array.isArray(raw?.topics)    ? raw.topics.slice(0, 12).map(String)    : [],
    keyPoints: Array.isArray(raw?.keyPoints) ? raw.keyPoints.slice(0, 20).map(String) : [],
    formulas:  Array.isArray(raw?.formulas)  ? raw.formulas.slice(0, 12).map(String)  : [],
    questions: Array.isArray(raw?.questions) ? raw.questions.slice(0, 10).map(String) : [],
    summary:   typeof raw?.summary === 'string' ? raw.summary.slice(0, 1200) : '',
  }
}

// ---------- Groq ----------
async function callGroq(userMessage: string): Promise<AISummary> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
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
    throw new Error(`Groq ${res.status}: ${errText.slice(0, 200)}`)
  }

  const json = await res.json()
  const content = json?.choices?.[0]?.message?.content
  if (!content) throw new Error('Groq: empty response')

  let parsed
  try { parsed = JSON.parse(content) }
  catch { throw new Error('Groq: malformed JSON') }

  return validateResult(parsed)
}

// ---------- Gemini (generic) ----------
async function callGemini(userMessage: string, model: string): Promise<AISummary> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        role: 'system',
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        { role: 'user', parts: [{ text: userMessage }] },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Gemini ${res.status}: ${errText.slice(0, 200)}`)
  }

  const json = await res.json()
  const content = json?.candidates?.[0]?.content?.parts?.[0]?.text
  if (!content) throw new Error('Gemini: empty response')

  let parsed
  try { parsed = JSON.parse(content) }
  catch { throw new Error('Gemini: malformed JSON') }

  return validateResult(parsed)
}

// ---------- Main dispatcher ----------
export async function callAI(
  provider: AIProvider,
  userMessage: string
): Promise<{ result: AISummary; usedProvider: string }> {
  // Explicit single-provider call
  if (provider === 'groq') {
    const result = await callGroq(userMessage)
    return { result, usedProvider: 'groq' }
  }
  if (provider === 'gemini-flash') {
    const result = await callGemini(userMessage, 'gemini-2.5-flash')
    return { result, usedProvider: 'gemini-flash' }
  }
  if (provider === 'gemini-flash-lite') {
    const result = await callGemini(userMessage, 'gemini-2.5-flash-lite')
    return { result, usedProvider: 'gemini-flash-lite' }
  }

  // Auto fallback: Groq → Gemini Flash → Gemini Flash-Lite
  const order: Array<{ name: string; fn: () => Promise<AISummary> }> = [
    { name: 'groq',              fn: () => callGroq(userMessage) },
    { name: 'gemini-flash',      fn: () => callGemini(userMessage, 'gemini-2.5-flash') },
    { name: 'gemini-flash-lite', fn: () => callGemini(userMessage, 'gemini-2.5-flash-lite') },
  ]

  const errors: string[] = []
  for (const { name, fn } of order) {
    try {
      const result = await fn()
      return { result, usedProvider: name }
    } catch (e: any) {
      errors.push(`${name}: ${e.message}`)
      // continue to next provider
    }
  }
  throw new Error(`All providers failed. ${errors.join(' | ')}`)
}
