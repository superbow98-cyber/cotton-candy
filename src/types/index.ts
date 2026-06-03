// ============================================================
// Cotton Candy — Types & Design Tokens & Plans
// Now with 4 themes: pink, blue, green, yellow
// ============================================================

export type Lang = 'en' | 'bm'

export type Plan = 'free' | 'day' | 'student_pro' | 'month' | 'year'

export type Theme = 'pink' | 'blue' | 'green' | 'yellow'

export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  plan: Plan
  plan_upgraded_at: string | null
  plan_expires_at: string | null
  lang: Lang
  theme: Theme | null
  ai_provider: 'auto' | 'groq' | 'gemini-flash' | 'gemini-flash-lite' | null
  is_admin?: boolean
  upload_credits?: number          // v61: current upload credit balance
  upload_credits_lifetime?: number // v61: total ever purchased
  // ambassador
  ambassador_promo_code?: string | null
  ambassador_commission_total?: number
  ambassador_user_count?: number
  created_at: string
}

export interface MindMapBranch {
  title: string
  subtitle?: string
  color?: 'blue' | 'green' | 'pink' | 'amber' | 'purple' | 'orange'
}

export interface MindMap {
  center: string
  branches: MindMapBranch[]
}

// v59: Clean transcript segment from Soniox per recording session
export interface CleanSegment {
  start: number       // seconds from lecture start (timeline-aware)
  end: number         // seconds from lecture start
  text: string        // Soniox cleaned text for this session
  source: 'soniox_async' | 'whisper_turbo' | 'whisper_v3'
  language?: string   // detected language
  created_at?: string
}

// v60: Image uploaded into clean transcript
export interface TranscriptImage {
  id: string             // unique uuid
  url: string            // Supabase Storage public URL
  caption?: string
  position: number       // index/order in transcript
  uploaded_at: string
  size_bytes: number
}

export interface Lecture {
  id: string
  user_id: string
  title: string
  subject: string | null
  lecturer: string | null
  location: string | null
  started_at: string
  ended_at: string | null
  duration_seconds: number
  transcript_md: string
  raw_transcript_md?: string | null
  clean_segments?: CleanSegment[] | null
  clean_transcript_edited?: string | null     // v60: user-edited markdown
  transcript_images?: TranscriptImage[] | null // v60: uploaded images
  summary: string | null
  timeline: TimelineEntry[]
  keywords: string[]
  word_count: number
  status: 'draft' | 'recording' | 'finished' | 'archived'
  lang: Lang
  ai_provider: 'auto' | 'groq' | 'gemini-flash' | 'gemini-flash-lite' | null
  recording_type: 'lecture' | 'meeting' | 'sv' | 'postmortem' | 'interview' | 'custom' | null
  created_at: string
  updated_at: string
  mindmap_json?: MindMap | null
  notebook_id?: string | null
}

export interface TimelineEntry {
  t: string
  seconds: number
  event: string
  type?: 'topic' | 'question' | 'formula' | 'example' | 'note'
}

export interface Notebook {
  id: string
  user_id: string
  title: string
  subject: string | null
  color: string
  lecture_ids: string[]
  last_exported_at: string | null
  created_at: string
  cover_image_url?: string | null
  cover_photographer_name?: string | null
  cover_photographer_link?: string | null
}

export interface PromoCode {
  id: string
  code: string
  plan: Plan
  discount_percent: number
  max_uses: number
  use_count: number
  expires_at: string | null
}

// =============================================================
// THEMES — 4 candy vibes
// =============================================================

export interface ThemeTokens {
  primary: string
  primaryDark: string
  accent: string
  cream: string
  soft: string
  dark: string
  gray: string
  border: string
  white: string
  success: string
  warn: string
  emoji: string
  label: string
  sub: string
}

