import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sessions: data })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { focus_secs, target_mins, sessions, pause_count, presence_pct, vibe } = body

  // Check plan — free = max 30, paid = unlimited
  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single()

  const isPaid = profile?.plan && profile.plan !== 'free' &&
    profile.plan_expires_at && new Date(profile.plan_expires_at) > new Date()

  if (!isPaid) {
    const { count } = await supabase
      .from('study_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if ((count ?? 0) >= 30) {
      // Delete oldest to keep at 30
      const { data: oldest } = await supabase
        .from('study_sessions')
        .select('id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(1)
      if (oldest?.[0]) {
        await supabase.from('study_sessions').delete().eq('id', oldest[0].id)
      }
    }
  }

  const { data, error } = await supabase
    .from('study_sessions')
    .insert({ user_id: user.id, focus_secs, target_mins, sessions, pause_count, presence_pct, vibe })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ session: data })
}
