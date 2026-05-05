'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useLang } from '@/lib/i18n/LangProvider'
import { createClient } from '@/lib/supabase/client'
import { type Profile } from '@/types'
import { Icon } from '@/components/ui/Icon'
import { BuyCreditsModal } from '@/components/lecture/BuyCreditsModal'

const RECORDING_LANGUAGES = [
  { code: 'auto', label_bm: 'Mod rojak (BM + EN, Soniox AI)', label_en: 'Rojak mode (BM + EN, Soniox AI)', recommended: true },
  { code: 'ms',   label_bm: 'Bahasa Melayu sahaja (Soniox)',   label_en: 'Malay only (Soniox)' },
  { code: 'en',   label_bm: 'English sahaja (Whisper)',         label_en: 'English only (Whisper)' },
  { code: 'zh',   label_bm: '中文 (Whisper)',                   label_en: 'Chinese (Whisper)' },
  { code: 'ta',   label_bm: 'தமிழ் (Whisper)',                  label_en: 'Tamil (Whisper)' },
]

type Phase = 'idle' | 'init' | 'uploading' | 'submitting' | 'transcribing' | 'done' | 'failed'

export default function UploadAudioPage() {
  const router = useRouter()
  const { lang } = useLang()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState('auto')
  const [title, setTitle] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState<string>('')
  const [buyModalOpen, setBuyModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollAbortRef = useRef<{ stop: boolean }>({ stop: false })

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      const { data: prof } = await sb.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (prof) setProfile(prof as Profile)
    })()
    return () => { pollAbortRef.current.stop = true }
  }, [router])

  const credits = profile?.upload_credits || 0
  const uploading = phase !== 'idle' && phase !== 'failed' && phase !== 'done'

  const onFilePick = (f: File | null) => {
    setError(null)
    if (!f) return
    if (f.size > 200 * 1024 * 1024) {
      setError(lang === 'bm' ? 'Fail terlalu besar (>200MB)' : 'File too large (>200MB)')
      return
    }
    setFile(f)
    if (!title) {
      setTitle(f.name.replace(/\.[^.]+$/, '').slice(0, 100))
    }
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (f) onFilePick(f)
  }

  // Upload file to R2 with progress tracking
  const uploadToR2 = (uploadUrl: string, fileToUpload: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', uploadUrl)
      xhr.setRequestHeader('Content-Type', fileToUpload.type)

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100)
          setProgress(pct)
        }
      })

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`R2 upload failed: ${xhr.status} ${xhr.statusText}`))
        }
      }
      xhr.onerror = () => reject(new Error('Network error during upload'))
      xhr.onabort = () => reject(new Error('Upload aborted'))

      xhr.send(fileToUpload)
    })
  }

  // Poll for transcription status
  const pollStatus = async (jobId: string): Promise<{ lectureId: string }> => {
    pollAbortRef.current.stop = false
    let attempts = 0
    const MAX_ATTEMPTS = 60  // 60 × 5s = 5 minutes max

    while (attempts < MAX_ATTEMPTS) {
      if (pollAbortRef.current.stop) throw new Error('Cancelled')

      await new Promise(r => setTimeout(r, 5000))
      attempts++

      try {
        const res = await fetch(`/api/upload-audio/status/${jobId}`)
        const data = await res.json()

        if (!res.ok || data.ok === false) {
          if (data.status === 'failed') {
            throw new Error(data.error || 'Transcription failed')
          }
          // Soft fail — continue polling
          continue
        }

        if (data.status === 'done') {
          return { lectureId: data.lectureId }
        }

        // Update status message based on phase
        const elapsed = attempts * 5
        const remainingEstimate = Math.max(60 - elapsed, 10)
        setStatusMsg(
          lang === 'bm'
            ? `🤖 AI sedang transkrip... (~${remainingEstimate}s lagi)`
            : `🤖 AI transcribing... (~${remainingEstimate}s remaining)`
        )
      } catch (e: any) {
        if (e.message === 'Cancelled') throw e
        // Network blip — keep trying
        console.warn('[poll] error:', e.message)
      }
    }

    throw new Error('Timed out waiting for transcription')
  }

  const startUpload = async () => {
    if (!file || !profile) return
    if (credits < 1) {
      setError(lang === 'bm' ? 'Tiada kredit. Beli dahulu.' : 'No credits. Please buy first.')
      return
    }

    setError(null)
    setProgress(0)

    try {
      // PHASE 1: Initialize - get pre-signed URL
      setPhase('init')
      setStatusMsg(lang === 'bm' ? '🔗 Menyediakan upload...' : '🔗 Preparing upload...')

      const initRes = await fetch('/api/upload-audio/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          sizeBytes: file.size,
          title: title || file.name,
          language,
        }),
      })

      if (!initRes.ok) {
        const data = await initRes.json()
        throw new Error(data.error || 'Init failed')
      }

      const { jobId, uploadUrl } = await initRes.json()

      // PHASE 2: Upload file directly to R2 (bypass Vercel!)
      setPhase('uploading')
      setStatusMsg(lang === 'bm' ? '📤 Memuat naik ke cloud...' : '📤 Uploading to cloud...')
      await uploadToR2(uploadUrl, file)

      // PHASE 3: Submit to Soniox
      setPhase('submitting')
      setProgress(100)
      setStatusMsg(lang === 'bm' ? '⚡ Memulakan AI...' : '⚡ Starting AI...')

      const submitRes = await fetch('/api/upload-audio/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId }),
      })

      if (!submitRes.ok) {
        const data = await submitRes.json()
        throw new Error(data.error || 'Submit failed')
      }

      // PHASE 4: Poll status until done
      setPhase('transcribing')
      setStatusMsg(lang === 'bm' ? '🤖 AI sedang transkrip...' : '🤖 AI transcribing...')

      const result = await pollStatus(jobId)

      // PHASE 5: Done — redirect
      setPhase('done')
      setStatusMsg(lang === 'bm' ? '✓ Siap! Memuat halaman...' : '✓ Done! Loading lecture...')

      setTimeout(() => {
        router.push(`/dashboard/lectures/${result.lectureId}`)
      }, 800)
    } catch (e: any) {
      setError(e.message || 'Upload failed')
      setPhase('failed')
      setProgress(0)
    }
  }

  const cancel = () => {
    pollAbortRef.current.stop = true
    setPhase('idle')
    setProgress(0)
    setStatusMsg('')
    setError(null)
  }

  return (
    <div style={{ maxWidth: 560, margin: '24px auto', padding: '0 16px' }}>
      <Link href="/dashboard" style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        fontSize: 12, color: 'rgba(29,29,31,0.55)',
        textDecoration: 'none', marginBottom: 12,
      }}>
        <Icon.ChevronRight size={11} style={{ transform: 'rotate(180deg)' }} />
        {lang === 'bm' ? 'Kembali' : 'Back'}
      </Link>

      <div style={{
        background: '#fff',
        border: '0.5px solid rgba(0,0,0,0.06)',
        borderRadius: 14,
        padding: '20px 22px',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 16, gap: 8, flexWrap: 'wrap',
        }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', margin: 0 }}>
              🎙️ {lang === 'bm' ? 'Muat naik rakaman' : 'Upload recording'}
            </h1>
            <p style={{ fontSize: 12, color: 'rgba(29,29,31,0.55)', margin: 0, marginTop: 3 }}>
              {lang === 'bm'
                ? 'Audio fail → AI nota auto'
                : 'Audio file → AI notes auto'}
            </p>
          </div>
          <button
            onClick={() => setBuyModalOpen(true)}
            style={{
              background: 'rgba(212, 83, 126, 0.08)',
              border: '0.5px solid rgba(212, 83, 126, 0.25)',
              borderRadius: 100, padding: '5px 12px',
              fontSize: 11, color: '#993556', cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            🎙️ <span style={{ fontWeight: 600 }}>{credits}</span> {lang === 'bm' ? 'kredit' : 'credits'}
          </button>
        </div>

        {/* File picker */}
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{
            border: file
              ? '1.5px solid rgba(212, 83, 126, 0.5)'
              : '1.5px dashed rgba(212, 83, 126, 0.35)',
            borderRadius: 12,
            padding: file ? '20px 16px' : '32px 18px',
            textAlign: 'center',
            background: '#FFFBFC',
            cursor: uploading ? 'wait' : 'pointer',
            marginBottom: 16,
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/mpeg,audio/mp3,audio/mp4,audio/m4a,audio/x-m4a,audio/wav,audio/wave,audio/x-wav,audio/webm,audio/ogg,audio/flac,video/mp4,video/webm"
            onChange={(e) => onFilePick(e.target.files?.[0] || null)}
            disabled={uploading}
            style={{ display: 'none' }}
          />
          {!file ? (
            <>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📁</div>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#1d1d1f', marginBottom: 3 }}>
                {lang === 'bm' ? 'Lepas fail di sini atau klik' : 'Drop file here or click'}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.55)' }}>
                MP3, M4A, WAV, MP4 · {lang === 'bm' ? 'Max 90 min · 200MB' : 'Max 90 min · 200MB'}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 24, marginBottom: 6 }}>🎙️</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#1d1d1f', marginBottom: 3 }}>
                {file.name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(29,29,31,0.55)' }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB · {file.type || 'audio'}
              </div>
              {!uploading && (
                <button
                  onClick={(e) => { e.stopPropagation(); setFile(null); setTitle('') }}
                  style={{
                    marginTop: 8,
                    background: 'transparent',
                    border: '0.5px solid rgba(0,0,0,0.15)',
                    borderRadius: 6,
                    padding: '3px 10px',
                    fontSize: 11, color: 'rgba(29,29,31,0.6)',
                    cursor: 'pointer',
                  }}
                >
                  {lang === 'bm' ? 'Tukar fail' : 'Change file'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Title */}
        {file && !uploading && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'rgba(29,29,31,0.6)', display: 'block', marginBottom: 4, fontWeight: 500 }}>
              {lang === 'bm' ? 'Tajuk' : 'Title'}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder={lang === 'bm' ? 'Contoh: Pelajaran Sejarah' : 'e.g. History lecture'}
              style={{
                width: '100%', padding: '8px 10px',
                border: '0.5px solid rgba(0,0,0,0.15)',
                borderRadius: 7, fontSize: 12,
                fontFamily: 'inherit',
              }}
            />
          </div>
        )}

        {/* Language */}
        {file && !uploading && (
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, color: 'rgba(29,29,31,0.6)', display: 'block', marginBottom: 4, fontWeight: 500 }}>
              {lang === 'bm' ? 'Bahasa rakaman' : 'Recording language'}
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px',
                border: '0.5px solid rgba(0,0,0,0.15)',
                borderRadius: 7, fontSize: 12,
                fontFamily: 'inherit', background: '#fff',
              }}
            >
              {RECORDING_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {(lang === 'bm' ? l.label_bm : l.label_en) + (l.recommended ? ' — ' + (lang === 'bm' ? 'Disyorkan' : 'Recommended') : '')}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Progress + status */}
        {uploading && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 12, color: '#993556', marginBottom: 6, fontWeight: 500,
            }}>
              {statusMsg || (
                phase === 'init' ? (lang === 'bm' ? '🔗 Menyediakan...' : '🔗 Preparing...') :
                phase === 'uploading' ? `📤 ${progress}%` :
                phase === 'submitting' ? (lang === 'bm' ? '⚡ Memulakan AI...' : '⚡ Starting AI...') :
                phase === 'transcribing' ? (lang === 'bm' ? '🤖 AI sedang transkrip...' : '🤖 AI transcribing...') :
                phase === 'done' ? '✓ Done!' : ''
              )}
            </div>
            <div style={{
              width: '100%', height: 4, background: 'rgba(212, 83, 126, 0.15)',
              borderRadius: 100, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', background: '#993556',
                width: phase === 'uploading' ? `${progress}%` :
                       phase === 'init' ? '5%' :
                       phase === 'submitting' ? '100%' :
                       phase === 'transcribing' ? '100%' :
                       phase === 'done' ? '100%' : '0%',
                transition: 'width 0.3s ease',
                animation: phase === 'transcribing' ? 'cc-pulse 2s ease-in-out infinite' : 'none',
              }} />
            </div>
            {phase === 'transcribing' && (
              <div style={{ fontSize: 10, color: 'rgba(29,29,31,0.45)', marginTop: 6, textAlign: 'center' }}>
                {lang === 'bm'
                  ? 'Boleh ambil 1-3 minit untuk fail panjang. Jangan tutup tab.'
                  : 'May take 1-3 min for long files. Keep this tab open.'}
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            background: '#fde8e8', color: '#b42929',
            padding: '8px 12px', borderRadius: 7, fontSize: 12,
            marginBottom: 12,
          }}>⚠ {error}</div>
        )}

        {/* Actions */}
        {!uploading ? (
          <button
            onClick={startUpload}
            disabled={!file || credits < 1}
            style={{
              width: '100%',
              background: !file || credits < 1
                ? 'rgba(153, 53, 86, 0.3)'
                : '#993556',
              color: '#fff', border: 'none', borderRadius: 9,
              padding: 11, fontSize: 13, fontWeight: 500,
              cursor: !file || credits < 1 ? 'not-allowed' : 'pointer',
            }}
          >
            {credits < 1
              ? (lang === 'bm' ? 'Beli kredit dahulu' : 'Buy credits first')
              : (lang === 'bm'
                ? 'Muat naik & transkrip (1 kredit)'
                : 'Upload & transcribe (1 credit)')}
          </button>
        ) : phase !== 'done' ? (
          <button
            onClick={cancel}
            style={{
              width: '100%',
              background: '#fff',
              color: 'rgba(29,29,31,0.7)',
              border: '0.5px solid rgba(0,0,0,0.15)',
              borderRadius: 9,
              padding: 11, fontSize: 12, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {lang === 'bm' ? 'Batal' : 'Cancel'}
          </button>
        ) : null}

        {credits < 1 && !uploading && (
          <button
            onClick={() => setBuyModalOpen(true)}
            style={{
              width: '100%', marginTop: 8,
              background: 'transparent',
              color: '#993556', border: '0.5px solid rgba(212, 83, 126, 0.4)',
              borderRadius: 9, padding: 9, fontSize: 12, fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            🎙️ {lang === 'bm' ? 'Beli kredit RM5/upload' : 'Buy credits RM5/upload'}
          </button>
        )}

        <p style={{
          fontSize: 10, color: 'rgba(29,29,31,0.5)',
          textAlign: 'center', marginTop: 12, lineHeight: 1.5,
        }}>
          {lang === 'bm'
            ? '1 kredit = 1 muat naik · sehingga 90 minit · BM/EN/Rojak supported'
            : '1 credit = 1 upload · up to 90 minutes · BM/EN/Rojak supported'}
        </p>
      </div>

      <BuyCreditsModal open={buyModalOpen} onClose={() => setBuyModalOpen(false)} />

      <style jsx global>{`
        @keyframes cc-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
