// src/lib/whisper.ts
// Client helpers for Whisper enhancement

const CHUNK_DURATION_SEC = 9 * 60

export function shouldChunk(audioBlob: Blob): boolean {
  return audioBlob.size > 20 * 1024 * 1024
}

// Split blob ikut bytes — SELAMAT untuk WAV (raw PCM) sahaja
// JANGAN guna untuk WebM/MP4 — akan corrupt (tiada EBML header pada chunks)
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

// Hantar satu bahagian WAV ke /api/transcribe
// Internal — guna oleh transcribeOne sahaja
async function _sendWavPart(
  wavBlob: Blob,
  signal?: AbortSignal,
  language?: 'auto' | 'ms' | 'en' | 'zh' | 'ta',
): Promise<TranscribeResponse> {
  const form = new FormData()
  // Pastikan MIME type betul — Soniox semak MIME, bukan filename sahaja
  const audioBlob = wavBlob.type === 'audio/wav'
    ? wavBlob
    : new Blob([wavBlob], { type: 'audio/wav' })
  form.append('audio', audioBlob, 'audio.wav')
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

// WAV split ikut PCM samples, bukan bytes — lihat transcribeOne()
export async function transcribeOne(
  audioBlob: Blob,
  signal?: AbortSignal,
  language?: 'auto' | 'ms' | 'en' | 'zh' | 'ta',
  skipConversion = false,
): Promise<TranscribeResponse> {

  console.log(`[transcribeOne] v2 | ${audioBlob.type} | ${(audioBlob.size / 1024 / 1024).toFixed(2)}MB | skip=${skipConversion}`)

  // LANGKAH 1: Convert ke WAV — WAV boleh di-split, WebM tidak (EBML header issue)
  let wavBlob: Blob = audioBlob

  if (!skipConversion) {
    console.log(`[transcribeOne] converting to WAV...`)
    try {
      wavBlob = await convertToWav(audioBlob)
      console.log(`[transcribeOne] WAV ready | ${(wavBlob.size / 1024 / 1024).toFixed(2)}MB`)
    } catch (e) {
      console.warn('[transcribeOne] WAV conversion failed:', e)
      wavBlob = audioBlob
    }
  }

 // LANGKAH 2: Hantar — WAV mesti hantar penuh (jangan split bytes, corrupt header)
  // Kalau WAV > 4MB, kena split PCM sebelum encode — tapi buat dulu hantar penuh
  const ext = wavBlob.type.includes('wav') ? 'wav' : 'webm'
  const VERCEL_LIMIT = 4 * 1024 * 1024  // 4MB hard limit Vercel

  if (wavBlob.size <= VERCEL_LIMIT) {
    // Boleh hantar terus
    console.log(`[transcribeOne] sending | ${ext} | ${(wavBlob.size / 1024 / 1024).toFixed(2)}MB | lang: ${language || 'auto'}`)
    return _sendWavPart(wavBlob, signal, language)
  }

  // WAV > 4MB — kena split PCM dan encode semula setiap bahagian dengan header lengkap
  console.log(`[transcribeOne] WAV ${(wavBlob.size / 1024 / 1024).toFixed(2)}MB > 4MB — splitting PCM`)
  const arrayBuffer = await wavBlob.arrayBuffer()
  // Skip 44-byte WAV header, ambil PCM data sahaja
  const pcmData = new Int16Array(arrayBuffer, 44)
  const SAMPLE_RATE = 16000
  // ~110 saat PCM per part = ~3.5MB WAV (110s * 16000 * 2 bytes = 3.52MB + 44 header)
  const SAMPLES_PER_PART = 110 * SAMPLE_RATE

  const parts: Blob[] = []
  for (let offset = 0; offset < pcmData.length; offset += SAMPLES_PER_PART) {
    const slice = pcmData.slice(offset, offset + SAMPLES_PER_PART)
    // Encode semula dengan WAV header lengkap
    const partBuffer = new ArrayBuffer(44 + slice.byteLength)
    const view = new DataView(partBuffer)
    const write = (off: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i))
    }
    write(0, 'RIFF'); view.setUint32(4, 36 + slice.byteLength, true)
    write(8, 'WAVE'); write(12, 'fmt ')
    view.setUint32(16, 16, true); view.setUint16(20, 1, true)
    view.setUint16(22, 1, true); view.setUint32(24, SAMPLE_RATE, true)
    view.setUint32(28, SAMPLE_RATE * 2, true); view.setUint16(32, 2, true)
    view.setUint16(34, 16, true); write(36, 'data')
    view.setUint32(40, slice.byteLength, true)
    new Int16Array(partBuffer, 44).set(slice)
    parts.push(new Blob([partBuffer], { type: 'audio/wav' }))
  }

  console.log(`[transcribeOne] PCM split → ${parts.length} parts`)
  const results: TranscribeResponse[] = []
  for (let i = 0; i < parts.length; i++) {
    console.log(`[transcribeOne] part ${i + 1}/${parts.length} | ${(parts[i].size / 1024 / 1024).toFixed(2)}MB`)
    const r = await _sendWavPart(parts[i], signal, language)
    results.push(r)
  }

  const joinedText = results.map(r => r.text).filter(Boolean).join(' ').trim()
  console.log(`[transcribeOne] done | ${parts.length} parts | chars: ${joinedText.length}`)

  return {
    text: joinedText,
    language: results[0]?.language,
    audioSeconds: results.reduce((sum, r) => sum + (r.audioSeconds ?? 0), 0),
    usage: results[results.length - 1]?.usage,
  }
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
