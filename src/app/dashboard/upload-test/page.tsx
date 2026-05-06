'use client'
import { useState, useRef } from 'react'

type LogEntry = {
  ts: string
  phase: string
  status: 'info' | 'success' | 'error' | 'warn'
  message: string
  details?: any
}

export default function UploadTestPage() {
  const [file, setFile] = useState<File | null>(null)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [running, setRunning] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const log = (phase: string, status: LogEntry['status'], message: string, details?: any) => {
    const ts = new Date().toLocaleTimeString('en-MY', { hour12: false }) + '.' + String(Date.now() % 1000).padStart(3, '0')
    setLogs((prev) => [...prev, { ts, phase, status, message, details }])
    console.log(`[${ts}] ${phase}: ${message}`, details || '')
  }

  const reset = () => {
    setLogs([])
    setRunning(false)
  }

  const runFullTest = async () => {
    if (!file) {
      log('SETUP', 'error', 'Please pick a file first')
      return
    }
    if (running) return

    setLogs([])
    setRunning(true)

    try {
      // ============================================
      // PHASE 1: Test /api/upload-audio/init
      // ============================================
      log('1-INIT', 'info', `Calling /api/upload-audio/init for "${file.name}" (${(file.size / 1024 / 1024).toFixed(2)} MB)...`)

      const initStart = Date.now()
      const initRes = await fetch('/api/upload-audio/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          title: 'Diagnostic test — ' + file.name,
          language: 'auto',
        }),
      })

      const initData = await initRes.json().catch(() => ({}))
      log('1-INIT', initRes.ok ? 'success' : 'error',
        `Status: ${initRes.status} (${Date.now() - initStart}ms)`,
        initData
      )

      if (!initRes.ok) {
        log('FATAL', 'error', 'Init failed — stopping. See response above.')
        setRunning(false)
        return
      }

      const { jobId, uploadUrl, r2Key } = initData
      if (!uploadUrl) {
        log('FATAL', 'error', 'No uploadUrl in response')
        setRunning(false)
        return
      }

      log('1-INIT', 'success', `Job ID: ${jobId}`)
      log('1-INIT', 'info', `Pre-signed URL host: ${new URL(uploadUrl).hostname}`)

      // ============================================
      // PHASE 2: Direct PUT to R2
      // ============================================
      log('2-R2-UPLOAD', 'info', `Uploading file directly to R2... (${(file.size / 1024 / 1024).toFixed(2)} MB)`)

      const uploadStart = Date.now()

      try {
        const uploadResult = await new Promise<{ status: number; statusText: string; headers: Record<string, string>; body: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', uploadUrl)
          // Don't set Content-Type — browser handles it, must match server signature

          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100)
              if (pct % 10 === 0 || pct === 100) {
                log('2-R2-UPLOAD', 'info', `Progress: ${pct}% (${(e.loaded / 1024 / 1024).toFixed(2)}MB / ${(e.total / 1024 / 1024).toFixed(2)}MB)`)
              }
            }
          })

          xhr.onload = () => {
            const headers: Record<string, string> = {}
            xhr.getAllResponseHeaders().split('\r\n').forEach(line => {
              const [k, ...v] = line.split(':')
              if (k) headers[k.trim().toLowerCase()] = v.join(':').trim()
            })
            resolve({
              status: xhr.status,
              statusText: xhr.statusText,
              headers,
              body: xhr.responseText.slice(0, 500),
            })
          }
          xhr.onerror = () => reject(new Error('XHR error event fired (CORS or network)'))
          xhr.onabort = () => reject(new Error('XHR aborted'))
          xhr.ontimeout = () => reject(new Error('XHR timeout'))

          xhr.send(file)
        })

        log('2-R2-UPLOAD',
          uploadResult.status >= 200 && uploadResult.status < 300 ? 'success' : 'error',
          `R2 response: ${uploadResult.status} ${uploadResult.statusText} (${Date.now() - uploadStart}ms)`,
          uploadResult
        )

        if (uploadResult.status < 200 || uploadResult.status >= 300) {
          log('FATAL', 'error', 'R2 rejected upload — stopping')
          setRunning(false)
          return
        }
      } catch (uploadErr: any) {
        log('2-R2-UPLOAD', 'error', `XHR failed: ${uploadErr.message}`, {
          tip: 'This is usually CORS-related. Check R2 bucket CORS policy AllowedOrigins matches exactly.',
          currentOrigin: window.location.origin,
        })
        setRunning(false)
        return
      }

      // ============================================
      // PHASE 3: Submit to Soniox
      // ============================================
      log('3-SUBMIT', 'info', 'Calling /api/upload-audio/submit...')

      const submitStart = Date.now()
      const submitRes = await fetch('/api/upload-audio/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })

      const submitData = await submitRes.json().catch(() => ({}))
      log('3-SUBMIT', submitRes.ok ? 'success' : 'error',
        `Status: ${submitRes.status} (${Date.now() - submitStart}ms)`,
        submitData
      )

      if (!submitRes.ok) {
        log('FATAL', 'error', 'Submit failed — stopping')
        setRunning(false)
        return
      }

      // ============================================
      // PHASE 4: Poll status (max 12 polls = 60s)
      // ============================================
      log('4-POLL', 'info', 'Polling /api/upload-audio/status/{jobId} every 5s...')

      let attempts = 0
      const maxAttempts = 24  // 2 minutes max

      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 5000))
        attempts++

        const pollStart = Date.now()
        const statusRes = await fetch(`/api/upload-audio/status/${jobId}`)
        const statusData = await statusRes.json().catch(() => ({}))

        log('4-POLL', statusData.status === 'failed' ? 'error' : 'info',
          `Attempt ${attempts} → ${statusData.status} (${Date.now() - pollStart}ms)`,
          statusData
        )

        if (statusData.status === 'done') {
          log('5-DONE', 'success', `Lecture created: ${statusData.lectureId}`, statusData)
          log('5-DONE', 'success', `🎉 Full flow complete! Took ${attempts * 5}s for transcription.`)
          break
        }

        if (statusData.status === 'failed') {
          log('FATAL', 'error', `Job failed: ${statusData.error}`)
          break
        }
      }

      if (attempts >= maxAttempts) {
        log('TIMEOUT', 'warn', `Polling timed out after ${maxAttempts * 5}s. Job may still complete in background.`)
      }
    } catch (e: any) {
      log('FATAL', 'error', `Unexpected error: ${e.message}`, { stack: e.stack })
    } finally {
      setRunning(false)
    }
  }

  return (
    <div style={{
      maxWidth: 800,
      margin: '24px auto',
      padding: '0 16px',
      fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    }}>
      <div style={{
        background: '#fff',
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 8 }}>
          🔍 Upload Diagnostic Test
        </h1>
        <p style={{ fontSize: 12, color: '#666', margin: 0, marginBottom: 16, lineHeight: 1.5 }}>
          Test full R2 + async upload flow. Each phase logs result inline (no F12 needed).
        </p>

        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          disabled={running}
          style={{ marginBottom: 12, fontSize: 12 }}
        />

        {file && (
          <div style={{
            background: '#f5f5f5',
            padding: '8px 12px',
            borderRadius: 6,
            fontSize: 11,
            color: '#333',
            marginBottom: 12,
            fontFamily: 'monospace',
          }}>
            📁 {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || '(no type)'}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={runFullTest}
            disabled={!file || running}
            style={{
              flex: 1,
              background: !file || running ? '#ccc' : '#993556',
              color: '#fff',
              border: 'none',
              borderRadius: 7,
              padding: '10px',
              fontSize: 13,
              fontWeight: 500,
              cursor: !file || running ? 'not-allowed' : 'pointer',
            }}
          >
            {running ? '⏳ Running test...' : '▶ Run full diagnostic'}
          </button>
          <button
            onClick={reset}
            disabled={running}
            style={{
              background: '#fff',
              color: '#333',
              border: '0.5px solid rgba(0,0,0,0.2)',
              borderRadius: 7,
              padding: '10px 16px',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        </div>
      </div>

      {/* Logs */}
      <div style={{
        background: '#0d1117',
        color: '#c9d1d9',
        borderRadius: 12,
        padding: 16,
        fontFamily: 'SF Mono, Consolas, monospace',
        fontSize: 11,
        lineHeight: 1.6,
        minHeight: 200,
      }}>
        {logs.length === 0 ? (
          <div style={{ color: '#666' }}>// Logs will appear here...</div>
        ) : logs.map((entry, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <span style={{ color: '#8b949e' }}>{entry.ts}</span>{' '}
            <span style={{
              color: entry.status === 'success' ? '#3fb950'
                  : entry.status === 'error' ? '#f85149'
                  : entry.status === 'warn' ? '#d29922'
                  : '#58a6ff',
              fontWeight: 500,
            }}>[{entry.phase}]</span>{' '}
            <span>{entry.message}</span>
            {entry.details && (
              <details style={{ marginLeft: 16, marginTop: 2 }}>
                <summary style={{ cursor: 'pointer', color: '#8b949e', fontSize: 10 }}>
                  ▸ details
                </summary>
                <pre style={{
                  background: '#161b22',
                  padding: 8,
                  borderRadius: 4,
                  marginTop: 4,
                  fontSize: 10,
                  overflow: 'auto',
                  maxHeight: 200,
                }}>
                  {JSON.stringify(entry.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16,
        padding: 12,
        background: '#fffbea',
        borderRadius: 8,
        fontSize: 11,
        color: '#666',
        lineHeight: 1.6,
      }}>
        <strong>How to read logs:</strong><br/>
        <span style={{ color: '#3fb950' }}>● Green</span> = success ·{' '}
        <span style={{ color: '#f85149' }}>● Red</span> = error ·{' '}
        <span style={{ color: '#d29922' }}>● Yellow</span> = warning ·{' '}
        <span style={{ color: '#58a6ff' }}>● Blue</span> = info<br/>
        Click <code>▸ details</code> to expand response JSON. Share screenshot of full log if stuck.
      </div>
    </div>
  )
}
