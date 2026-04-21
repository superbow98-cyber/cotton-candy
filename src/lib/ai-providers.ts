// ============================================================
// Cotton Candy — Multi-provider AI (Gemini Flash prioritized)
// Order: Gemini 2.5 Flash → Auto → Groq → Gemini Flash-Lite
// ============================================================

export type AIProvider = 'gemini-flash' | 'auto' | 'groq' | 'gemini-flash-lite'

export type AISummary = {
  topics: string[]
  keyPoints: string[]
  formulas: string[]
  questions: string[]
  summary: string
}

// Order matters — this is the dropdown display order
export const PROVIDER_ORDER: AIProvider[] = [
  'gemini-flash',
  'auto',
  'groq',
  'gemini-flash-lite',
]

export const DEFAULT_PROVIDER: AIProvider = 'gemini-flash'

export const PROVIDER_META: Record<AIProvider, {
  label: string
  shortLabel: string
  descEn: string
  descBm: string
  logoKey: 'auto' | 'groq' | 'gemini' | 'gemini-lite'
}> = {
  'gemini-flash': {
    label: 'Gemini 2.5 Flash',
    shortLabel: 'Gemini Flash',
    descEn: 'Handles very long lectures and nuanced topics.',
    descBm: 'Kendalikan kuliah panjang dan topik kompleks.',
    logoKey: 'gemini',
  },
  'auto': {
    label: 'Auto',
    shortLabel: 'Auto',
    descEn: 'Picks the best available AI. Never fails.',
    descBm: 'Pilih AI terbaik yang ada. Tidak pernah gagal.',
    logoKey: 'auto',
  },
  'groq': {
    label: 'Groq · Llama 3.3 70B',
    shortLabel: 'Groq',
    descEn: 'Lightning fast. Great for dense technical lectures.',
    descBm: 'Sangat pantas. Bagus untuk kuliah teknikal padat.',
    logoKey: 'groq',
  },
  'gemini-flash-lite': {
    label: 'Gemini 2.5 Flash-Lite',
    shortLabel: 'Flash-Lite',
    descEn: 'Best for short recaps, daily tutorials, simple notes.',
    descBm: 'Terbaik untuk ringkasan pendek, tutorial harian.',
    logoKey: 'gemini-lite',
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
- DO NOT invent facts not in the transcript. If transcript is gibberish/too short, return empty arrays and note in summary.
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
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
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

  try { return validateResult(JSON.parse(content)) }
  catch { throw new Error('Groq: malformed JSON') }
}

// ---------- Gemini ----------
async function callGemini(userMessage: string, model: string): Promise<AISummary> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
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

  try { return validateResult(JSON.parse(content)) }
  catch { throw new Error('Gemini: malformed JSON') }
}

// ---------- Main dispatcher ----------
// Auto fallback order: Gemini Flash → Groq → Gemini Flash-Lite (Gemini first as default preference)
export async function callAI(
  provider: AIProvider,
  userMessage: string
): Promise<{ result: AISummary; usedProvider: string }> {
  if (provider === 'gemini-flash') {
    return { result: await callGemini(userMessage, 'gemini-2.5-flash'), usedProvider: 'gemini-flash' }
  }
  if (provider === 'groq') {
    return { result: await callGroq(userMessage), usedProvider: 'groq' }
  }
  if (provider === 'gemini-flash-lite') {
    return { result: await callGemini(userMessage, 'gemini-2.5-flash-lite'), usedProvider: 'gemini-flash-lite' }
  }

  // Auto: Gemini Flash → Groq → Gemini Flash-Lite
  const chain: Array<{ name: string; fn: () => Promise<AISummary> }> = [
    { name: 'gemini-flash',      fn: () => callGemini(userMessage, 'gemini-2.5-flash') },
    { name: 'groq',              fn: () => callGroq(userMessage) },
    { name: 'gemini-flash-lite', fn: () => callGemini(userMessage, 'gemini-2.5-flash-lite') },
  ]
  const errors: string[] = []
  for (const { name, fn } of chain) {
    try {
      return { result: await fn(), usedProvider: name }
    } catch (e: any) {
      errors.push(`${name}: ${e.message}`)
    }
  }
  throw new Error(`All providers failed. ${errors.join(' | ')}`)
}
