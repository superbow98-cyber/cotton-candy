// src/app/api/soniox-token/route.ts
// v57: Issue temporary Soniox API key for browser direct streaming
// Browser uses this to authenticate WebSocket without exposing main key

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAudioCap } from '@/lib/audio-usage'
import { type Plan } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SONIOX_API_KEY = process.env.SONIOX_API_KEY!
const TEMP_KEY_EXPIRY_SECONDS = 3600  // 1 hour max session

export async function POST() {
  try {
    if (!SONIOX_API_KEY) {
      return NextResponse.json({
        error: 'SONIOX_API_KEY not configured',
      }, { status: 500 })
    }

    // Authenticate user
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check audio cap before issuing token (prevent overuse)
    const { data: profile } = await sb.from('profiles')
      .select('plan, audio_seconds_used, audio_reset_at, plan_upgraded_at')
      .eq('id', user.id)
      .maybeSingle()

    const plan = (profile?.plan || 'free') as Plan
    const check = checkAudioCap(
      plan,
      profile?.audio_seconds_used || 0,
      profile?.audio_reset_at || null,
      profile?.plan_upgraded_at || null,
    )

    if (!check.allowed) {
      return NextResponse.json({
        error: check.reason || 'Audio cap reached',
        capReached: true,
        usage: check,
      }, { status: 402 })
    }

    // Request temporary key from Soniox
    const res = await fetch('https://api.soniox.com/v1/auth/temporary-api-key', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SONIOX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        usage_type: 'transcribe_websocket',
        expires_in_seconds: TEMP_KEY_EXPIRY_SECONDS,
        client_reference_id: `cottoncandy-${user.id.slice(0, 8)}`,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[soniox-token] failed:', res.status, err.slice(0, 200))
      return NextResponse.json({
        error: 'Failed to obtain Soniox temporary key',
      }, { status: 502 })
    }

    const data = await res.json()
    return NextResponse.json({
      api_key: data.api_key,
      expires_at: data.expires_at,
      usage: check,
    })
  } catch (e: any) {
    console.error('[soniox-token] error:', e.message)
    return NextResponse.json({
      error: e.message || 'Token issuance failed',
    }, { status: 500 })
  }
}
