'use client'
// src/components/lecture/KnowledgeFacts.tsx
// v56b — Universal interesting facts shown during recording (opt-in)
// Subtle, dismissible, rotates every 8s

import { useEffect, useState } from 'react'

interface Fact {
  emoji: string
  category: 'science' | 'history' | 'nature' | 'space' | 'human' | 'world'
  en: string
  bm: string
}

const FACTS: Fact[] = [
  // SCIENCE
  { emoji: '🧠', category: 'human', en: 'Your brain uses about 20% of your body\'s energy despite being only 2% of your weight.', bm: 'Otak anda guna 20% tenaga badan walaupun hanya 2% berat badan.' },
  { emoji: '🐙', category: 'nature', en: 'Octopuses have three hearts and blue blood made from copper.', bm: 'Sotong kurita ada tiga jantung dan darah biru dari kuprum.' },
  { emoji: '🌌', category: 'space', en: 'There are more stars in the universe than grains of sand on all of Earth\'s beaches.', bm: 'Bintang dalam alam semesta lebih banyak daripada butir pasir di semua pantai Bumi.' },
  { emoji: '🍯', category: 'nature', en: 'Honey never spoils. 3,000-year-old honey from Egyptian tombs is still edible.', bm: 'Madu tak akan rosak. Madu 3,000 tahun dari makam Mesir masih boleh dimakan.' },
  { emoji: '🐝', category: 'nature', en: 'A single bee makes only 1/12 teaspoon of honey in its lifetime.', bm: 'Seekor lebah hanya hasilkan 1/12 sudu madu sepanjang hidupnya.' },
  { emoji: '🌍', category: 'world', en: 'The Earth is not a perfect sphere — it bulges at the equator due to rotation.', bm: 'Bumi bukan sfera sempurna — ia membonjol di khatulistiwa kerana putaran.' },
  { emoji: '🦈', category: 'nature', en: 'Sharks existed before trees. They\'ve been around for 400 million years.', bm: 'Jerung wujud sebelum pokok. Mereka dah hidup 400 juta tahun.' },
  { emoji: '⚡', category: 'science', en: 'A bolt of lightning is 5 times hotter than the surface of the sun.', bm: 'Kilat 5 kali lebih panas daripada permukaan matahari.' },
  { emoji: '🌙', category: 'space', en: 'The Moon is moving 3.8 cm farther from Earth every year.', bm: 'Bulan bergerak 3.8 cm lebih jauh dari Bumi setiap tahun.' },
  { emoji: '🐌', category: 'nature', en: 'Snails can sleep for up to 3 years during extreme drought.', bm: 'Siput boleh tidur sehingga 3 tahun semasa kemarau melampau.' },
  { emoji: '💎', category: 'science', en: 'Diamonds rain on Jupiter and Saturn due to extreme atmospheric pressure.', bm: 'Berlian hujan di Musytari dan Zuhal kerana tekanan atmosfera melampau.' },
  { emoji: '🐘', category: 'nature', en: 'Elephants are the only mammals that cannot jump.', bm: 'Gajah adalah satu-satunya mamalia yang tidak boleh melompat.' },
  { emoji: '🌊', category: 'world', en: 'The Pacific Ocean is wider than the Moon — 12,300 km vs 3,474 km.', bm: 'Lautan Pasifik lebih luas daripada Bulan — 12,300 km vs 3,474 km.' },
  { emoji: '🦒', category: 'nature', en: 'A giraffe\'s tongue is 50 cm long and dark purple to prevent sunburn.', bm: 'Lidah zirafah 50 cm dan ungu gelap untuk elak terbakar matahari.' },
  { emoji: '🧬', category: 'human', en: 'Humans share 60% of their DNA with bananas.', bm: 'Manusia berkongsi 60% DNA dengan pisang.' },
  { emoji: '🕰️', category: 'history', en: 'Cleopatra lived closer in time to the iPhone than to the Great Pyramid\'s construction.', bm: 'Cleopatra hidup lebih dekat dengan iPhone berbanding dengan pembinaan Piramid Agung.' },
  { emoji: '🏛️', category: 'history', en: 'Oxford University is older than the Aztec Empire by about 200 years.', bm: 'Universiti Oxford lebih tua dari Empayar Aztec hampir 200 tahun.' },
  { emoji: '🌋', category: 'science', en: 'There are about 20 active volcanoes erupting somewhere on Earth right now.', bm: 'Terdapat 20 gunung berapi aktif sedang meletus di Bumi sekarang.' },
  { emoji: '🐧', category: 'nature', en: 'Emperor penguins can hold their breath for up to 27 minutes underwater.', bm: 'Penguin Maharaja boleh tahan nafas sehingga 27 minit dalam air.' },
  { emoji: '🚀', category: 'space', en: 'A day on Venus is longer than a year on Venus due to its slow rotation.', bm: 'Sehari di Zuhrah lebih lama daripada setahun di Zuhrah kerana putaran perlahan.' },
  { emoji: '🩸', category: 'human', en: 'Your blood vessels laid end-to-end would circle the Earth 2.5 times.', bm: 'Saluran darah anda jika disambung boleh keliling Bumi 2.5 kali.' },
  { emoji: '🏔️', category: 'world', en: 'Mount Everest grows about 4mm taller every year due to tectonic shift.', bm: 'Gunung Everest membesar 4mm setiap tahun kerana pergerakan tektonik.' },
  { emoji: '🌳', category: 'nature', en: 'A single tree can absorb up to 22kg of CO2 per year.', bm: 'Satu pokok boleh serap sehingga 22kg CO2 setahun.' },
  { emoji: '🦴', category: 'human', en: 'Babies are born with around 300 bones, but adults have only 206.', bm: 'Bayi dilahirkan dengan 300 tulang, tapi dewasa hanya ada 206.' },
  { emoji: '⏱️', category: 'science', en: 'Time moves slightly faster on top of a mountain than at sea level (relativity).', bm: 'Masa bergerak sedikit lebih pantas di puncak gunung berbanding paras laut (relativiti).' },
  { emoji: '🎵', category: 'human', en: 'Listening to music releases dopamine, the same chemical as eating chocolate.', bm: 'Dengar muzik bebaskan dopamin, kimia sama macam makan coklat.' },
  { emoji: '🐢', category: 'nature', en: 'Some sea turtles live over 150 years — older than most countries.', bm: 'Sesetengah penyu laut hidup lebih 150 tahun — lebih tua dari kebanyakan negara.' },
  { emoji: '🌿', category: 'science', en: 'Plants can recognize their siblings and share resources with them.', bm: 'Tumbuhan boleh kenal adik-beradik mereka dan berkongsi sumber.' },
  { emoji: '👁️', category: 'human', en: 'Your eyes can distinguish about 10 million different colors.', bm: 'Mata anda boleh bezakan 10 juta warna berbeza.' },
  { emoji: '🛌', category: 'human', en: 'You spend about 26 years of your life sleeping — and 7 years trying to fall asleep.', bm: 'Anda habiskan 26 tahun tidur sepanjang hidup — dan 7 tahun cuba untuk tidur.' },
  { emoji: '☄️', category: 'space', en: 'A teaspoon of neutron star material would weigh about 6 billion tonnes on Earth.', bm: 'Satu sudu bahan bintang neutron berat 6 bilion tan di Bumi.' },
  { emoji: '🍌', category: 'nature', en: 'Bananas are technically berries, but strawberries are not.', bm: 'Pisang secara teknikal adalah beri, tapi strawberi bukan.' },
]

