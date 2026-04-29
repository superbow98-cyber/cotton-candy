'use client'
// src/components/lecture/ProcessingLoader.tsx
// v55-pro — Educational facts loader during transcription/AI processing
// Mix of study science + product tips, rotating every 5s, with Unsplash photos

import { useEffect, useState } from 'react'

interface Fact {
  type: 'study' | 'product'
  emoji: string
  titleEn: string
  titleBm: string
  bodyEn: string
  bodyBm: string
  searchQuery: string  // Unsplash search keyword
}

const FACTS: Fact[] = [
  // STUDY SCIENCE
  {
    type: 'study',
    emoji: '🧠',
    titleEn: 'Active recall beats re-reading',
    titleBm: 'Recall aktif lebih baik dari baca semula',
    bodyEn: 'Testing yourself on material is up to 50% more effective for long-term memory than passively re-reading notes.',
    bodyBm: 'Test diri anda 50% lebih efektif untuk memori jangka panjang berbanding hanya baca semula nota.',
    searchQuery: 'student studying brain memory',
  },
  {
    type: 'study',
    emoji: '⏱️',
    titleEn: 'The 25-minute focus window',
    titleBm: 'Tempoh fokus 25-minit',
    bodyEn: 'The Pomodoro technique uses 25-minute focused work sessions followed by 5-minute breaks for peak productivity.',
    bodyBm: 'Teknik Pomodoro guna sesi fokus 25-minit diikuti rehat 5-minit untuk produktiviti maksimum.',
    searchQuery: 'pomodoro timer focus desk',
  },
  {
    type: 'study',
    emoji: '🌙',
    titleEn: 'Sleep consolidates memory',
    titleBm: 'Tidur perkukuh memori',
    bodyEn: 'Your brain consolidates new learning during deep sleep. 7-9 hours of quality sleep is essential for retention.',
    bodyBm: 'Otak anda perkukuh pembelajaran semasa tidur dalam. 7-9 jam tidur berkualiti penting untuk ingat.',
    searchQuery: 'peaceful sleep moon stars',
  },
  {
    type: 'study',
    emoji: '📊',
    titleEn: 'Spaced repetition wins',
    titleBm: 'Pengulangan berkala menang',
    bodyEn: 'Reviewing material at increasing intervals (1 day, 3 days, 1 week) boosts retention by up to 200%.',
    bodyBm: 'Ulang kaji pada selang waktu (1 hari, 3 hari, 1 minggu) tingkatkan ingatan sehingga 200%.',
    searchQuery: 'calendar planning study schedule',
  },
  {
    type: 'study',
    emoji: '✍️',
    titleEn: 'Handwriting helps memory',
    titleBm: 'Tulisan tangan bantu memori',
    bodyEn: 'Writing notes by hand activates more brain regions than typing, improving conceptual understanding.',
    bodyBm: 'Tulis nota dengan tangan aktifkan lebih kawasan otak berbanding taip — paham konsep lebih baik.',
    searchQuery: 'handwriting notebook journal',
  },
  {
    type: 'study',
    emoji: '🎯',
    titleEn: 'Teach to truly learn',
    titleBm: 'Ajar untuk benar-benar belajar',
    bodyEn: 'The Feynman Technique: explaining a concept in simple terms reveals gaps in your understanding.',
    bodyBm: 'Teknik Feynman: terangkan konsep dalam ayat ringkas — anda akan nampak mana yang tak faham.',
    searchQuery: 'teaching whiteboard explain',
  },
  {
    type: 'study',
    emoji: '☕',
    titleEn: 'Caffeine has a half-life',
    titleBm: 'Kafein ada separuh hayat',
    bodyEn: 'Caffeine takes 5-6 hours to halve in your system. Avoid coffee after 2pm for better sleep.',
    bodyBm: 'Kafein ambil 5-6 jam untuk separuh hilang dari badan. Elak kopi selepas 2 petang untuk tidur lebih baik.',
    searchQuery: 'coffee cup morning sunlight',
  },
  {
    type: 'study',
    emoji: '🚶',
    titleEn: 'Walks boost memory',
    titleBm: 'Berjalan rangsang memori',
    bodyEn: 'A 20-minute walk between study sessions improves memory consolidation by up to 25%.',
    bodyBm: 'Jalan kaki 20-minit antara sesi study tingkatkan ingatan sehingga 25%.',
    searchQuery: 'morning walk park nature',
  },
  {
    type: 'study',
    emoji: '🎵',
    titleEn: 'Lo-fi for focus',
    titleBm: 'Lo-fi untuk fokus',
    bodyEn: 'Instrumental music at 60-70 BPM can enhance focus, while lyrics often distract from reading.',
    bodyBm: 'Muzik instrumental 60-70 BPM bantu fokus — manakala muzik berlirik selalu ganggu pembacaan.',
    searchQuery: 'headphones music study',
  },
  {
    type: 'study',
    emoji: '💧',
    titleEn: 'Hydration affects cognition',
    titleBm: 'Air mempengaruhi kognitif',
    bodyEn: 'Even 1% dehydration reduces concentration and short-term memory. Keep water at your desk.',
    bodyBm: 'Hanya 1% dehidrasi pun boleh kurangkan tumpuan dan memori. Letak air di meja study.',
    searchQuery: 'water glass minimal',
  },
  {
    type: 'study',
    emoji: '📖',
    titleEn: 'Mix subjects (interleaving)',
    titleBm: 'Campur subjek (interleaving)',
    bodyEn: 'Switching between subjects in a session improves long-term retention more than blocking one topic.',
    bodyBm: 'Tukar antara subjek dalam satu sesi tingkatkan ingatan jangka panjang lebih baik dari fokus satu topik.',
    searchQuery: 'open books study desk',
  },

  // PRODUCT TIPS
  {
    type: 'product',
    emoji: '🍭',
    titleEn: 'Drag lectures into notebooks',
    titleBm: 'Seret kuliah ke buku nota',
    bodyEn: 'Organize recordings by subject — drag any lecture into a notebook to group them visually.',
    bodyBm: 'Susun rakaman ikut subjek — seret mana-mana kuliah ke buku nota untuk dikumpulkan.',
    searchQuery: 'notebook organization minimal',
  },
  {
    type: 'product',
    emoji: '🎙️',
    titleEn: 'Rojak mode handles BM + EN',
    titleBm: 'Mod Rojak handle BM + EN',
    bodyEn: 'Use Rojak Mode to transcribe naturally mixed Malay and English speech without switching languages.',
    bodyBm: 'Guna Mod Rojak untuk transkripkan campuran BM dan English secara semula jadi.',
    searchQuery: 'malaysia diversity culture',
  },
  {
    type: 'product',
    emoji: '🌳',
    titleEn: 'Mind maps auto-generate',
    titleBm: 'Peta minda auto-jana',
    bodyEn: 'Every recording produces a mind map of key topics — perfect for visual learners and revision.',
    bodyBm: 'Setiap rakaman jana peta minda topik utama — sesuai untuk pelajar visual dan ulang kaji.',
    searchQuery: 'mind map diagram tree',
  },
  {
    type: 'product',
    emoji: '🎚️',
    titleEn: 'Voice boost in settings',
    titleBm: 'Penambah suara di tetapan',
    bodyEn: 'Quiet lecturer? Adjust mic boost in Settings → Mic Enhancement for clearer transcripts.',
    bodyBm: 'Pensyarah perlahan? Adjust boost di Tetapan → Mic Enhancement untuk transkrip lebih jelas.',
    searchQuery: 'microphone audio professional',
  },
  {
    type: 'product',
    emoji: '📄',
    titleEn: 'Export to PDF anytime',
    titleBm: 'Eksport ke PDF bila-bila',
    bodyEn: 'Click export in any lecture to download a formatted PDF — perfect for sharing or printing.',
    bodyBm: 'Klik eksport pada mana-mana kuliah untuk muat turun PDF — sesuai untuk kongsi atau cetak.',
    searchQuery: 'documents pdf paper minimal',
  },
  {
    type: 'product',
    emoji: '🔒',
    titleEn: 'Audio is never stored',
    titleBm: 'Audio tidak disimpan',
    bodyEn: 'Cotton Candy transcribes audio in real-time then deletes it. Only your notes are saved.',
    bodyBm: 'Cotton Candy transkripkan audio masa nyata, kemudian padam. Hanya nota anda disimpan.',
    searchQuery: 'privacy security shield',
  },
]

