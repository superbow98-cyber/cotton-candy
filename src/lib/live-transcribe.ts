// src/lib/live-transcript.ts
// Live transcript engine — Groq Whisper (primary) + webkitSpeechRecognition (fallback)
//
// CARA KERJA:
// 1. Cuba Groq Whisper — rakam mic, potong setiap CHUNK_INTERVAL_MS, hantar ke /api/live-transcribe
// 2. Kalau Groq fail (API error, GROQ_API_KEY tak set, dll) → auto fallback ke webkitSpeechRecognition
// 3. Output: onLine callback → caller append ke setLines() seperti biasa
//
// YANG TIDAK BERUBAH:
// - setLines(), linesRef, raw_transcript_md flow — sama je
// - /api/transcribe (clean transcript) — tidak disentuh langsung
// - finishLecture(), save() — tidak disentuh

export type LiveLine = {
  id: string
  t: number
  text: string
  lang?: string
}

export type LiveTranscriptOptions = {
  language: string            // e.g. 'ms-MY', 'en-US', 'zh-CN', 'ta-MY'
  onLine: (line: LiveLine) => void
  onInterim?: (text: string) => void
  onError?: (err: string) => void
  onEngineChange?: (engine: 'groq' | 'webkit') => void
  getElapsed: () => number    // fungsi untuk dapat elapsed seconds semasa
}

// Chunk interval — setiap 10s rakam, hantar ke Groq
const CHUNK_INTERVAL_MS = 10_000

// Min size untuk hantar ke Groq — skip kalau terlalu kecil (silence/noise)
const MIN_CHUNK_BYTES = 2_000

// Map dari SpeechRecognition lang code ke Groq/Whisper language code
function toWhisperLang(langCode: string): string | null {
  const map: Record<string, string> = {
    'ms-MY': 'ms',
    'en-US': 'en',
    'en-IN': 'en',
    'zh-CN': 'zh',
    'ta-MY': 'ta',
    'ar-SA': 'ar',
  }
  return map[langCode] || null
}

// ─────────────────────────────────────────────
// CLASS: LiveTranscriptEngine
// ─────────────────────────────────────────────
export class LiveTranscriptEngine {
  private opts: LiveTranscriptOptions
  private engine: 'groq' | 'webkit' = 'groq'
  private running = false

  // Groq engine refs
  private mediaStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private chunkInterval: ReturnType<typeof setInterval> | null = null
  private pendingChunks: Blob[] = []
  private currentChunkData: Blob[] = []
  private isSending = false

  // WebKit engine refs
  private recognition: any = null

  constructor(opts: LiveTranscriptOptions) {
    this.opts = opts
  }

  // ── PUBLIC: start ──
  async start(): Promise<void> {
    if (this.running) return
    this.running = true

    // Cuba Groq dulu
    const groqOk = await this.startGroq()
    if (!groqOk) {
      console.warn('[live-transcript] Groq unavailable — fallback to webkitSpeechRecognition')
      this.engine = 'webkit'
      this.opts.onEngineChange?.('webkit')
      this.startWebkit()
    } else {
      this.engine = 'groq'
      this.opts.onEngineChange?.('groq')
    }
  }

  // ── PUBLIC: stop ──
  async stop(): Promise<void> {
    this.running = false
    if (this.engine === 'groq') {
      await this.stopGroq()
    } else {
      this.stopWebkit()
    }
  }

  // ── PUBLIC: swap language semasa running ──
  async swapLanguage(newLangCode: string): Promise<void> {
    if (!this.running) return
    this.opts = { ...this.opts, language: newLangCode }

    if (this.engine === 'groq') {
      // Groq — language hint diambil per-chunk, tak perlu restart
      // Tapi perlu restart recognition untuk language baru
    } else {
      // WebKit — kena restart dengan lang baru
      this.stopWebkit()
      setTimeout(() => this.startWebkit(), 120)
    }
  }

  // ─────────────────────────────────────────
  // GROQ ENGINE
  // ─────────────────────────────────────────

