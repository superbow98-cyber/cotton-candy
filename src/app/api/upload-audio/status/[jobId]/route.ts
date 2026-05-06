// src/app/api/upload-audio/status/[jobId]/route.ts
// v63: Polling endpoint - browser calls this every 5s to check job status
// When Soniox done: creates lecture, deducts credit, deletes R2 file

import { NextRequest, NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'
import { deleteObject } from '@/lib/r2'
import { logUsage } from '@/lib/usage-logger'
import { calcSonioxCost } from '@/lib/usage-pricing'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 10  // 10s — enough for Soniox status check + lecture creation

const SONIOX_API_KEY = process.env.SONIOX_API_KEY

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const jobId = params.jobId
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    const admin = adminClient()
    const { data: job, error: jobErr } = await admin
      .from('upload_jobs')
      .select('*')
      .eq('id', jobId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (jobErr || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    // Already done — return cached result
    if (job.status === 'done') {
      return NextResponse.json({
        ok: true,
        status: 'done',
        lectureId: job.lecture_id,
        audioSeconds: job.audio_seconds,
        transcriptPreview: job.transcript_preview,
      })
    }

    // Failed — return error
    if (job.status === 'failed') {
      return NextResponse.json({
        ok: false,
        status: 'failed',
        error: job.error_message || 'Transcription failed',
      })
    }

    // Not yet submitted — return current state
    if (job.status === 'created' || job.status === 'uploaded' || job.status === 'uploading') {
      return NextResponse.json({
        ok: true,
        status: job.status,
        message: 'Waiting for upload to complete',
      })
    }

    // Status === 'transcribing' — check Soniox
    if (job.status === 'transcribing' && job.soniox_id) {
      const sonioxRes = await fetch(`https://api.soniox.com/v1/transcriptions/${job.soniox_id}`, {
        headers: { 'Authorization': `Bearer ${SONIOX_API_KEY}` },
      })

      if (!sonioxRes.ok) {
        console.error('[upload-status] Soniox status check failed:', sonioxRes.status)
        return NextResponse.json({
          ok: true,
          status: 'transcribing',
          message: 'Still processing',
        })
      }

      const sonioxData = await sonioxRes.json()

      // Soniox states: 'queued' | 'processing' | 'completed' | 'error'
      if (sonioxData.status === 'error') {
        await admin.from('upload_jobs').update({
          status: 'failed',
          error_message: sonioxData.error_message || 'Soniox transcription error',
          error_code: 'soniox_error',
          updated_at: new Date().toISOString(),
        }).eq('id', jobId)
        return NextResponse.json({
          ok: false,
          status: 'failed',
          error: sonioxData.error_message || 'Transcription error',
        })
      }

      if (sonioxData.status !== 'completed') {
        // Still processing
        return NextResponse.json({
          ok: true,
          status: 'transcribing',
          progress: sonioxData.progress || null,
        })
      }

      // Soniox completed — fetch transcript
      const txRes = await fetch(`https://api.soniox.com/v1/transcriptions/${job.soniox_id}/transcript`, {
        headers: { 'Authorization': `Bearer ${SONIOX_API_KEY}` },
      })

      if (!txRes.ok) {
        console.error('[upload-status] Soniox transcript fetch failed:', txRes.status)
        return NextResponse.json({ ok: true, status: 'transcribing' })
      }

      const txData = await txRes.json()
      const transcript = txData.text || ''
      const audioSeconds = Math.round(txData.audio_duration_ms ? txData.audio_duration_ms / 1000 : 0)
      const detectedLang = (txData.tokens?.[0]?.language) || job.language

      if (!transcript || transcript.length < 10) {
        await admin.from('upload_jobs').update({
          status: 'failed',
          error_message: 'Empty transcript — audio may be silent',
          error_code: 'empty_transcript',
          updated_at: new Date().toISOString(),
        }).eq('id', jobId)
        return NextResponse.json({
          ok: false,
          status: 'failed',
          error: 'Empty transcript — audio may be silent or corrupted',
        })
      }

      // Re-fetch profile to get current credit
      const { data: profile } = await admin.from('profiles')
        .select('upload_credits')
        .eq('id', user.id)
        .maybeSingle()

      if (!profile || (profile.upload_credits || 0) < 1) {
        await admin.from('upload_jobs').update({
          status: 'failed',
          error_message: 'No credits remaining',
          error_code: 'no_credits',
          updated_at: new Date().toISOString(),
        }).eq('id', jobId)
        return NextResponse.json({
          ok: false,
          status: 'failed',
          error: 'No upload credits remaining',
        })
      }

      // Create lecture
      const { data: lecture, error: lecErr } = await admin.from('lectures').insert({
        user_id: user.id,
        title: job.title,
        transcript_md: transcript,
        duration_seconds: audioSeconds,
        lang: 'en',
        source: 'upload',
        status: 'finished',
        started_at: new Date().toISOString(),
        ended_at: new Date().toISOString(),
        clean_segments: [{
          start: 0,
          end: audioSeconds,
          text: transcript,
          source: 'soniox_async',
          language: detectedLang,
          created_at: new Date().toISOString(),
        }],
      }).select('id').single()

      if (lecErr || !lecture) {
        console.error('[upload-status] lecture insert failed:', lecErr)
        return NextResponse.json({ error: 'Could not save lecture' }, { status: 500 })
      }

      // Deduct credit
      const newBalance = (profile.upload_credits || 0) - 1
      await admin.from('profiles')
        .update({ upload_credits: newBalance })
        .eq('id', user.id)

      // Log credit transaction
      await admin.from('upload_credit_transactions').insert({
        user_id: user.id,
        type: 'redeem',
        delta: -1,
        balance_after: newBalance,
        lecture_id: lecture.id,
        metadata: {
          audio_seconds: audioSeconds,
          service: 'soniox_async',
          language: detectedLang,
          job_id: jobId,
        },
      })

      // Mark job done
      await admin.from('upload_jobs').update({
        status: 'done',
        lecture_id: lecture.id,
        audio_seconds: audioSeconds,
        transcript_preview: transcript.slice(0, 200),
        detected_language: detectedLang,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('id', jobId)

      // Cleanup R2 file (async, don't block response)
      deleteObject(job.r2_key).catch((e) =>
        console.warn('[upload-status] R2 cleanup failed:', e)
      )

      // Log usage cost
      try {
        const cost = calcSonioxCost('async', audioSeconds)
        await logUsage({
          userId: user.id,
          service: 'soniox_async',
          operation: 'transcribe',
          units: audioSeconds,
          unit_type: 'audio_seconds',
          cost_usd: cost,
          lecture_id: lecture.id,
          metadata: {
            language: detectedLang,
            source: 'upload',
            job_id: jobId,
          },
        })
      } catch (e) { console.warn('[upload-status] cost log failed:', e) }

      console.log(`[upload-status] DONE job=${jobId} lecture=${lecture.id} ${audioSeconds}s`)

      return NextResponse.json({
        ok: true,
        status: 'done',
        lectureId: lecture.id,
        audioSeconds,
        transcriptPreview: transcript.slice(0, 200),
      })
    }

    // Unknown state
    return NextResponse.json({
      ok: true,
      status: job.status,
    })
  } catch (e: any) {
    console.error('[upload-status] error:', e)
    return NextResponse.json({ error: e.message || 'Status check failed' }, { status: 500 })
  }
}
