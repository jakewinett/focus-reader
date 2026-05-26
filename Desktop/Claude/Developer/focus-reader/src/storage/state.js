// Focus Reader — localStorage schema wrapper
// Sprint 5: assignment schedule persistence.
// Sprint 6+: course roster persistence.

const SCHEDULE_KEY = 'focusreader_schedule'
const COURSES_KEY  = 'focusreader_courses'

// Assignment schema:
// { id: string, title: string, course: string, dueDate: string (YYYY-MM-DD),
//   status: 'pending' | 'done' }

// Course schema:
// { id: string, name: string, teacher: string, schedule: string }
// name     — short code or title, e.g. "BIO 201" (required)
// teacher  — instructor name, e.g. "Prof. Smith" (optional)
// schedule — days/time string, e.g. "MWF 10:00–11:15 AM" (optional)
// Max 6 courses enforced at the UI layer.

export function loadAssignments() {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveAssignments(assignments) {
  try {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(assignments))
  } catch {
    // localStorage unavailable — silently continue
  }
}

export function clearAssignments() {
  try {
    localStorage.removeItem(SCHEDULE_KEY)
  } catch {
    // silently continue
  }
}

// ── Courses ──────────────────────────────────────────────────────────────────

export function loadCourses() {
  try {
    const raw = localStorage.getItem(COURSES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveCourses(courses) {
  try {
    localStorage.setItem(COURSES_KEY, JSON.stringify(courses))
  } catch {
    // localStorage unavailable — silently continue
  }
}

export function clearCourses() {
  try {
    localStorage.removeItem(COURSES_KEY)
  } catch {
    // silently continue
  }
}
