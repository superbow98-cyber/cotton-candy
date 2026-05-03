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

export default function UploadAudioPage() {
  const router = useRouter()
  const { lang } = useLang()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [language, setLanguage] = useState('auto')
  const [title, setTitle] = useState('')
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'transcribing' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [buyModalOpen, setBuyModalOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
  }, [router])

  const credits = profile?.upload_credits || 0
  const isFree = profile?.plan === 'free' ||
    (profile?.plan_expires_at && new Date(profile.plan_expires_at) < new Date())

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

  const upload = async () => {
    if (!file || !profile) return
    if (credits < 1) {
      setError(lang === 'bm' ? 'Tiada kredit. Beli dahulu.' : 'No credits. Please buy first.')
      return
    }

    setUploading(true)
    setError(null)
    setPhase('uploading')
    setProgress(10)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('title', title || file.name)
      form.append('language', language)

      // Simulate progress (fetch doesn't expose upload progress easily)
      const progressInterval = setInterval(() => {
        setProgress((p) => Math.min(p + 5, 80))
      }, 500)

      setPhase('transcribing')
      const res = await fetch('/api/upload-audio', {
        method: 'POST',
        body: form,
      })

      clearInterval(progressInterval)
      const data = await res.json()

      if (!res.ok) {
        if (data.requiresUpgrade) {
          setError(lang === 'bm'
            ? 'Pakej berbayar diperlukan'
            : 'Paid plan required')
        } else {
          setError(data.error || (lang === 'bm' ? 'Muat naik gagal' : 'Upload failed'))
        }
        setPhase('idle')
        setUploading(false)
        return
      }

      setProgress(100)
      setPhase('done')

      // Wait briefly then redirect to lecture page
      setTimeout(() => {
        router.push(`/dashboard/lectures/${data.lectureId}`)
      }, 800)
    } catch (e: any) {
      setError(e.message || 'Network error')
      setPhase('idle')
      setUploading(false)
    }
  }

  if (isFree) {
    return (
      <div style={{ maxWidth: 560, margin: '40px auto', padding: '0 16px' }}>
        <div style={{
          background: '#fff',
          border: '0.5px solid rgba(0,0,0,0.06)',
          borderRadius: 14,
          padding: '40px 24px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: '#1d1d1f', margin: 0, marginBottom: 6 }}>
            {lang === 'bm' ? 'Pakej berbayar diperlukan' : 'Paid plan required'}
          </h2>
          <p style={{ fontSize: 13, color: 'rgba(29,29,31,0.6)', margin: 0, marginBottom: 18, lineHeight: 1.6 }}>
            {lang === 'bm'
              ? 'Ciri muat naik audio tersedia untuk pakej Lite, Student PRO, Pro, dan Max sahaja.'
              : 'Upload feature available for Lite, Student PRO, Pro, and Max plans only.'}
          </p>
          <Link href="/#pricing" style={{
            display: 'inline-block',
            background: '#993556', color: '#fff',
            padding: '9px 18px', borderRadius: 8,
            fontSize: 13, fontWeight: 500,
            textDecoration: 'none',
          }}>
            {lang === 'bm' ? 'Lihat pakej →' : 'View plans →'}
          </Link>
        </div>
      </div>
    )
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

        {/* File picker / drop zone */}
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
            transition: 'all 0.15s ease',
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
                {lang === 'bm'
                  ? 'MP3, M4A, WAV, MP4 · Max 90 min · 200MB'
                  : 'MP3, M4A, WAV, MP4 · Max 90 min · 200MB'}
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

        {/* Title input */}
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

        {/* Progress bar */}
        {uploading && (
          <div style={{ marginBottom: 14 }}>
            <div style={{
              fontSize: 12, color: '#993556', marginBottom: 6, fontWeight: 500,
            }}>
              {phase === 'uploading' && (lang === 'bm' ? '📤 Memuat naik...' : '📤 Uploading...')}
              {phase === 'transcribing' && (lang === 'bm' ? '🤖 AI menulis transkrip... (boleh ambil 1-3 minit)' : '🤖 AI transcribing... (may take 1-3 min)')}
              {phase === 'done' && (lang === 'bm' ? '✓ Siap! Memuat halaman...' : '✓ Done! Loading...')}
            </div>
            <div style={{
              width: '100%', height: 4, background: 'rgba(212, 83, 126, 0.15)',
              borderRadius: 100, overflow: 'hidden',
            }}>
              <div style={{
                height: '100%', background: '#993556',
                width: `${progress}%`, transition: 'width 0.3s ease',
              }} />
            </div>
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

        {/* Action button */}
        {!uploading && (
          <button
            onClick={upload}
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
        )}

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
    </div>
  )
}
