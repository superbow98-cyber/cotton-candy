// src/lib/live-transcript.ts
// Live transcript engine — Groq Whisper + WebKit DUAL ENGINE (Option C)
//
// CARA KERJA:
// 1. Kedua-dua Groq + WebKit start serentak
// 2. WebKit — HANYA set onInterim (preview kelabu), TIDAK append final lines
// 3. Groq — cycle setiap 10s, produce final lines yang accurate
// 4. Groq fail (400/network) → promote lastInterimText jadi final line (WebKit cover)
// 5. Groq OK → clear interim, append final line dari Groq
//
// YANG TIDAK BERUBAH:
// - setLines(), linesRef, raw_transcript_md flow — sama je
// - /api/transcribe (clean transcript) — tidak disentuh
// - finishLecture(), save() — tidak disentuh
// - LectureRecorder.tsx — tiada perubahan (onLine + onInterim signature sama)

export type LiveLine = {
  id: string
  t: number
  text: string
  lang?: string
}

export type LiveTranscriptOptions = {
  language: string
  onLine: (line: LiveLine) => void
  onInterim?: (text: string) => void
  onError?: (err: string) => void
  onEngineChange?: (engine: 'groq' | 'webkit') => void
  getElapsed: () => number
}

const CHUNK_INTERVAL_MS = 10_000
const MIN_CHUNK_BYTES = 2_000

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

export class LiveTranscriptEngine {
  private opts: LiveTranscriptOptions
  private running = false

  // Groq refs
  private mediaStream: MediaStream | null = null
  private mediaRecorder: MediaRecorder | null = null
  private chunkInterval: ReturnType<typeof setInterval> | null = null
  private isSending = false
  private groqAvailable = false

  // WebKit refs
  private recognition: any = null

  // Track interim terkini dari WebKit — untuk promote kalau Groq fail
  private lastInterimText = ''

  constructor(opts: LiveTranscriptOptions) {
    this.opts = opts
  }

  async start(): Promise<void> {
    if (this.running) return
    this.running = true

    // Cuba start Groq — kalau ok, jalan dual engine
    // Kalau Groq unavailable, WebKit jadi sole engine (promote interim jadi final)
    this.groqAvailable = await this.startGroq()

    if (this.groqAvailable) {
      console.log('[live-transcript] Dual engine: Groq primary + WebKit interim')
      this.opts.onEngineChange?.('groq')
    } else {
      console.warn('[live-transcript] Groq unavailable — WebKit sole engine')
      this.opts.onEngineChange?.('webkit')
    }

    // WebKit sentiasa start — dual engine atau sole engine
    this.startWebkit()
  }

  async stop(): Promise<void> {
    this.running = false
    await this.stopGroq()
    this.stopWebkit()
  }

  async swapLanguage(newLangCode: string): Promise<void> {
    if (!this.running) return
    this.opts = { ...this.opts, language: newLangCode }
    // Restart WebKit dengan lang baru
    this.stopWebkit()
    setTimeout(() => this.startWebkit(), 120)
    // Groq ambil lang per-chunk — tak perlu restart
  }

  // ─────────────────────────────────────────
  // GROQ ENGINE
  // ─────────────────────────────────────────

