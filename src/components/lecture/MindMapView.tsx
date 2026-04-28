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

  // Layout: distribute branches around center in a circle
  const cx = 300
  const cy = 180
  const radius = 130
  const branchWidth = 130
  const branchHeight = 44

  const positions = branches.map((branch, i) => {
    const total = branches.length
    // Distribute around circle, starting from left side, going clockwise
    const angle = -Math.PI + (i / total) * Math.PI * 2
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius * 0.85 // squash vertical to fit
    return {
      ...branch,
      x,
      y,
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
        viewBox="0 0 600 360"
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
            strokeWidth="1.5"
            opacity="0.4"
          />
        ))}

        {/* Center node */}
        <circle cx={cx} cy={cy} r="50" fill="#1d1d1f" />
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          fill="#fff"
          style={{ fontFamily: '-apple-system, sans-serif', fontSize: 13, fontWeight: 600 }}
        >
          {truncate(mindmap.center, 14)}
        </text>
        <text
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fill="rgba(255,255,255,0.6)"
          style={{ fontFamily: '-apple-system, sans-serif', fontSize: 9 }}
        >
          Main Topic
        </text>

        {/* Branches */}
        {positions.map((pos, i) => (
          <g key={`branch-${i}`}>
            <rect
              x={pos.x - branchWidth / 2}
              y={pos.y - branchHeight / 2}
              width={branchWidth}
              height={branchHeight}
              rx="10"
              fill="#fff"
              stroke={pos.colorHex}
              strokeWidth="1"
            />
            <text
              x={pos.x}
              y={pos.subtitle ? pos.y - 3 : pos.y + 3}
              textAnchor="middle"
              fill="#1d1d1f"
              style={{ fontFamily: '-apple-system, sans-serif', fontSize: 11, fontWeight: 600 }}
            >
              {truncate(pos.title, 18)}
            </text>
            {pos.subtitle && (
              <text
                x={pos.x}
                y={pos.y + 11}
                textAnchor="middle"
                fill="#6B6B70"
                style={{ fontFamily: '-apple-system, sans-serif', fontSize: 9 }}
              >
                {truncate(pos.subtitle, 22)}
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  )
}

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}
