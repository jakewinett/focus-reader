import { useState, useEffect } from 'react'
import {
  loadHistory,
  deleteHistoryRecord,
  clearHistory,
} from '../storage/history.js'

// Sprint 8: Zone 4 in Dashboard — persistent reading history.
// Shows the last 20 reading sessions from IndexedDB, newest first.
// Each row lets the user continue, restart, or delete a past session.

const SOURCE_LABELS = { pdf: 'PDF', docx: 'DOCX', paste: 'Paste' }
const SOURCE_COLORS = {
  pdf:   'bg-focus-50 text-focus-700',
  docx:  'bg-sage-50 text-sage-700',
  paste: 'bg-ink-100 text-ink-500',
}

function formatDate(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diffDays = Math.floor((now - d) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7)  return d.toLocaleDateString('en-US', { weekday: 'short' })
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function ProgressLabel({ lastLine, totalLines, isComplete }) {
  if (isComplete) {
    return <span className="text-sage-600 font-medium text-xs">Complete ✓</span>
  }
  if (lastLine === 0) {
    return <span className="text-ink-400 text-xs">Not started</span>
  }
  const pct = Math.min(99, Math.round((lastLine / Math.max(totalLines, 1)) * 100))
  return <span className="text-ink-400 text-xs">{pct}%</span>
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 bg-white border border-ink-100 rounded-xl px-4 py-3">
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-ink-100 rounded animate-pulse-soft w-3/4" />
        <div className="h-2.5 bg-ink-100 rounded animate-pulse-soft w-1/2" />
      </div>
      <div className="h-7 w-16 bg-ink-100 rounded-lg animate-pulse-soft shrink-0" />
    </div>
  )
}

export default function HistoryZone({ onContinueReading }) {
  const [items, setItems]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [clearStep, setClearStep] = useState(0) // 0=idle, 1=confirm, back to 0 after

  useEffect(() => {
    loadHistory()
      .then(records => { setItems(records); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function handleDelete(id, e) {
    e.stopPropagation()
    await deleteHistoryRecord(id)
    setItems(prev => prev.filter(r => r.id !== id))
  }

  async function handleClearAll() {
    if (clearStep === 0) {
      setClearStep(1)
      // Auto-reset confirm state after 3 s if user doesn't click again
      setTimeout(() => setClearStep(0), 3000)
      return
    }
    await clearHistory()
    setItems([])
    setClearStep(0)
  }

  function handleContinue(id, fromStart = false) {
    onContinueReading(id, { fromStart })
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="bg-white border border-ink-100 rounded-xl px-4 py-8 text-center">
        <p className="text-sm text-ink-400">
          No readings yet. Start a document to see it here.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="space-y-2">
        {items.map(record => {
          const ctaLabel = record.isComplete
            ? 'Read again'
            : record.lastLine > 0
            ? 'Continue →'
            : 'Start →'
          const fromStart = record.isComplete

          return (
            <div
              key={record.id}
              className="flex items-center gap-3 bg-white border border-ink-100 rounded-xl
                         px-4 py-3 hover:border-ink-200 transition-colors group"
            >
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-800 truncate leading-snug mb-1">
                  {record.title}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Source badge */}
                  <span className={[
                    'text-xs px-1.5 py-0.5 rounded-md font-medium',
                    SOURCE_COLORS[record.source] ?? SOURCE_COLORS.paste,
                  ].join(' ')}>
                    {SOURCE_LABELS[record.source] ?? 'Text'}
                  </span>
                  <span className="text-ink-200 text-xs">·</span>
                  <span className="text-xs text-ink-400">
                    {record.wordCount.toLocaleString()} words
                  </span>
                  <span className="text-ink-200 text-xs">·</span>
                  <ProgressLabel
                    lastLine={record.lastLine}
                    totalLines={record.totalLines}
                    isComplete={record.isComplete}
                  />
                  <span className="text-ink-200 text-xs">·</span>
                  <span className="text-xs text-ink-300">
                    {formatDate(record.lastReadAt)}
                  </span>
                </div>
              </div>

              {/* CTA */}
              <button
                onClick={() => handleContinue(record.id, fromStart)}
                className="shrink-0 px-3 py-1.5 bg-ink-100 text-ink-600 text-xs font-medium
                           rounded-lg hover:bg-focus-600 hover:text-white active:scale-95
                           transition-all duration-150 whitespace-nowrap"
              >
                {ctaLabel}
              </button>

              {/* Delete */}
              <button
                onClick={e => handleDelete(record.id, e)}
                aria-label="Remove from history"
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-lg
                           text-ink-300 hover:text-red-500 hover:bg-red-50
                           opacity-0 group-hover:opacity-100 transition-all duration-150
                           text-base leading-none"
              >
                ×
              </button>
            </div>
          )
        })}
      </div>

      {/* Clear all — two-tap confirmation */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={handleClearAll}
          className={[
            'text-xs transition-colors duration-150',
            clearStep === 1
              ? 'text-red-500 font-medium'
              : 'text-ink-300 hover:text-ink-500',
          ].join(' ')}
        >
          {clearStep === 1 ? 'Click again to clear all history' : 'Clear history'}
        </button>
      </div>
    </div>
  )
}
