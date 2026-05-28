// Focus Reader — Anthropic API module
// Sprint 3: section chunking + previews.
// Sprint 4: retention quiz generation.
// Sprint 5: syllabus parsing.
// Sprint 7: navigator.onLine guard (FR-27) + Vercel Edge Function proxy (FR-25).

const MODEL   = 'claude-haiku-4-5-20251001'
const IS_PROD = import.meta.env.PROD

// Two transport modes:
//
//  Key present (dev env var OR user-entered key in Settings):
//    Browser → Anthropic directly, using the dangerous-direct-browser-access header.
//
//  No key + production (Vercel):
//    Browser → /api/claude (Edge Function) → Anthropic
//    ANTHROPIC_API_KEY is set in the Vercel dashboard (server-side only).
//
// In either mode the app degrades gracefully when neither transport is available.

// Sprint 8: read the API key dynamically at call time so a key entered via the
// in-app Settings panel takes effect without a page reload.
function getApiKey() {
  try {
    const stored = localStorage.getItem('focusreader_api_key')
    if (stored?.trim()) return stored.trim()
  } catch { /* localStorage blocked (e.g. private browsing with strict settings) */ }
  const env = import.meta.env.VITE_ANTHROPIC_API_KEY
  return (env && env !== 'your_key_here') ? env : null
}

// Returns true when at least one transport path is available.
function canCallAPI() {
  return Boolean(getApiKey()) || IS_PROD
}

// ── FR-27: Offline guard ──────────────────────────────────────────────────────
// Throws a typed error when the browser reports no network.
// App.jsx listens for this to show a visible offline banner.
function assertOnline() {
  if (!navigator.onLine) {
    const err = new Error(
      "You're offline. Connect to the internet to use AI features."
    )
    err.code = 'OFFLINE'
    throw err
  }
}

// ── Shared transport ──────────────────────────────────────────────────────────
async function callClaude({ max_tokens, messages }) {
  assertOnline()

  const payload = { model: MODEL, max_tokens, messages }
  const userKey = getApiKey()

  let res
  if (userKey) {
    // Direct browser → Anthropic (dev env var or user-entered key from Settings)
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': userKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(payload),
    })
  } else {
    // Prod: browser → Vercel Edge Function proxy at /api/claude
    res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  }

  if (!res.ok) {
    const err = new Error(`Claude API error ${res.status}`)
    err.code = 'API_ERROR'
    err.status = res.status
    throw err
  }

  return res.json()
}

// ── JSON extraction helper ────────────────────────────────────────────────────
function extractJSON(text) {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
}

// ── Public API ────────────────────────────────────────────────────────────────

// Analyses the text and returns logical section boundaries.
// Returns: Promise<Array<{ title: string, startLine: number }>>
// Returns [] when no API transport is available.
export async function analyzeText(lines) {
  if (!canCallAPI()) return []

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
    const data   = await callClaude({ max_tokens: 512, messages: [{ role: 'user', content: prompt }] })
    const parsed = JSON.parse(extractJSON(data.content?.[0]?.text ?? ''))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Generates 4 multiple-choice retention questions from the text.
// Returns: Promise<Array<{ question, options[4], correctIndex, sourceLine, explanation }>>
// Returns null when no API transport is available.
export async function generateQuiz(lines) {
  if (!canCallAPI()) return null

  const numbered = lines.map((l, i) => `${i}: ${l}`).join('\n')

  const prompt =
`Generate exactly 4 multiple-choice comprehension questions about this text.
Return ONLY a JSON array — no explanation, no markdown fences:
[{"question":"...","options":["A text","B text","C text","D text"],"correctIndex":0,"sourceLine":N,"explanation":"..."},...]

Rules:
- Test genuine comprehension, not trivial recall
- All 4 options must be plausible
- correctIndex: 0-3 (index into options array)
- sourceLine: 0-indexed line number most relevant to the question
- explanation: 1 sentence explaining why the answer is correct

Text (${lines.length} lines):
${numbered}`

  try {
    const data   = await callClaude({ max_tokens: 1024, messages: [{ role: 'user', content: prompt }] })
    const parsed = JSON.parse(extractJSON(data.content?.[0]?.text ?? ''))
    return Array.isArray(parsed) && parsed.length ? parsed : null
  } catch {
    return null
  }
}

// Parses a course syllabus and extracts reading assignments with due dates.
// Returns: Promise<Array<{ title, course, dueDate }>> or [] on failure.
export async function parseSyllabus(text) {
  if (!canCallAPI()) return []

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
    const data   = await callClaude({ max_tokens: 1024, messages: [{ role: 'user', content: prompt }] })
    const parsed = JSON.parse(extractJSON(data.content?.[0]?.text ?? ''))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
