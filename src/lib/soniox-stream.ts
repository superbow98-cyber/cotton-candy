'use client'
// src/lib/soniox-stream.ts
// v57.9: Fixed Soniox streaming using proper SonioxClient API

import { useEffect, useRef, useState, useCallback } from 'react'

interface SonioxToken {
  text: string
  is_final?: boolean
  confidence?: number
  language?: string
  start_ms?: number
  end_ms?: number
  speaker?: string
}

interface UseSonioxStreamOptions {
  languageHints?: string[]
  context?: any
  onError?: (status: string, message: string) => void
}

interface UseSonioxStreamReturn {
  isReady: boolean
  isStreaming: boolean
  error: string | null
  finalText: string
  partialText: string
  detectedLanguage: string
  start: () => Promise<void>
  stop: () => Promise<{ text: string; tokenCount: number; audioSeconds: number; language: string }>
  reset: () => void
}

export function useSonioxStream(options: UseSonioxStreamOptions = {}): UseSonioxStreamReturn {
  const [isReady, setIsReady] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [finalText, setFinalText] = useState('')
  const [partialText, setPartialText] = useState('')
  const [detectedLanguage, setDetectedLanguage] = useState('auto')

  const clientRef = useRef<any>(null)
  const RecordTranscribeRef = useRef<any>(null)
  const finalAccumRef = useRef<string>('')
  const startTimeRef = useRef<number>(0)
  const tokenCountRef = useRef<number>(0)
  const langCountsRef = useRef<Record<string, number>>({})

  // Lazy-load Soniox library
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const mod = await import('@soniox/speech-to-text-web')
        if (cancelled) return
        // Try both export names (library evolution)
        RecordTranscribeRef.current = (mod as any).RecordTranscribe || (mod as any).SonioxClient
        if (!RecordTranscribeRef.current) {
          throw new Error('No RecordTranscribe/SonioxClient export found')
        }
        setIsReady(true)
        console.log('[soniox-stream] library loaded')
      } catch (e: any) {
        console.error('[soniox-stream] load failed:', e)
        setError(`load_failed: ${e.message}`)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const start = useCallback(async () => {
    if (!RecordTranscribeRef.current) {
      throw new Error('Soniox library not loaded')
    }
    if (clientRef.current) {
      throw new Error('Already streaming')
    }

    setError(null)
    setFinalText('')
    setPartialText('')
    finalAccumRef.current = ''
    tokenCountRef.current = 0
    langCountsRef.current = {}
    startTimeRef.current = Date.now()

    const RecordTranscribe = RecordTranscribeRef.current

    // Function to fetch fresh temp key
    const getApiKey = async () => {
      const res = await fetch('/api/soniox-token', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Token fetch failed: ${res.status}`)
      }
      const data = await res.json()
      return data.api_key
    }

    // Constructor with apiKey + onPartialResult
    const client = new RecordTranscribe({
      apiKey: getApiKey,
      onStarted: () => {
        console.log('[soniox-stream] started')
        setIsStreaming(true)
      },
      onFinished: () => {
        console.log('[soniox-stream] finished')
        setIsStreaming(false)
        setPartialText('')
      },
      onPartialResult: (result: { tokens?: SonioxToken[]; words?: SonioxToken[] }) => {
        // Try both `tokens` (new API) and `words` (legacy)
        const tokens: SonioxToken[] = result.tokens || result.words || []

        let finalThisCallback = ''
        let partialBuf = ''

        for (const t of tokens) {
          if (t.is_final) {
            finalThisCallback += t.text
            tokenCountRef.current++
            if (t.language) {
              langCountsRef.current[t.language] = (langCountsRef.current[t.language] || 0) + 1
            }
          } else {
            partialBuf += t.text
          }
        }

        // Append finalized tokens (Soniox only sends NEW finals, not all)
        // But just to be safe, library may behave either way:
        // - If sends only new finals → accumulate
        // - If sends all finals each time → replace
        // Using endpoint_detection to keep things simple, accumulate is safer
        if (finalThisCallback) {
          finalAccumRef.current += finalThisCallback
          setFinalText(finalAccumRef.current)
        }
        setPartialText(partialBuf)

        // Update detected language
        const langs = Object.entries(langCountsRef.current).sort((a, b) => b[1] - a[1])
        if (langs.length > 0) {
          setDetectedLanguage(langs[0][0])
        }
      },
      onError: (status: string, message: string) => {
        console.error('[soniox-stream] error:', status, message)
        setError(`${status}: ${message || 'Unknown'}`)
        setIsStreaming(false)
        if (options.onError) options.onError(status, message)
      },
    })

    clientRef.current = client

    // Start with proper config — model + audio format CRITICAL
    client.start({
      model: 'stt-rt-preview',
      audioFormat: 's16le',
      numChannels: 1,
      sampleRate: 16000,
      languageHints: options.languageHints || ['ms', 'en'],
      context: options.context,
      enableLanguageIdentification: true,
      enableEndpointDetection: true,
    })

    console.log('[soniox-stream] start() called with config')
  }, [options])

  const stop = useCallback(async () => {
    const audioSeconds = Math.ceil((Date.now() - startTimeRef.current) / 1000)
    if (!clientRef.current) {
      return {
        text: finalAccumRef.current,
        tokenCount: tokenCountRef.current,
        audioSeconds,
        language: detectedLanguage,
      }
    }

    try {
      await clientRef.current.stop()
    } catch (e) {
      console.warn('[soniox-stream] stop warning:', e)
    }
    clientRef.current = null

    setIsStreaming(false)
    setPartialText('')

    return {
      text: finalAccumRef.current,
      tokenCount: tokenCountRef.current,
      audioSeconds,
      language: detectedLanguage,
    }
  }, [detectedLanguage])

  const reset = useCallback(() => {
    if (clientRef.current) {
      try { clientRef.current.cancel?.() || clientRef.current.stop?.() } catch {}
      clientRef.current = null
    }
    setFinalText('')
    setPartialText('')
    setDetectedLanguage('auto')
    setError(null)
    setIsStreaming(false)
    finalAccumRef.current = ''
    tokenCountRef.current = 0
    langCountsRef.current = {}
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        try { clientRef.current.cancel?.() || clientRef.current.stop?.() } catch {}
        clientRef.current = null
      }
    }
  }, [])

  return {
    isReady,
    isStreaming,
    error,
    finalText,
    partialText,
    detectedLanguage,
    start,
    stop,
    reset,
  }
}