export const THEMES: Record<Theme, ThemeTokens> = {
  pink: {
    primary:     '#FFB7C5',
    primaryDark: '#FF8FA8',
    accent:      '#A8DEFF',
    cream:       '#FFF6F8',
    soft:        '#FBEEF1',
    dark:        '#2B1B24',
    gray:        '#6B5560',
    border:      '#F4D6DE',
    white:       '#FFFFFF',
    success:     '#7AB883',
    warn:        '#F2B35A',
    emoji:       '🌸',
    label:       'Pink',
    sub:         'cotton candy',
  },
  blue: {
    primary:     '#A8D4FF',
    primaryDark: '#6BA8E5',
    accent:      '#FFB7C5',
    cream:       '#F4F9FF',
    soft:        '#E8F2FB',
    dark:        '#1B2538',
    gray:        '#5A6578',
    border:      '#D4E4F5',
    white:       '#FFFFFF',
    success:     '#7AB883',
    warn:        '#F2B35A',
    emoji:       '💙',
    label:       'Blue',
    sub:         'sky candy',
  },
  green: {
    primary:     '#B8E6C9',
    primaryDark: '#7BBF93',
    accent:      '#FFE58A',
    cream:       '#F4FBF6',
    soft:        '#E6F4EB',
    dark:        '#1B2E22',
    gray:        '#5A6B60',
    border:      '#D4EBDB',
    white:       '#FFFFFF',
    success:     '#4E9964',
    warn:        '#F2B35A',
    emoji:       '🌿',
    label:       'Green',
    sub:         'mint candy',
  },
  yellow: {
    primary:     '#FFE58A',
    primaryDark: '#E5B947',
    accent:      '#B8E6C9',
    cream:       '#FFFBF0',
    soft:        '#FFF4D6',
    dark:        '#2E2615',
    gray:        '#6E6145',
    border:      '#F0DFA8',
    white:       '#FFFFFF',
    success:     '#7AB883',
    warn:        '#E5B947',
    emoji:       '☀️',
    label:       'Yellow',
    sub:         'sunny candy',
  },
}

// Default `s` kept for old imports during migration.
// Prefer `useTheme()` in client components going forward.
export const s = THEMES.pink

export function getTheme(theme: Theme | null | undefined): ThemeTokens {
  if (theme && THEMES[theme]) return THEMES[theme]
  return THEMES.pink
}

// =============================================================
// PLANS
// =============================================================

export const PLANS: Record<Plan, {
  name: string
  priceRM: number
  durationHours: number | null
  lectureLimit: number
  minutesPerLecture: number
  maxAudioHours: number  // NEW: hard cap on total audio processed per plan period
  notebookLimit: number
  pdfExport: boolean
  mdExport: boolean
  aiSummary: boolean
  watermark: boolean
  stripeMode: 'payment' | 'subscription'
}> = {
  free: {
    name: 'Free', priceRM: 0, durationHours: null,
    lectureLimit: 1, minutesPerLecture: 15, maxAudioHours: 0.25, notebookLimit: 1,
    pdfExport: true, mdExport: true, aiSummary: true, watermark: true,
    stripeMode: 'payment',
  },
  day: {
    name: 'Day Pass', priceRM: 16, durationHours: 24,
    lectureLimit: 10, minutesPerLecture: 45, maxAudioHours: 4, notebookLimit: 3,
    pdfExport: true, mdExport: true, aiSummary: true, watermark: false,
    stripeMode: 'payment',
  },
  student_pro: {
    name: 'Student PRO', priceRM: 34, durationHours: 24 * 30,
    lectureLimit: 20, minutesPerLecture: 45, maxAudioHours: 15, notebookLimit: 10,
    pdfExport: true, mdExport: true, aiSummary: true, watermark: false,
    stripeMode: 'payment',
  },
  month: {
    name: 'Monthly', priceRM: 50, durationHours: 24 * 30,
    lectureLimit: 30, minutesPerLecture: 60, maxAudioHours: 12, notebookLimit: 20,
    pdfExport: true, mdExport: true, aiSummary: true, watermark: false,
    stripeMode: 'payment',
  },
  year: {
    name: 'Yearly', priceRM: 200, durationHours: 24 * 365,
    lectureLimit: 200, minutesPerLecture: 60, maxAudioHours: 60, notebookLimit: 50,
    pdfExport: true, mdExport: true, aiSummary: true, watermark: false,
    stripeMode: 'payment',
  },
}
