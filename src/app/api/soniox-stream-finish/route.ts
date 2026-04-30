// src/app/api/soniox-stream-finish/route.ts
// v57: Log cost + update audio cap after streaming session ends
// Browser calls this when WebSocket closes

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logUsage } from '@/lib/usage-logger'
import { calcSonioxCost } from '@/lib/usage-pricing'
import { checkAudioCap } from '@/lib/audio-usage'
import { type Plan } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const audioSeconds = Math.max(0, Math.ceil(Number(body.audioSeconds) || 0))
    const finalText = String(body.finalText || '').slice(0, 100000)
    const detectedLanguage = String(body.detectedLanguage || 'auto')
    const tokenCount = Number(body.tokenCount) || 0

    if (audioSeconds === 0) {
      return NextResponse.json({ ok: true, audioSeconds: 0 })
    }

    // Update profile audio usage
    const { data: profile } = await sb.from('profiles')
      .select('plan, audio_seconds_used, audio_reset_at, plan_upgraded_at')
      .eq('id', user.id)
      .maybeSingle()

    await sb.from('profiles')
      .update({
        audio_seconds_used: (profile?.audio_seconds_used || 0) + audioSeconds,
      })
      .eq('id', user.id)

    // Log streaming cost
    try {
      const cost = calcSonioxCost('streaming', audioSeconds)
      await logUsage({
        userId: user.id,
        service: 'soniox_streaming' as any,
        operation: 'transcribe',
        units: audioSeconds,
        unit_type: 'audio_seconds',
        cost_usd: cost,
        metadata: {
          language: detectedLanguage,
          token_count: tokenCount,
          text_length: finalText.length,
          mode: 'realtime_streaming',
        },
      })
    } catch (logErr) {
      console.error('[soniox-stream-finish] usage log failed:', logErr)
    }

    const plan = (profile?.plan || 'free') as Plan
    const newUsage = (profile?.audio_seconds_used || 0) + audioSeconds
    const newCheck = checkAudioCap(
      plan,
      newUsage,
      profile?.audio_reset_at || null,
      profile?.plan_upgraded_at || null,
    )

    return NextResponse.json({
      ok: true,
      audioSeconds,
      usage: newCheck,
    })
  } catch (e: any) {
    console.error('[soniox-stream-finish] error:', e)
    return NextResponse.json({
      error: e.message || 'Finish failed',
    }, { status: 500 })
  }
}
