'use client'
import { useState } from 'react'
import { useLang } from '@/lib/i18n/LangProvider'

export function BuyCreditsModal({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { lang } = useLang()
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const total = quantity * 5

  const checkout = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/upload-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.requiresUpgrade) {
          setError(lang === 'bm'
            ? 'Pakej berbayar diperlukan. Sila upgrade dulu.'
            : 'Paid plan required. Please upgrade first.')
        } else {
          setError(data.error || 'Checkout failed')
        }
        setLoading(false)
        return
      }
      if (data.url) window.location.href = data.url
    } catch (e: any) {
      setError(e.message || 'Network error')
      setLoading(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(29,29,31,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, padding: 22,
          maxWidth: 420, width: '100%',
          border: '0.5px solid rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#1d1d1f' }}>
              🎙️ {lang === 'bm' ? 'Kredit muat naik audio' : 'Audio upload credits'}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(29,29,31,0.6)', marginTop: 4, lineHeight: 1.5 }}>
              {lang === 'bm'
                ? 'Muat naik rakaman lama (max 90 min) — Cotton Candy AI hasilkan nota'
                : 'Upload existing recordings (max 90 min each) — Cotton Candy AI generates notes'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            fontSize: 20, color: 'rgba(29,29,31,0.5)', padding: 0,
            lineHeight: 1,
          }}>×</button>
        </div>

        <div style={{
          background: '#FFFBFC',
          border: '0.5px solid rgba(212, 83, 126, 0.25)',
          borderRadius: 10,
          padding: 14,
          marginBottom: 14,
        }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 28, fontWeight: 600, color: '#993556' }}>RM5</span>
            <span style={{ fontSize: 11, color: 'rgba(29,29,31,0.6)' }}>
              {lang === 'bm' ? '/ muat naik' : '/ upload'}
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.7)', lineHeight: 1.6 }}>
            ✓ {lang === 'bm' ? 'Sehingga 90 min audio' : 'Up to 90 min audio'}<br />
            ✓ Soniox AI · BM + EN + Rojak<br />
            ✓ {lang === 'bm' ? 'Auto summary + mind map' : 'Auto summary + mind map'}<br />
            ✓ {lang === 'bm' ? 'Lifetime — tak luput' : 'Lifetime validity'}
          </div>
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          marginBottom: 14, padding: '0 2px',
        }}>
          <span style={{ fontSize: 12, color: 'rgba(29,29,31,0.7)' }}>
            {lang === 'bm' ? 'Kuantiti:' : 'Quantity:'}
          </span>
          <button
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={loading}
            style={{
              width: 30, height: 30, borderRadius: 7,
              border: '0.5px solid rgba(0,0,0,0.15)',
              background: '#fff', fontSize: 16, cursor: 'pointer',
              color: '#1d1d1f', lineHeight: 1,
            }}
          >−</button>
          <span style={{ fontSize: 14, fontWeight: 500, minWidth: 28, textAlign: 'center' }}>
            {quantity}
          </span>
          <button
            onClick={() => setQuantity(Math.min(50, quantity + 1))}
            disabled={loading}
            style={{
              width: 30, height: 30, borderRadius: 7,
              border: '0.5px solid rgba(0,0,0,0.15)',
              background: '#fff', fontSize: 16, cursor: 'pointer',
              color: '#1d1d1f', lineHeight: 1,
            }}
          >+</button>
          <span style={{ marginLeft: 'auto', fontSize: 13, fontWeight: 500, color: '#1d1d1f' }}>
            {lang === 'bm' ? 'Jumlah: ' : 'Total: '}
            <span style={{ color: '#993556' }}>RM{total}</span>
          </span>
        </div>

        {error && (
          <div style={{
            background: '#fde8e8', color: '#b42929',
            padding: '8px 12px', borderRadius: 6, fontSize: 12,
            marginBottom: 12,
          }}>⚠ {error}</div>
        )}

        <button
          onClick={checkout}
          disabled={loading}
          style={{
            width: '100%',
            background: loading ? 'rgba(153, 53, 86, 0.5)' : '#993556',
            color: '#fff', border: 'none', borderRadius: 9,
            padding: 11, fontSize: 13, fontWeight: 500,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading
            ? (lang === 'bm' ? 'Memuatkan...' : 'Loading...')
            : (lang === 'bm' ? 'Bayar dengan Stripe →' : 'Pay with Stripe →')}
        </button>

        <div style={{
          fontSize: 10, color: 'rgba(29,29,31,0.5)',
          textAlign: 'center', marginTop: 10, lineHeight: 1.5,
        }}>
          {lang === 'bm'
            ? 'Pembayaran satu kali · Selamat dengan Stripe · Tiada langganan'
            : 'One-time payment · Secured by Stripe · No subscription'}
        </div>
      </div>
    </div>
  )
}
