// Focus Reader — Anthropic API module
// Sprint 3: section chunking + previews.
// Sprint 4: retention quiz generation.
// Sprint 5: syllabus parsing.
// Sprint 7 will replace the direct browser fetch with a Vercel Edge Function proxy.

const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY
const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL   = 'claude-haiku-4-5-20251001'

// Analyses the text and returns logical section boundaries.
// Returns: Promise<Array<{ title: string, startLine: number }>>
// Silently returns [] on any error or missing key so the reader degrades gracefully.
export async function analyzeText(lines) {
  if (!API_KEY || API_KEY === 'your_key_here') return []

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
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return []

    const data = await res.json()
    const raw  = data.content?.[0]?.text ?? ''
    // Strip markdown code fences if present (```json ... ``` or ``` ... ```)
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(stripped)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// Generates 4 multiple-choice retention questions from the text.
// Returns: Promise<Array<{ question, options[4], correctIndex, sourceLine, explanation }>>
// Silently returns null on any error or missing key.
export async function generateQuiz(lines) {
  if (!API_KEY || API_KEY === 'your_key_here') return null

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
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return null

    const data = await res.json()
    const raw  = data.content?.[0]?.text ?? ''
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(stripped)
    return Array.isArray(parsed) && parsed.length ? parsed : null
  } catch {
    return null
  }
}

// Parses a course syllabus and extracts reading assignments with due dates.
// Returns: Promise<Array<{ title, course, dueDate }>> or [] on failure.
export async function parseSyllabus(text) {
  if (!API_KEY || API_KEY === 'your_key_here') return []

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
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) return []

    const data = await res.json()
    const raw  = data.content?.[0]?.text ?? ''
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const parsed = JSON.parse(stripped)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}
