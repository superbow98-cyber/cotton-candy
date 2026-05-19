'use client'
import type { MindMap, MindMapBranch } from '@/types'

const BRANCH_COLORS: Record<string, string> = {
  blue: '#5A8FF5',
  green: '#34A853',
  pink: '#F8B4D9',
  amber: '#FFB627',
  purple: '#C8A8E9',
  orange: '#FF7043',
}

const COLOR_SEQUENCE = ['blue', 'green', 'pink', 'amber', 'purple', 'orange'] as const

// Word-wrap helper: split text into max N lines, max M chars per line
function wrapWords(text: string, maxCharsPerLine: number, maxLines: number = 2): string[] {
  if (!text) return ['']
  const words = text.trim().split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const w of words) {
    const tentative = current ? `${current} ${w}` : w
    if (tentative.length <= maxCharsPerLine) {
      current = tentative
    } else {
      if (current) lines.push(current)
      current = w
      if (lines.length >= maxLines - 1) break
    }
  }
  if (current && lines.length < maxLines) lines.push(current)

  // If still more text remained, append ellipsis to last line
  const allText = lines.join(' ')
  if (allText.length < text.length && lines.length === maxLines) {
    const last = lines[maxLines - 1]
    if (last.length + 1 <= maxCharsPerLine) {
      lines[maxLines - 1] = last + '…'
    } else {
      lines[maxLines - 1] = last.slice(0, maxCharsPerLine - 1) + '…'
    }
  }
  return lines.length > 0 ? lines : [text.slice(0, maxCharsPerLine)]
}

export default function MindMapView({ mindmap }: { mindmap: MindMap | null | undefined }) {
  if (!mindmap || !mindmap.branches || mindmap.branches.length === 0) {
    return (
      <div style={{
        background: 'linear-gradient(180deg, #FAFBFD 0%, #F4F6FA 100%)',
        border: '0.5px solid rgba(0,0,0,0.06)',
        borderRadius: 14,
        padding: 40,
        textAlign: 'center',
        color: '#6B6B70',
        fontSize: 13,
      }}>
        Mind map akan tersedia selepas AI summary.
      </div>
    )
  }

  // Auto-assign colors to branches that don't have one
  const branches = mindmap.branches.slice(0, 8).map((b, i) => ({
    ...b,
    color: b.color || COLOR_SEQUENCE[i % COLOR_SEQUENCE.length],
  }))

  // FULL FRAME LAYOUT — bigger viewBox + larger branches + bigger radius
  const VIEW_W = 900
  const VIEW_H = 620
  const cx = VIEW_W / 2
  const cy = VIEW_H / 2
  const radius = 230
  const branchWidth = 200
  const branchBaseHeight = 60

  // Pre-wrap text for all branches to determine actual heights
  const wrappedBranches = branches.map((b) => {
    const titleLines = wrapWords(b.title || '', 22, 2)
    const subtitleLines = b.subtitle ? wrapWords(b.subtitle, 26, 2) : []
    return { ...b, titleLines, subtitleLines }
  })

  // Wrap center text too
  const centerLines = wrapWords(mindmap.center || 'Main Topic', 14, 2)

  // Compute branch positions (radial) with dynamic heights
  const positions = wrappedBranches.map((branch, i) => {
    const total = wrappedBranches.length
    const angle = -Math.PI + (i / total) * Math.PI * 2
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius * 0.82
    // Dynamic height based on text lines
    const totalLines = branch.titleLines.length + branch.subtitleLines.length
    const dynamicHeight = Math.max(branchBaseHeight, totalLines * 18 + 20)
    return {
      ...branch,
      x,
      y,
      height: dynamicHeight,
      colorHex: BRANCH_COLORS[branch.color] || BRANCH_COLORS.blue,
    }
  })

  return (
    <div style={{
      background: 'linear-gradient(180deg, #FAFBFD 0%, #F4F6FA 100%)',
      border: '0.5px solid rgba(0,0,0,0.06)',
      borderRadius: 14,
      padding: 16,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        style={{ width: '100%', height: 'auto', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Connections */}
        {positions.map((pos, i) => (
          <line
            key={`line-${i}`}
            x1={cx}
            y1={cy}
            x2={pos.x}
            y2={pos.y}
            stroke={pos.colorHex}
            strokeWidth="2"
            opacity="0.35"
          />
        ))}

        {/* Center node — LARGER */}
        <circle cx={cx} cy={cy} r="80" fill="#1d1d1f" />
        {centerLines.map((line, i) => {
          const lineOffset = (i - (centerLines.length - 1) / 2) * 18
          return (
            <text
              key={`center-${i}`}
              x={cx}
              y={cy + lineOffset + 4}
              textAnchor="middle"
              fill="#fff"
              style={{ fontFamily: '-apple-system, sans-serif', fontSize: 15, fontWeight: 700 }}
            >
              {line}
            </text>
          )
        })}
        <text
          x={cx}
          y={cy + centerLines.length * 9 + 18}
          textAnchor="middle"
          fill="rgba(255,255,255,0.6)"
          style={{ fontFamily: '-apple-system, sans-serif', fontSize: 10 }}
        >
          Main Topic
        </text>

        {/* Branches */}
        {positions.map((pos, i) => {
          const totalLines = pos.titleLines.length + pos.subtitleLines.length
          const lineSpacing = 16
          const startY = pos.y - ((totalLines - 1) * lineSpacing) / 2

          return (
            <g key={`branch-${i}`}>
              {/* Branch box */}
              <rect
                x={pos.x - branchWidth / 2}
                y={pos.y - pos.height / 2}
                width={branchWidth}
                height={pos.height}
                rx="12"
                fill="#fff"
                stroke={pos.colorHex}
                strokeWidth="2"
              />
              {/* Title lines */}
              {pos.titleLines.map((line, ti) => (
                <text
                  key={`t-${i}-${ti}`}
                  x={pos.x}
                  y={startY + ti * lineSpacing + 4}
                  textAnchor="middle"
                  fill="#1d1d1f"
                  style={{ fontFamily: '-apple-system, sans-serif', fontSize: 13, fontWeight: 600 }}
                >
                  {line}
                </text>
              ))}
              {/* Subtitle lines */}
              {pos.subtitleLines.map((line, si) => (
                <text
                  key={`s-${i}-${si}`}
                  x={pos.x}
                  y={startY + (pos.titleLines.length + si) * lineSpacing + 4}
                  textAnchor="middle"
                  fill="#6B6B70"
                  style={{ fontFamily: '-apple-system, sans-serif', fontSize: 10 }}
                >
                  {line}
                </text>
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
