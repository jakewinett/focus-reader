// Text processing utilities for Focus Reader
// All functions are pure — no side effects, no API calls.

// Split raw text into an array of non-empty lines.
// Preserves paragraph breaks as empty-line separators for visual rhythm.
export function parseLines(rawText) {
  if (!rawText || typeof rawText !== 'string') return []

  return rawText
    .split('\n')
    .map(line => line.trimEnd())        // remove trailing whitespace
    .filter((line, i, arr) => {
      // Remove consecutive blank lines — keep at most one
      if (line === '') {
        return i === 0 || arr[i - 1] !== ''
      }
      return true
    })
    .filter((line, i, arr) => {
      // Remove leading/trailing blank lines
      if (i === 0 || i === arr.length - 1) return line !== ''
      return true
    })
}

// Count words in a string.
export function countWords(text) {
  if (!text || typeof text !== 'string') return 0
  return text.trim().split(/\s+/).filter(Boolean).length
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
