// ============================================================
// Cotton Candy — Multi-provider AI (Groq prioritized, DeepSeek for Flash slot)
// Order: Auto/Groq → GPT → Claude → DeepSeek → Gemini Flash-Lite
// ============================================================

export type AIProvider = 'gemini-flash' | 'auto' | 'groq' | 'gemini-flash-lite' | 'gpt-4o-mini' | 'claude-haiku'

export type AISummary = {
  // Common
  summary: string
  inferredTitle?: string  // v58.1: AI-generated title from transcript
  // Lecture
  topics?: string[]
  keyPoints?: string[]
  formulas?: string[]
  questions?: string[]
  // Meeting
  attendees?: string[]
  decisions?: string[]
  actionItems?: string[]
  openQuestions?: string[]
  // SV / Pre-viva
  feedback?: string[]
  requiredFixes?: string[]
  discussionPoints?: string[]
  nextMilestones?: string[]
  // Postmortem
  whatWorked?: string[]
  whatDidntWork?: string[]
  lessonsLearned?: string[]
  // Interview
  keyAnswers?: string[]
  quotes?: string[]
  followUpQuestions?: string[]
  themes?: string[]
}

// Order matters — this is the dropdown display order
export const PROVIDER_ORDER: AIProvider[] = [
  'gemini-flash',
  'auto',
  'groq',
  'gemini-flash-lite',
  'gpt-4o-mini',
  'claude-haiku',
]

export const DEFAULT_PROVIDER: AIProvider = 'auto'

export const PROVIDER_META: Record<AIProvider, {
  label: string
  shortLabel: string
  descEn: string
  descBm: string
  logoKey: 'auto' | 'groq' | 'gemini' | 'gemini-lite' | 'gpt' | 'claude'
  proOnly?: boolean
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
  'gpt-4o-mini': {
    label: 'GPT-4o mini',
    shortLabel: 'GPT-4o',
    descEn: 'OpenAI\'s efficient model. Consistent and accurate.',
    descBm: 'Model OpenAI yang cekap. Konsisten dan tepat.',
    logoKey: 'gpt',
    proOnly: true,
  },
  'claude-haiku': {
    label: 'Claude Haiku 3.5',
    shortLabel: 'Claude',
    descEn: 'Anthropic\'s nimble model. Natural-sounding notes.',
    descBm: 'Model Anthropic yang pantas. Nota terasa semula jadi.',
    logoKey: 'claude',
    proOnly: true,
  },
}

// Field schema map per section
const SECTION_SCHEMA: Record<string, { type: 'array' | 'string'; description: string }> = {
  inferredTitle:     { type: 'string', description: 'A concise 3-7 word title inferred from the discussion content (in the SAME language as transcript). Do NOT use any user-provided title.' },
  summary:           { type: 'string', description: '2-3 sentence TL;DR in the primary language used' },
  topics:            { type: 'array',  description: '3-8 main topics covered (2-6 word phrases)' },
  keyPoints:         { type: 'array',  description: '5-15 critical points (complete short sentences)' },
  formulas:          { type: 'array',  description: 'Math formulas, equations, dates, numbers, laws (empty if none)' },
  questions:         { type: 'array',  description: 'Questions raised in the session (empty if none)' },
  attendees:         { type: 'array',  description: 'People mentioned by name as participants' },
  decisions:         { type: 'array',  description: 'Decisions explicitly made (clear yes/no outcomes)' },
  actionItems:       { type: 'array',  description: 'Tasks assigned, format: "Owner: task by deadline" if owner stated' },
  openQuestions:     { type: 'array',  description: 'Questions left unresolved' },
  feedback:          { type: 'array',  description: "Supervisor's feedback on the work" },
  requiredFixes:     { type: 'array',  description: 'Must-do revisions or corrections' },
  discussionPoints:  { type: 'array',  description: 'Points discussed about methodology/findings' },
  nextMilestones:    { type: 'array',  description: 'Upcoming deadlines or milestones' },
  whatWorked:        { type: 'array',  description: 'Genuine wins, not generic platitudes' },
  whatDidntWork:     { type: 'array',  description: "Specific issues or failures (be candid)" },
  lessonsLearned:    { type: 'array',  description: 'Reusable lessons for future events' },
  keyAnswers:        { type: 'array',  description: 'Most important answers from the interviewee' },
  quotes:            { type: 'array',  description: '3-5 verbatim quotes (light cleanup ok)' },
  followUpQuestions: { type: 'array',  description: 'Suggested follow-up questions for next interview' },
  themes:            { type: 'array',  description: 'Recurring themes across responses' },
}

