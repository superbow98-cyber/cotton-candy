// src/app/api/debug-lecture/[lectureId]/route.ts
// Diagnostic endpoint - inspect lecture state to debug transcript edit/append bugs

import { NextRequest, NextResponse } from 'next/server'
import { createClient, adminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { lectureId: string } }
) {
  try {
    const sb = await createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const lectureId = params.lectureId
    if (!lectureId) return NextResponse.json({ error: 'lectureId required' }, { status: 400 })

    const admin = adminClient()
    const { data: lecture, error } = await admin
      .from('lectures')
      .select('*')
      .eq('id', lectureId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!lecture) return NextResponse.json({ error: 'Lecture not found' }, { status: 404 })

    // Analyze clean_segments structure
    const segments = lecture.clean_segments || []
    const segmentAnalysis = segments.map((seg: any, i: number) => ({
      index: i,
      start: seg.start,
      end: seg.end,
      duration: seg.end - seg.start,
      source: seg.source || '(no source)',
      language: seg.language || '(no lang)',
      created_at: seg.created_at || '(no timestamp)',
      text_length: seg.text?.length || 0,
      text_preview: seg.text?.slice(0, 80) || '(empty)',
      edited: seg.edited || false,
    }))

    // Detect gaps and overlaps in segments
    const issues: any[] = []
    for (let i = 1; i < segments.length; i++) {
      const prev = segments[i - 1]
      const curr = segments[i]
      const gap = curr.start - prev.end
      if (gap < 0) {
        issues.push({
          type: 'OVERLAP',
          between: `segment ${i - 1} (ends ${prev.end}s)`,
          and: `segment ${i} (starts ${curr.start}s)`,
          amount: `${Math.abs(gap)}s overlap`,
        })
      } else if (gap > 5) {
        issues.push({
          type: 'GAP',
          between: `segment ${i - 1} (ends ${prev.end}s)`,
          and: `segment ${i} (starts ${curr.start}s)`,
          amount: `${gap}s gap (possible resume point)`,
        })
      }
    }

    // Detect source mix (might indicate edit + append)
    const sources = [...new Set(segments.map((s: any) => s.source))]
    const hasMultipleSources = sources.length > 1

    // Compare transcript_md vs concatenated segments
    const segmentsConcat = segments.map((s: any) => s.text || '').join(' ').trim()
    const transcriptMd = lecture.transcript_md || ''
    const concatLength = segmentsConcat.length
    const mdLength = transcriptMd.length
    const lengthRatio = concatLength > 0 ? (mdLength / concatLength).toFixed(2) : 'N/A'

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      lecture: {
        id: lecture.id,
        title: lecture.title,
        status: lecture.status,
        duration_seconds: lecture.duration_seconds,
        source: lecture.source || 'live',
        lang: lecture.lang,
        started_at: lecture.started_at,
        ended_at: lecture.ended_at,
        created_at: lecture.created_at,
        updated_at: lecture.updated_at,
      },
      transcript: {
        markdown_length: mdLength,
        markdown_preview: transcriptMd.slice(0, 200),
        segments_count: segments.length,
        segments_total_length: concatLength,
        length_ratio_md_to_segments: lengthRatio,
        possible_edit_detected: Math.abs(parseFloat(lengthRatio) - 1) > 0.1,
        note: parseFloat(lengthRatio) > 1.1
          ? 'transcript_md LONGER than segments — user edited and added content?'
          : parseFloat(lengthRatio) < 0.9
            ? 'transcript_md SHORTER than segments — user trimmed?'
            : 'Lengths roughly match',
      },
      segments: segmentAnalysis,
      summary: {
        total_segments: segments.length,
        unique_sources: sources,
        has_multiple_sources: hasMultipleSources,
        issues_found: issues.length,
        issues,
        time_coverage: {
          first_segment_start: segments[0]?.start || 0,
          last_segment_end: segments[segments.length - 1]?.end || 0,
          total_audio_duration: lecture.duration_seconds,
          covered: segments[segments.length - 1]?.end || 0,
          uncovered: (lecture.duration_seconds || 0) - (segments[segments.length - 1]?.end || 0),
        },
      },
      // Full raw segments untuk deep debug
      raw_segments_first_3: segments.slice(0, 3),
      raw_segments_last_3: segments.slice(-3),
    }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({
      error: e.message,
      stack: e.stack?.split('\n').slice(0, 5),
    }, { status: 500 })
  }
}