  private async startGroq(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return false
      if (typeof MediaRecorder === 'undefined') return false

      // Test GROQ endpoint dulu — kalau server return 503 (key tak set), terus fallback
      const testRes = await fetch('/api/live-transcribe', {
        method: 'POST',
        body: (() => { const f = new FormData(); f.append('_test', '1'); return f })(),
      }).catch(() => null)

      // 503 = GROQ_API_KEY tak set, 401 = auth issue
      // Anything else (400 = no audio = OK, means endpoint live)
      if (testRes && testRes.status === 503) {
        console.warn('[live-transcript] Groq not configured (503)')
        return false
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaStream = stream

      const mimeCandidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/ogg;codecs=opus',
      ]
      const mime = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) || ''
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)

      this.currentChunkData = []

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.currentChunkData.push(e.data)
        }
      }

      rec.onerror = () => {
        console.error('[live-transcript] MediaRecorder error — fallback to webkit')
        this.stopGroq().then(() => {
          if (this.running) {
            this.engine = 'webkit'
            this.opts.onEngineChange?.('webkit')
            this.startWebkit()
          }
        })
      }

      // Record continuously, collect data every 1s
      rec.start(1000)
      this.mediaRecorder = rec

      // Send chunk every CHUNK_INTERVAL_MS
      this.chunkInterval = setInterval(() => {
        this.sendCurrentChunk()
      }, CHUNK_INTERVAL_MS)

      console.log(`[live-transcript] Groq engine started | mime: ${mime || 'default'}`)
      return true

    } catch (e: any) {
      console.warn('[live-transcript] Groq start failed:', e.message)
      // Cleanup kalau partial setup
      this.mediaStream?.getTracks().forEach(t => t.stop())
      this.mediaStream = null
      return false
    }
  }

  private async stopGroq(): Promise<void> {
    if (this.chunkInterval) {
      clearInterval(this.chunkInterval)
      this.chunkInterval = null
    }
    // Send final chunk kalau ada
    await this.sendCurrentChunk(true)

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop() } catch {}
    }
    this.mediaRecorder = null
    this.mediaStream?.getTracks().forEach(t => t.stop())
    this.mediaStream = null
  }

  private async sendCurrentChunk(isFinal = false): Promise<void> {
    if (this.isSending) return
    if (this.currentChunkData.length === 0) return

    // Ambil data semasa, reset untuk next interval
    const chunks = this.currentChunkData.splice(0)
    const mime = this.mediaRecorder?.mimeType || 'audio/webm'
    const blob = new Blob(chunks, { type: mime })

    if (blob.size < MIN_CHUNK_BYTES) {
      console.log(`[live-transcript] Chunk too small (${blob.size}B) — skip`)
      return
    }

    this.isSending = true
    try {
      const whisperLang = toWhisperLang(this.opts.language)
      const form = new FormData()
      const ext = mime.includes('mp4') ? 'mp4'
                : mime.includes('ogg') ? 'ogg'
                : mime.includes('wav') ? 'wav'
                : 'webm'
      form.append('audio', blob, `chunk.${ext}`)
      if (whisperLang) form.append('language', whisperLang)

      const res = await fetch('/api/live-transcribe', {
        method: 'POST',
        body: form,
      })

      if (!res.ok) {
        // Groq API error — fallback ke webkit kalau bukan final
        if (!isFinal && this.running) {
          console.warn(`[live-transcript] Groq API error ${res.status} — falling back to webkit`)
          await this.stopGroq()
          this.engine = 'webkit'
          this.opts.onEngineChange?.('webkit')
          this.startWebkit()
        }
        return
      }

      const data = await res.json()

      if (data.text && data.text.trim().length > 0) {
        const line: LiveLine = {
          id: `g${Date.now()}${Math.random()}`,
          t: this.opts.getElapsed(),
          text: data.text.trim(),
          lang: this.opts.language,
        }
        this.opts.onLine(line)
      }

    } catch (e: any) {
      console.warn('[live-transcript] sendChunk error:', e.message)
      // Network error — fallback ke webkit
      if (!isFinal && this.running) {
        await this.stopGroq()
        this.engine = 'webkit'
        this.opts.onEngineChange?.('webkit')
        this.startWebkit()
      }
    } finally {
      this.isSending = false
    }
  }

  // ─────────────────────────────────────────
  // WEBKIT ENGINE (fallback)
  // ─────────────────────────────────────────

  private startWebkit(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      this.opts.onError?.('Speech recognition not supported in this browser')
      return
    }

    try {
      const r = new SR()
      r.continuous = true
      r.interimResults = true
      r.lang = this.opts.language

      r.onresult = (e: any) => {
        let finalText = ''
        let interimText = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const chunk = e.results[i][0].transcript
          if (e.results[i].isFinal) finalText += chunk
          else interimText += chunk
        }
        if (finalText.trim()) {
          const line: LiveLine = {
            id: `w${Date.now()}${Math.random()}`,
            t: this.opts.getElapsed(),
            text: finalText.trim(),
            lang: this.opts.language,
          }
          this.opts.onLine(line)
          this.opts.onInterim?.('')
        } else {
          this.opts.onInterim?.(interimText)
        }
      }

      r.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          this.opts.onError?.('Microphone permission denied')
        }
      }

      // Auto-restart webkit kalau stop (normal behaviour)
      r.onend = () => {
        if (this.running && this.engine === 'webkit') {
          try { r.start() } catch {}
        }
      }

      r.start()
      this.recognition = r
      console.log(`[live-transcript] WebKit engine started | lang: ${this.opts.language}`)

    } catch (e: any) {
      console.error('[live-transcript] WebKit start failed:', e)
      this.opts.onError?.('Speech recognition failed to start')
    }
  }

  private stopWebkit(): void {
    if (this.recognition) {
      try {
        this.recognition.onend = null
        this.recognition.stop()
      } catch {}
      this.recognition = null
    }
    this.opts.onInterim?.('')
  }
}