interface Props {
  status: string
  subStatus?: string
  lang?: 'en' | 'bm'
  estimatedSeconds?: number
}

export default function ProcessingLoader({ status, subStatus, lang = 'en', estimatedSeconds }: Props) {
  const [factIndex, setFactIndex] = useState(() => Math.floor(Math.random() * FACTS.length))
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photographer, setPhotographer] = useState<{ name: string; link: string } | null>(null)
  const [photoLoading, setPhotoLoading] = useState(true)
  const [fadeIn, setFadeIn] = useState(true)
  const [elapsed, setElapsed] = useState(0)

  const fact = FACTS[factIndex % FACTS.length]
  const title = lang === 'bm' ? fact.titleBm : fact.titleEn
  const body = lang === 'bm' ? fact.bodyBm : fact.bodyEn

  // Elapsed counter
  useEffect(() => {
    const start = Date.now()
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000))
    }, 1000)
    return () => clearInterval(tick)
  }, [])

  // Fetch Unsplash photo for current fact
  useEffect(() => {
    let cancelled = false
    setPhotoLoading(true)
    setPhotoUrl(null)

    const fetchPhoto = async () => {
      try {
        const res = await fetch(`/api/unsplash?q=${encodeURIComponent(fact.searchQuery)}`)
        if (!res.ok) throw new Error('Unsplash failed')
        const data = await res.json()
        if (cancelled) return
        if (data.image) {
          setPhotoUrl(data.image.url)
          setPhotographer({
            name: data.image.photographer?.name || '',
            link: data.image.photographer?.link || '',
          })
        }
      } catch {
        // Silent fail — fact still shows without photo
      } finally {
        if (!cancelled) setPhotoLoading(false)
      }
    }

    fetchPhoto()
    return () => { cancelled = true }
  }, [factIndex, fact.searchQuery])

  // Rotate fact every 5s
  useEffect(() => {
    const rotate = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setFactIndex(i => (i + 1) % FACTS.length)
        setFadeIn(true)
      }, 250)
    }, 5000)
    return () => clearInterval(rotate)
  }, [])

  return (
    <div style={{
      background: '#fff',
      borderRadius: 18,
      border: '0.5px solid rgba(0,0,0,0.08)',
      maxWidth: 480,
      margin: '0 auto',
      overflow: 'hidden',
      boxShadow: '0 6px 24px rgba(212, 83, 126, 0.08)',
    }}>
      {/* Hero photo */}
      <div style={{
        position: 'relative',
        height: 180,
        background: photoUrl
          ? `url(${photoUrl}) center / cover no-repeat`
          : 'linear-gradient(135deg, #FFE4F1, #F0EDFE)',
        transition: 'background-image 0.4s ease',
      }}>
        {photoLoading && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, #FFE4F1, #F0EDFE)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%',
              border: '2px solid rgba(212,83,126,0.2)',
              borderTopColor: '#D4537E',
              animation: 'cc-loader-spin 0.8s linear infinite',
            }} />
          </div>
        )}
        {photographer?.name && photoUrl && (
          <a
            href={photographer.link || '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              position: 'absolute', bottom: 8, right: 10,
              fontSize: 9.5, color: '#fff',
              background: 'rgba(0,0,0,0.42)',
              padding: '3px 8px', borderRadius: 4,
              textDecoration: 'none',
              backdropFilter: 'blur(8px)',
            }}
          >
            Photo by {photographer.name} · Unsplash
          </a>
        )}
      </div>

      {/* Fact card */}
      <div style={{
        padding: '20px 22px 16px',
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.25s ease',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          marginBottom: 8,
        }}>
          <span style={{ fontSize: 16 }}>{fact.emoji}</span>
          <span style={{
            fontSize: 10, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.06em',
            color: fact.type === 'study' ? '#5A8FF5' : '#D4537E',
          }}>
            {fact.type === 'study'
              ? (lang === 'bm' ? 'Tip Belajar' : 'Study Tip')
              : (lang === 'bm' ? 'Tip Cotton Candy' : 'Cotton Candy Tip')}
          </span>
        </div>

        <div style={{
          fontSize: 16, fontWeight: 600,
          color: '#1d1d1f',
          letterSpacing: '-0.02em',
          lineHeight: 1.3,
          marginBottom: 6,
        }}>{title}</div>

        <div style={{
          fontSize: 13,
          color: 'rgba(29,29,31,0.65)',
          lineHeight: 1.5,
          letterSpacing: '-0.005em',
        }}>{body}</div>
      </div>

      {/* Status footer */}
      <div style={{
        padding: '12px 22px 16px',
        borderTop: '0.5px solid rgba(0,0,0,0.06)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%',
          border: '2px solid rgba(90, 143, 245, 0.25)',
          borderTopColor: '#5A8FF5',
          animation: 'cc-loader-spin 0.8s linear infinite',
          flexShrink: 0,
        }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500,
            color: '#1d1d1f',
            letterSpacing: '-0.01em',
          }}>{status}</div>
          {subStatus && (
            <div style={{
              fontSize: 11,
              color: 'rgba(29,29,31,0.5)',
              marginTop: 2,
            }}>{subStatus}</div>
          )}
        </div>
        <div style={{
          fontSize: 11,
          color: 'rgba(29,29,31,0.45)',
          fontFamily: 'SF Mono, Monaco, monospace',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {elapsed}s
        </div>
      </div>

      <style jsx>{`
        @keyframes cc-loader-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
