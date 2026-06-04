// Focus Reader — Assignment & Course persistence (Sprint 5 / Sprint 9)
// Sprint 9: Dual-mode — authenticated users read/write Supabase; anon uses localStorage.
//   Call initState(userId) from App.jsx whenever auth state changes.
//   All functions are async for a uniform API (localStorage calls resolve immediately).

import { supabase, SUPABASE_ENABLED } from '../lib/supabase.js'

const SCHEDULE_KEY = 'focusreader_schedule'
const COURSES_KEY  = 'focusreader_courses'

// ── Auth state ────────────────────────────────────────────────────────────────
let _userId = null

export function initState(userId) {
  _userId = userId ?? null
}

function isCloud() {
  return !!(SUPABASE_ENABLED && _userId && supabase)
}

// ── Assignment schema ─────────────────────────────────────────────────────────
// { id, title, course, dueDate (YYYY-MM-DD), status: 'pending'|'done' }

export async function loadAssignments() {
  if (isCloud()) {
    const { data, error } = await supabase
      .from('assignments')
      .select('id,title,course,due_date,status')
      .eq('user_id', _userId)
      .order('due_date', { ascending: true })
    if (error || !data) return []
    return data.map(r => ({
      id:      r.id,
      title:   r.title,
      course:  r.course ?? '',
      dueDate: r.due_date,
      status:  r.status,
    }))
  }
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export async function saveAssignments(assignments) {
  if (isCloud()) {
    // Upsert all assignments — delete removed ones first
    await supabase.from('assignments').delete().eq('user_id', _userId)
    if (assignments.length > 0) {
      await supabase.from('assignments').insert(
        assignments.map(a => ({
          id:       a.id,
          user_id:  _userId,
          title:    a.title,
          course:   a.course ?? null,
          due_date: a.dueDate ?? null,
          status:   a.status ?? 'pending',
        }))
      )
    }
    return
  }
  try { localStorage.setItem(SCHEDULE_KEY, JSON.stringify(assignments)) } catch {}
}

export async function clearAssignments() {
  if (isCloud()) {
    await supabase.from('assignments').delete().eq('user_id', _userId)
    return
  }
  try { localStorage.removeItem(SCHEDULE_KEY) } catch {}
}

// ── Course schema ─────────────────────────────────────────────────────────────
// { id, name, teacher?, schedule? }

export async function loadCourses() {
  if (isCloud()) {
    const { data, error } = await supabase
      .from('courses')
      .select('id,name,teacher,schedule')
      .eq('user_id', _userId)
      .order('name', { ascending: true })
    if (error || !data) return []
    return data.map(r => ({
      id:       r.id,
      name:     r.name,
      teacher:  r.teacher ?? '',
      schedule: r.schedule ?? '',
    }))
  }
  try {
    const raw = localStorage.getItem(COURSES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

export async function saveCourses(courses) {
  if (isCloud()) {
    await supabase.from('courses').delete().eq('user_id', _userId)
    if (courses.length > 0) {
      await supabase.from('courses').insert(
        courses.map(c => ({
          id:       c.id,
          user_id:  _userId,
          name:     c.name,
          teacher:  c.teacher ?? null,
          schedule: c.schedule ?? null,
        }))
      )
    }
    return
  }
  try { localStorage.setItem(COURSES_KEY, JSON.stringify(courses)) } catch {}
}

export async function clearCourses() {
  if (isCloud()) {
    await supabase.from('courses').delete().eq('user_id', _userId)
    return
  }
  try { localStorage.removeItem(COURSES_KEY) } catch {}
}
