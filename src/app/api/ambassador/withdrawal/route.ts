// src/app/api/ambassador/withdrawal/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { adminClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const { id, action } = await req.json()
  if (!id || !['approve', 'transfer'].includes(action)) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  const sb = adminClient()
  const update =
    action === 'approve'
      ? { status: 'approved', approved_at: new Date().toISOString() }
      : { status: 'transferred', transferred_at: new Date().toISOString() }

  const { error } = await sb
    .from('ambassador_withdrawals')
    .update(update)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
