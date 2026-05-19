'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'

type Lecture = {
  id: string
  title: string | null
  transcript_md: string | null
  clean_segments: any[] | null
  clean_transcript_edited: string | null
  summary: string | null
  keywords: string[] | null
  duration_seconds: number | null
  created_at: string
}

type AISummary = {
  inferredTitle?: string
  summary?: string
  topics?: string[]
  keyPoints?: string[]
  mindMap?: any
}

export default function LectureDocument({ id }: { id: string }) {
  const router = useRouter()
  const [lecture, setLecture] = useState<Lecture | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        HTMLAttributes: {
          style: 'max-width: 100%; height: auto; border-radius: 8px; margin: 12px 0;',
        },
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        style: 'min-height: 600px; padding: 40px 48px; outline: none; line-height: 1.7; font-size: 15px;',
      },
    },
  })

  // Load lecture + populate editor
  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { router.replace('/dashboard'); return }

      const { data } = await sb.from('lectures').select('*').eq('id', id).maybeSingle()
      if (!data) { router.replace('/dashboard/lectures'); return }

      setLecture(data as Lecture)

      // Parse AI summary
      let ai: AISummary = {}
      if (data.summary) {
        try { ai = JSON.parse(data.summary) } catch {}
      }

      // Build initial HTML content
      const html = buildInitialHTML(data as Lecture, ai)
      editor?.commands.setContent(html)

      setLoading(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, editor])

  const buildInitialHTML = (lec: Lecture, ai: AISummary): string => {
    const parts: string[] = []

    // Title
    const title = ai.inferredTitle || lec.title || 'Untitled Lecture'
    parts.push(`<h1>${escapeHtml(title)}</h1>`)

    const duration = lec.duration_seconds ? Math.round(lec.duration_seconds / 60) : 0
    const date = new Date(lec.created_at).toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' })
    parts.push(`<p><em>${date} · ${duration} min</em></p>`)

    // Summary
    if (ai.summary) {
      parts.push('<h2>✨ Summary</h2>')
      parts.push(`<p>${escapeHtml(ai.summary)}</p>`)
    }

    // Topics
    if (ai.topics && ai.topics.length > 0) {
      parts.push('<h2>📚 Topics Covered</h2>')
      parts.push('<ul>')
      ai.topics.forEach(t => parts.push(`<li>${escapeHtml(t)}</li>`))
      parts.push('</ul>')
    }

    // Key Points
    if (ai.keyPoints && ai.keyPoints.length > 0) {
      parts.push('<h2>🔑 Key Points</h2>')
      parts.push('<ul>')
      ai.keyPoints.forEach(p => parts.push(`<li>${escapeHtml(p)}</li>`))
      parts.push('</ul>')
    }

    // Mind Map (flatten to text outline)
    if (ai.mindMap) {
      parts.push('<h2>🧠 Mind Map</h2>')
      parts.push(mindMapToHTML(ai.mindMap))
    }

    // Clean Transcript
    parts.push('<h2>📝 Transcript</h2>')
    const transcript = lec.clean_transcript_edited
      || (lec.clean_segments && Array.isArray(lec.clean_segments)
          ? lec.clean_segments.map((s: any) => s.text || '').join('\n\n')
          : lec.transcript_md || '')
    transcript.split('\n').forEach(line => {
      const trimmed = line.trim().replace(/^-\s*/, '')
      if (trimmed) parts.push(`<p>${escapeHtml(trimmed)}</p>`)
    })

    return parts.join('\n')
  }

  const mindMapToHTML = (node: any, level = 0): string => {
    if (!node) return ''
    const label = node.label || node.name || node.text || 'Branch'
    const children = node.children || []
    let html = level === 0
      ? `<p><strong>${escapeHtml(label)}</strong></p>`
      : `<p>${'  '.repeat(level)}• ${escapeHtml(label)}</p>`
    children.forEach((child: any) => {
      html += mindMapToHTML(child, level + 1)
    })
    return html
  }

  const escapeHtml = (s: string) =>
    String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')

  // Insert image
  const insertImage = useCallback(async () => {
    if (!editor) return
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/jpeg,image/png,image/webp,image/gif'
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0]
      if (!file) return
      if (file.size > 2 * 1024 * 1024) {
        alert('Image too large. Max 2MB.')
        return
      }
      setUploadingImage(true)
      try {
        // Read as base64 (embed inline)
        const reader = new FileReader()
        reader.onload = () => {
          const dataUrl = reader.result as string
          editor.chain().focus().setImage({ src: dataUrl }).run()
        }
        reader.readAsDataURL(file)
      } finally {
        setUploadingImage(false)
      }
    }
    input.click()
  }, [editor])

  // Export to .docx
  const exportDocx = async () => {
    if (!editor || !lecture) return
    setSaving(true)
    try {
      const html = editor.getHTML()
      const docxParagraphs = await htmlToDocxParagraphs(html)

      const doc = new Document({
        sections: [{
          properties: {},
          children: docxParagraphs,
        }],
      })

      const blob = await Packer.toBlob(doc)
      const title = lecture.title?.replace(/[^a-z0-9-_ ]/gi, '_').slice(0, 60) || 'lecture'
      saveAs(blob, `${title}.docx`)
    } catch (e: any) {
      console.error('[document export]', e)
      alert('Export failed: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontFamily: 'Georgia, serif' }}>
        Loading document...
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f5f7',
      fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
    }}>
      {/* Toolbar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '0.5px solid rgba(0,0,0,0.1)',
        padding: '12px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button
          onClick={() => router.push(`/dashboard/lectures/${id}`)}
          style={{ background: 'none', border: 'none', fontSize: 14, color: '#993556', cursor: 'pointer' }}
        >
          ← Back to lecture
        </button>

        <div style={{ display: 'flex', gap: 8 }}>
          {/* Editor controls */}
          <button
            onClick={() => editor?.chain().focus().toggleBold().run()}
            style={btnStyle(editor?.isActive('bold'))}
            title="Bold"
          >
            <strong>B</strong>
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            style={btnStyle(editor?.isActive('italic'))}
            title="Italic"
          >
            <em>I</em>
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            style={btnStyle(editor?.isActive('heading', { level: 2 }))}
            title="Heading"
          >
            H
          </button>
          <button
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            style={btnStyle(editor?.isActive('bulletList'))}
            title="Bullet list"
          >
            •
          </button>
          <button
            onClick={insertImage}
            disabled={uploadingImage}
            style={btnStyle(false)}
            title="Insert image"
          >
            🖼️ {uploadingImage ? '...' : ''}
          </button>
          <button
            onClick={exportDocx}
            disabled={saving}
            style={{
              background: '#993556', color: '#fff', border: 'none',
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', marginLeft: 8,
            }}
          >
            {saving ? 'Exporting...' : '⬇ Download .docx'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div style={{
        maxWidth: 800, margin: '24px auto',
        background: '#fff',
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        border: '0.5px solid rgba(0,0,0,0.08)',
      }}>
        <EditorContent editor={editor} />
      </div>

      {/* Apply tiptap styles */}
      <style jsx global>{`
        .ProseMirror { outline: none; }
        .ProseMirror h1 { font-family: Georgia, serif; font-size: 28px; font-weight: 600; margin: 24px 0 12px; color: #1d1d1f; }
        .ProseMirror h2 { font-family: Georgia, serif; font-size: 20px; font-weight: 600; margin: 24px 0 8px; color: #993556; }
        .ProseMirror p { margin: 8px 0; color: #1d1d1f; }
        .ProseMirror ul { padding-left: 24px; margin: 8px 0; }
        .ProseMirror li { margin: 4px 0; }
        .ProseMirror em { font-style: italic; color: rgba(29,29,31,0.7); }
        .ProseMirror strong { font-weight: 700; }
        .ProseMirror img { display: block; margin: 16px auto; }
      `}</style>
    </div>
  )
}

