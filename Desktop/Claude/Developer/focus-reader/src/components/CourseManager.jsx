import { useState } from 'react'

// Course manager — add, edit, delete up to 6 courses.
// Props: { courses, onChange(courses) }
// Course shape: { id, name, teacher, schedule }

const MAX_COURSES = 6

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

const EMPTY_FORM = { name: '', teacher: '', schedule: '' }

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconPerson() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
      <circle cx="6" cy="4" r="2.25" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 10.5c0-2.485 2.015-4.5 4.5-4.5s4.5 2.015 4.5 4.5"
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
      <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6 3.5V6l1.5 1.5" stroke="currentColor" strokeWidth="1.2"
            strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

// ── Inline form (shared for add and edit) ─────────────────────────────────────
function CourseForm({ initial = EMPTY_FORM, onSave, onCancel, saveLabel = 'Add course' }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState('')

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  function handleSave() {
    if (!form.name.trim()) {
      setError('Course name is required.')
      return
    }
    onSave({ ...form, name: form.name.trim(), teacher: form.teacher.trim(), schedule: form.schedule.trim() })
  }

  return (
    <div className="space-y-2.5">
      <div>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Course name or code (e.g. BIO 201)"
          autoFocus
          className="w-full px-3 py-2 border border-ink-200 rounded-xl text-sm text-ink-700
                     placeholder:text-ink-300 outline-none focus:border-focus-400 focus:ring-1
                     focus:ring-focus-200 transition-colors"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <input
        type="text"
        value={form.teacher}
        onChange={e => set('teacher', e.target.value)}
        placeholder="Teacher name (optional)"
        className="w-full px-3 py-2 border border-ink-200 rounded-xl text-sm text-ink-700
                   placeholder:text-ink-300 outline-none focus:border-focus-400 focus:ring-1
                   focus:ring-focus-200 transition-colors"
      />
      <input
        type="text"
        value={form.schedule}
        onChange={e => set('schedule', e.target.value)}
        placeholder="Days & time (e.g. MWF 10:00–11:15 AM)"
        className="w-full px-3 py-2 border border-ink-200 rounded-xl text-sm text-ink-700
                   placeholder:text-ink-300 outline-none focus:border-focus-400 focus:ring-1
                   focus:ring-focus-200 transition-colors"
      />
      <div className="flex items-center gap-2 pt-0.5">
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-focus-600 text-white text-xs font-medium rounded-lg
                     hover:bg-focus-700 active:scale-95 transition-all duration-150"
        >
          {saveLabel}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium text-ink-500 hover:text-ink-700
                     transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

// ── Course card ───────────────────────────────────────────────────────────────
function CourseCard({ course, onEdit, onDelete }) {
  return (
    <div className="flex items-start gap-3 bg-white border border-ink-100 rounded-xl
                    px-4 py-3.5 group hover:border-ink-200 transition-colors">
      {/* Indicator dot */}
      <div className="shrink-0 mt-1 w-2 h-2 rounded-full bg-focus-400" />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink-800">{course.name}</p>
        <div className="flex flex-col gap-0.5 mt-1">
          {course.teacher && (
            <span className="flex items-center gap-1.5 text-xs text-ink-400">
              <IconPerson /> {course.teacher}
            </span>
          )}
          {course.schedule && (
            <span className="flex items-center gap-1.5 text-xs text-ink-400">
              <IconClock /> {course.schedule}
            </span>
          )}
          {!course.teacher && !course.schedule && (
            <span className="text-xs text-ink-300 italic">No details added</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100
                      transition-opacity duration-150">
        <button
          onClick={onEdit}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-400
                     hover:text-ink-700 hover:bg-ink-100 transition-colors"
          aria-label={`Edit ${course.name}`}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M9.5 1.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor"
                  strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-ink-400
                     hover:text-red-500 hover:bg-red-50 transition-colors"
          aria-label={`Remove ${course.name}`}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor"
                  strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </div>
  )
}

// ── CourseManager ─────────────────────────────────────────────────────────────
export default function CourseManager({ courses, onChange }) {
  const [editingId, setEditingId] = useState(null)   // id of course being edited
  const [showAdd, setShowAdd]     = useState(false)

  const atMax = courses.length >= MAX_COURSES

  function addCourse(form) {
    onChange([...courses, { id: makeId(), ...form }])
    setShowAdd(false)
  }

  function updateCourse(id, form) {
    onChange(courses.map(c => c.id === id ? { ...c, ...form } : c))
    setEditingId(null)
  }

  function deleteCourse(id) {
    onChange(courses.filter(c => c.id !== id))
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-ink-800">My Courses</p>
          <p className="text-xs text-ink-400 mt-0.5">
            {courses.length === 0
              ? 'Add your courses to track assignments by class.'
              : `${courses.length} of ${MAX_COURSES} courses`}
          </p>
        </div>
        {!showAdd && !atMax && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                       text-focus-600 bg-focus-50 rounded-lg hover:bg-focus-100
                       transition-colors duration-150"
          >
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M5.5 1.5v8M1.5 5.5h8" stroke="currentColor"
                    strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Add course
          </button>
        )}
        {!showAdd && atMax && (
          <span className="text-xs text-ink-400">Max {MAX_COURSES} reached</span>
        )}
      </div>

      {/* Course list */}
      {courses.length > 0 && (
        <div className="space-y-2 mb-3">
          {courses.map(course =>
            editingId === course.id ? (
              <div key={course.id}
                   className="bg-ink-50/60 border border-ink-200 rounded-xl px-4 py-4">
                <CourseForm
                  initial={{ name: course.name, teacher: course.teacher, schedule: course.schedule }}
                  onSave={form => updateCourse(course.id, form)}
                  onCancel={() => setEditingId(null)}
                  saveLabel="Save changes"
                />
              </div>
            ) : (
              <CourseCard
                key={course.id}
                course={course}
                onEdit={() => { setEditingId(course.id); setShowAdd(false) }}
                onDelete={() => deleteCourse(course.id)}
              />
            )
          )}
        </div>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-ink-50/60 border border-ink-200 rounded-xl px-4 py-4">
          <CourseForm
            onSave={addCourse}
            onCancel={() => setShowAdd(false)}
          />
        </div>
      )}

      {/* Empty state */}
      {courses.length === 0 && !showAdd && (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full py-6 flex flex-col items-center gap-2 border-2 border-dashed
                     border-ink-200 rounded-xl hover:border-focus-300 hover:bg-ink-50/50
                     transition-colors duration-150 cursor-pointer"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8.5" stroke="#c8c4bc" strokeWidth="1.2"/>
            <path d="M10 6.5v7M6.5 10h7" stroke="#c8c4bc" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <span className="text-xs text-ink-400">Add your first course</span>
        </button>
      )}
    </div>
  )
}
