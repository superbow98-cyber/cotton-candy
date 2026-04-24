// ============================================================
// STT Providers — 3-tier fallback chain
//
// 1st: Groq Whisper Turbo    (RM 0.19/hr) — cheapest primary
// 2nd: Grok STT (xAI)         (RM 0.47/hr) — highest accuracy fallback
// 3rd: Groq Whisper v3        (RM 0.53/hr) — most proven last resort
// ============================================================

export type Provider = 'groq-whisper-turbo' | 'grok-stt' | 'groq-whisper-v3'

export interface TranscriptResult {
  text: string
  usedProvider: Provider
  usedFallback: boolean
  attempts: { provider: Provider; error?: string }[]
}

export class STTError extends Error {
  constructor(message: string, public provider: string) {
    super(message)
    this.name = 'STTError'
  }
}

/**
 * Transcribe audio with 3-tier fallback chain.
 * Tries cheapest first, escalates only if each fails.
 */
export async function transcribeAudio(
  audioBlob: Blob,
  language: 'en' | 'ms' = 'en',
): Promise<TranscriptResult> {
  const attempts: TranscriptResult['attempts'] = []

  // === 1st: Groq Whisper Turbo (cheapest) ===
  try {
    const text = await callGroqWhisper(audioBlob, language, 'whisper-large-v3-turbo')
    attempts.push({ provider: 'groq-whisper-turbo' })
    return {
      text,
      usedProvider: 'groq-whisper-turbo',
      usedFallback: false,
      attempts,
    }
  } catch (err: any) {
    console.warn('[STT] Turbo failed, trying Grok STT:', err.message)
    attempts.push({ provider: 'groq-whisper-turbo', error: err.message })
  }

  // === 2nd: Grok STT (xAI) ===
  try {
    const text = await callGrokSTT(audioBlob, language)
    attempts.push({ provider: 'grok-stt' })
    return {
      text,
      usedProvider: 'grok-stt',
      usedFallback: true,
      attempts,
    }
  } catch (err: any) {
    console.warn('[STT] Grok STT failed, trying Whisper v3:', err.message)
    attempts.push({ provider: 'grok-stt', error: err.message })
  }

  // === 3rd: Groq Whisper v3 (most proven) ===
  try {
    const text = await callGroqWhisper(audioBlob, language, 'whisper-large-v3')
    attempts.push({ provider: 'groq-whisper-v3' })
    return {
      text,
      usedProvider: 'groq-whisper-v3',
      usedFallback: true,
      attempts,
    }
  } catch (err: any) {
    attempts.push({ provider: 'groq-whisper-v3', error: err.message })
    throw new STTError(
      `All 3 STT providers failed. Attempts: ${JSON.stringify(attempts)}`,
      'all',
    )
  }
}

/**
 * Groq Whisper — shared function for both Turbo (v3 Turbo) and v3
 * Endpoint: https://api.groq.com/openai/v1/audio/transcriptions
 */
async function callGroqWhisper(
  audioBlob: Blob,
  language: 'en' | 'ms',
  model: 'whisper-large-v3-turbo' | 'whisper-large-v3',
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    throw new STTError('GROQ_API_KEY not configured', model)
  }

  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', model)
  formData.append('language', language)
  formData.append('response_format', 'json')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown error')
    throw new STTError(`Groq ${model} ${res.status}: ${errText}`, model)
  }

  const data = await res.json()
  if (!data.text) {
    throw new STTError(`Groq ${model} returned no text`, model)
  }

  return data.text
}

/**
 * Grok STT — xAI Speech-to-Text
 * Endpoint: https://api.x.ai/v1/stt
 * Launched April 2026
 */
async function callGrokSTT(audioBlob: Blob, language: 'en' | 'ms'): Promise<string> {
  const apiKey = process.env.XAI_API_KEY
  if (!apiKey) {
    throw new STTError('XAI_API_KEY not configured', 'grok-stt')
  }

  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')
  formData.append('model', 'grok-stt')
  formData.append('language', language)
  formData.append('format', 'json')

  const res = await fetch('https://api.x.ai/v1/stt', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => 'unknown error')
    throw new STTError(`Grok STT ${res.status}: ${errText}`, 'grok-stt')
  }

  const data = await res.json()
  if (!data.text) {
    throw new STTError('Grok STT returned no text', 'grok-stt')
  }

  return data.text
}