  private async startGroq(): Promise<boolean> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) return false
      if (typeof MediaRecorder === 'undefined') return false

      const testRes = await fetch('/api/live-transcribe', {
        method: 'POST',
        body: (() => { const f = new FormData(); f.append('_test', '1'); return f })(),
      }).catch(() => null)

      if (testRes && testRes.status === 503) {
        console.warn('[live-transcript] Groq not configured (503)')
        return false
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      this.mediaStream = stream

      this.startNewRecorder(stream)

      // cycleRecorder setiap 10s — stop+start = complete WebM blob setiap kali
      this.chunkInterval = setInterval(() => {
        this.cycleRecorder()
      }, CHUNK_INTERVAL_MS)

      console.log('[live-transcript] Groq engine started')
      return true

    } catch (e: any) {
      console.warn('[live-transcript] Groq start failed:', e.message)
      this.mediaStream?.getTracks().forEach(t => t.stop())
      this.mediaStream = null
      return false
    }
  }

  private startNewRecorder(stream: MediaStream): void {
    const mimeCandidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
    ]
    const mime = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) || ''
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)

    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        this.sendBlob(e.data, rec.mimeType || mime || 'audio/webm')
      }
    }

    rec.onerror = () => {
      console.error('[live-transcript] MediaRecorder error')
      this.stopGroq()
    }

    rec.start()
    this.mediaRecorder = rec
  }

  private cycleRecorder(): void {
    const rec = this.mediaRecorder
    const stream = this.mediaStream
    if (!rec || !stream || rec.state !== 'recording') return

    rec.onstop = () => {
      if (!this.running) return
      this.startNewRecorder(stream)
    }

    rec.stop()
  }

  private async stopGroq(): Promise<void> {
    if (this.chunkInterval) {
      clearInterval(this.chunkInterval)
      this.chunkInterval = null
    }

    if (this.mediaRecorder) {
      this.mediaRecorder.onstop = null
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop()
        await new Promise(r => setTimeout(r, 300))
      }
    }

    this.mediaRecorder = null
    this.mediaStream?.getTracks().forEach(t => t.stop())
    this.mediaStream = null
  }

  private async sendBlob(blob: Blob, mime: string): Promise<void> {
    if (this.isSending) {
      console.log('[live-transcript] Still sending — skip chunk')
      return
    }
    if (blob.size < MIN_CHUNK_BYTES) {
      console.log(`[live-transcript] Chunk too small (${blob.size}B) — skip`)
      // Groq skip chunk kecil (senyap) — promote WebKit interim kalau ada
      this.promoteInterimIfAny('silence')
      return
    }

    this.isSending = true
    try {
      const whisperLang = toWhisperLang(this.opts.language)
      const ext = mime.includes('mp4') ? 'mp4'
                : mime.includes('ogg') ? 'ogg'
                : mime.includes('wav') ? 'wav'
                : 'webm'
      const form = new FormData()
      form.append('audio', blob, `chunk.${ext}`)
      if (whisperLang) form.append('language', whisperLang)

      const res = await fetch('/api/live-transcribe', {
        method: 'POST',
        body: form,
      })

      if (!res.ok) {
        console.warn(`[live-transcript] Groq ${res.status} — promote WebKit interim`)
        // Groq fail — WebKit cover: promote lastInterimText jadi final line
        this.promoteInterimIfAny('groq-error')
        return
      }

      const data = await res.json()
      if (data.text && data.text.trim().length > 0) {
        // Groq OK — clear interim, append Groq final line
        this.opts.onInterim?.('')
        this.lastInterimText = ''
        const line: LiveLine = {
          id: `g${Date.now()}${Math.random()}`,
          t: this.opts.getElapsed(),
          text: data.text.trim(),
          lang: this.opts.language,
        }
        this.opts.onLine(line)
      } else {
        // Groq return empty (senyap/hallucination filtered) — promote interim kalau ada
        this.promoteInterimIfAny('groq-empty')
      }

    } catch (e: any) {
      console.warn('[live-transcript] sendBlob error:', e.message)
      this.promoteInterimIfAny('network-error')
    } finally {
      this.isSending = false
    }
  }

  // Promote WebKit interim jadi final line kalau ada teks
  // Dipanggil bila Groq fail, senyap, atau error
  private promoteInterimIfAny(reason: string): void {
    const text = this.lastInterimText.trim()
    if (text.length < 3) return // terlalu pendek — skip
    console.log(`[live-transcript] Promote interim → final (${reason}): "${text.slice(0, 40)}"`)
    this.opts.onInterim?.('')
    this.lastInterimText = ''
    const line: LiveLine = {
      id: `w${Date.now()}${Math.random()}`,
      t: this.opts.getElapsed(),
      text,
      lang: this.opts.language,
    }
    this.opts.onLine(line)
  }

  // ─────────────────────────────────────────
  // WEBKIT ENGINE
  // ─────────────────────────────────────────

  private startWebkit(): void {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      // Kalau WebKit pun tak support dan Groq unavailable — report error
      if (!this.groqAvailable) {
        this.opts.onError?.('Speech recognition not supported in this browser')
      }
      return
    }

    try {
      const r = new SR()
      r.continuous = true
      r.interimResults = true
      r.lang = this.opts.language

      r.onresult = (e: any) => {
        let interimText = ''
        let finalText = ''

        for (let i = e.resultIndex; i < e.results.length; i++) {
          const chunk = e.results[i][0].transcript
          if (e.results[i].isFinal) finalText += chunk
          else interimText += chunk
        }

        // Gabung final + interim untuk lastInterimText
        const combined = (finalText + interimText).trim()
        if (combined) {
          this.lastInterimText = combined
        }

        if (this.groqAvailable) {
          // DUAL ENGINE MODE:
          // WebKit HANYA set interim (preview) — Groq yang produce final lines
          // Final text dari WebKit pun jadi interim — Groq akan confirm/replace dalam 10s
          const display = finalText || interimText
          if (display.trim()) {
            this.opts.onInterim?.(display.trim())
          }
        } else {
          // SOLE ENGINE MODE (Groq unavailable):
          // WebKit jadi primary — final text terus jadi final line
          if (finalText.trim()) {
            this.opts.onInterim?.('')
            this.lastInterimText = ''
            const line: LiveLine = {
              id: `w${Date.now()}${Math.random()}`,
              t: this.opts.getElapsed(),
              text: finalText.trim(),
              lang: this.opts.language,
            }
            this.opts.onLine(line)
          } else {
            this.opts.onInterim?.(interimText)
          }
        }
      }

      r.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          this.opts.onError?.('Microphone permission denied')
        }
        // Error lain (network, aborted) — biar onend handle restart
      }

      r.onend = () => {
        if (this.running) {
          try { r.start() } catch {}
        }
      }

      r.start()
      this.recognition = r
      console.log(`[live-transcript] WebKit engine started | lang: ${this.opts.language} | mode: ${this.groqAvailable ? 'interim-only' : 'sole'}`)

    } catch (e: any) {
      console.error('[live-transcript] WebKit start failed:', e)
      if (!this.groqAvailable) {
        this.opts.onError?.('Speech recognition failed to start')
      }
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
    this.lastInterimText = ''
  }
}
