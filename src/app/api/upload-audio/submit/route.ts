// src/app/api/upload-audio/submit/route.ts
// v63: Submit uploaded R2 file to Soniox for async transcription
// Returns soniox_id; client polls /status for completion

import { NextRequest, NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'
import { getPresignedDownloadUrl } from '@/lib/r2'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30  // 30s max (mostly Soniox submit + R2 download URL)

const SONIOX_API_KEY = process.env.SONIOX_API_KEY

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const jobId = String(body.jobId || '')
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    // Verify job ownership + status
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
    if (job.status !== 'created' && job.status !== 'uploaded') {
      return NextResponse.json({
        error: `Cannot submit job in state "${job.status}"`,
        status: job.status,
      }, { status: 400 })
    }

    if (!SONIOX_API_KEY) {
      return NextResponse.json({ error: 'Soniox not configured' }, { status: 500 })
    }

    // Generate presigned URL for Soniox to fetch from R2
    const audioUrl = await getPresignedDownloadUrl(job.r2_key, 7200)  // 2 hour validity

    // Determine language hints
    const useSoniox = job.language === 'ms' || job.language === 'auto'
    let detectedService = 'soniox_async'

    let sonioxJobId: string | null = null

    if (useSoniox) {
      // Soniox async transcription with audio_url
      const langHints = job.language === 'ms' ? ['ms'] : ['ms', 'en']
      const sonioxRes = await fetch('https://api.soniox.com/v1/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SONIOX_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audio_url: audioUrl,
          model: 'stt-async-preview',
          language_hints: langHints,
          context: job.language === 'ms'
            ? 'Bahasa Melayu academic recording'
            : 'Malaysian student recording, BM + EN code-switching common',
        }),
      })

      if (!sonioxRes.ok) {
        const errText = await sonioxRes.text()
        console.error('[upload-submit] Soniox failed:', sonioxRes.status, errText.slice(0, 300))
        // Mark job failed
        await admin.from('upload_jobs').update({
          status: 'failed',
          error_message: `Soniox: ${sonioxRes.status}`,
          error_code: 'soniox_submit_failed',
          updated_at: new Date().toISOString(),
        }).eq('id', jobId)
        return NextResponse.json({
          error: `Transcription submission failed (${sonioxRes.status})`,
          detail: errText.slice(0, 300),
        }, { status: 500 })
      }

      const sonioxData = await sonioxRes.json()
      sonioxJobId = sonioxData.id
      detectedService = 'soniox_async'
    } else {
      // For non-Malay, we'd use Whisper but Whisper doesn't support audio_url
      // Mark as queued for sync processing in status endpoint
      detectedService = 'groq_whisper_turbo'
    }

    // Update job to transcribing state
    await admin.from('upload_jobs').update({
      status: 'transcribing',
      soniox_id: sonioxJobId,
      soniox_submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', jobId)

    console.log(`[upload-submit] user=${user.id} job=${jobId} soniox_id=${sonioxJobId} service=${detectedService}`)

    return NextResponse.json({
      ok: true,
      jobId,
      status: 'transcribing',
      service: detectedService,
    })
  } catch (e: any) {
    console.error('[upload-submit] error:', e)
    return NextResponse.json({ error: e.message || 'Submit failed' }, { status: 500 })
  }
}