const CATEGORY_LABELS: Record<Fact['category'], { en: string; bm: string; color: string }> = {
  science: { en: 'Science', bm: 'Sains', color: '#5A8FF5' },
  history: { en: 'History', bm: 'Sejarah', color: '#8E6F3E' },
  nature: { en: 'Nature', bm: 'Alam', color: '#2C8545' },
  space: { en: 'Space', bm: 'Angkasa', color: '#7F77DD' },
  human: { en: 'Human Body', bm: 'Tubuh Manusia', color: '#D4537E' },
  world: { en: 'World', bm: 'Dunia', color: '#D85A30' },
}

interface Props {
  active: boolean       // true while recording
  lang?: 'en' | 'bm'
  rotateSeconds?: number  // default 8
}

export default function KnowledgeFacts({ active, lang = 'en', rotateSeconds = 8 }: Props) {
  const [factIndex, setFactIndex] = useState(() => Math.floor(Math.random() * FACTS.length))
  const [visible, setVisible] = useState(true)
  const [fadeIn, setFadeIn] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  const fact = FACTS[factIndex % FACTS.length]
  const text = lang === 'bm' ? fact.bm : fact.en
  const category = CATEGORY_LABELS[fact.category]
  const categoryLabel = lang === 'bm' ? category.bm : category.en

  useEffect(() => {
    if (!active || dismissed) return
    const rotate = setInterval(() => {
      setFadeIn(false)
      setTimeout(() => {
        setFactIndex(i => (i + 1) % FACTS.length)
        setFadeIn(true)
      }, 300)
    }, rotateSeconds * 1000)
    return () => clearInterval(rotate)
  }, [active, dismissed, rotateSeconds])

  // Reset visibility when active toggles
  useEffect(() => {
    if (active) {
      setVisible(true)
      setDismissed(false)
    }
  }, [active])

  if (!active || !visible || dismissed) return null

  return (
    <div
      style={{
        marginTop: 12,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(12px)',
        border: '0.5px solid rgba(0,0,0,0.08)',
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        opacity: fadeIn ? 1 : 0,
        transition: 'opacity 0.3s ease',
        maxWidth: 460,
        marginLeft: 'auto',
        marginRight: 'auto',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>
        {fact.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 9.5, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          color: category.color,
          marginBottom: 3,
        }}>
          {lang === 'bm' ? 'Tahukah anda' : 'Did you know'} · {categoryLabel}
        </div>
        <div style={{
          fontSize: 12.5,
          color: 'rgba(29,29,31,0.75)',
          lineHeight: 1.5,
          letterSpacing: '-0.005em',
        }}>{text}</div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        style={{
          background: 'transparent',
          border: 'none',
          padding: 2,
          fontSize: 14,
          color: 'rgba(29,29,31,0.4)',
          cursor: 'pointer',
          flexShrink: 0,
          fontFamily: 'inherit',
          lineHeight: 1,
        }}
        aria-label="Dismiss"
        title={lang === 'bm' ? 'Sembunyikan' : 'Dismiss'}
      >
        ✕
      </button>
    </div>
  )
}
