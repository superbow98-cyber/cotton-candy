'use client'
// src/app/dashboard/admin/withdrawals/page.tsx

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Withdrawal {
  id: string
  amount_myr: number
  bank_name: string
  account_number: string
  account_name: string
  status: 'pending' | 'approved' | 'transferred'
  requested_at: string
  ambassador_user_id: string
  profiles: {
    full_name: string | null
    email: string | null
    ambassador_promo_code: string | null
  } | null
}

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const sb = createClient()
      const { data } = await sb
        .from('ambassador_withdrawals')
        .select('*, profiles(full_name, email, ambassador_promo_code)')
        .order('requested_at', { ascending: false })
      setWithdrawals(data || [])
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(id: string, action: 'approve' | 'transfer') {
    setActionLoading(id + action)
    try {
      const res = await fetch('/api/ambassador/withdrawal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      if (res.ok) await load()
    } finally {
      setActionLoading(null)
    }
  }

  const pending = withdrawals.filter(w => w.status === 'pending')
  const approved = withdrawals.filter(w => w.status === 'approved')
  const transferred = withdrawals.filter(w => w.status === 'transferred')

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #1d1d1f', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 0' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#1d1d1f' }}>
          💸 Withdrawal Requests
        </h1>
        <div style={{ fontSize: 13, color: 'rgba(29,29,31,0.5)' }}>
          {pending.length} pending · {approved.length} approved · {transferred.length} transferred
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Pending', count: pending.length, bg: 'rgba(240,160,40,0.1)', border: 'rgba(240,160,40,0.35)', color: '#b45309' },
          { label: 'Approved', count: approved.length, bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.3)', color: '#1a56db' },
          { label: 'Transferred', count: transferred.length, bg: 'rgba(80,200,120,0.1)', border: 'rgba(80,200,120,0.35)', color: '#2d6a40' },
        ].map(chip => (
          <div key={chip.label} style={{ padding: '5px 12px', borderRadius: 8, background: chip.bg, border: `0.5px solid ${chip.border}`, fontSize: 12, fontWeight: 600, color: chip.color }}>
            {chip.label}: {chip.count}
          </div>
        ))}
      </div>

      {withdrawals.length === 0 ? (
        <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.07)', borderRadius: 14, padding: '40px 24px', textAlign: 'center', color: 'rgba(29,29,31,0.4)', fontSize: 14 }}>
          No withdrawal requests yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {withdrawals.map(w => (
            <div key={w.id} style={{
              background: '#fff',
              border: `0.5px solid ${w.status === 'pending' ? 'rgba(240,160,40,0.3)' : 'rgba(0,0,0,0.07)'}`,
              borderRadius: 14, padding: '18px 20px',
              display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
            }}>
              {/* Ambassador info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', marginBottom: 2 }}>
                  {w.profiles?.full_name || 'Unknown'}
                  {w.profiles?.ambassador_promo_code && (
                    <span style={{ marginLeft: 8, fontSize: 11, fontFamily: 'monospace', background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: 4, color: 'rgba(29,29,31,0.6)' }}>
                      {w.profiles.ambassador_promo_code}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.45)' }}>{w.profiles?.email || w.ambassador_user_id}</div>
              </div>

              {/* Bank info */}
              <div style={{ minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>RM {w.amount_myr.toFixed(2)}</div>
                <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.55)', marginTop: 2 }}>
                  {w.bank_name} · {w.account_number}
                </div>
                <div style={{ fontSize: 11.5, color: 'rgba(29,29,31,0.45)' }}>{w.account_name}</div>
              </div>

              {/* Date */}
              <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.4)', minWidth: 80, textAlign: 'center' }}>
                {new Date(w.requested_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>

              {/* Status + Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6,
                  background: w.status === 'transferred' ? '#e6f4eb' : w.status === 'approved' ? '#e8f0fe' : 'rgba(240,160,40,0.12)',
                  color: w.status === 'transferred' ? '#2d6a40' : w.status === 'approved' ? '#1a56db' : '#b45309',
                  border: `0.5px solid ${w.status === 'transferred' ? '#7AB883' : w.status === 'approved' ? '#93b4f5' : 'rgba(240,160,40,0.4)'}`,
                }}>
                  {w.status === 'transferred' ? '✓ Transferred' : w.status === 'approved' ? '✓ Approved' : '⏳ Pending'}
                </span>

                {w.status === 'pending' && (
                  <button
                    onClick={() => handleAction(w.id, 'approve')}
                    disabled={actionLoading === w.id + 'approve'}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: '0.5px solid rgba(59,130,246,0.4)',
                      background: 'rgba(59,130,246,0.08)', color: '#1a56db',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      opacity: actionLoading === w.id + 'approve' ? 0.5 : 1,
                    }}
                  >
                    {actionLoading === w.id + 'approve' ? '…' : 'Approve'}
                  </button>
                )}

                {w.status === 'approved' && (
                  <button
                    onClick={() => handleAction(w.id, 'transfer')}
                    disabled={actionLoading === w.id + 'transfer'}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: '0.5px solid rgba(80,200,120,0.4)',
                      background: 'rgba(80,200,120,0.1)', color: '#2d6a40',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      opacity: actionLoading === w.id + 'transfer' ? 0.5 : 1,
                    }}
                  >
                    {actionLoading === w.id + 'transfer' ? '…' : 'Mark Transferred'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
