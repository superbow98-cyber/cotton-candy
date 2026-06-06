// src/lib/usage-pricing.ts
// Real pricing from providers
// Updated: Jun 2026

// Groq Whisper pricing (per HOUR of audio)
const GROQ_WHISPER_LARGE_V3_PER_HOUR_USD = 0.111
const GROQ_WHISPER_TURBO_PER_HOUR_USD    = 0.04

// DeepSeek V3 pricing (per 1M tokens)
const DEEPSEEK_INPUT_PER_M_USD  = 0.27
const DEEPSEEK_OUTPUT_PER_M_USD = 1.10

// Gemini Flash Lite pricing (per 1M tokens)
const GEMINI_FLASH_LITE_INPUT_PER_M_USD  = 0.0375
const GEMINI_FLASH_LITE_OUTPUT_PER_M_USD = 0.15

// Groq Llama 3.3 70B pricing (per 1M tokens)
const GROQ_INPUT_PER_M_USD  = 0.59
const GROQ_OUTPUT_PER_M_USD = 0.79

// GPT-4o Mini pricing (per 1M tokens)
const GPT4O_MINI_INPUT_PER_M_USD  = 0.15
const GPT4O_MINI_OUTPUT_PER_M_USD = 0.60

// Claude Haiku pricing (per 1M tokens)
const CLAUDE_HAIKU_INPUT_PER_M_USD  = 0.80
const CLAUDE_HAIKU_OUTPUT_PER_M_USD = 4.00

// xAI Grok (backup)
const XAI_GROK_INPUT_PER_M_USD  = 2.00
const XAI_GROK_OUTPUT_PER_M_USD = 10.00

// Soniox pricing
const SONIOX_ASYNC_PER_HOUR_USD     = 0.10
const SONIOX_STREAMING_PER_HOUR_USD = 0.12

export type ServiceKey =
  | 'groq_whisper_v3'
  | 'groq_whisper_turbo'
  | 'deepseek'
  | 'gemini_flash_lite'
  | 'groq'
  | 'gpt4o_mini'
  | 'claude_haiku'
  | 'xai_grok'
  | 'soniox_async'
  | 'soniox_streaming'

export interface UsageRecord {
  service: ServiceKey
  operation: 'transcribe' | 'summarize'
  units: number
  unit_type: 'audio_seconds' | 'tokens'
  cost_usd: number
  metadata?: Record<string, any>
}

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

export function calcLLMCost(
  service: 'deepseek' | 'gemini_flash_lite' | 'groq' | 'gpt4o_mini' | 'claude_haiku' | 'xai_grok',
  inputTokens: number,
  outputTokens: number
): number {
  let inputRate = 0, outputRate = 0
  if (service === 'deepseek') {
    inputRate = DEEPSEEK_INPUT_PER_M_USD
    outputRate = DEEPSEEK_OUTPUT_PER_M_USD
  } else if (service === 'gemini_flash_lite') {
    inputRate = GEMINI_FLASH_LITE_INPUT_PER_M_USD
    outputRate = GEMINI_FLASH_LITE_OUTPUT_PER_M_USD
  } else if (service === 'groq') {
    inputRate = GROQ_INPUT_PER_M_USD
    outputRate = GROQ_OUTPUT_PER_M_USD
  } else if (service === 'gpt4o_mini') {
    inputRate = GPT4O_MINI_INPUT_PER_M_USD
    outputRate = GPT4O_MINI_OUTPUT_PER_M_USD
  } else if (service === 'claude_haiku') {
    inputRate = CLAUDE_HAIKU_INPUT_PER_M_USD
    outputRate = CLAUDE_HAIKU_OUTPUT_PER_M_USD
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
  deepseek: 'DeepSeek V3',
  gemini_flash_lite: 'Gemini Flash Lite',
  groq: 'Groq · Llama 3.3 70B',
  gpt4o_mini: 'GPT-4o Mini',
  claude_haiku: 'Claude Haiku',
  xai_grok: 'xAI Grok',
  soniox_async: 'Soniox Async (BM/Rojak)',
  soniox_streaming: 'Soniox Streaming',
}

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
