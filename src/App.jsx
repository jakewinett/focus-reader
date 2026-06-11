import { useState, useEffect } from 'react'
import { Analytics } from '@vercel/analytics/react'
import LandingView    from './components/LandingView.jsx'
import FocusReader    from './components/FocusReader.jsx'
import Dashboard      from './components/Dashboard.jsx'
import FlaggedReview  from './components/FlaggedReview.jsx'
import MigrationPrompt from './components/MigrationPrompt.jsx'
import { useAppAuth } from './lib/AuthContext.jsx'
import { setSupabaseToken, SUPABASE_ENABLED } from './lib/supabase.js'
import { setAuthToken, clearAuthToken } from './api/claude.js'
import { hasMigrationBeenOffered, getAnonDocCount } from './lib/auth.js'
import {
  initHistory,
  loadHistory,
  createHistoryRecord,
  saveReadingPosition,
  getHistoryRecord,
} from './storage/history.js'
import { initState, loadAssignments } from './storage/state.js'

// View states: 'landing' | 'dashboard' | 'reader' | 'review'
// Sprint 9: Clerk auth, Supabase cloud storage, anonymous session limits.

// ── Offline banner ────────────────────────────────────────────────────────────
function OfflineBanner() {
  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-50 flex items-center justify-center gap-2
                 bg-ink-800 text-white text-xs font-medium py-2 px-4 animate-slide-down"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="shrink-0">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M6 3.5v3M6 8h.01" stroke="currentColor" strokeWidth="1.2"
              strokeLinecap="round"/>
      </svg>
      You're offline — AI features (section analysis, quiz, syllabus parsing) won't work until
      you reconnect.
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { isLoaded, isSignedIn, userId, getToken } = useAppAuth()

  const [view, setView]               = useState('landing')
  const [inputText, setInputText]     = useState('')
  const [landingTab, setLandingTab]   = useState('paste')
  const [isOnline, setIsOnline]       = useState(() => navigator.onLine)
  const [readingMeta, setReadingMeta] = useState(null)
  // Shape: { sessionId: string, initialLine: number } | null

  // Sprint 9: migration prompt state
  const [showMigration, setShowMigration]       = useState(false)
  const [localSessionCount, setLocalSessionCount] = useState(0)

  // Set initial view after async assignment load
  useEffect(() => {
    if (!isLoaded) return
    loadAssignments().then(a => {
      setView(a.length > 0 ? 'dashboard' : 'landing')
    })
  }, [isLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  // FR-27: online/offline listener
  useEffect(() => {
    const handleOnline  = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online',  handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online',  handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Sprint 9: wire auth tokens and initialise storage when sign-in state changes
  useEffect(() => {
    if (!isLoaded) return

    if (isSignedIn && userId) {
      // Refresh Supabase session token and pass to API module
      getToken({ template: 'supabase' }).then(token => {
        if (token) {
          setSupabaseToken(token)
          setAuthToken(token)
        }
      })
      initHistory(userId)
      initState(userId)

      // Show migration prompt once if local sessions exist and haven't been offered
      if (SUPABASE_ENABLED && !hasMigrationBeenOffered()) {
        loadHistory({ localOnly: true }).then(records => {
          if (records.length > 0) {
            setLocalSessionCount(records.length)
            setShowMigration(true)
          }
        })
      }
    } else {
      clearAuthToken()
      initHistory(null)
      initState(null)
    }
  }, [isLoaded, isSignedIn, userId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Reading session handlers ──────────────────────────────────────────────

  async function handleStartReading(text, meta = {}) {
    const sessionId = await createHistoryRecord({
      rawText:  text,
      source:   meta.source   ?? 'paste',
      fileName: meta.fileName ?? null,
    })
    setInputText(text)
    setReadingMeta({ sessionId, initialLine: 0 })
    setView('reader')
  }

  async function handleContinueReading(historyId, { fromStart = false } = {}) {
    const record = await getHistoryRecord(historyId)
    if (!record) return
    setInputText(record.rawText)
    setReadingMeta({
      sessionId:           historyId,
      initialLine:         fromStart ? 0 : record.lastLine,
      initialFlaggedLines: record.flaggedLines ?? [],
    })
    setView('reader')
  }

  async function handleExitReader(pos = {}) {
    if (readingMeta?.sessionId && pos.lastLine != null) {
      await saveReadingPosition({
        id:         readingMeta.sessionId,
        lastLine:   pos.lastLine,
        isComplete: pos.isComplete ?? false,
      })
    }
    setInputText('')
    setReadingMeta(null)
    loadAssignments().then(a => setView(a.length > 0 ? 'dashboard' : 'landing'))
  }

  // ── Navigation helpers ────────────────────────────────────────────────────

  function handleGoToLanding(tab = 'paste') {
    setLandingTab(tab)
    setView('landing')
  }

  function handleGoToDashboard() { setView('dashboard') }
  function handleViewFlagged()   { setView('review') }
  function handleReParse()       { handleGoToLanding('schedule') }

  // Hold render until Clerk resolves auth (avoids flash of wrong view)
  if (!isLoaded) return null

  return (
    <div className="min-h-screen">
      <Analytics />
      {!isOnline && <OfflineBanner />}

      {showMigration && (
        <MigrationPrompt
          userId={userId}
          localCount={localSessionCount}
          onDone={() => setShowMigration(false)}
        />
      )}

      {view === 'landing' && (
        <LandingView
          onStartReading={handleStartReading}
          initialTab={landingTab}
          onBack={handleGoToDashboard}
          onContinueReading={handleContinueReading}
        />
      )}
      {view === 'dashboard' && (
        <Dashboard
          onGoToLanding={() => handleGoToLanding('paste')}
          onStartReading={() => handleGoToLanding('paste')}
          onReParse={handleReParse}
          onContinueReading={handleContinueReading}
          onViewFlagged={handleViewFlagged}
        />
      )}
      {view === 'reader' && (
        <FocusReader
          rawText={inputText}
          onExit={handleExitReader}
          sessionId={readingMeta?.sessionId ?? null}
          initialLine={readingMeta?.initialLine ?? 0}
          initialFlaggedLines={readingMeta?.initialFlaggedLines ?? []}
          onSavePosition={saveReadingPosition}
        />
      )}
      {view === 'review' && (
        <FlaggedReview onBack={handleGoToDashboard} />
      )}
    </div>
  )
}
