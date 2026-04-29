// src/lib/usage-logger.ts
// Server-only — uses service role key to bypass RLS for inserts

import { createClient as createSupabase } from '@supabase/supabase-js'
import type { UsageRecord, ServiceKey } from './usage-pricing'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

let _adminClient: ReturnType<typeof createSupabase> | null = null
function getAdmin() {
  if (!_adminClient) {
    _adminClient = createSupabase(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _adminClient
}

export interface LogUsageInput {
  userId: string
  service: ServiceKey
  operation: 'transcribe' | 'summarize'
  units: number
  unit_type: 'audio_seconds' | 'tokens'
  cost_usd: number
  lecture_id?: string | null
  metadata?: Record<string, any>
}

/**
 * Log API usage to api_usage_log table.
 * Failures are logged but never thrown — usage tracking should not break user requests.
 */
export async function logUsage(input: LogUsageInput): Promise<void> {
  try {
    const sb = getAdmin()
    const { error } = await sb.from('api_usage_log').insert({
      user_id: input.userId,
      service: input.service,
      operation: input.operation,
      units: input.units,
      unit_type: input.unit_type,
      cost_usd: input.cost_usd,
      lecture_id: input.lecture_id || null,
      metadata: input.metadata || {},
    })
    if (error) {
      console.error('[usage-logger] insert failed:', error.message)
    }
  } catch (e: any) {
    console.error('[usage-logger] exception:', e.message || e)
  }
}
