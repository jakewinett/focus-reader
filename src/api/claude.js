// Focus Reader — Anthropic API module (Sprint 9 update)
// All requests route through the /api/claude Edge Function.
// In local dev without a server, falls back to direct browser transport using VITE_ key.
// App.jsx calls setAuthToken() / clearAuthToken() when Clerk auth state changes.

const MODEL   = 'claude-haiku-4-5-20251001'
const IS_PROD = import.meta.env.PROD
const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// ── Module-level auth token (set by App.jsx) ──────────────────────────────────
let _authToken = null

export const setAuthToken   = token => { _authToken = token }
export const clearAuthToken = ()    => { _authToken = null }

// ── Dev fallback: direct browser key (local dev without Clerk/Edge Function) ──
function getDevKey() {
  if (IS_PROD || CLERK_ENABLED) return null
  try {
    const stored = localStorage.getItem('focusreader_api_key')
    if (stored?.trim()) return stored.trim()
  } catch {}
  const env = import.meta.env.VITE_ANTHROPIC_API_KEY
  return (env && env !== 'your_key_here') ? env : null
}

export function isAIAvailable() {
  return navigator.onLine && (IS_PROD || CLERK_ENABLED || !!getDevKey())
}

// ── FR-27: Offline guard ──────────────────────────────────────────────────────
function assertOnline() {
  if (!navigator.onLine) {
    const err = new Error("You're offline. Connect to the internet to use AI features.")
    err.code = 'OFFLINE'
    throw err
  }
}

// ── Shared transport ──────────────────────────────────────────────────────────
async function callClaude({ max_tokens, messages, requestType = 'analyze' }) {
  assertOnline()

  const payload = { model: MODEL, max_tokens, messages }
  const devKey  = getDevKey()

  let res
  if (devKey) {
    // Local dev fallback: direct browser → Anthropic
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': devKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(payload),
    })
  } else {
    // Production / SaaS: always proxy through Edge Function
    const headers = { 'Content-Type': 'application/json', 'x-request-type': requestType }
    if (_authToken) headers['Authorization'] = `Bearer ${_authToken}`
    res = await fetch('/api/claude', { method: 'POST', headers, body: JSON.stringify(payload) })
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    const err  = new Error(body?.error ?? `Claude API error ${res.status}`)
    err.code      = body?.error === 'rate_limit' ? 'RATE_LIMIT' : 'API_ERROR'
    err.status    = res.status
    err.remaining = body?.remaining ?? null
    throw err
  }

  const data      = await res.json()
  const remaining = res.headers.get('x-ai-remaining')
  data._aiRemaining = remaining !== null ? parseInt(remaining, 10) : null
  return data
}

// ── JSON extraction helper ────────────────────────────────────────────────────
function extractJSON(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function analyzeText(lines) {
  if (!isAIAvailable()) return []

  const numbered = lines.map((l, i) => `${i}: ${l}`).join('\n')
  const prompt =
`Identify the logical sections of this text (topics, chapters, thematic breaks).
Return ONLY a JSON array — no explanation, no markdown fences:
[{"title":"...", "startLine": N}, ...]

Rules:
- title: 2–6 words, sentence-case
- startLine: 0-indexed line where the section begins
- First section always starts at 0
- If no clear sections, return: [{"title":"Text","startLine":0}]
- Maximum 8 sections

Text (${lines.length} lines):
${numbered}`

  try {
    const data   = await callClaude({ max_tokens: 512, messages: [{ role: 'user', content: prompt }], requestType: 'analyze' })
    const parsed = JSON.parse(extractJSON(data.content?.[0]?.text ?? ''))
    return { sections: Array.isArray(parsed) ? parsed : [], aiRemaining: data._aiRemaining ?? null }
  } catch { return { sections: [], aiRemaining: null } }
}

export async function generateQuiz(lines, flaggedLines = []) {
  if (!isAIAvailable()) return null

  const numbered      = lines.map((l, i) => `${i}: ${l}`).join('\n')
  const hasFlagged    = flaggedLines.length > 0
  const questionCount = hasFlagged ? 5 : 4
  const flagNote      = hasFlagged
    ? `\n\nThe reader flagged these lines as important: ${flaggedLines.join(', ')}. Include exactly 1–2 questions that test comprehension of those specific lines; set "fromFlag":true on those questions and "fromFlag":false on the rest.`
    : ''

  const prompt =
`Generate exactly ${questionCount} multiple-choice comprehension questions about this text.
Return ONLY a JSON array — no explanation, no markdown fences:
[{"question":"...","options":["A text","B text","C text","D text"],"correctIndex":0,"sourceLine":N,"explanation":"...","fromFlag":false},...]

Rules:
- Test genuine comprehension, not trivial recall
- All 4 options must be plausible
- correctIndex: 0-3 (index into options array)
- sourceLine: 0-indexed line number most relevant to the question
- explanation: 1 sentence explaining why the answer is correct
- fromFlag: boolean${flagNote}

Text (${lines.length} lines):
${numbered}`

  try {
    const data   = await callClaude({ max_tokens: 1280, messages: [{ role: 'user', content: prompt }], requestType: 'quiz' })
    const parsed = JSON.parse(extractJSON(data.content?.[0]?.text ?? ''))
    return {
      questions:    Array.isArray(parsed) && parsed.length ? parsed : null,
      aiRemaining:  data._aiRemaining ?? null,
    }
  } catch { return { questions: null, aiRemaining: null } }
}

export async function parseSyllabus(text) {
  if (!isAIAvailable()) return []

  const today = new Date().toISOString().slice(0, 10)
  const prompt =
`Extract every reading assignment or task that has a due date from this syllabus.
Today's date is ${today} — use it to resolve relative dates like "next Monday" or "Week 3".
Return ONLY a JSON array — no explanation, no markdown fences:
[{"title":"...","course":"...","dueDate":"YYYY-MM-DD"},...]

Rules:
- title: short name for the reading/task (e.g. "Chapter 3: Neurons", "HW 2", "Lab Report 1")
- course: course name or code from the syllabus (e.g. "BIO 101"); empty string if not found
- dueDate: ISO date YYYY-MM-DD
- Omit items with no identifiable due date
- Maximum 30 items

Syllabus text:
${text}`

  try {
    const data   = await callClaude({ max_tokens: 1024, messages: [{ role: 'user', content: prompt }], requestType: 'syllabus' })
    const parsed = JSON.parse(extractJSON(data.content?.[0]?.text ?? ''))
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}
