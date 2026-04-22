// src/lib/audio-usage.ts
// Server-side helpers for audio cap enforcement.
// Tracks Whisper transcription time per user per plan period.

import { PLANS, type Plan } from '@/types'

export type AudioUsageCheck = {
  allowed: boolean
  usedSeconds: number
  capSeconds: number
  remainingSeconds: number
  percentUsed: number
  reason?: string
}

/**
 * Check if user can process more audio. Does NOT mutate state.
 * Returns detailed usage info for UI display.
 */
export function checkAudioCap(
  plan: Plan,
  usedSeconds: number,
  resetAt: string | null,
  planUpgradedAt: string | null,
): AudioUsageCheck {
  const limits = PLANS[plan]
  const capSeconds = limits.maxAudioHours * 3600

  // If plan period has expired since reset, usage should be considered 0
  // (the cron/webhook normally handles this, but we defensive-check here)
  const now = Date.now()
  const resetMs = resetAt ? new Date(resetAt).getTime() : 0
  const planStartMs = planUpgradedAt ? new Date(planUpgradedAt).getTime() : resetMs

  // If plan has a duration and we're past it, return fresh state
  if (limits.durationHours && planStartMs > 0) {
    const planExpiryMs = planStartMs + (limits.durationHours * 3600 * 1000)
    if (now > planExpiryMs) {
      // Plan expired — treat as fresh (webhook should downgrade them but be safe)
      return {
        allowed: false,
        usedSeconds: 0,
        capSeconds,
        remainingSeconds: 0,
        percentUsed: 0,
        reason: 'Plan period expired. Please renew.',
      }
    }
  }

  const remaining = Math.max(0, capSeconds - usedSeconds)
  const percentUsed = Math.min(100, Math.round((usedSeconds / capSeconds) * 100))

  return {
    allowed: usedSeconds < capSeconds,
    usedSeconds,
    capSeconds,
    remainingSeconds: remaining,
    percentUsed,
    reason: usedSeconds >= capSeconds
      ? `Audio cap reached (${(capSeconds / 3600).toFixed(1)}h). Upgrade for more.`
      : undefined,
  }
}

/**
 * Format usage for display: "3.5 / 4.0 hours" or "45 / 45 min"
 */
export function formatUsage(usedSeconds: number, capSeconds: number, lang: 'en' | 'bm' = 'en'): string {
  const usedMin = Math.round(usedSeconds / 60)
  const capMin = Math.round(capSeconds / 60)
  if (capMin < 60) {
    return `${usedMin} / ${capMin} min`
  }
  const usedHr = (usedSeconds / 3600).toFixed(1)
  const capHr = (capSeconds / 3600).toFixed(1)
  const unit = lang === 'bm' ? 'jam' : 'h'
  return `${usedHr} / ${capHr} ${unit}`
}
