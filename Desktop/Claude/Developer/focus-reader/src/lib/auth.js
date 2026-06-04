// Focus Reader — anonymous session helpers
// Tracks doc count and AI usage for users who haven't signed in.
// All counters live in localStorage and are cleared after cloud migration.

const ANON_DOC_KEY  = 'focusreader_anon_count'
const ANON_AI_KEY   = 'focusreader_anon_ai_count'
const MIGRATION_KEY = 'focusreader_migration_offered'

export const ANON_DOC_LIMIT = Number(import.meta.env.VITE_ANON_DOC_LIMIT ?? 3)
export const ANON_AI_LIMIT  = Number(import.meta.env.VITE_ANON_AI_LIMIT  ?? 3)

function read(key) {
  try { return Math.max(0, parseInt(localStorage.getItem(key) ?? '0', 10) || 0) } catch { return 0 }
}
function write(key, n) {
  try { localStorage.setItem(key, String(n)) } catch {}
}

export const getAnonDocCount  = () => read(ANON_DOC_KEY)
export const getAnonAICount   = () => read(ANON_AI_KEY)
export const incrementAnonDoc = () => write(ANON_DOC_KEY, getAnonDocCount() + 1)
export const incrementAnonAI  = () => write(ANON_AI_KEY,  getAnonAICount()  + 1)

// Migration offer tracking — show the import prompt once after first sign-in
export const hasMigrationBeenOffered = () => {
  try { return localStorage.getItem(MIGRATION_KEY) !== null } catch { return false }
}
export const markMigrationOffered = () => {
  try { localStorage.setItem(MIGRATION_KEY, '1') } catch {}
}

// Called after a successful cloud migration or on sign-out
export const clearAnonCounts = () => {
  try {
    localStorage.removeItem(ANON_DOC_KEY)
    localStorage.removeItem(ANON_AI_KEY)
  } catch {}
}
