'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { isAdminEmail } from '@/lib/admin'

interface PromoCode {
  id: string
  code: string
  discount_percent: number
  applicable_plans: string[]
  max_uses: number | null
  used_count: number
  expires_at: string | null
  active: boolean
  created_at: string
}

const PLAN_LABELS: Record<string, { name: string; price: string }> = {
  day:            { name: 'Day Pass',           price: 'RM 8' },
  student_pro:    { name: 'Student PRO',        price: 'RM 17' },
  month:          { name: 'Monthly',            price: 'RM 25' },
  year:           { name: 'Yearly',             price: 'RM 100' },
  upload_credits: { name: 'Upload Credits',     price: 'RM 5/each' },  // v62
}

export default function AdminPromoCodesPage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [code, setCode] = useState('')
  const [discountPercent, setDiscountPercent] = useState(50)
  const [maxUses, setMaxUses] = useState<number | ''>('')
  const [expiresAt, setExpiresAt] = useState('')
  const [selectedPlans, setSelectedPlans] = useState<string[]>(['student_pro'])
  const [submitting, setSubmitting] = useState(false)

  // Auth check
  useEffect(() => {
    const sb = createClient()
    sb.auth.getUser().then(({ data }) => {
      if (!data.user || !isAdminEmail(data.user.email)) {
        router.push('/dashboard')
        return
      }
      setAuthChecked(true)
      load()
    })
  }, [router])

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/promo-codes')
      const data = await res.json()
      if (data.codes) setCodes(data.codes)
    } finally {
      setLoading(false)
    }
  }

  const create = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          discount_percent: discountPercent,
          max_uses: maxUses === '' ? null : maxUses,
          expires_at: expiresAt || null,
          applicable_plans: selectedPlans,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Failed to create')
        return
      }
      setShowModal(false)
      resetForm()
      load()
    } finally {
      setSubmitting(false)
    }
  }

  const toggleActive = async (id: string, active: boolean) => {
    await fetch('/api/admin/promo-codes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, active: !active }),
    })
    load()
  }

  const remove = async (id: string, code: string) => {
    if (!confirm(`Delete promo code "${code}"?`)) return
    await fetch(`/api/admin/promo-codes?id=${id}`, { method: 'DELETE' })
    load()
  }

  const resetForm = () => {
    setCode('')
    setDiscountPercent(50)
    setMaxUses('')
    setExpiresAt('')
    setSelectedPlans(['student_pro'])
    setError(null)
  }

  const togglePlan = (plan: string) => {
    setSelectedPlans(prev =>
      prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan]
    )
  }

  const formatExpiry = (date: string | null): string => {
    if (!date) return 'No expiry'
    const d = new Date(date)
    const now = new Date()
    const days = Math.floor((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (days < 0) return 'Expired'
    if (days < 7) return `In ${days}d`
    return d.toLocaleDateString('en-MY', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  if (!authChecked) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Checking access...</div>
  }

  // Stats
  const activeCount = codes.filter(c => c.active).length
  const totalUses = codes.reduce((sum, c) => sum + c.used_count, 0)
  const expiringSoon = codes.filter(c => {
    if (!c.expires_at || !c.active) return false
    const days = Math.floor((new Date(c.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return days >= 0 && days < 7
  }).length

  return (
    <div style={{
      maxWidth: 1100, margin: '0 auto', padding: '40px 20px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
      color: '#1d1d1f',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h1 style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.025em' }}>
          🎁 Promo Codes
          <span style={{
            display: 'inline-block', marginLeft: 10,
            padding: '3px 10px',
            background: 'rgba(255, 107, 157, 0.1)',
            color: '#C42470',
            borderRadius: 100,
            fontSize: 11, fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>Admin Only</span>
        </h1>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 18px', background: '#1d1d1f', color: '#fff',
            border: 'none', borderRadius: 100,
            fontSize: 13, fontWeight: 500, cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          + New Code
        </button>
      </div>
      <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.6)', marginBottom: 26 }}>
        Manage discount codes for Cotton Candy plans
      </p>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 10, marginBottom: 24,
      }}>
        <StatCard label="Active Codes" value={activeCount.toString()} sub={`${expiringSoon} expiring soon`} />
        <StatCard label="Total Uses" value={totalUses.toString()} sub="All time" />
        <StatCard label="Total Codes" value={codes.length.toString()} sub={`${codes.length - activeCount} inactive`} />
      </div>

      {/* Code list */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Loading...</div>
      ) : codes.length === 0 ? (
        <div style={{
          background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)',
          borderRadius: 16, padding: 40, textAlign: 'center',
          color: 'rgba(29,29,31,0.6)',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎁</div>
          <p style={{ fontSize: 14, marginBottom: 14 }}>No promo codes yet</p>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '8px 16px', background: '#1d1d1f', color: '#fff',
              border: 'none', borderRadius: 100,
              fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Create First Code
          </button>
        </div>
      ) : (
        <div style={{
          background: '#fff',
          border: '0.5px solid rgba(0,0,0,0.08)',
          borderRadius: 16,
          overflow: 'hidden',
        }}>
          {codes.map((c, i) => (
            <div key={c.id} style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1.5fr 1fr 1fr 100px',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: i < codes.length - 1 ? '0.5px solid rgba(0,0,0,0.06)' : 'none',
              gap: 12,
              opacity: c.active ? 1 : 0.5,
            }}>
              <div>
                <span style={{
                  fontFamily: 'SF Mono, Monaco, monospace',
                  fontSize: 14, fontWeight: 600,
                  background: 'rgba(90, 143, 245, 0.08)',
                  padding: '4px 10px', borderRadius: 6,
                  display: 'inline-block',
                }}>{c.code}</span>
              </div>
              <div>
                <span style={{
                  display: 'inline-block',
                  padding: '3px 10px',
                  background: 'linear-gradient(135deg, #FF6B9D, #C471F5)',
                  color: '#fff', borderRadius: 100,
                  fontSize: 12, fontWeight: 600,
                }}>{c.discount_percent}% OFF</span>
              </div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {c.applicable_plans.map(p => (
                  <span key={p} style={{
                    fontSize: 10.5,
                    padding: '2px 7px',
                    background: 'rgba(0,0,0,0.05)',
                    borderRadius: 100,
                    color: 'rgba(29,29,31,0.7)',
                    fontWeight: 500,
                  }}>{PLAN_LABELS[p]?.name || p}</span>
                ))}
              </div>
              <div style={{ fontSize: 12 }}>
                <div>{c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ''}</div>
                {c.max_uses && (
                  <div style={{
                    height: 4, background: 'rgba(0,0,0,0.06)',
                    borderRadius: 100, overflow: 'hidden', marginTop: 4,
                  }}>
                    <div style={{
                      height: '100%',
                      background: '#5A8FF5',
                      width: `${Math.min(100, (c.used_count / c.max_uses) * 100)}%`,
                    }} />
                  </div>
                )}
              </div>
              <div style={{
                fontSize: 12,
                color: !c.expires_at ? 'rgba(29,29,31,0.6)' :
                  (new Date(c.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 7
                    ? '#C62828' : 'rgba(29,29,31,0.6)',
                fontWeight: !c.expires_at || (new Date(c.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24) >= 7 ? 400 : 600,
              }}>
                {formatExpiry(c.expires_at)}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => toggleActive(c.id, c.active)}
                  title={c.active ? 'Disable' : 'Enable'}
                  style={{
                    width: 38, height: 22, borderRadius: 100,
                    background: c.active ? '#34c759' : 'rgba(0,0,0,0.15)',
                    border: 'none', cursor: 'pointer', position: 'relative',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: 2,
                    left: c.active ? 18 : 2,
                    width: 18, height: 18, background: '#fff',
                    borderRadius: '50%',
                    transition: 'left 200ms',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  }} />
                </button>
                <button
                  onClick={() => remove(c.id, c.code)}
                  style={{
                    width: 28, height: 28, borderRadius: 7,
                    border: '0.5px solid rgba(0,0,0,0.1)',
                    background: '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showModal && (
        <div
          onClick={() => setShowModal(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 22, padding: 32,
              width: '100%', maxWidth: 520,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
              maxHeight: '90vh', overflowY: 'auto',
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 4 }}>Create Promo Code</h2>
            <p style={{ fontSize: 12.5, color: 'rgba(29,29,31,0.6)', marginBottom: 22 }}>
              Configure a new discount code
            </p>

            <Field label="Code (uppercase)">
              <input
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                placeholder="STUDENT50"
                maxLength={20}
                style={{
                  ...inputStyle,
                  fontFamily: 'SF Mono, Monaco, monospace',
                  textTransform: 'uppercase',
                }}
              />
            </Field>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="Discount %">
                <input
                  type="number" min={1} max={100}
                  value={discountPercent}
                  onChange={e => setDiscountPercent(Number(e.target.value))}
                  placeholder="50"
                  style={inputStyle}
                />
              </Field>
              <Field label="Max Uses (blank = unlimited)">
                <input
                  type="number" min={1}
                  value={maxUses}
                  onChange={e => setMaxUses(e.target.value ? Number(e.target.value) : '')}
                  placeholder="100"
                  style={inputStyle}
                />
              </Field>
            </div>

            <Field label="Expires On (optional)">
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={e => setExpiresAt(e.target.value)}
                style={inputStyle}
              />
            </Field>

            <Field label="Applicable Plans">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {Object.entries(PLAN_LABELS).map(([key, info]) => {
                  const active = selectedPlans.includes(key)
                  return (
                    <div
                      key={key}
                      onClick={() => togglePlan(key)}
                      style={{
                        padding: '10px 12px',
                        border: '0.5px solid',
                        borderColor: active ? '#1d1d1f' : 'rgba(0,0,0,0.14)',
                        background: active ? '#1d1d1f' : '#fff',
                        color: active ? '#fff' : '#1d1d1f',
                        borderRadius: 10, cursor: 'pointer',
                        fontSize: 13, fontWeight: 500,
                        userSelect: 'none',
                      }}
                    >
                      {info.name} · {info.price}
                    </div>
                  )
                })}
              </div>
            </Field>

            {error && (
              <div style={{
                padding: '10px 12px', background: '#FEE',
                color: '#C62828', borderRadius: 10,
                fontSize: 12.5, marginBottom: 12,
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowModal(false); resetForm() }}
                style={{
                  padding: '10px 18px', background: '#fff',
                  color: '#1d1d1f',
                  border: '0.5px solid rgba(0,0,0,0.12)',
                  borderRadius: 100,
                  fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >Cancel</button>
              <button
                onClick={create}
                disabled={submitting}
                style={{
                  padding: '10px 22px', background: '#1d1d1f',
                  color: '#fff', border: 'none',
                  borderRadius: 100,
                  fontSize: 13, fontWeight: 600,
                  cursor: submitting ? 'wait' : 'pointer',
                  fontFamily: 'inherit',
                  opacity: submitting ? 0.6 : 1,
                }}
              >{submitting ? 'Creating…' : 'Create Code'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '11px 14px',
  border: '0.5px solid rgba(0,0,0,0.14)',
  borderRadius: 10,
  fontSize: 14,
  fontFamily: 'inherit',
  color: '#1d1d1f',
  outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{
        display: 'block', fontSize: 11.5, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        color: 'rgba(29,29,31,0.65)', marginBottom: 6,
      }}>{label}</label>
      {children}
    </div>
  )
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{
      background: '#fff',
      border: '0.5px solid rgba(0,0,0,0.08)',
      borderRadius: 14, padding: 16,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: 'rgba(29,29,31,0.55)',
        marginBottom: 6,
      }}>{label}</div>
      <div style={{
        fontSize: 24, fontWeight: 600,
        letterSpacing: '-0.02em',
      }}>{value}</div>
      <div style={{
        fontSize: 11.5,
        color: 'rgba(29,29,31,0.55)',
        marginTop: 4,
      }}>{sub}</div>
    </div>
  )
}
