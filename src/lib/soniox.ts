// src/lib/soniox.ts
// Soniox async transcription client (server-only)
// API docs: https://soniox.com/docs/stt/async/async-transcription

const SONIOX_API_BASE = 'https://api.soniox.com'
const ASYNC_MODEL = 'stt-async-preview'  // Soniox's main async model
const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 50_000  // matches Vercel maxDuration: 60s

export interface SonioxToken {
  text: string
  start_ms: number
  end_ms: number
  confidence: number
  language?: string
  speaker?: string
}

export interface SonioxTranscript {
  text: string
  tokens: SonioxToken[]
  audio_duration_ms?: number
}

function authHeaders() {
  const key = process.env.SONIOX_API_KEY
  if (!key) throw new Error('SONIOX_API_KEY not configured')
  return { Authorization: `Bearer ${key}` }
}

/**
 * Upload audio file to Soniox. Returns file_id.
 * Fix: wrap Blob as File with explicit mime type so Soniox can determine audio duration.
 */
async function uploadFile(audio: Blob, filename = 'audio.webm'): Promise<string> {
  // Strip codecs param — Soniox rejects 'audio/webm;codecs=opus', needs plain 'audio/webm'
  const rawMime = audio.type || 'audio/webm'
  const mimeType = rawMime.split(';')[0].trim()
  const file = new File([audio], filename, { type: mimeType })
  const form = new FormData()
  form.append('file', file, filename)

  const res = await fetch(`${SONIOX_API_BASE}/v1/files`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Soniox file upload failed (${res.status}): ${err.slice(0, 300)}`)
  }
  const data = await res.json()
  return data.id
}

/**
 * Create transcription job. Returns transcription_id.
 */
async function createTranscription(
  fileId: string,
  languageHints?: string[],
  context?: string
): Promise<string> {
  const body: any = {
    model: ASYNC_MODEL,
    file_id: fileId,
  }
  if (languageHints && languageHints.length > 0) {
    body.languages = languageHints
  }
  if (context) {
    body.context = context
  }

  const res = await fetch(`${SONIOX_API_BASE}/v1/transcriptions`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Soniox createTranscription failed (${res.status}): ${err.slice(0, 300)}`)
  }
  const data = await res.json()
  return data.id
}

/**
 * Poll transcription status until completed or failed.
 */
async function waitForCompletion(transcriptionId: string): Promise<{ duration_ms: number }> {
  const start = Date.now()
  while (Date.now() - start < POLL_TIMEOUT_MS) {
    const res = await fetch(`${SONIOX_API_BASE}/v1/transcriptions/${transcriptionId}`, {
      headers: authHeaders(),
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Soniox poll failed (${res.status}): ${err.slice(0, 300)}`)
    }
    const data = await res.json()
    const status = data.status as string

    if (status === 'completed') {
      return { duration_ms: data.audio_duration_ms || 0 }
    }
    if (status === 'error' || status === 'failed') {
      throw new Error(`Soniox transcription failed: ${data.error_message || 'unknown'}`)
    }

    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
  }
  throw new Error(`Soniox transcription timed out after ${POLL_TIMEOUT_MS}ms`)
}

/**
 * Fetch the completed transcript.
 */
async function fetchTranscript(transcriptionId: string): Promise<SonioxTranscript> {
  const res = await fetch(`${SONIOX_API_BASE}/v1/transcriptions/${transcriptionId}/transcript`, {
    headers: authHeaders(),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Soniox fetchTranscript failed (${res.status}): ${err.slice(0, 300)}`)
  }
  return await res.json()
}

/**
 * Cleanup: delete transcription job + uploaded file.
 * Errors are logged but never thrown (cleanup is best-effort).
 */
async function cleanup(transcriptionId: string | null, fileId: string | null) {
  try {
    if (transcriptionId) {
      await fetch(`${SONIOX_API_BASE}/v1/transcriptions/${transcriptionId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
    }
  } catch (e: any) {
    console.warn('[soniox] cleanup transcription failed:', e.message)
  }
  try {
    if (fileId) {
      await fetch(`${SONIOX_API_BASE}/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
    }
  } catch (e: any) {
    console.warn('[soniox] cleanup file failed:', e.message)
  }
}

/**
 * High-level: upload audio and get transcript text + duration.
 * Cleans up uploaded file + transcription job after.
 */
export async function transcribeWithSoniox(
  audio: Blob,
  filename: string,
  options: { languageHints?: string[]; context?: string } = {}
): Promise<{ text: string; tokens: SonioxToken[]; audioSeconds: number; language: string }> {
  let fileId: string | null = null
  let transcriptionId: string | null = null
  try {
    fileId = await uploadFile(audio, filename)
    transcriptionId = await createTranscription(fileId, options.languageHints, options.context)
    const { duration_ms } = await waitForCompletion(transcriptionId)
    const transcript = await fetchTranscript(transcriptionId)

    // Detect dominant language from token languages
    const langCounts: Record<string, number> = {}
    for (const t of transcript.tokens || []) {
      if (t.language) langCounts[t.language] = (langCounts[t.language] || 0) + 1
    }
    const dominantLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'auto'

    return {
      text: transcript.text || '',
      tokens: transcript.tokens || [],
      audioSeconds: Math.ceil((duration_ms || 0) / 1000),
      language: dominantLang,
    }
  } finally {
    await cleanup(transcriptionId, fileId)
  }
}
