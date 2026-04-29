'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ServiceStat {
  service: string
  cost: number
  calls: number
  units: number
}
interface TopSpender {
  user_id: string
  email: string
  cost: number
  calls: number
}
interface DailyPoint {
  date: string
  cost: number
}
interface UsageResponse {
  days: number
  totalCost: number
  totalCalls: number
  totalAudioHours: number
  totalTokens: number
  uniqueUsers: number
  byService: ServiceStat[]
  topSpenders: TopSpender[]
  daily: DailyPoint[]
}

const SERVICE_LABELS: Record<string, { label: string; emoji: string }> = {
  groq_whisper_v3: { label: 'Whisper Large v3 (BM/Rojak)', emoji: '🎙️' },
  groq_whisper_turbo: { label: 'Whisper Turbo (EN/zh/ta)', emoji: '⚡' },
  gemini_flash: { label: 'Gemini Flash', emoji: '✨' },
  gemini_flash_lite: { label: 'Gemini Flash Lite', emoji: '✨' },
  xai_grok: { label: 'xAI Grok', emoji: '🧠' },
  soniox_async: { label: 'Soniox Async (BM/Rojak)', emoji: '🎯' },
  soniox_streaming: { label: 'Soniox Streaming', emoji: '🎯' },
}

function fmtUSD(n: number): string {
  return `$${n.toFixed(4)}`
}

export default function AdminUsagePage() {
  const [data, setData] = useState<UsageResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true); setError(null)
    try {
      const res = await fetch(`/api/admin/usage?days=${days}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const j = await res.json()
      setData(j)
    } catch (e: any) {
      setError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [days])

  const maxDaily = data?.daily.length ? Math.max(...data.daily.map(d => d.cost)) : 1

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px' }}>

      <Link href="/dashboard" style={{
        fontSize: 12, color: 'rgba(29,29,31,0.6)',
        textDecoration: 'none', marginBottom: 12, display: 'inline-block',
      }}>← Dashboard</Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 8 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.025em', margin: 0 }}>
          📊 Usage & Cost
        </h1>
        <div style={{ display: 'flex', gap: 6 }}>
          {[7, 30, 90].map(d => (
            <button
              key={d}
              onClick={() => setDays(d)}
              style={{
                padding: '6px 12px',
                background: days === d ? '#1d1d1f' : '#fff',
                color: days === d ? '#fff' : '#1d1d1f',
                border: '0.5px solid rgba(0,0,0,0.14)',
                borderRadius: 100, fontSize: 12,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{d}d</button>
          ))}
        </div>
      </div>

      {loading && <div style={{ padding: 24, textAlign: 'center', color: 'rgba(29,29,31,0.5)' }}>Loading…</div>}
      {error && <div style={{ padding: 12, background: 'rgba(255,80,80,0.08)', borderRadius: 10, color: '#a00', fontSize: 13 }}>Error: {error}</div>}

      {data && !loading && (
        <>
          {/* SUMMARY CARDS */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12,
            marginBottom: 24,
          }}>
            <SummaryCard label="Total cost" value={fmtUSD(data.totalCost)} sub={`${days} days`} />
            <SummaryCard label="API calls" value={data.totalCalls.toLocaleString()} sub="transactions" />
            <SummaryCard label="Audio hours" value={data.totalAudioHours.toFixed(1)} sub="transcribed" />
            <SummaryCard label="Active users" value={data.uniqueUsers.toString()} sub="unique" />
            <SummaryCard label="Tokens" value={(data.totalTokens / 1000).toFixed(1) + 'k'} sub="LLM tokens" />
          </div>

          {/* DAILY CHART */}
          <Section title="Daily spend">
            <div style={{ padding: 16 }}>
              {data.daily.length === 0 ? (
                <div style={{ color: 'rgba(29,29,31,0.5)', fontSize: 13, textAlign: 'center', padding: 16 }}>
                  No usage data yet
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
                  {data.daily.map(d => (
                    <div
                      key={d.date}
                      title={`${d.date}: ${fmtUSD(d.cost)}`}
                      style={{
                        flex: 1,
                        height: `${maxDaily > 0 ? (d.cost / maxDaily) * 100 : 0}%`,
                        background: 'linear-gradient(to top, #5A8FF5, #87B4FF)',
                        borderRadius: '3px 3px 0 0',
                        minHeight: d.cost > 0 ? 2 : 0,
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* BY SERVICE */}
          <Section title="Cost by service">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <th style={thStyle}>Service</th>
                  <th style={thStyle}>Calls</th>
                  <th style={thStyle}>Units</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.byService.map(s => {
                  const meta = SERVICE_LABELS[s.service] || { label: s.service, emoji: '•' }
                  const isAudio = s.service.startsWith('groq_whisper')
                  return (
                    <tr key={s.service} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                      <td style={tdStyle}>
                        <span style={{ marginRight: 6 }}>{meta.emoji}</span>
                        {meta.label}
                      </td>
                      <td style={tdStyle}>{s.calls}</td>
                      <td style={tdStyle}>
                        {isAudio
                          ? `${(s.units / 3600).toFixed(2)} hrs`
                          : `${(s.units / 1000).toFixed(1)}k tokens`}
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontFamily: 'SF Mono, monospace' }}>
                        {fmtUSD(s.cost)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Section>

          {/* TOP SPENDERS */}
          <Section title="Top 10 spenders">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid rgba(0,0,0,0.08)' }}>
                  <th style={thStyle}>#</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Calls</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.topSpenders.length === 0 && (
                  <tr><td colSpan={4} style={{ padding: 14, textAlign: 'center', color: 'rgba(29,29,31,0.5)' }}>No usage yet</td></tr>
                )}
                {data.topSpenders.map((u, i) => (
                  <tr key={u.user_id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.04)' }}>
                    <td style={tdStyle}>{i + 1}</td>
                    <td style={{ ...tdStyle, fontFamily: 'SF Mono, monospace', fontSize: 12 }}>{u.email}</td>
                    <td style={tdStyle}>{u.calls}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 600, fontFamily: 'SF Mono, monospace' }}>
                      {fmtUSD(u.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <div style={{
            marginTop: 16, padding: 12,
            background: 'rgba(255, 246, 230, 0.5)',
            border: '0.5px solid rgba(255, 200, 100, 0.3)',
            borderRadius: 10,
            fontSize: 12, color: 'rgba(29,29,31,0.6)',
            lineHeight: 1.5,
          }}>
            💡 <strong>Note:</strong> Costs estimated using current Groq + Gemini pricing.
            Real Groq invoice may differ slightly due to minimum charges.
            Compare with <a href="https://console.groq.com/billing" target="_blank" rel="noreferrer" style={{ color: '#5A8FF5' }}>Groq billing dashboard</a> for actual.
          </div>
        </>
      )}
    </div>
  )
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{
      background: '#fff', padding: 14, borderRadius: 12,
      border: '0.5px solid rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 600, color: '#1d1d1f', marginTop: 4, letterSpacing: '-0.02em', fontFamily: 'SF Mono, Monaco, monospace' }}>
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.5)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 11, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.05em',
        color: 'rgba(29,29,31,0.5)',
        marginBottom: 8,
      }}>{title}</div>
      <div style={{
        background: '#fff', borderRadius: 12,
        border: '0.5px solid rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  )
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 14px',
  fontSize: 11,
  fontWeight: 600,
  color: 'rgba(29,29,31,0.55)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}
const tdStyle: React.CSSProperties = {
  padding: '10px 14px',
  color: '#1d1d1f',
}
