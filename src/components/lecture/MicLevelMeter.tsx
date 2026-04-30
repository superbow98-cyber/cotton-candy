'use client'
// src/components/lecture/MicLevelMeter.tsx
// v56 — Live mic input level visualizer during recording
// Shows frequency bars + dB level + signal status

import { useEffect, useRef, useState } from 'react'

interface Props {
  analyser: AnalyserNode | null
  active: boolean      // true while recording
  bars?: number        // number of bars (default 28)
  height?: number      // px (default 48)
  lang?: 'en' | 'bm'
}

export default function MicLevelMeter({ analyser, active, bars = 28, height = 48, lang = 'en' }: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const [db, setDb] = useState<number>(-60)
  const [peakDb, setPeakDb] = useState<number>(-60)

  useEffect(() => {
    if (!analyser || !active || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas resolution (retina-aware)
    const dpr = window.devicePixelRatio || 1
    const cssWidth = canvas.clientWidth
    const cssHeight = canvas.clientHeight
    canvas.width = cssWidth * dpr
    canvas.height = cssHeight * dpr
    ctx.scale(dpr, dpr)

    analyser.fftSize = 256
    const bufferLength = analyser.frequencyBinCount  // 128
    const dataArray = new Uint8Array(bufferLength)

    let peakHold = -60
    let peakDecayTimer = Date.now()

    const draw = () => {
      analyser.getByteFrequencyData(dataArray)

      // Calculate overall level (RMS)
      let sum = 0
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i] * dataArray[i]
      }
      const rms = Math.sqrt(sum / bufferLength)
      const normalizedRms = rms / 255  // 0-1
      const currentDb = normalizedRms > 0
        ? Math.max(-60, 20 * Math.log10(normalizedRms))
        : -60

      // Peak hold (1.5s decay)
      if (currentDb > peakHold) {
        peakHold = currentDb
        peakDecayTimer = Date.now()
      } else if (Date.now() - peakDecayTimer > 1500) {
        peakHold = Math.max(currentDb, peakHold - 0.5)
      }

      setDb(currentDb)
      setPeakDb(peakHold)

      // Clear canvas
      ctx.clearRect(0, 0, cssWidth, cssHeight)

      // Sample bars from frequency data
      const samplesPerBar = Math.floor(bufferLength / bars)
      const barWidth = cssWidth / bars - 2
      const cornerRadius = 2

      for (let i = 0; i < bars; i++) {
        // Average frequency bin samples for this bar
        let barSum = 0
        for (let j = 0; j < samplesPerBar; j++) {
          barSum += dataArray[i * samplesPerBar + j]
        }
        const barValue = barSum / samplesPerBar / 255  // 0-1
        const barHeight = barValue * cssHeight * 0.92

        // Color by intensity
        let color: string
        if (barValue < 0.4) color = '#9FE1CB'      // teal (good)
        else if (barValue < 0.7) color = '#FAC775' // amber (loud)
        else color = '#E24B4A'                     // red (clipping)

        // Draw bar with rounded top
        const x = i * (cssWidth / bars) + 1
        const y = cssHeight - barHeight
        ctx.fillStyle = color

        // Rounded rectangle (top corners)
        ctx.beginPath()
        ctx.moveTo(x, y + cornerRadius)
        ctx.lineTo(x, y + barHeight)
        ctx.lineTo(x + barWidth, y + barHeight)
        ctx.lineTo(x + barWidth, y + cornerRadius)
        ctx.quadraticCurveTo(x + barWidth, y, x + barWidth - cornerRadius, y)
        ctx.lineTo(x + cornerRadius, y)
        ctx.quadraticCurveTo(x, y, x, y + cornerRadius)
        ctx.closePath()
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [analyser, active, bars])

  // Status text based on dB level
  let statusText = lang === 'bm' ? 'Senyap' : 'Quiet'
  let statusColor = 'rgba(29,29,31,0.4)'
  if (db > -40) {
    statusText = lang === 'bm' ? 'Isyarat baik' : 'Good signal'
    statusColor = '#2C8545'
  }
  if (db > -12) {
    statusText = lang === 'bm' ? 'Kuat — kurangkan jarak/volume' : 'Loud — reduce distance/volume'
    statusColor = '#A37018'
  }
  if (db > -3) {
    statusText = lang === 'bm' ? 'Terlalu kuat (clipping)' : 'Too loud (clipping)'
    statusColor = '#A32D2D'
  }

  return (
    <div style={{
      background: 'rgba(245, 245, 247, 0.6)',
      border: '0.5px solid rgba(0,0,0,0.06)',
      borderRadius: 12,
      padding: '12px 14px',
    }}>
      {/* Top: dB readout + status */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 8, fontSize: 11,
      }}>
        <div style={{
          fontFamily: 'SF Mono, Monaco, monospace',
          color: 'rgba(29,29,31,0.6)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {db > -60 ? `${db.toFixed(0)} dB` : '— dB'}
          {peakDb > -60 && (
            <span style={{ marginLeft: 8, color: 'rgba(29,29,31,0.4)' }}>
              peak {peakDb.toFixed(0)}
            </span>
          )}
        </div>
        <div style={{ color: statusColor, fontWeight: 500 }}>
          {active ? statusText : (lang === 'bm' ? 'Tidak aktif' : 'Inactive')}
        </div>
      </div>

      {/* Bars canvas */}
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: height,
          display: 'block',
          borderRadius: 6,
        }}
      />
    </div>
  )
}
