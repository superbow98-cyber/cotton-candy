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

  // v62: Promo code state
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState<{ code: string; discount: number } | null>(null)
  const [promoError, setPromoError] = useState<string | null>(null)
  const [validatingPromo, setValidatingPromo] = useState(false)

  if (!open) return null

  const subtotal = quantity * 5
  const discount = promoApplied ? subtotal * (promoApplied.discount / 100) : 0
  const total = subtotal - discount

  const validatePromo = async () => {
    const code = promoCode.trim().toUpperCase()
    if (!code) return
    setValidatingPromo(true)
    setPromoError(null)
    try {
      const res = await fetch('/api/checkout/upload-credits/validate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!data.ok) {
        setPromoError(data.error || 'Invalid code')
        setPromoApplied(null)
      } else {
        setPromoApplied({ code: data.code, discount: data.discountPercent })
        setPromoError(null)
      }
    } catch (e: any) {
      setPromoError(e.message || 'Network error')
    } finally {
      setValidatingPromo(false)
    }
  }

  const removePromo = () => {
    setPromoApplied(null)
    setPromoCode('')
    setPromoError(null)
  }

  const checkout = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/checkout/upload-credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quantity,
          promoCode: promoApplied?.code || null,
        }),
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
          maxHeight: '90vh', overflowY: 'auto',
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
          marginBottom: 12, padding: '0 2px',
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
        </div>

        {/* v62: Promo code input */}
        <div style={{ marginBottom: 12 }}>
          {!promoApplied ? (
            <>
              <label style={{
                fontSize: 11, color: 'rgba(29,29,31,0.6)',
                display: 'block', marginBottom: 4, fontWeight: 500,
              }}>
                {lang === 'bm' ? 'Kod promo (pilihan)' : 'Promo code (optional)'}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && validatePromo()}
                  placeholder={lang === 'bm' ? 'cth. SAMA10' : 'e.g. SAMA10'}
                  disabled={loading || validatingPromo}
                  style={{
                    flex: 1, padding: '8px 10px',
                    border: '0.5px solid rgba(0,0,0,0.15)',
                    borderRadius: 7, fontSize: 12,
                    fontFamily: 'inherit',
                    textTransform: 'uppercase',
                  }}
                />
                <button
                  onClick={validatePromo}
                  disabled={!promoCode || validatingPromo || loading}
                  style={{
                    background: 'transparent',
                    border: '0.5px solid rgba(212, 83, 126, 0.4)',
                    color: '#993556',
                    padding: '8px 12px', borderRadius: 7,
                    fontSize: 12, fontWeight: 500,
                    cursor: !promoCode || validatingPromo ? 'not-allowed' : 'pointer',
                    opacity: !promoCode ? 0.4 : 1,
                  }}
                >
                  {validatingPromo
                    ? '...'
                    : (lang === 'bm' ? 'Guna' : 'Apply')}
                </button>
              </div>
              {promoError && (
                <div style={{ fontSize: 11, color: '#b42929', marginTop: 4 }}>
                  ⚠ {promoError}
                </div>
              )}
            </>
          ) : (
            <div style={{
              background: '#e8f5e9',
              border: '0.5px solid rgba(46, 125, 50, 0.3)',
              borderRadius: 7,
              padding: '8px 12px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ fontSize: 12, color: '#1b5e20', fontWeight: 500 }}>
                ✓ {promoApplied.code} — {promoApplied.discount}% {lang === 'bm' ? 'diskaun' : 'off'}
              </div>
              <button
                onClick={removePromo}
                style={{
                  background: 'transparent', border: 'none',
                  color: '#1b5e20', cursor: 'pointer',
                  fontSize: 11, padding: 0, fontWeight: 500,
                  textDecoration: 'underline',
                }}
              >
                {lang === 'bm' ? 'Buang' : 'Remove'}
              </button>
            </div>
          )}
        </div>

        {/* Total breakdown */}
        <div style={{
          background: 'rgba(0,0,0,0.02)',
          borderRadius: 8,
          padding: '10px 12px',
          marginBottom: 14,
          fontSize: 12,
        }}>
          {promoApplied && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(29,29,31,0.65)', marginBottom: 3 }}>
                <span>{lang === 'bm' ? 'Subtotal' : 'Subtotal'}</span>
                <span>RM{subtotal.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1b5e20', marginBottom: 6 }}>
                <span>{lang === 'bm' ? 'Diskaun' : 'Discount'} ({promoApplied.discount}%)</span>
                <span>−RM{discount.toFixed(2)}</span>
              </div>
            </>
          )}
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            paddingTop: promoApplied ? 6 : 0,
            borderTop: promoApplied ? '0.5px solid rgba(0,0,0,0.08)' : 'none',
          }}>
            <span style={{ fontWeight: 500, color: '#1d1d1f' }}>
              {lang === 'bm' ? 'Jumlah' : 'Total'}
            </span>
            <span style={{ fontWeight: 600, color: '#993556', fontSize: 14 }}>
              RM{total.toFixed(2)}
            </span>
          </div>
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
