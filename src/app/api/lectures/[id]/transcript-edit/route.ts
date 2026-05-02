// src/app/api/lectures/[id]/transcript-edit/route.ts
// v60: Save user-edited clean transcript (markdown)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_LENGTH = 200000  // 200K chars cap

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
      .select('id, user_id')
      .eq('id', lectureId)
      .maybeSingle()
    if (!lecture) return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })
    if (lecture.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const edited = String(body.edited || '').slice(0, MAX_LENGTH)

    await sb.from('lectures')
      .update({
        clean_transcript_edited: edited || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lectureId)

    return NextResponse.json({ ok: true, length: edited.length })
  } catch (e: any) {
    console.error('[transcript-edit] error:', e)
    return NextResponse.json({ error: e.message || 'Save failed' }, { status: 500 })
  }
}
