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

export type AudioUsageInfo = {
  allowed: boolean
  usedSeconds: number
  capSeconds: number
  remainingSeconds: number
  percentUsed: number
  reason?: string
}

export type TranscribeResponse = {
  text: string
  segments?: Array<{ start: number; end: number; text: string }>
  language?: string
  error?: string
  capReached?: boolean
  usage?: AudioUsageInfo
  audioSeconds?: number
}

/**
 * POST one audio blob to /api/transcribe.
 * Server forwards to Groq Whisper, returns JSON. No storage.
 * Throws CapReachedError if user's audio cap is reached.
 */
export class CapReachedError extends Error {
  usage?: AudioUsageInfo
  constructor(msg: string, usage?: AudioUsageInfo) {
    super(msg)
    this.name = 'CapReachedError'
    this.usage = usage
  }
}

/**
 * Convert any audio Blob (WebM/Opus) → WAV 16kHz mono
 * using Web Audio API — zero dependencies, runs in browser only.
 */
export async function convertToWav(blob: Blob): Promise<Blob> {
  try {
    const AudioCtx = (window.AudioContext || (window as any).webkitAudioContext)
    if (!AudioCtx) return blob

    const audioCtx = new AudioCtx()
    const arrayBuffer = await blob.arrayBuffer()
    const decoded = await audioCtx.decodeAudioData(arrayBuffer)
    audioCtx.close()

    const targetSampleRate = 16000
    const offlineCtx = new OfflineAudioContext(1, Math.ceil(decoded.duration * targetSampleRate), targetSampleRate)
    const source = offlineCtx.createBufferSource()
    source.buffer = decoded
    source.connect(offlineCtx.destination)
    source.start()
    const resampled = await offlineCtx.startRendering()

    const pcm = resampled.getChannelData(0)
    const wavBuffer = encodeWav(pcm, targetSampleRate)
    return new Blob([wavBuffer], { type: 'audio/wav' })
  } catch (e) {
    console.warn('[convertToWav] failed, using original:', e)
    return blob
  }
}

function encodeWav(pcm: Float32Array, sampleRate: number): ArrayBuffer {
  const int16 = new Int16Array(pcm.length)
  for (let i = 0; i < pcm.length; i++) {
    int16[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] * 32767)))
  }
  const buffer = new ArrayBuffer(44 + int16.byteLength)
  const view = new DataView(buffer)
  const write = (off: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i))
  }
  write(0, 'RIFF')
  view.setUint32(4, 36 + int16.byteLength, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, int16.byteLength, true)
  new Int16Array(buffer, 44).set(int16)
  return buffer
}

export async function transcribeOne(
  audioBlob: Blob,
  signal?: AbortSignal,
  language?: 'auto' | 'ms' | 'en' | 'zh' | 'ta',
): Promise<TranscribeResponse> {
  const form = new FormData()
  const wavBlob = await convertToWav(audioBlob)
  form.append('audio', wavBlob, 'chunk.wav')
  // Only pass language if explicitly set (not 'auto')
  if (language && language !== 'auto') {
    form.append('language', language)
  }
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
  if (res.status === 402 || data.capReached) {
    throw new CapReachedError(data.error || 'Audio cap reached', data.usage)
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
