// src/lib/recording-types.ts
// Single source of truth for the 6 recording types.
// Used by: new-session form, lectures list filter, AI prompt builder, recorder UI.

export type RecordingType =
  | 'lecture'
  | 'meeting'
  | 'sv'
  | 'postmortem'
  | 'interview'
  | 'custom'

export type AISectionKey =
  | 'summary'
  | 'topics'
  | 'keyPoints'
  | 'formulas'
  | 'questions'
  | 'attendees'
  | 'decisions'
  | 'actionItems'
  | 'openQuestions'
  | 'feedback'
  | 'requiredFixes'
  | 'discussionPoints'
  | 'nextMilestones'
  | 'whatWorked'
  | 'whatDidntWork'
  | 'lessonsLearned'
  | 'keyAnswers'
  | 'quotes'
  | 'followUpQuestions'
  | 'themes'

export type RecordingTypeMeta = {
  id: RecordingType
  // Bilingual labels
  label: { en: string; bm: string }
  desc: { en: string; bm: string }
  // Tag color (Tailwind-compatible)
  color: string         // text color
  bg: string            // background color
  // AI sections this type generates (in order)
  sections: AISectionKey[]
  // Type-specific system prompt addition
  systemPromptHint: string
}

export const RECORDING_TYPES: RecordingTypeMeta[] = [
  {
    id: 'lecture',
    label: { en: 'Lecture', bm: 'Kuliah' },
    desc: { en: 'Class, tutorial, lab', bm: 'Kelas, tutorial, makmal' },
    color: '#185FA5',
    bg: 'rgba(90,143,245,0.10)',
    sections: ['summary', 'topics', 'keyPoints', 'formulas', 'questions'],
    systemPromptHint: `This is a LECTURE recording. Focus on educational content:
- Extract topics covered chronologically
- List key concepts and definitions students must remember
- Identify formulas, equations, or technical terms (preserve LaTeX/notation)
- Flag review questions or topics likely to appear in exams`,
  },
  {
    id: 'meeting',
    label: { en: 'Meeting', bm: 'Mesyuarat' },
    desc: { en: 'Mesyuarat, kerja', bm: 'Mesyuarat, kerja' },
    color: '#0F6E56',
    bg: 'rgba(31,158,117,0.10)',
    sections: ['summary', 'attendees', 'decisions', 'actionItems', 'openQuestions'],
    systemPromptHint: `This is a MEETING recording. Focus on business outcomes:
- List attendees mentioned by name
- Capture DECISIONS made (clear yes/no outcomes)
- Extract ACTION ITEMS with owner and deadline if stated (format: "Owner: task by deadline")
- Note open questions still pending resolution
- Skip casual chat — focus on substantive content`,
  },
  {
    id: 'sv',
    label: { en: 'SV / Pre-viva', bm: 'SV / Pra-viva' },
    desc: { en: 'Supervisor, thesis prep', bm: 'Penyelia, persiapan tesis' },
    color: '#534AB7',
    bg: 'rgba(127,119,221,0.10)',
    sections: ['summary', 'feedback', 'requiredFixes', 'discussionPoints', 'nextMilestones'],
    systemPromptHint: `This is a SUPERVISOR MEETING or PRE-VIVA recording. Focus on academic feedback:
- Capture the supervisor's FEEDBACK on the work presented
- List REQUIRED FIXES or revisions explicitly mentioned (must-do items)
- Note discussion points around methodology/findings
- Identify next milestones and deadlines for the student`,
  },
  {
    id: 'postmortem',
    label: { en: 'Postmortem', bm: 'Postmortem' },
    desc: { en: 'Event review, retro', bm: 'Semakan acara, retro' },
    color: '#854F0B',
    bg: 'rgba(186,117,23,0.12)',
    sections: ['summary', 'whatWorked', 'whatDidntWork', 'lessonsLearned', 'actionItems'],
    systemPromptHint: `This is a POSTMORTEM or RETROSPECTIVE recording. Focus on learning:
- Capture what WORKED WELL (genuine wins, not generic fluff)
- List what DIDN'T WORK or went wrong (be specific)
- Distill LESSONS LEARNED for future events
- Extract ACTION ITEMS to improve next time`,
  },
  {
    id: 'interview',
    label: { en: 'Interview', bm: 'Temubual' },
    desc: { en: 'Q&A, research', bm: 'Soal-jawab, kajian' },
    color: '#993C1D',
    bg: 'rgba(216,90,48,0.12)',
    sections: ['summary', 'keyAnswers', 'quotes', 'themes', 'followUpQuestions'],
    systemPromptHint: `This is an INTERVIEW recording. Focus on insights:
- Summarize the interviewee's main message
- Extract KEY ANSWERS to the most important questions
- Pull 3-5 NOTABLE QUOTES verbatim (with light cleanup)
- Identify recurring THEMES across responses
- Suggest FOLLOW-UP QUESTIONS for next interview`,
  },
  {
    id: 'custom',
    label: { en: 'Custom', bm: 'Lain-lain' },
    desc: { en: 'Anything else', bm: 'Apa-apa lain' },
    color: 'rgba(29,29,31,0.65)',
    bg: 'rgba(29,29,31,0.06)',
    sections: ['summary', 'topics', 'keyPoints'],
    systemPromptHint: `This is a GENERIC recording. Provide a helpful general summary:
- Capture the overall message or purpose
- Identify main topics discussed
- Extract key points worth remembering`,
  },
]

export const getRecordingTypeMeta = (id: string | null | undefined): RecordingTypeMeta => {
  return RECORDING_TYPES.find(t => t.id === id) || RECORDING_TYPES[0]
}

// Display label for AI section key (bilingual)
export const SECTION_LABELS: Record<AISectionKey, { en: string; bm: string }> = {
  summary:           { en: 'Summary',           bm: 'Ringkasan' },
  topics:            { en: 'Topics covered',    bm: 'Topik diliputi' },
  keyPoints:         { en: 'Key points',        bm: 'Key points' },
  formulas:          { en: 'Formulas',          bm: 'Formula' },
  questions:         { en: 'Questions',         bm: 'Soalan' },
  attendees:         { en: 'Attendees',         bm: 'Hadirin' },
  decisions:         { en: 'Decisions',         bm: 'Keputusan' },
  actionItems:       { en: 'Action items',      bm: 'Tindakan' },
  openQuestions:     { en: 'Open questions',    bm: 'Soalan terbuka' },
  feedback:          { en: 'Feedback received', bm: 'Maklum balas' },
  requiredFixes:     { en: 'Required fixes',    bm: 'Perlu dibetulkan' },
  discussionPoints:  { en: 'Discussion points', bm: 'Perbincangan' },
  nextMilestones:    { en: 'Next milestones',   bm: 'Milestone seterusnya' },
  whatWorked:        { en: 'What worked',       bm: 'Apa berjaya' },
  whatDidntWork:     { en: "What didn't work",  bm: 'Apa tidak berjaya' },
  lessonsLearned:    { en: 'Lessons learned',   bm: 'Pengajaran' },
  keyAnswers:        { en: 'Key answers',       bm: 'Jawapan utama' },
  quotes:            { en: 'Notable quotes',    bm: 'Petikan' },
  followUpQuestions: { en: 'Follow-up questions', bm: 'Soalan susulan' },
  themes:            { en: 'Themes',            bm: 'Tema' },
}
