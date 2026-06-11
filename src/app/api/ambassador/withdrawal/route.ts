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

  // Reset commission_total to 0 bila status jadi 'transferred'
  if (action === 'transfer') {
    // Ambil ambassador_user_id dari withdrawal record
    const { data: wd, error: fetchErr } = await sb
      .from('ambassador_withdrawals')
      .select('ambassador_user_id')
      .eq('id', id)
      .single()

    if (fetchErr || !wd) {
      return NextResponse.json({ error: 'Withdrawal not found' }, { status: 404 })
    }

    const { error: profileErr } = await sb
  .from('profiles')
  .update({ ambassador_commission_total: 0 })
  .eq('id', wd.ambassador_user_id)

    if (profileErr) {
      return NextResponse.json({ error: profileErr.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
