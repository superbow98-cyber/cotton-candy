// src/lib/usage-pricing.ts
// Real pricing from Groq (https://groq.com/pricing) and Gemini (https://ai.google.dev/pricing)
// Updated: April 2026

// Groq Whisper pricing (per HOUR of audio)
const GROQ_WHISPER_LARGE_V3_PER_HOUR_USD = 0.111  // $0.111/hour
const GROQ_WHISPER_TURBO_PER_HOUR_USD    = 0.04   // $0.04/hour

// Gemini pricing (per 1M tokens)
const GEMINI_FLASH_INPUT_PER_M_USD       = 0.075  // $0.075/1M input tokens
const GEMINI_FLASH_OUTPUT_PER_M_USD      = 0.30   // $0.30/1M output tokens
const GEMINI_FLASH_LITE_INPUT_PER_M_USD  = 0.0375
const GEMINI_FLASH_LITE_OUTPUT_PER_M_USD = 0.15

// xAI Grok (backup)
const XAI_GROK_INPUT_PER_M_USD  = 2.00
const XAI_GROK_OUTPUT_PER_M_USD = 10.00

// Soniox pricing — token-based, equivalent to:
const SONIOX_ASYNC_PER_HOUR_USD     = 0.10   // file upload
const SONIOX_STREAMING_PER_HOUR_USD = 0.12   // real-time

export type ServiceKey =
  | 'groq_whisper_v3'
  | 'groq_whisper_turbo'
  | 'gemini_flash'
  | 'gemini_flash_lite'
  | 'xai_grok'
  | 'soniox_async'
  | 'soniox_streaming'

export interface UsageRecord {
  service: ServiceKey
  operation: 'transcribe' | 'summarize'
  units: number          // seconds for audio, tokens for LLM
  unit_type: 'audio_seconds' | 'tokens'
  cost_usd: number
  metadata?: Record<string, any>
}

/**
 * Calculate Whisper transcription cost
 * @param service - 'groq_whisper_v3' or 'groq_whisper_turbo'
 * @param audioSeconds - duration of audio in seconds
 */
export function calcWhisperCost(
  service: 'groq_whisper_v3' | 'groq_whisper_turbo',
  audioSeconds: number
): number {
  const ratePerHour = service === 'groq_whisper_v3'
    ? GROQ_WHISPER_LARGE_V3_PER_HOUR_USD
    : GROQ_WHISPER_TURBO_PER_HOUR_USD
  const hours = audioSeconds / 3600
  return Number((hours * ratePerHour).toFixed(6))
}

/**
 * Calculate LLM cost based on input + output tokens
 */
export function calcLLMCost(
  service: 'gemini_flash' | 'gemini_flash_lite' | 'xai_grok',
  inputTokens: number,
  outputTokens: number
): number {
  let inputRate = 0, outputRate = 0
  if (service === 'gemini_flash') {
    inputRate = GEMINI_FLASH_INPUT_PER_M_USD
    outputRate = GEMINI_FLASH_OUTPUT_PER_M_USD
  } else if (service === 'gemini_flash_lite') {
    inputRate = GEMINI_FLASH_LITE_INPUT_PER_M_USD
    outputRate = GEMINI_FLASH_LITE_OUTPUT_PER_M_USD
  } else if (service === 'xai_grok') {
    inputRate = XAI_GROK_INPUT_PER_M_USD
    outputRate = XAI_GROK_OUTPUT_PER_M_USD
  }
  const cost = (inputTokens / 1_000_000) * inputRate + (outputTokens / 1_000_000) * outputRate
  return Number(cost.toFixed(6))
}

export const SERVICE_LABELS: Record<ServiceKey, string> = {
  groq_whisper_v3: 'Whisper Large v3 (BM/Rojak)',
  groq_whisper_turbo: 'Whisper Turbo (EN/zh/ta)',
  gemini_flash: 'Gemini Flash',
  gemini_flash_lite: 'Gemini Flash Lite',
  xai_grok: 'xAI Grok',
  soniox_async: 'Soniox Async (BM/Rojak)',
  soniox_streaming: 'Soniox Streaming',
}

/**
 * Calculate Soniox transcription cost.
 * @param mode - 'async' (file upload) or 'streaming' (real-time)
 * @param audioSeconds - duration of audio in seconds
 */
export function calcSonioxCost(
  mode: 'async' | 'streaming',
  audioSeconds: number
): number {
  const ratePerHour = mode === 'async'
    ? SONIOX_ASYNC_PER_HOUR_USD
    : SONIOX_STREAMING_PER_HOUR_USD
  const hours = audioSeconds / 3600
  return Number((hours * ratePerHour).toFixed(6))
}
