// src/lib/whisper.ts
// Client helpers for Whisper enhancement

const CHUNK_DURATION_SEC = 9 * 60

export function shouldChunk(audioBlob: Blob): boolean {
  return audioBlob.size > 20 * 1024 * 1024
}
// Tambah selepas shouldChunk()
export function splitBlob(blob: Blob, maxBytes = 3.5 * 1024 * 1024): Blob[] {
  if (blob.size <= maxBytes) return [blob]
  const parts: Blob[] = []
  let offset = 0
  while (offset < blob.size) {
    parts.push(blob.slice(offset, offset + maxBytes, blob.type))
    offset += maxBytes
  }
  return parts
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

export class CapReachedError extends Error {
  usage?: AudioUsageInfo
  constructor(msg: string, usage?: AudioUsageInfo) {
    super(msg)
    this.name = 'CapReachedError'
    this.usage = usage
  }
}

/**
 * Convert any audio Blob (WebM/Opus/MP4) → WAV 16kHz mono
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

/**
 * Detect if running on Chrome iOS (CriOS) — produce audio/mp4 yang server ffmpeg tak boleh handle
 * sebab ffmpeg-static ENOENT dalam Vercel Lambda.
 * Fix: convert client-side ke WAV sebelum hantar ke server.
 */
function isChromeIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /CriOS/i.test(navigator.userAgent)
}

export async function transcribeOne(
  audioBlob: Blob,
  signal?: AbortSignal,
  language?: 'auto' | 'ms' | 'en' | 'zh' | 'ta',
  skipConversion = false,
): Promise<TranscribeResponse> {
  const form = new FormData()

  let finalBlob = audioBlob
  let ext = audioBlob.type.includes('mp4') ? 'mp4'
           : audioBlob.type.includes('ogg') ? 'ogg'
           : audioBlob.type.includes('wav') ? 'wav'
           : 'webm'

  // FIX: Chrome iOS convert ke WAV
  if (!skipConversion && isChromeIOS() && (audioBlob.type.includes('mp4') || audioBlob.type.includes('webm'))) {
    console.log('[transcribeOne] Chrome iOS detected — converting to WAV client-side')
    try {
      finalBlob = await convertToWav(audioBlob)
      ext = 'wav'
      console.log(`[transcribeOne] WAV conversion done | ${finalBlob.size}B`)
    } catch (e) {
      console.warn('[transcribeOne] WAV conversion failed, using original:', e)
      finalBlob = audioBlob
    }
  }

  // FIX: Groq limit 25MB — kalau blob terlalu besar, hantar terus ke /api/transcribe
  // (server-side Soniox boleh handle saiz besar, Groq ada limit)
  const MAX_SIZE = 24 * 1024 * 1024  // 24MB safe limit
  if (finalBlob.size > MAX_SIZE) {
    console.warn(`[transcribeOne] blob ${(finalBlob.size / 1024 / 1024).toFixed(1)}MB > 24MB — splitting not supported, sending as-is (server will handle via Soniox)`)
  }

  const MAX_VERCEL_BYTES = 4 * 1024 * 1024  // 4MB safe limit (Vercel = 4.5MB)

// Kalau blob > 4MB, split dan transcribe bahagian terbesar sahaja
// (untuk rakaman panjang, Soniox server lebih sesuai — ini fallback path)
let sendBlob = finalBlob
if (finalBlob.size > MAX_VERCEL_BYTES) {
  console.warn(`[transcribeOne] blob ${(finalBlob.size / 1024 / 1024).toFixed(1)}MB > 4MB — trimming to first 4MB`)
  sendBlob = finalBlob.slice(0, MAX_VERCEL_BYTES, finalBlob.type)
}

console.log(`[transcribeOne] sending | ${ext} | ${(sendBlob.size / 1024 / 1024).toFixed(2)}MB | lang: ${language || 'auto'}`)

form.append('audio', sendBlob, `audio.${ext}`)
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
