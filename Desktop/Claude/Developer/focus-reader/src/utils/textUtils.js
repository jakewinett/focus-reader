// Text processing utilities for Focus Reader
// All functions are pure — no side effects, no API calls.

// Split raw text into an array of lines.
// Lines starting with § are "block lines" — consecutive § lines are grouped
// into a single array entry so FocusReader can render them as a block card.
// Non-block logic: preserves paragraph breaks, collapses consecutive blanks.
//
// Block entry format:  "§First line\nSecond line\nThird line\n..."
// (The § prefix marks the whole entry; content follows after slicing it off.)
export function parseLines(rawText) {
  if (!rawText || typeof rawText !== 'string') return []

  const raw = rawText.split('\n').map(l => l.trimEnd())
  const out = []
  let i = 0

  while (i < raw.length) {
    const line = raw[i]

    // ── Block group: collect consecutive § lines ─────────────────
    if (line.startsWith('§')) {
      const blockItems = []
      while (i < raw.length && raw[i].startsWith('§')) {
        blockItems.push(raw[i].slice(1).trimStart())
        i++
      }
      out.push('§' + blockItems.join('\n'))
      continue
    }

    // ── Blank line: keep at most one ─────────────────────────────
    if (line === '') {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('')
      i++; continue
    }

    // ── Regular line ─────────────────────────────────────────────
    out.push(line)
    i++
  }

  // Trim leading / trailing blank entries
  while (out.length > 0 && out[0] === '')            out.shift()
  while (out.length > 0 && out[out.length - 1] === '') out.pop()

  return out
}

// Count words in a string.
// Block lines (§-prefixed) have the marker stripped before counting;
// embedded \n within a block entry counts as whitespace naturally.
export function countWords(text) {
  if (!text || typeof text !== 'string') return 0
  const t = text.startsWith('§') ? text.slice(1) : text
  return t.trim().split(/\s+/).filter(Boolean).length
}

// Count total words across all lines.
export function countTotalWords(lines) {
  return lines.reduce((sum, line) => sum + countWords(line), 0)
}

// Calculate percentage complete given current line index and total lines.
// Returns integer 0–100.
export function calcProgress(currentIndex, totalLines) {
  if (totalLines === 0) return 0
  return Math.round(((currentIndex + 1) / totalLines) * 100)
}

// Format minutes into a human-readable string.
// < 1 min → "< 1 min"
// 1–59 min → "X min"
// 60+ min → "X hr Y min"
export function formatMinutes(minutes) {
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${minutes} min`
  const hrs  = Math.floor(minutes / 60)
  const mins = minutes % 60
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`
}

// Determine if a line is a paragraph separator (blank line).
export function isBlankLine(line) {
  return line.trim() === ''
}

// Estimate pages from word count (250 words per page is standard).
export function wordsToPages(wordCount) {
  return Math.ceil(wordCount / 250)
}

// Group lines into paragraphs (runs of non-blank lines separated by blank lines).
// Returns: Array<{ startLine: number, endLine: number }>
export function parseParagraphs(lines) {
  const paragraphs = []
  let start = null
  for (let i = 0; i < lines.length; i++) {
    const blank = lines[i].trim() === ''
    if (!blank && start === null) {
      start = i
    } else if (blank && start !== null) {
      paragraphs.push({ startLine: start, endLine: i - 1 })
      start = null
    }
  }
  if (start !== null) paragraphs.push({ startLine: start, endLine: lines.length - 1 })
  return paragraphs
}
