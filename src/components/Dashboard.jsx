import { useState } from 'react'
import { loadAssignments, saveAssignments, clearAssignments, loadCourses } from '../storage/state.js'

// Sprint 6: Dashboard — 3-zone layout.
// FR-15: Zone 1 — right now card (single most urgent assignment).
// FR-16: Zone 2 — this week list (5-item cap).
// FR-17: Zone 3 — course progress cards.
// FR-18: Route from dashboard to reader.
// FR-28: Due-date sort with title tiebreak.
// Props: { onGoToLanding(), onStartReading(), onReParse() }

const DAY_MS = 86_400_000

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(iso, n) {
  return new Date(new Date(iso).getTime() + n * DAY_MS).toISOString().slice(0, 10)
}

function friendlyDate(iso) {
  const today    = isoToday()
  const tomorrow = addDays(today, 1)
  if (iso === today)    return 'Today'
  if (iso === tomorrow) return 'Tomorrow'
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// FR-28: sort by dueDate ASC; title as stable tiebreak.
function sortByDue(list) {
  return [...list].sort((a, b) => {
    const d = a.dueDate.localeCompare(b.dueDate)
    return d !== 0 ? d : a.title.localeCompare(b.title)
  })
}

// ── Zone 1 — Right now card (FR-15) ──────────────────────────────────────────
function RightNowCard({ assignment, onStartReading, onToggleDone }) {
  if (!assignment) {
    return (
      <div className="bg-white border border-ink-100 rounded-2xl px-6 py-8 text-center shadow-sm">
        <p className="text-2xl mb-2">🎉</p>
        <p className="text-sm font-semibold text-ink-700">You're all caught up</p>
        <p className="text-xs text-ink-400 mt-1">No pending assignments right now.</p>
      </div>
    )
  }

  const isToday  = assignment.dueDate === isoToday()
  const dateLabel = friendlyDate(assignment.dueDate)

  return (
    <div className="bg-white border border-focus-200 rounded-2xl shadow-sm overflow-hidden">
      {/* Accent bar */}
      <div className="h-1 bg-gradient-to-r from-focus-500 to-focus-400" />

      <div className="px-6 py-5 flex items-start gap-4">
        {/* Done toggle */}
        <button
          onClick={onToggleDone}
          className="shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 border-ink-300
                     hover:border-sage-400 flex items-center justify-center transition-colors"
          aria-label="Mark as done"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold text-ink-900 leading-snug mb-2">
            {assignment.title}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            {assignment.course && (
              <span className="text-xs bg-focus-50 text-focus-700 px-2 py-0.5 rounded-full font-medium">
                {assignment.course}
              </span>
            )}
            <span className={[
              'text-xs px-2 py-0.5 rounded-full font-medium',
              isToday ? 'bg-red-50 text-red-600' : 'bg-ink-100 text-ink-500',
            ].join(' ')}>
              {dateLabel}
            </span>
          </div>
        </div>

        {/* CTA (FR-18) */}
        <button
          onClick={onStartReading}
          className="shrink-0 px-4 py-2 bg-focus-600 text-white text-sm font-medium
                     rounded-xl hover:bg-focus-700 active:scale-95 transition-all duration-150"
        >
          Start Reading →
        </button>
      </div>
    </div>
  )
}

// ── Zone 2 — This week row ────────────────────────────────────────────────────
function WeekRow({ assignment, onStartReading, onToggleDone }) {
  const dateLabel = friendlyDate(assignment.dueDate)
  const isToday   = assignment.dueDate === isoToday()

  return (
    <div className="flex items-center gap-3 bg-white border border-ink-100 rounded-xl
                    px-4 py-3 hover:border-ink-200 transition-colors">
      {/* Done toggle */}
      <button
        onClick={onToggleDone}
        className="shrink-0 w-5 h-5 rounded-full border-2 border-ink-300
                   hover:border-sage-400 flex items-center justify-center transition-colors"
        aria-label="Mark as done"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink-800 truncate">{assignment.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          {assignment.course && (
            <span className="text-xs text-focus-600 font-medium">{assignment.course}</span>
          )}
          {assignment.course && (
            <span className="text-ink-200 text-xs">·</span>
          )}
          <span className={[
            'text-xs font-medium',
            isToday ? 'text-red-500' : 'text-ink-400',
          ].join(' ')}>
            {dateLabel}
          </span>
        </div>
      </div>

      {/* Read button (FR-18) */}
      <button
        onClick={onStartReading}
        className="shrink-0 px-3 py-1.5 bg-ink-100 text-ink-600 text-xs font-medium
                   rounded-lg hover:bg-focus-600 hover:text-white active:scale-95
                   transition-all duration-150"
      >
        Read →
      </button>
    </div>
  )
}

