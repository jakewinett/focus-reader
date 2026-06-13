import { useState, useEffect } from 'react'
import { UserButton, SignInButton } from '@clerk/react'
import GoogleButton from './GoogleButton.jsx'
import { useAppAuth } from '../lib/AuthContext.jsx'
import { loadAssignments, saveAssignments, clearAssignments, loadCourses } from '../storage/state.js'
import EvanoryLogo from './EvanoryLogo.jsx'
import SettingsModal from './SettingsModal.jsx'
import HistoryZone from './HistoryZone.jsx'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Sprint 6: Dashboard — 3-zone layout.
// Sprint 8: Zone 4 — reading history; Settings gear; onContinueReading prop.
// Props: { onGoToLanding(), onStartReading(), onReParse(), onContinueReading() }

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
export default function Dashboard({ onGoToLanding, onStartReading, onReParse, onContinueReading, onViewFlagged, onGoToPricing }) {
  const { isSignedIn } = useAppAuth()
  const [assignments, setAssignments]   = useState([])
  const [courses, setCourses]           = useState([])
  const [showSettings, setShowSettings] = useState(false)

  // Load assignments and courses (async — works for both localStorage and Supabase)
  useEffect(() => {
    loadAssignments().then(setAssignments)
    loadCourses().then(setCourses)
  }, [])

  function update(updated) {
    saveAssignments(updated) // async, fire-and-forget — local state updates immediately
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

  async function handleReParse() {
    await clearAssignments()
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
  const courseMetaMap  = Object.fromEntries(courses.map(c => [c.name, c]))
  const courseMap = {}
  for (const a of assignments) {
    const key = a.course?.trim() || 'Other'
    if (!courseMap[key]) courseMap[key] = { done: 0, total: 0 }
    courseMap[key].total++
    if (a.status === 'done') courseMap[key].done++
  }
  const courseProgress = Object.entries(courseMap)
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
  const showCourses = courseProgress.length >= 2

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <header className="border-b border-ink-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <EvanoryLogo />
          <div className="flex items-center gap-3">
            <span className="text-xs text-ink-400 font-mono hidden sm:inline">v1.0 · Sprint 10</span>
            {/* Auth controls */}
            {CLERK_ENABLED && !isSignedIn && (
              <div className="flex items-center gap-2">
                <SignInButton mode="modal">
                  <button className="text-xs text-ink-500 hover:text-ink-800 transition-colors">
                    Sign in
                  </button>
                </SignInButton>
                <GoogleButton label="Sign up free" className={[
                  'flex items-center gap-1.5 text-xs font-medium',
                  'px-3 py-1.5 rounded-lg bg-white border border-ink-200',
                  'text-ink-800 hover:bg-ink-50 hover:border-ink-300',
                  'transition-colors duration-150 shadow-sm',
                ].join(' ')} />
              </div>
            )}
            {CLERK_ENABLED && isSignedIn && <UserButton afterSignOutUrl="/" />}
            {/* Settings gear */}
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              className="w-7 h-7 flex items-center justify-center rounded-lg
                         text-ink-400 hover:text-ink-700 hover:bg-ink-100
                         transition-colors duration-150"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M6.16 1.56a.75.75 0 0 1 1.48-.12l.1.6a4.5 4.5 0 0 1 1.5.87l.57-.22a.75.75 0 0 1 .95.96l-.22.56a4.5 4.5 0 0 1 .87 1.5l.6.1a.75.75 0 0 1-.12 1.48l-.6.1a4.5 4.5 0 0 1-.87 1.5l.22.57a.75.75 0 0 1-.96.95l-.56-.22a4.5 4.5 0 0 1-1.5.87l-.1.6a.75.75 0 0 1-1.48-.12l-.1-.6a4.5 4.5 0 0 1-1.5-.87l-.57.22a.75.75 0 0 1-.95-.96l.22-.56a4.5 4.5 0 0 1-.87-1.5l-.6-.1a.75.75 0 0 1 .12-1.48l.6-.1a4.5 4.5 0 0 1 .87-1.5l-.22-.57a.75.75 0 0 1 .96-.95l.56.22a4.5 4.5 0 0 1 1.5-.87l.1-.6ZM7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                  fill="currentColor"/>
              </svg>
            </button>
            {onGoToPricing && (
              <button
                onClick={onGoToPricing}
                className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50
                           rounded-lg hover:bg-indigo-100 transition-colors duration-150"
              >
                Upgrade
              </button>
            )}
            <button
              onClick={onGoToLanding}
              className="px-3 py-1.5 text-xs font-medium text-ink-600 bg-ink-100
                         rounded-lg hover:bg-ink-200 transition-colors duration-150"
            >
              + Add a reading
            </button>
          </div>
          {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
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
              {courseProgress.map(c => (
                <CourseCard key={c.name} {...c} />
              ))}
            </div>
          </section>
        )}

        {/* Zone 4 — Recent readings (Sprint 8) */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-mono text-ink-400 uppercase tracking-wide">
              Recent readings
            </h2>
            <button
              onClick={onViewFlagged}
              className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-700
                         font-medium transition-colors duration-150"
            >
              <svg width="11" height="11" viewBox="0 0 14 14" fill="currentColor">
                <path d="M3 1h8a1 1 0 0 1 1 1v10.5l-4.5-2-4.5 2V2a1 1 0 0 1 1-1Z"/>
              </svg>
              Review flagged
            </button>
          </div>
          <HistoryZone onContinueReading={onContinueReading} />
        </section>

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