// Build a system prompt tailored to the recording type.
// `sections` is the list of fields the AI should emit, in order.
// `typeHint` is the type-specific guidance from RECORDING_TYPES.
export function buildSystemPrompt(sections: string[], typeHint: string): string {
  const schemaLines = sections.map((s) => {
    const meta = SECTION_SCHEMA[s] || { type: 'array', description: 'list of items' }
    if (meta.type === 'string') {
      return `  "${s}": "${meta.description}"`
    }
    return `  "${s}": ["${meta.description}", ...]`
  }).join(',\n')

  return `You are a helpful assistant that organizes raw recorded transcripts into clean, structured notes for Malaysian students and professionals.

${typeHint}

Input: a transcript from Malaysia. Speakers commonly use:
- Pure English
- Pure Bahasa Melayu (BM)
- ROJAK (natural mix of BM + EN, e.g. "okay so kita nak discuss tentang mitosis lah")

Output: STRICT JSON with this exact schema (no markdown, no extra text, just valid JSON):
{
${schemaLines}
}

Rules for handling Malaysian rojak speech:
- **CRITICAL TITLE INFERENCE:** ALWAYS generate inferredTitle from the actual discussion content (3-7 words). NEVER use any user-provided title from metadata. Analyze the transcript and create a concise title that reflects what was actually discussed. Title MUST be in the same language as transcript.
- **CRITICAL LANGUAGE MATCHING:** Output language MUST match transcript language exactly:
  - Transcript pure Bahasa Melayu → Output 100% Bahasa Melayu (inferredTitle, summary, topics, keyPoints, formulas, questions ALL in BM).
  - Transcript pure English → Output 100% English.
  - Transcript rojak (mix BM+EN) → Output rojak (mirror the mix natural).
- DO NOT translate. NEVER convert BM transcript to English notes or vice versa.
- Preserve common BM connectors and particles when natural: "yang, dengan, tu, je, kan, lah, ni, sebab, lepas tu, untuk".
- Common Malaysian phrases to recognize: "okay so", "actually", "basically", "macam ni", "lepas tu", "sebab tu", "dalam erti kata lain".
- Topic titles and key points: short, natural — NOT formal academic translation.
- Topics array MUST be populated (3-8 items) — these become mind map nodes. Empty topics = broken mind map.

Universal rules:
- DO NOT invent facts not in the transcript. If gibberish/too short, return mostly empty arrays.
- Fix obvious speech-recognition errors (e.g. "my toe corner dia" → "Mitochondria", "metafis" → "metaphase").
- Keep each list item concise: short complete sentences or phrases.
- Empty arrays are valid — better than fabricating content.
- Respond ONLY with the JSON object. No prose. No markdown fences. No explanations.`
}

// Default backwards-compat (for callers that don't pass type)
export const SYSTEM_PROMPT = buildSystemPrompt(
  ['inferredTitle', 'summary', 'topics', 'keyPoints', 'formulas', 'questions'],
  'This is a generic recording.',
)

function validateResult(raw: any): AISummary {
  const arr = (v: any, max: number) =>
    Array.isArray(v) ? v.slice(0, max).map(String).filter(Boolean) : undefined
  const str = (v: any, max: number) =>
    typeof v === 'string' ? v.slice(0, max) : ''

  return {
    summary:           str(raw?.summary, 1200),
    inferredTitle:     str(raw?.inferredTitle, 120) || undefined,
    topics:            arr(raw?.topics, 12),
    keyPoints:         arr(raw?.keyPoints, 20),
    formulas:          arr(raw?.formulas, 12),
    questions:         arr(raw?.questions, 10),
    attendees:         arr(raw?.attendees, 20),
    decisions:         arr(raw?.decisions, 15),
    actionItems:       arr(raw?.actionItems, 20),
    openQuestions:     arr(raw?.openQuestions, 10),
    feedback:          arr(raw?.feedback, 15),
    requiredFixes:     arr(raw?.requiredFixes, 15),
    discussionPoints:  arr(raw?.discussionPoints, 15),
    nextMilestones:    arr(raw?.nextMilestones, 10),
    whatWorked:        arr(raw?.whatWorked, 15),
    whatDidntWork:     arr(raw?.whatDidntWork, 15),
    lessonsLearned:    arr(raw?.lessonsLearned, 15),
    keyAnswers:        arr(raw?.keyAnswers, 15),
    quotes:            arr(raw?.quotes, 8),
    followUpQuestions: arr(raw?.followUpQuestions, 10),
    themes:            arr(raw?.themes, 10),
  }
}

// ---------- Groq ----------
async function callGroq(userMessage: string, systemPrompt: string = SYSTEM_PROMPT): Promise<AISummary> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
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

// ---------- DeepSeek V3 ----------
async function callDeepSeek(userMessage: string, systemPrompt: string = SYSTEM_PROMPT): Promise<AISummary> {
  const apiKey = process.env.DEEPSEEK_API_KEY
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured')

  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`DeepSeek ${res.status}: ${errText.slice(0, 200)}`)
  }

  const json = await res.json()
  const content = json?.choices?.[0]?.message?.content
  if (!content) throw new Error('DeepSeek: empty response')

  try { return validateResult(JSON.parse(content)) }
  catch { throw new Error('DeepSeek: malformed JSON') }
}