// ── Zone 3 — Course progress card ────────────────────────────────────────────
function CourseCard({ name, done, total, pct, teacher, schedule }) {
  return (
    <div className="bg-white border border-ink-100 rounded-xl px-4 py-4">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-semibold text-ink-800 leading-snug">{name}</p>
        <span className="shrink-0 text-xs font-mono text-ink-400">{done}/{total}</span>
      </div>
      {/* Teacher + schedule metadata */}
      {(teacher || schedule) && (
        <div className="flex flex-col gap-0.5 mb-3">
          {teacher && (
            <span className="text-xs text-ink-400 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
                <circle cx="5" cy="3.5" r="1.75" stroke="currentColor" strokeWidth="1"/>
                <path d="M1.25 8.75c0-2.07 1.68-3.75 3.75-3.75s3.75 1.68 3.75 3.75"
                      stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
              </svg>
              {teacher}
            </span>
          )}
          {schedule && (
            <span className="text-xs text-ink-400 flex items-center gap-1">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="shrink-0">
                <circle cx="5" cy="5" r="3.75" stroke="currentColor" strokeWidth="1"/>
                <path d="M5 3V5l1.25 1.25" stroke="currentColor" strokeWidth="1"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {schedule}
            </span>
          )}
        </div>
      )}
      {!(teacher || schedule) && <div className="mb-3" />}
      {/* Progress bar */}
      <div className="h-1.5 bg-ink-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-focus-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-ink-400">{pct}% complete</p>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard({ onGoToLanding, onStartReading, onReParse }) {
  const [assignments, setAssignments] = useState(() => loadAssignments())

  function update(updated) {
    saveAssignments(updated)
    setAssignments(updated)
  }

  function toggleDone(id) {
    update(assignments.map(a =>
      a.id === id ? { ...a, status: a.status === 'done' ? 'pending' : 'done' } : a
    ))
  }

  function startReading(id) {
    update(assignments.map(a =>
      a.id === id ? { ...a, status: 'done' } : a
    ))
    onStartReading()
  }

  function handleReParse() {
    clearAssignments()
    onReParse()
  }

  // ── Derived data ─────────────────────────────────────────────
  const today  = isoToday()
  const week7  = addDays(today, 7)
  const pending = sortByDue(assignments.filter(a => a.status === 'pending'))

  // Zone 1: most urgent pending (FR-15)
  const rightNow = pending[0] ?? null

  // Zone 2: this week, excluding rightNow, cap 5 (FR-16)
  const thisWeek = pending
    .filter(a => rightNow ? a.id !== rightNow.id : true)
    .filter(a => a.dueDate <= week7)
    .slice(0, 5)

  // Zone 3: course progress (FR-17) — only show when 2+ distinct courses
  // Merge assignment counts with saved course metadata (teacher, schedule)
  const savedCourses   = loadCourses()
  const courseMetaMap  = Object.fromEntries(savedCourses.map(c => [c.name, c]))
  const courseMap = {}
  for (const a of assignments) {
    const key = a.course?.trim() || 'Other'
    if (!courseMap[key]) courseMap[key] = { done: 0, total: 0 }
    courseMap[key].total++
    if (a.status === 'done') courseMap[key].done++
  }
  const courses = Object.entries(courseMap)
    .map(([name, { done, total }]) => {
      const meta = courseMetaMap[name] ?? {}
      return {
        name, done, total,
        pct:      Math.round((done / total) * 100),
        teacher:  meta.teacher  || '',
        schedule: meta.schedule || '',
      }
    })
    .sort((a, b) => a.pct - b.pct || a.name.localeCompare(b.name))
  const showCourses = courses.length >= 2

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <header className="border-b border-ink-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-focus-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="3" width="12" height="1.5" rx="0.75" fill="white"/>
                <rect x="1" y="6.25" width="8" height="1.5" rx="0.75" fill="white"/>
                <rect x="1" y="9.5" width="10" height="1.5" rx="0.75" fill="white"/>
              </svg>
            </div>
            <span className="font-semibold text-ink-800 tracking-tight">Focus Reader</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-400 font-mono hidden sm:inline">v1.0 · Sprint 6</span>
            <button
              onClick={onGoToLanding}
              className="px-3 py-1.5 text-xs font-medium text-ink-600 bg-ink-100
                         rounded-lg hover:bg-ink-200 transition-colors duration-150"
            >
              + Add a reading
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-8 space-y-8 animate-fade-in">

        {/* Greeting */}
        <div>
          <h1 className="text-2xl font-semibold text-ink-900">{greeting()}</h1>
          <p className="text-ink-400 text-sm mt-1">
            {pending.length === 0
              ? 'Nothing left on your plate.'
              : `You have ${pending.length} pending assignment${pending.length !== 1 ? 's' : ''}.`}
          </p>
        </div>

        {/* Zone 1 — Right now (FR-15) */}
        <section>
          <h2 className="text-xs font-mono text-ink-400 uppercase tracking-wide mb-3">
            Right now
          </h2>
          <RightNowCard
            assignment={rightNow}
            onStartReading={() => rightNow && startReading(rightNow.id)}
            onToggleDone={() => rightNow && toggleDone(rightNow.id)}
          />
        </section>

        {/* Zone 2 — This week (FR-16) */}
        {thisWeek.length > 0 && (
          <section>
            <h2 className="text-xs font-mono text-ink-400 uppercase tracking-wide mb-3">
              This week
            </h2>
            <div className="space-y-2">
              {thisWeek.map(a => (
                <WeekRow
                  key={a.id}
                  assignment={a}
                  onStartReading={() => startReading(a.id)}
                  onToggleDone={() => toggleDone(a.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Zone 3 — Course progress (FR-17) */}
        {showCourses && (
          <section>
            <h2 className="text-xs font-mono text-ink-400 uppercase tracking-wide mb-3">
              Course progress
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {courses.map(c => (
                <CourseCard key={c.name} {...c} />
              ))}
            </div>
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto w-full px-6 pb-8 pt-2 flex items-center justify-center gap-6">
        <button
          onClick={handleReParse}
          className="text-xs text-ink-400 hover:text-ink-600 transition-colors"
        >
          Re-parse syllabus
        </button>
        <span className="text-ink-200 text-xs">·</span>
        <button
          onClick={onGoToLanding}
          className="text-xs text-ink-400 hover:text-ink-600 transition-colors"
        >
          Paste / upload reading
        </button>
      </footer>

    </div>
  )
}