const btnStyle = (active?: boolean): React.CSSProperties => ({
  background: active ? '#993556' : '#fff',
  color: active ? '#fff' : '#1d1d1f',
  border: '0.5px solid rgba(0,0,0,0.15)',
  borderRadius: 6,
  padding: '6px 10px',
  fontSize: 13,
  cursor: 'pointer',
  minWidth: 32,
})

// Convert HTML to docx paragraphs
async function htmlToDocxParagraphs(html: string): Promise<Paragraph[]> {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const paragraphs: Paragraph[] = []

  for (const node of Array.from(doc.body.childNodes)) {
    if (node.nodeType !== 1) continue
    const el = node as HTMLElement
    const tag = el.tagName.toLowerCase()

    if (tag === 'h1') {
      paragraphs.push(new Paragraph({
        text: el.textContent || '',
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 200, after: 100 },
      }))
    } else if (tag === 'h2') {
      paragraphs.push(new Paragraph({
        text: el.textContent || '',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 80 },
      }))
    } else if (tag === 'h3') {
      paragraphs.push(new Paragraph({
        text: el.textContent || '',
        heading: HeadingLevel.HEADING_3,
      }))
    } else if (tag === 'p') {
      // Check for inline image
      const img = el.querySelector('img')
      if (img) {
        const src = img.getAttribute('src') || ''
        if (src.startsWith('data:')) {
          try {
            const base64 = src.split(',')[1]
            const binary = atob(base64)
            const bytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
            paragraphs.push(new Paragraph({
              children: [new ImageRun({
                data: bytes,
                transformation: { width: 480, height: 320 },
                type: 'png',
              } as any)],
              alignment: AlignmentType.CENTER,
            }))
            continue
          } catch (e) {
            console.warn('[docx] image embed failed', e)
          }
        }
      }
      // Regular paragraph with potential bold/italic
      const runs = extractRuns(el)
      paragraphs.push(new Paragraph({
        children: runs.length > 0 ? runs : [new TextRun(el.textContent || '')],
        spacing: { after: 120 },
      }))
    } else if (tag === 'ul' || tag === 'ol') {
      for (const li of Array.from(el.querySelectorAll('li'))) {
        paragraphs.push(new Paragraph({
          children: [new TextRun(`• ${li.textContent || ''}`)],
          indent: { left: 360 },
          spacing: { after: 80 },
        }))
      }
    } else if (tag === 'img') {
      const src = el.getAttribute('src') || ''
      if (src.startsWith('data:')) {
        try {
          const base64 = src.split(',')[1]
          const binary = atob(base64)
          const bytes = new Uint8Array(binary.length)
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
          paragraphs.push(new Paragraph({
            children: [new ImageRun({
              data: bytes,
              transformation: { width: 480, height: 320 },
              type: 'png',
            } as any)],
            alignment: AlignmentType.CENTER,
          }))
        } catch (e) {
          console.warn('[docx] inline image embed failed', e)
        }
      }
    }
  }

  return paragraphs
}

function extractRuns(el: HTMLElement): TextRun[] {
  const runs: TextRun[] = []
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 3) {
      // Text node
      runs.push(new TextRun(child.textContent || ''))
    } else if (child.nodeType === 1) {
      const c = child as HTMLElement
      const tag = c.tagName.toLowerCase()
      if (tag === 'strong' || tag === 'b') {
        runs.push(new TextRun({ text: c.textContent || '', bold: true }))
      } else if (tag === 'em' || tag === 'i') {
        runs.push(new TextRun({ text: c.textContent || '', italics: true }))
      } else {
        runs.push(new TextRun(c.textContent || ''))
      }
    }
  }
  return runs
}
