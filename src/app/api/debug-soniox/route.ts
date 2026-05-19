// src/app/api/debug-soniox/route.ts
// Soniox diagnostic - check API key, recent jobs, audio_url accessibility

import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/server'
import { getPresignedDownloadUrl } from '@/lib/r2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SONIOX_API_KEY = process.env.SONIOX_API_KEY

export async function GET(req: NextRequest) {
  const result: any = {
    timestamp: new Date().toISOString(),
    env: {
      SONIOX_API_KEY: SONIOX_API_KEY ? `set (${SONIOX_API_KEY.length} chars)` : 'MISSING',
    },
    tests: [],
  }

  if (!SONIOX_API_KEY) {
    result.fatal = 'SONIOX_API_KEY not set'
    return NextResponse.json(result, { status: 500 })
  }

  // ===== TEST 1: Soniox API key valid? List recent transcriptions =====
  try {
    const listRes = await fetch('https://api.soniox.com/v1/transcriptions?limit=10', {
      headers: { 'Authorization': `Bearer ${SONIOX_API_KEY}` },
    })
    const listData = await listRes.json().catch(() => ({}))
    result.tests.push({
      name: 'TEST 1: Soniox API auth + list recent',
      status: listRes.ok ? 'PASS' : 'FAIL',
      details: {
        status: listRes.status,
        count: listData?.transcriptions?.length || 0,
        recent: (listData?.transcriptions || []).slice(0, 5).map((t: any) => ({
          id: t.id,
          status: t.status,
          created_at: t.created_at,
          duration_ms: t.audio_duration_ms,
          error: t.error_message,
        })),
        raw: listData,
      },
    })
  } catch (e: any) {
    result.tests.push({
      name: 'TEST 1: Soniox API auth + list recent',
      status: 'FAIL',
      error: { message: e.message },
    })
  }

  // ===== TEST 2: Check stuck upload_jobs =====
  try {
    const admin = adminClient()
    const { data: jobs, error: jobsErr } = await admin
      .from('upload_jobs')
      .select('id, status, soniox_id, r2_key, error_message, created_at, soniox_submitted_at')
      .order('created_at', { ascending: false })
      .limit(10)

    result.tests.push({
      name: 'TEST 2: Recent upload_jobs in DB',
      status: jobsErr ? 'FAIL' : 'PASS',
      details: {
        count: jobs?.length || 0,
        jobs: (jobs || []).map((j: any) => ({
          id: j.id,
          status: j.status,
          soniox_id: j.soniox_id,
          age_minutes: Math.floor((Date.now() - new Date(j.created_at).getTime()) / 60000),
          submitted_ago_seconds: j.soniox_submitted_at
            ? Math.floor((Date.now() - new Date(j.soniox_submitted_at).getTime()) / 1000)
            : null,
          error: j.error_message,
        })),
      },
    })

    // ===== TEST 3: Check specific stuck job's Soniox status =====
    const stuckJob = jobs?.find((j: any) => j.status === 'transcribing' && j.soniox_id)
    if (stuckJob) {
      try {
        const sonioxRes = await fetch(`https://api.soniox.com/v1/transcriptions/${stuckJob.soniox_id}`, {
          headers: { 'Authorization': `Bearer ${SONIOX_API_KEY}` },
        })
        const sonioxData = await sonioxRes.json().catch(() => ({}))
        result.tests.push({
          name: `TEST 3: Soniox status for stuck job ${stuckJob.id.slice(0, 8)}`,
          status: sonioxRes.ok ? 'PASS' : 'FAIL',
          details: {
            soniox_id: stuckJob.soniox_id,
            http_status: sonioxRes.status,
            transcription_status: sonioxData.status,
            error_message: sonioxData.error_message,
            audio_duration_ms: sonioxData.audio_duration_ms,
            progress: sonioxData.progress,
            full_response: sonioxData,
          },
        })

        // ===== TEST 4: Can we access R2 file Soniox is supposed to download? =====
        try {
          const audioUrl = await getPresignedDownloadUrl(stuckJob.r2_key, 600)
          const headRes = await fetch(audioUrl, { method: 'HEAD' })
          result.tests.push({
            name: 'TEST 4: R2 file accessible via presigned URL',
            status: headRes.ok ? 'PASS' : 'FAIL',
            details: {
              r2_key: stuckJob.r2_key,
              presigned_status: headRes.status,
              content_length: headRes.headers.get('content-length'),
              content_type: headRes.headers.get('content-type'),
              presigned_url_preview: audioUrl.slice(0, 150) + '...',
            },
          })
        } catch (e: any) {
          result.tests.push({
            name: 'TEST 4: R2 file accessible',
            status: 'FAIL',
            error: { message: e.message },
          })
        }
      } catch (e: any) {
        result.tests.push({
          name: 'TEST 3: Soniox status check',
          status: 'FAIL',
          error: { message: e.message },
        })
      }
    } else {
      result.tests.push({
        name: 'TEST 3 + 4: No stuck transcribing job to check',
        status: 'SKIP',
        note: 'No upload_jobs in state "transcribing"',
      })
    }
  } catch (e: any) {
    result.tests.push({
      name: 'TEST 2: upload_jobs query',
      status: 'FAIL',
      error: { message: e.message },
    })
  }

  const passed = result.tests.filter((t: any) => t.status === 'PASS').length
  const failed = result.tests.filter((t: any) => t.status === 'FAIL').length
  result.summary = `${passed} passed, ${failed} failed`

  return NextResponse.json(result, { status: 200 })
}
