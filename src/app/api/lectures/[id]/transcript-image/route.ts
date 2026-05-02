// src/app/api/lectures/[id]/transcript-image/route.ts
// v60: Upload image into transcript_images JSONB

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { TranscriptImage } from '@/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_IMAGES = 5
const MAX_SIZE_BYTES = 1024 * 1024  // 1MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const lectureId = params.id

    // Verify ownership
    const { data: lecture } = await sb.from('lectures')
      .select('id, user_id, transcript_images')
      .eq('id', lectureId)
      .maybeSingle()
    if (!lecture) return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    if (lecture.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check current image count
    const existingImages: TranscriptImage[] = lecture.transcript_images || []
    if (existingImages.length >= MAX_IMAGES) {
      return NextResponse.json({
        error: `Maximum ${MAX_IMAGES} images per lecture reached`,
      }, { status: 400 })
    }

    // Parse multipart form
    const form = await req.formData()
    const file = form.get('file') as File
    const caption = (form.get('caption') as string) || ''

    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Use JPEG, PNG, WebP, or GIF.' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: `File too large. Max ${MAX_SIZE_BYTES / 1024 / 1024}MB.` }, { status: 400 })
    }

    // Upload to Supabase Storage
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    const imageId = crypto.randomUUID()
    const path = `${user.id}/${lectureId}/${imageId}.${ext}`

    const { error: uploadErr } = await sb.storage
      .from('lecture-images')
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadErr) {
      console.error('[transcript-image] upload failed:', uploadErr)
      return NextResponse.json({ error: 'Upload failed: ' + uploadErr.message }, { status: 500 })
    }

    // Get public URL
    const { data: publicData } = sb.storage
      .from('lecture-images')
      .getPublicUrl(path)
    const url = publicData.publicUrl

    // Add to transcript_images array
    const newImage: TranscriptImage = {
      id: imageId,
      url,
      caption: caption.slice(0, 200),
      position: existingImages.length,
      uploaded_at: new Date().toISOString(),
      size_bytes: file.size,
    }

    const updatedImages = [...existingImages, newImage]
    await sb.from('lectures')
      .update({ transcript_images: updatedImages, updated_at: new Date().toISOString() })
      .eq('id', lectureId)

    return NextResponse.json({ ok: true, image: newImage, images: updatedImages })
  } catch (e: any) {
    console.error('[transcript-image] error:', e)
    return NextResponse.json({ error: e.message || 'Upload failed' }, { status: 500 })
  }
}

// DELETE — remove image
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const lectureId = params.id
    const url = new URL(req.url)
    const imageId = url.searchParams.get('imageId')
    if (!imageId) return NextResponse.json({ error: 'imageId required' }, { status: 400 })

    // Verify ownership
    const { data: lecture } = await sb.from('lectures')
      .select('id, user_id, transcript_images')
      .eq('id', lectureId)
      .maybeSingle()
    if (!lecture || lecture.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const existingImages: TranscriptImage[] = lecture.transcript_images || []
    const target = existingImages.find(img => img.id === imageId)
    if (!target) return NextResponse.json({ error: 'Image not found' }, { status: 404 })

    // Delete from storage
    const pathMatch = target.url.match(/lecture-images\/(.+)$/)
    if (pathMatch) {
      await sb.storage.from('lecture-images').remove([pathMatch[1]])
    }

    // Update DB
    const updatedImages = existingImages.filter(img => img.id !== imageId)
      .map((img, i) => ({ ...img, position: i }))

    await sb.from('lectures')
      .update({ transcript_images: updatedImages, updated_at: new Date().toISOString() })
      .eq('id', lectureId)

    return NextResponse.json({ ok: true, images: updatedImages })
  } catch (e: any) {
    console.error('[transcript-image DELETE] error:', e)
    return NextResponse.json({ error: e.message || 'Delete failed' }, { status: 500 })
  }
}
