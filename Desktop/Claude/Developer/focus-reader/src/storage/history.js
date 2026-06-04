// Focus Reader — Reading History (Sprint 8 / Sprint 9)
// Sprint 8: IndexedDB persistence for anonymous / local sessions.
// Sprint 9: Dual-mode — authenticated users read/write Supabase; anon uses IndexedDB.
//   Call initHistory(userId) from App.jsx whenever auth state changes.
//   All exported functions accept an optional { localOnly } flag for the migration helper.

import { openDB as idbOpenDB } from 'idb'
import { supabase, SUPABASE_ENABLED } from '../lib/supabase.js'

// ── IndexedDB setup ───────────────────────────────────────────────────────────
const DB_NAME    = 'focusreader_history'
const STORE_NAME = 'readings'
const DB_VERSION = 1
const MAX_ITEMS  = 20

const dbPromise = idbOpenDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
    store.createIndex('lastReadAt', 'lastReadAt')
  },
})

// ── Auth state ────────────────────────────────────────────────────────────────
// Set by App.jsx on sign-in / sign-out; null = anonymous mode
let _userId = null

export function initHistory(userId) {
  _userId = userId ?? null
}

function isCloud() {
  return !!(SUPABASE_ENABLED && _userId && supabase)
}

// ── Title / count helpers ─────────────────────────────────────────────────────
function deriveTitle(rawText, source, fileName) {
  if (fileName) return fileName.replace(/\.[^.]+$/, '')
  const firstLine = rawText.split('\n').map(l => l.trim()).find(l => l.length >= 10)
  if (firstLine) {
    if (firstLine.length <= 60) return firstLine
    const cut = firstLine.slice(0, 60)
    const lastSpace = cut.lastIndexOf(' ')
    return (lastSpace > 20 ? cut.slice(0, lastSpace) : cut) + '…'
  }
  const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `Paste — ${date}`
}

function countLines(rawText) {
  const lines = rawText.split('\n').map(l => l.trimEnd())
  const deduped = []
  for (const line of lines) {
    if (line === '' && deduped[deduped.length - 1] === '') continue
    deduped.push(line)
  }
  while (deduped.length && deduped[0] === '') deduped.shift()
  while (deduped.length && deduped[deduped.length - 1] === '') deduped.pop()
  return deduped.length
}

function countWords(rawText) {
  return rawText.trim().split(/\s+/).filter(Boolean).length
}

// ── Supabase ↔ app record mapping ─────────────────────────────────────────────
function fromRow(row) {
  return {
    id:         row.id,
    title:      row.title,
    source:     row.source,
    fileName:   row.file_name,
    rawText:    row.raw_text,
    wordCount:  row.word_count,
    totalLines: row.total_lines,
    openedAt:   new Date(row.opened_at).getTime(),
    lastReadAt: new Date(row.last_read_at).getTime(),
    lastLine:   row.last_line,
    isComplete: row.is_complete,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function createHistoryRecord({ rawText, source = 'paste', fileName = null }) {
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

  if (isCloud()) {
    await supabase.from('reading_sessions').insert({
      id,
      user_id:      _userId,
      title:        record.title,
      source:       record.source,
      file_name:    record.fileName,
      raw_text:     record.rawText,
      word_count:   record.wordCount,
      total_lines:  record.totalLines,
      last_line:    0,
      is_complete:  false,
      opened_at:    new Date(now).toISOString(),
      last_read_at: new Date(now).toISOString(),
    })
    return id
  }

  // Anonymous: IndexedDB
  const db = await dbPromise
  await db.put(STORE_NAME, record)
  const all = await db.getAllFromIndex(STORE_NAME, 'lastReadAt')
  if (all.length > MAX_ITEMS) {
    const toDelete = all.slice(0, all.length - MAX_ITEMS)
    const tx = db.transaction(STORE_NAME, 'readwrite')
    await Promise.all(toDelete.map(r => tx.store.delete(r.id)))
    await tx.done
  }
  return id
}

export async function saveReadingPosition({ id, lastLine, isComplete = false }) {
  if (isCloud()) {
    await supabase.from('reading_sessions')
      .update({ last_line: lastLine, is_complete: isComplete, last_read_at: new Date().toISOString() })
      .eq('id', id)
    return
  }
  const db = await dbPromise
  const record = await db.get(STORE_NAME, id)
  if (!record) return
  await db.put(STORE_NAME, { ...record, lastLine, isComplete, lastReadAt: Date.now() })
}

// localOnly: true forces IndexedDB (used by MigrationPrompt)
export async function loadHistory({ localOnly = false } = {}) {
  if (isCloud() && !localOnly) {
    const { data, error } = await supabase
      .from('reading_sessions')
      .select('id,title,source,file_name,word_count,total_lines,last_line,is_complete,opened_at,last_read_at')
      .order('last_read_at', { ascending: false })
      .limit(MAX_ITEMS)
    if (error || !data) return []
    return data.map(fromRow)
  }
  const db  = await dbPromise
  const all = await db.getAllFromIndex(STORE_NAME, 'lastReadAt')
  return all.reverse().slice(0, MAX_ITEMS)
}

export async function getHistoryRecord(id) {
  if (isCloud()) {
    const { data } = await supabase
      .from('reading_sessions')
      .select('*')
      .eq('id', id)
      .single()
    return data ? fromRow(data) : null
  }
  const db = await dbPromise
  return (await db.get(STORE_NAME, id)) ?? null
}

// localOnly: true forces IndexedDB delete (used by MigrationPrompt)
export async function deleteHistoryRecord(id, { localOnly = false } = {}) {
  if (isCloud() && !localOnly) {
    await supabase.from('reading_sessions').delete().eq('id', id)
    return
  }
  const db = await dbPromise
  await db.delete(STORE_NAME, id)
}

export async function clearHistory() {
  if (isCloud()) {
    await supabase.from('reading_sessions').delete().eq('user_id', _userId)
    return
  }
  const db = await dbPromise
  await db.clear(STORE_NAME)
}
