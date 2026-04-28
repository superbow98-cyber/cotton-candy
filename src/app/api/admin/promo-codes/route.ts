// src/app/api/admin/promo-codes/route.ts
// Admin CRUD for promo codes. Requires admin email.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return { sb, user: null, isAdmin: false }
  const isAdmin = isAdminEmail(user.email)
  return { sb, user, isAdmin }
}

// GET — list all promo codes
export async function GET() {
  const { sb, isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data, error } = await sb
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ codes: data || [] })
}

// POST — create new promo code
export async function POST(req: NextRequest) {
  const { sb, user, isAdmin } = await requireAdmin()
  if (!isAdmin || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const code = String(body.code || '').trim().toUpperCase()
    const discount_percent = Number(body.discount_percent)
    const max_uses = body.max_uses ? Number(body.max_uses) : null
    const expires_at = body.expires_at || null
    const applicable_plans = Array.isArray(body.applicable_plans) ? body.applicable_plans : []

    // Validation
    if (!code || code.length < 3) {
      return NextResponse.json({ error: 'Code must be at least 3 characters' }, { status: 400 })
    }
    if (!Number.isInteger(discount_percent) || discount_percent < 1 || discount_percent > 100) {
      return NextResponse.json({ error: 'Discount must be 1-100' }, { status: 400 })
    }
    if (applicable_plans.length === 0) {
      return NextResponse.json({ error: 'Select at least 1 applicable plan' }, { status: 400 })
    }
    const validPlans = ['day', 'student_pro', 'month', 'year']
    if (!applicable_plans.every((p: string) => validPlans.includes(p))) {
      return NextResponse.json({ error: 'Invalid plan in applicable_plans' }, { status: 400 })
    }

    const { data, error } = await sb
      .from('promo_codes')
      .insert({
        code,
        discount_percent,
        max_uses,
        expires_at,
        applicable_plans,
        active: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Code already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ code: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Bad request' }, { status: 400 })
  }
}

// PATCH — update existing promo code
export async function PATCH(req: NextRequest) {
  const { sb, isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const id = body.id
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const updates: any = {}
    if (typeof body.active === 'boolean') updates.active = body.active
    if (typeof body.discount_percent === 'number') updates.discount_percent = body.discount_percent
    if (body.max_uses !== undefined) updates.max_uses = body.max_uses
    if (body.expires_at !== undefined) updates.expires_at = body.expires_at
    if (Array.isArray(body.applicable_plans)) updates.applicable_plans = body.applicable_plans

    const { data, error } = await sb
      .from('promo_codes')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ code: data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Bad request' }, { status: 400 })
  }
}

// DELETE — remove promo code
export async function DELETE(req: NextRequest) {
  const { sb, isAdmin } = await requireAdmin()
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const { error } = await sb
    .from('promo_codes')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
