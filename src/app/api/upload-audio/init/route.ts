// src/app/api/upload-audio/init/route.ts
// v63: Initialize upload — validates credit, creates job, returns pre-signed R2 URL
// Browser uses this URL to PUT file directly to R2 (bypass Vercel)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPresignedUploadUrl, buildUploadKey, mimeToExt } from '@/lib/r2'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = 200 * 1024 * 1024  // 200MB hard cap
const ALLOWED_TYPES = [
  'audio/mpeg', 'audio/mp3',
  'audio/mp4', 'audio/m4a', 'audio/x-m4a',
  'audio/wav', 'audio/wave', 'audio/x-wav',
  'audio/webm', 'audio/ogg', 'audio/flac',
  'video/mp4', 'video/webm',
]

export async function POST(req: NextRequest) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const filename = String(body.filename || '').slice(0, 255)
    const contentType = String(body.contentType || '')
    const sizeBytes = Number(body.sizeBytes || 0)
    const title = String(body.title || filename).slice(0, 200)
    const language = String(body.language || 'auto')

    // Validation
    if (!filename) return NextResponse.json({ error: 'Filename required' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json({
        error: `Unsupported file type "${contentType}". Use MP3, M4A, WAV, WebM, OGG, FLAC, or MP4.`,
      }, { status: 400 })
    }
    if (sizeBytes > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: `File too large (${(sizeBytes / 1024 / 1024).toFixed(1)}MB). Max 200MB.`,
      }, { status: 400 })
    }
    if (sizeBytes < 1024) {
      return NextResponse.json({ error: 'File too small' }, { status: 400 })
    }

    // Check credit balance
    const { data: profile } = await sb.from('profiles')
      .select('upload_credits')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    if ((profile.upload_credits || 0) < 1) {
      return NextResponse.json({
        error: 'No upload credits remaining. Purchase credits to use this feature.',
        creditsRemaining: 0,
      }, { status: 402 })
    }

    // Generate job ID + R2 key
    const jobId = crypto.randomUUID()
    const ext = mimeToExt(contentType)
    const r2Key = buildUploadKey(user.id, jobId, ext)

    // Create job row
    const { error: insertErr } = await sb.from('upload_jobs').insert({
      id: jobId,
      user_id: user.id,
      filename,
      size_bytes: sizeBytes,
      content_type: contentType,
      r2_key: r2Key,
      title,
      language,
      status: 'created',
    })

    if (insertErr) {
      console.error('[upload-init] insert failed:', insertErr)
      return NextResponse.json({ error: 'Could not create upload job' }, { status: 500 })
    }

    // Generate pre-signed PUT URL (1 hour validity)
    const uploadUrl = await getPresignedUploadUrl(r2Key, contentType, 3600)

    console.log(`[upload-init] user=${user.id} job=${jobId} size=${sizeBytes} type=${contentType}`)

    return NextResponse.json({
      ok: true,
      jobId,
      uploadUrl,        // Browser PUTs file here
      r2Key,
      expiresIn: 3600,
    })
  } catch (e: any) {
    console.error('[upload-init] error:', e)
    return NextResponse.json({ error: e.message || 'Init failed' }, { status: 500 })
  }
}