// ---------- Gemini ----------
async function callGemini(userMessage: string, model: string, systemPrompt: string = SYSTEM_PROMPT): Promise<AISummary> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured')

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { role: 'system', parts: [{ text: systemPrompt }] },
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

// Retry helper — waits and retries once on transient errors (503, 429, network)
async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  try {
    return await fn()
  } catch (e: any) {
    const msg = String(e?.message || '')
    const isTransient = /503|429|overload|unavailable|timeout|network|fetch failed/i.test(msg)
    if (!isTransient) throw e
    console.warn(`[${label}] transient error, retrying in 2s:`, msg.slice(0, 120))
    await new Promise(r => setTimeout(r, 2000))
    return fn()
  }
}

// ---------- GPT-4o mini ----------
async function callGPT(userMessage: string, systemPrompt: string = SYSTEM_PROMPT): Promise<AISummary> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured')

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.2,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`GPT ${res.status}: ${errText.slice(0, 200)}`)
  }

  const json = await res.json()
  const content = json?.choices?.[0]?.message?.content
  if (!content) throw new Error('GPT: empty response')

  try { return validateResult(JSON.parse(content)) }
  catch { throw new Error('GPT: malformed JSON') }
}

// ---------- Claude Haiku ----------
async function callClaude(userMessage: string, systemPrompt: string = SYSTEM_PROMPT): Promise<AISummary> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.2,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Claude ${res.status}: ${errText.slice(0, 200)}`)
  }

  const json = await res.json()
  const content = json?.content?.[0]?.text
  if (!content) throw new Error('Claude: empty response')

  // Claude may wrap in markdown — strip fences
  const clean = content.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
  try { return validateResult(JSON.parse(clean)) }
  catch { throw new Error('Claude: malformed JSON') }
}

// Every single-provider call now has retry + auto-fallback.
// User's chosen provider is attempted first, then fallback chain.
// `systemPrompt` is type-aware (built via buildSystemPrompt).
// `plan` gates GPT-4o mini + Claude Haiku (month/year/student_pro only)
// v20.2: gemini-flash slot → DeepSeek V3, claude model fixed, isProPlan fixed
export async function callAI(
  provider: AIProvider,
  userMessage: string,
  systemPrompt: string = SYSTEM_PROMPT,
  plan?: string,
): Promise<{ result: AISummary; usedProvider: string; fellBack: boolean }> {
  // Plans allowed to use GPT + Claude
  const isProPlan = plan === 'month' || plan === 'year' || plan === 'student_pro'

  // If user picks pro-only provider but not on pro plan — fallback to auto
  const effectiveProvider = (provider === 'gpt-4o-mini' || provider === 'claude-haiku') && !isProPlan
    ? 'auto'
    : provider

  // Build all providers
  const allProviders: Array<{ name: string; fn: () => Promise<AISummary> }> = [
    { name: 'gemini-flash',      fn: () => callDeepSeek(userMessage, systemPrompt) },
    { name: 'groq',              fn: () => callGroq(userMessage, systemPrompt) },
    { name: 'gemini-flash-lite', fn: () => callGemini(userMessage, 'gemini-2.5-flash-lite', systemPrompt) },
    { name: 'gpt-4o-mini',      fn: () => callGPT(userMessage, systemPrompt) },
    { name: 'claude-haiku',      fn: () => callClaude(userMessage, systemPrompt) },
  ]

  // Build chain: chosen provider first, Groq as stable fallback
  let chain: typeof allProviders
  if (effectiveProvider === 'gemini-flash') {
    chain = [allProviders[0], allProviders[1], allProviders[2]]
  } else if (effectiveProvider === 'groq') {
    chain = [allProviders[1], allProviders[3], allProviders[4], allProviders[0], allProviders[2]]
  } else if (effectiveProvider === 'gemini-flash-lite') {
    chain = [allProviders[2], allProviders[1], allProviders[0]]
  } else if (effectiveProvider === 'gpt-4o-mini') {
    chain = [allProviders[3], allProviders[1], allProviders[0], allProviders[2]]
  } else if (effectiveProvider === 'claude-haiku') {
    chain = [allProviders[4], allProviders[1], allProviders[0], allProviders[2]]
  } else {
    // 'auto' — Groq first (stable), GPT/Claude if available, DeepSeek last resort
    chain = [allProviders[1], allProviders[3], allProviders[4], allProviders[0], allProviders[2]]
  }

  const errors: string[] = []
  for (let i = 0; i < chain.length; i++) {
    const { name, fn } = chain[i]
    try {
      const result = await withRetry(fn, name)
      return { result, usedProvider: name, fellBack: i > 0 }
    } catch (e: any) {
      errors.push(`${name}: ${String(e.message).slice(0, 100)}`)
      console.warn(`[callAI] ${name} failed:`, e.message)
    }
  }
  throw new Error(`All providers failed. ${errors.join(' | ')}`)
}
