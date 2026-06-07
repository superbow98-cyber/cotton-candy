// src/app/api/admin/usage/route.ts
// Admin-only — returns usage analytics
import { NextResponse } from 'next/server'
import { isAdminUser } from '@/lib/admin-server'
import { createClient as createSupabase } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

function admin() {
  return createSupabase(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET(req: Request) {
  const { isAdmin } = await isAdminUser()
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  const url = new URL(req.url)
  const days = parseInt(url.searchParams.get('days') || '30', 10)
  const filter = url.searchParams.get('filter') || 'all' // 'all' | 'stt' | 'summarize'
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const sb = admin()

  let query = sb
    .from('api_usage_log')
    .select('service, operation, units, cost_usd, created_at, user_id')
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  if (filter === 'stt') query = query.eq('operation', 'transcribe')
  else if (filter === 'summarize') query = query.eq('operation', 'summarize')

  const { data: rows, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all = rows || []

  // Aggregate
  let totalCost = 0
  let totalAudioSec = 0
  let totalTokens = 0
  const byService: Record<string, { cost: number; calls: number; units: number }> = {}
  const byUser: Record<string, { cost: number; calls: number }> = {}
  const byDay: Record<string, number> = {}

  for (const r of all) {
    totalCost += Number(r.cost_usd) || 0
    if (r.operation === 'transcribe') totalAudioSec += Number(r.units) || 0
    if (r.operation === 'summarize') totalTokens += Number(r.units) || 0

    if (!byService[r.service]) byService[r.service] = { cost: 0, calls: 0, units: 0 }
    byService[r.service].cost += Number(r.cost_usd) || 0
    byService[r.service].calls += 1
    byService[r.service].units += Number(r.units) || 0

    if (!byUser[r.user_id]) byUser[r.user_id] = { cost: 0, calls: 0 }
    byUser[r.user_id].cost += Number(r.cost_usd) || 0
    byUser[r.user_id].calls += 1

    const day = new Date(r.created_at).toISOString().slice(0, 10)
    byDay[day] = (byDay[day] || 0) + (Number(r.cost_usd) || 0)
  }

  // Top 10 spenders
  const topSpenders = Object.entries(byUser)
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 10)
  const topUserIds = topSpenders.map(([id]) => id)

  let userEmails: Record<string, string> = {}
  if (topUserIds.length > 0) {
    const { data: profs } = await sb
      .from('profiles')
      .select('id, email, plan')
      .in('id', topUserIds)
    userEmails = Object.fromEntries((profs || []).map((p: any) => [p.id, p.email]))
  }

  // Daily series sorted asc
  const daily = Object.entries(byDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, cost]) => ({ date, cost: Number(cost.toFixed(4)) }))

  return NextResponse.json({
    days,
    filter,
    since,
    totalCost: Number(totalCost.toFixed(4)),
    totalCalls: all.length,
    totalAudioSec,
    totalAudioHours: Number((totalAudioSec / 3600).toFixed(2)),
    totalTokens,
    uniqueUsers: Object.keys(byUser).length,
    byService: Object.entries(byService).map(([service, v]) => ({
      service,
      cost: Number(v.cost.toFixed(4)),
      calls: v.calls,
      units: v.units,
    })).sort((a, b) => b.cost - a.cost),
    topSpenders: topSpenders.map(([id, v]) => ({
      user_id: id,
      email: userEmails[id] || 'unknown',
      cost: Number(v.cost.toFixed(4)),
      calls: v.calls,
    })),
    daily,
  })
}
