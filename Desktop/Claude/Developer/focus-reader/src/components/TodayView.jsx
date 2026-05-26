// Sprint 5: Today view — shows assignments due today + next 3 days.
// Props: { assignments, onUpdate(assignments), onReParse(), onStartReading() }

const DAY_MS = 86_400_000

function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(isoDate, n) {
  return new Date(new Date(isoDate).getTime() + n * DAY_MS).toISOString().slice(0, 10)
}

function friendlyDate(isoDate) {
  const today    = isoToday()
  const tomorrow = addDays(today, 1)
  if (isoDate === today)    return 'Today'
  if (isoDate === tomorrow) return 'Tomorrow'
  // "Wed, May 28"
  return new Date(isoDate + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function AssignmentCard({ assignment, onToggleDone, onStartReading }) {
  const done     = assignment.status === 'done'
  const dateLabel = friendlyDate(assignment.dueDate)
  const isToday  = assignment.dueDate === isoToday()

  return (
    <div className={[
      'flex items-start gap-3 bg-white border rounded-xl px-4 py-3.5 transition-opacity',
      done ? 'opacity-50 border-ink-100' : 'border-ink-100 hover:border-ink-200',
    ].join(' ')}>

      {/* Done toggle */}
      <button
        onClick={onToggleDone}
        className={[
          'shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
          done
            ? 'bg-sage-400 border-sage-400 text-white'
            : 'border-ink-300 hover:border-sage-400',
        ].join(' ')}
        aria-label={done ? 'Mark as pending' : 'Mark as done'}
      >
        {done && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={[
          'text-sm font-medium text-ink-800 leading-snug',
          done ? 'line-through text-ink-400' : '',
        ].join(' ')}>
          {assignment.title}
        </p>
        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
          {assignment.course && (
            <span className="text-xs bg-focus-50 text-focus-700 px-2 py-0.5 rounded-full font-medium">
              {assignment.course}
            </span>
          )}
          <span className={[
            'text-xs px-2 py-0.5 rounded-full font-medium',
            isToday
              ? 'bg-red-50 text-red-600'
              : 'bg-ink-100 text-ink-500',
          ].join(' ')}>
            {dateLabel}
          </span>
        </div>
      </div>

      {/* Start Reading */}
      {!done && (
        <button
          onClick={onStartReading}
          className="shrink-0 px-3 py-1.5 bg-focus-600 text-white text-xs font-medium
                     rounded-lg hover:bg-focus-700 active:scale-95 transition-all duration-150"
        >
          Read →
        </button>
      )}
    </div>
  )
}

export default function TodayView({ assignments, onUpdate, onReParse, onStartReading }) {
  const today     = isoToday()
  const day3      = addDays(today, 3)

  const dueToday  = assignments.filter(a => a.dueDate === today)
  const upcoming  = assignments
    .filter(a => a.dueDate > today && a.dueDate <= day3)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))

  const hasAnything = dueToday.length > 0 || upcoming.length > 0

  function toggleDone(id) {
    const updated = assignments.map(a =>
      a.id === id ? { ...a, status: a.status === 'done' ? 'pending' : 'done' } : a
    )
    onUpdate(updated)
  }

  function handleStartReading(id) {
    const updated = assignments.map(a =>
      a.id === id ? { ...a, status: 'done' } : a
    )
    onUpdate(updated)
    onStartReading()
  }

  return (
    <div className="px-6 py-6">

      {!hasAnything ? (
        <div className="text-center py-10">
          <p className="text-2xl mb-2">🎉</p>
          <p className="text-sm font-medium text-ink-700">Nothing due in the next 3 days</p>
          <p className="text-xs text-ink-400 mt-1">Enjoy the break — or get ahead.</p>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Due today */}
          {dueToday.length > 0 && (
            <section>
              <h3 className="text-xs font-mono text-ink-400 uppercase tracking-wide mb-3">
                Due today
              </h3>
              <div className="space-y-2">
                {dueToday.map(a => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    onToggleDone={() => toggleDone(a.id)}
                    onStartReading={() => handleStartReading(a.id)}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Coming up */}
          {upcoming.length > 0 && (
            <section>
              <h3 className="text-xs font-mono text-ink-400 uppercase tracking-wide mb-3">
                Coming up
              </h3>
              <div className="space-y-2">
                {upcoming.map(a => (
                  <AssignmentCard
                    key={a.id}
                    assignment={a}
                    onToggleDone={() => toggleDone(a.id)}
                    onStartReading={() => handleStartReading(a.id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-ink-100 text-center">
        <button
          onClick={onReParse}
          className="text-xs text-ink-400 hover:text-ink-600 transition-colors"
        >
          Re-parse syllabus
        </button>
      </div>
    </div>
  )
}
