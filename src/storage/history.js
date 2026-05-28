// Focus Reader — Reading History (Sprint 8)
// Persists reading sessions in IndexedDB so students can resume or re-read documents
// across browser sessions. IndexedDB is used (not localStorage) because document text
// can be 100–200 KB and we may store up to 20 items.

import { openDB as idbOpenDB } from 'idb'

const DB_NAME    = 'focusreader_history'
const STORE_NAME = 'readings'
const DB_VERSION = 1
const MAX_ITEMS  = 20

// ── Database connection ───────────────────────────────────────────────────────
const dbPromise = idbOpenDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    store.createIndex('lastReadAt', 'lastReadAt')
  },
})

// ── Title derivation ──────────────────────────────────────────────────────────
function deriveTitle(rawText, source, fileName) {
  // PDF / DOCX: use filename without extension
  if (fileName) {
    return fileName.replace(/\.[^.]+$/, '')
  }
  // Paste: use first non-blank line, truncated to 60 chars at a word boundary
  const firstLine = rawText
    .split('\n')
    .map(l => l.trim())
    .find(l => l.length >= 10)
  if (firstLine) {
    if (firstLine.length <= 60) return firstLine
    const cut = firstLine.slice(0, 60)
    const lastSpace = cut.lastIndexOf(' ')
    return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + '…'
  }
  // Fallback
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Paste — ${date}`
}

// ── Line / word count helpers ─────────────────────────────────────────────────
function countLines(rawText) {
  // Same logic as parseLines in textUtils.js — counts after deduplicating blanks
  const lines = rawText.split('\n').map(l => l.trimEnd())
  const deduped = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '' && deduped[deduped.length - 1] === '') continue
    deduped.push(lines[i])
  }
  // Strip leading/trailing blank lines
  while (deduped.length && deduped[0] === '') deduped.shift()
  while (deduped.length && deduped[deduped.length - 1] === '') deduped.pop()
  return deduped.length
}

function countWords(rawText) {
  return rawText.trim().split(/\s+/).filter(Boolean).length
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Create a new history record when a reading session starts.
 * Returns the new record id (UUID).
 */
export async function createHistoryRecord({ rawText, source = 'paste', fileName = null }) {
  const db = await dbPromise
  const now = Date.now()
  const id  = crypto.randomUUID()

  const record = {
    id,
    title:      deriveTitle(rawText, source, fileName),
    source,
    fileName,
    rawText,
    wordCount:  countWords(rawText),
    totalLines: countLines(rawText),
    openedAt:   now,
    lastReadAt: now,
    lastLine:   0,
    isComplete: false,
  }

  await db.put(STORE_NAME, record)

  // Prune oldest items if we exceed MAX_ITEMS
  const all = await db.getAllFromIndex(STORE_NAME, 'lastReadAt')
  if (all.length > MAX_ITEMS) {
    // all is sorted ASC by lastReadAt — delete the oldest ones
    const toDelete = all.slice(0, all.length - MAX_ITEMS)
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await Promise.all(toDelete.map(r => tx.store.delete(r.id)))
    await tx.done
  }

  return id
}

/**
 * Update reading position and completion state.
 * Called debounced during reading and on reader exit.
 */
export async function saveReadingPosition({ id, lastLine, isComplete = false }) {
  const db = await dbPromise
  const record = await db.get(STORE_NAME, id)
  if (!record) return
  await db.put(STORE_NAME, {
    ...record,
    lastLine,
    isComplete,
    lastReadAt: Date.now(),
  })
}

/**
 * Load all history records sorted by lastReadAt DESC, capped at MAX_ITEMS.
 */
export async function loadHistory() {
  const db  = await dbPromise
  const all = await db.getAllFromIndex(STORE_NAME, 'lastReadAt')
  return all.reverse().slice(0, MAX_ITEMS)
}

/**
 * Load a single record by id (for "Continue Reading").
 * Returns null if not found.
 */
export async function getHistoryRecord(id) {
  const db = await dbPromise
  return (await db.get(STORE_NAME, id)) ?? null
}

/**
 * Delete a single record by id.
 */
export async function deleteHistoryRecord(id) {
  const db = await dbPromise
  await db.delete(STORE_NAME, id)
}

/**
 * Wipe the entire readings store.
 */
export async function clearHistory() {
  const db = await dbPromise
  await db.clear(STORE_NAME)
}
