// src/lib/whisper.ts
// Client helpers for Whisper enhancement

// ~25MB hard limit per Groq Whisper call.
// We aim for safe margin: chunk audio into ~9-minute pieces at typical webm/opus bitrate.
// MediaRecorder with default opus = ~32-48 kbps. 9 min * 60 * 48kbps / 8 = ~3.2MB per chunk.
// Well below limit, even on higher bitrates.
const CHUNK_DURATION_SEC = 9 * 60

/**
 * Split a long audio blob into ~9-minute chunks.
 * For webm/opus, we concatenate chunks via MediaRecorder timeslicing at recording time.
 * Here we accept a pre-chunked array of Blobs from the recorder.
 */
export function shouldChunk(audioBlob: Blob): boolean {
  return audioBlob.size > 20 * 1024 * 1024 // 20MB safety margin
}

export type TranscribeResponse = {
  text: string
  segments?: Array<{ start: number; end: number; text: string }>
  language?: string
  error?: string
}

/**
 * POST one audio blob to /api/transcribe.
 * Server forwards to Groq Whisper, returns JSON. No storage.
 */
export async function transcribeOne(audioBlob: Blob, signal?: AbortSignal): Promise<TranscribeResponse> {
  const form = new FormData()
  form.append('audio', audioBlob, 'chunk.webm')
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    body: form,
    signal,
  })
  const text = await res.text()
  let data: TranscribeResponse
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(`Transcribe failed (${res.status}): ${text.slice(0, 200)}`)
  }
  if (!res.ok || data.error) {
    throw new Error(data.error || `Transcribe failed (${res.status})`)
  }
  return data
}

/**
 * Transcribe multiple chunks in parallel and concatenate results in order.
 * Each chunk already represents ~9 minutes of audio.
 */
export async function transcribeChunks(
  chunks: Blob[],
  onProgress?: (done: number, total: number) => void,
): Promise<string> {
  const results = await Promise.all(
    chunks.map(async (c, i) => {
      const r = await transcribeOne(c)
      onProgress?.(i + 1, chunks.length)
      return r.text
    }),
  )
  return results.join('\n').trim()
}

/**
 * Format Whisper transcript into Cotton Candy's Line[] shape.
 * Whisper returns continuous text. We split by sentences and assign rough timestamps.
 */
export function whisperTextToLines(text: string, totalDurationSec: number): Array<{
  id: string; t: number; text: string; lang?: string
}> {
  const sentences = text
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map(s => s.trim())
    .filter(Boolean)
  if (sentences.length === 0) return []

  const perSentence = totalDurationSec / sentences.length
  return sentences.map((s, i) => ({
    id: `w${Date.now()}${i}`,
    t: Math.floor(i * perSentence),
    text: s,
    lang: 'auto',
  }))
}
