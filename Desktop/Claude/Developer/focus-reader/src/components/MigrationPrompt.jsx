// One-time dialog shown after first sign-in when the user has local reading sessions.
// Offers to import IndexedDB sessions into Supabase cloud storage.

import { useState } from 'react'
import { supabase, SUPABASE_ENABLED } from '../lib/supabase.js'
import { loadHistory, deleteHistoryRecord } from '../storage/history.js'
import { markMigrationOffered, clearAnonCounts } from '../lib/auth.js'

async function migrateToCloud(userId) {
  if (!SUPABASE_ENABLED || !userId || !supabase) return 0
  // loadHistory() with no userId returns local IndexedDB records
  const records = await loadHistory({ localOnly: true })
  if (!records.length) return 0

  let migrated = 0
  for (const r of records) {
    const { error } = await supabase.from('reading_sessions').insert({
      id:           r.id,
      user_id:      userId,
      title:        r.title,
      source:       r.source,
      file_name:    r.fileName,
      raw_text:     r.rawText,
      word_count:   r.wordCount,
      total_lines:  r.totalLines,
      last_line:    r.lastLine,
      is_complete:  r.isComplete,
      opened_at:    new Date(r.openedAt).toISOString(),
      last_read_at: new Date(r.lastReadAt).toISOString(),
    })
    if (!error) {
      await deleteHistoryRecord(r.id, { localOnly: true })
      migrated++
    }
  }
  return migrated
}

export default function MigrationPrompt({ userId, localCount, onDone }) {
  const [status, setStatus] = useState('idle') // 'idle' | 'migrating' | 'done'
  const [migrated, setMigrated] = useState(0)

  async function handleImport() {
    setStatus('migrating')
    const n = await migrateToCloud(userId)
    setMigrated(n)
    clearAnonCounts()
    markMigrationOffered()
    setStatus('done')
  }

  function handleSkip() {
    markMigrationOffered()
    onDone?.()
  }

  if (status === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6 text-center animate-slide-up">
          <div className="w-10 h-10 rounded-xl bg-sage-100 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-sage-600">
              <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.6l7.3-7.3a1 1 0 0 1 1.4 0Z" fill="currentColor"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-ink-900 mb-1">
            Imported {migrated} session{migrated !== 1 ? 's' : ''}
          </h2>
          <p className="text-sm text-ink-500 mb-4">
            Your reading history is now synced to your account.
          </p>
          <button
            onClick={onDone}
            className="px-4 py-2 bg-focus-600 text-white text-sm font-medium
                       rounded-xl hover:bg-focus-700 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6 animate-slide-up">
        <h2 className="text-base font-semibold text-ink-900 mb-1">
          Import your local sessions?
        </h2>
        <p className="text-sm text-ink-500 mb-5">
          You have {localCount} reading session{localCount !== 1 ? 's' : ''} saved on this device.
          Import them to your account to access them from any device.
        </p>
        <div className="space-y-2">
          <button
            onClick={handleImport}
            disabled={status === 'migrating'}
            className="w-full px-4 py-2.5 bg-focus-600 text-white text-sm font-medium
                       rounded-xl hover:bg-focus-700 disabled:opacity-50
                       active:scale-95 transition-all duration-150"
          >
            {status === 'migrating' ? 'Importing…' : `Import ${localCount} session${localCount !== 1 ? 's' : ''}`}
          </button>
          <button
            onClick={handleSkip}
            className="w-full px-4 py-2.5 bg-ink-50 text-ink-600 text-sm font-medium
                       rounded-xl hover:bg-ink-100 transition-colors"
          >
            Skip, start fresh
          </button>
        </div>
      </div>
    </div>
  )
}
