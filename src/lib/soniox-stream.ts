'use client'
// src/lib/soniox-stream.ts
// v57: Soniox live streaming using @soniox/speech-to-text-web
// Returns hook that streams tokens in real-time

import { useEffect, useRef, useState, useCallback } from 'react'

interface SonioxToken {
  text: string
  is_final: boolean
  confidence?: number
  language?: string
  start_ms?: number
  end_ms?: number
}

interface UseSonioxStreamOptions {
  languageHints?: string[]    // e.g. ['ms', 'en']
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
  const finalTokensRef = useRef<SonioxToken[]>([])
  const startTimeRef = useRef<number>(0)
  const tokenCountRef = useRef<number>(0)
  const langCountsRef = useRef<Record<string, number>>({})

  // Lazy-load Soniox web library on mount (avoid SSR issue)
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const mod = await import('@soniox/speech-to-text-web')
        if (cancelled) return
        RecordTranscribeRef.current = mod.RecordTranscribe
        setIsReady(true)
      } catch (e: any) {
        console.error('[soniox-stream] failed to load library:', e)
        setError('Failed to load streaming library')
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
    finalTokensRef.current = []
    tokenCountRef.current = 0
    langCountsRef.current = {}
    startTimeRef.current = Date.now()

    // Function to fetch fresh temp key (called by library when needed)
    const getApiKey = async () => {
      const res = await fetch('/api/soniox-token', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Token fetch failed: ${res.status}`)
      }
      const data = await res.json()
      return data.api_key
    }

    const RecordTranscribe = RecordTranscribeRef.current
    const client = new RecordTranscribe({ apiKey: getApiKey })
    clientRef.current = client

    client.start({
      model: 'stt-rt-preview',
      languageHints: options.languageHints || ['ms', 'en'],
      context: options.context,
      enableLanguageIdentification: true,

      onPartialResult: (result: { tokens: SonioxToken[] }) => {
        const tokens = result.tokens || []

        // Soniox sends ALL tokens each callback (final + partial)
        // We separate: collect finals once, replace partials on each update
        const finalTokens: SonioxToken[] = []
        let partialBuf = ''

        for (const t of tokens) {
          if (t.is_final) {
            finalTokens.push(t)
            if (t.language) {
              langCountsRef.current[t.language] = (langCountsRef.current[t.language] || 0) + 1
            }
          } else {
            partialBuf += t.text
          }
        }

        // Replace finals (library guarantees finals are stable + accumulating)
        finalTokensRef.current = finalTokens
        tokenCountRef.current = finalTokens.length

        const newFinal = finalTokens.map(t => t.text).join('')
        setFinalText(newFinal)
        setPartialText(partialBuf)

        // Update detected language
        const langs = Object.entries(langCountsRef.current).sort((a, b) => b[1] - a[1])
        if (langs.length > 0) {
          setDetectedLanguage(langs[0][0])
        }
      },

      onStarted: () => {
        console.log('[soniox-stream] started')
        setIsStreaming(true)
      },

      onFinished: () => {
        console.log('[soniox-stream] finished')
        setIsStreaming(false)
        setPartialText('')
      },

      onError: (status: string, message: string) => {
        console.error('[soniox-stream] error:', status, message)
        setError(`${status}: ${message}`)
        setIsStreaming(false)
        if (options.onError) options.onError(status, message)
      },
    })
  }, [options])

  const stop = useCallback(async () => {
    if (!clientRef.current) {
      return {
        text: finalText,
        tokenCount: tokenCountRef.current,
        audioSeconds: Math.ceil((Date.now() - startTimeRef.current) / 1000),
        language: detectedLanguage,
      }
    }

    try {
      await clientRef.current.stop()
    } catch (e) {
      console.warn('[soniox-stream] stop warning:', e)
    }
    clientRef.current = null

    const audioSeconds = Math.ceil((Date.now() - startTimeRef.current) / 1000)
    const finalCombined = finalTokensRef.current.map(t => t.text).join('')

    setIsStreaming(false)
    setPartialText('')

    return {
      text: finalCombined,
      tokenCount: tokenCountRef.current,
      audioSeconds,
      language: detectedLanguage,
    }
  }, [finalText, detectedLanguage])

  const reset = useCallback(() => {
    if (clientRef.current) {
      try { clientRef.current.stop() } catch {}
      clientRef.current = null
    }
    setFinalText('')
    setPartialText('')
    setDetectedLanguage('auto')
    setError(null)
    setIsStreaming(false)
    finalTokensRef.current = []
    tokenCountRef.current = 0
    langCountsRef.current = {}
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clientRef.current) {
        try { clientRef.current.stop() } catch {}
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
