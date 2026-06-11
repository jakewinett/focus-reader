import { useState, useEffect } from 'react'
import { parseLines } from '../utils/textUtils.js'
import { getFlaggedSessions } from '../storage/history.js'

const PERIODS = [
  { label: '1 day',  days: 1 },
  { label: '3 days', days: 3 },
  { label: '6 days', days: 6 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
]

function formatDate(ts) {
  const d       = new Date(ts)
  const diffMs  = Date.now() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)  return d.toLocaleDateString('en-US', { weekday: 'long' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// Group flagged line indices into passages; merge any within 4 lines of each other.
function buildPassages(flaggedLines, lines) {
  const sorted = [...flaggedLines].sort((a, b) => a - b)
  if (!sorted.length) return []

  const groups = [[sorted[0]]]
  for (let i = 1; i < sorted.length; i++) {
    const last = groups[groups.length - 1]
    if (sorted[i] - last[last.length - 1] <= 4) {
      last.push(sorted[i])
    } else {
      groups.push([sorted[i]])
    }
  }

  return groups.map(group => {
    const start   = Math.max(0, group[0] - 2)
    const end     = Math.min(lines.length - 1, group[group.length - 1] + 2)
    const flagged = new Set(group)
    return { start, end, flagged, passage: lines.slice(start, end + 1) }
  })
}

function SkeletonCard() {
  return (
    <div className="bg-white border border-ink-100 rounded-xl p-4 space-y-2">
      <div className="h-3 bg-ink-100 rounded animate-pulse-soft w-2/5" />
      <div className="h-2.5 bg-ink-100 rounded animate-pulse-soft w-full" />
      <div className="h-2.5 bg-ink-100 rounded animate-pulse-soft w-4/5" />
      <div className="h-2.5 bg-ink-100 rounded animate-pulse-soft w-full mt-1" />
    </div>
  )
}

export default function FlaggedReview({ onBack }) {
  const [days, setDays]       = useState(7)
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getFlaggedSessions(days)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [days])

  return (
    <div className="min-h-screen bg-white">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-ink-100">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-ink-400 hover:text-ink-700
                       text-sm transition-colors duration-150 shrink-0"
            aria-label="Back to dashboard"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>
          <div className="flex items-center gap-2 flex-1">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"
                 className="text-amber-400 shrink-0">
              <path d="M3 1h8a1 1 0 0 1 1 1v10.5l-4.5-2-4.5 2V2a1 1 0 0 1 1-1Z"/>
            </svg>
            <h1 className="text-sm font-semibold text-ink-800">Flagged Sections</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">

        {/* Period selector */}
        <div className="flex items-center gap-2 mb-8 flex-wrap">
          <span className="text-xs text-ink-400 font-mono mr-1 shrink-0">From the last</span>
          {PERIODS.map(p => (
            <button
              key={p.days}
              onClick={() => setDays(p.days)}
              className={[
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150',
                days === p.days
                  ? 'bg-focus-600 text-white'
                  : 'bg-ink-100 text-ink-500 hover:bg-ink-200',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-6">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Empty */}
        {!loading && sessions.length === 0 && (
          <div className="bg-white border border-ink-100 rounded-xl px-6 py-14 text-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                 className="text-ink-200 mx-auto mb-4">
              <path d="M5 3h14a2 2 0 0 1 2 2v16l-7-3-7 3V5a2 2 0 0 1 2-2Z"
                    stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            <p className="text-sm font-medium text-ink-700 mb-1">No flagged sections</p>
            <p className="text-xs text-ink-400 max-w-xs mx-auto">
              Press <kbd className="px-1 py-0.5 bg-ink-100 rounded text-ink-500">F</kbd> while
              reading to flag important lines — they'll appear here for review.
            </p>
          </div>
        )}

        {/* Sessions */}
        {!loading && sessions.length > 0 && (
          <div className="space-y-10">
            {sessions.map(session => {
              const lines    = parseLines(session.rawText ?? '')
              const passages = buildPassages(session.flaggedLines, lines)
              if (!passages.length) return null

              return (
                <div key={session.id}>
                  {/* Session header */}
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-sm font-semibold text-ink-800 truncate">
                      {session.title}
                    </span>
                    <span className="text-ink-200 text-xs shrink-0">·</span>
                    <span className="text-xs text-ink-400 shrink-0">
                      {formatDate(session.lastReadAt)}
                    </span>
                    <span className="ml-auto text-xs text-amber-500 font-medium shrink-0">
                      {session.flaggedLines.length} flagged
                    </span>
                  </div>

                  {/* Passages */}
                  <div className="space-y-3">
                    {passages.map((p, pi) => (
                      <div key={pi}
                           className="bg-white border border-ink-100 rounded-xl overflow-hidden">
                        {p.passage.map((line, li) => {
                          const lineIdx  = p.start + li
                          const isFlagged = p.flagged.has(lineIdx)
                          const isBlank  = !line.trim()
                          return (
                            <div
                              key={li}
                              className={[
                                'px-4 text-sm leading-relaxed',
                                isBlank ? 'py-1' : 'py-2',
                                isFlagged
                                  ? 'bg-amber-50 border-l-2 border-amber-400 text-ink-800 font-medium'
                                  : 'text-ink-400',
                              ].join(' ')}
                            >
                              {isBlank ? ' ' : line}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

      </main>
    </div>
  )
}
