import { useState, useEffect } from 'react'
import LandingView from './components/LandingView.jsx'
import FocusReader from './components/FocusReader.jsx'
import Dashboard   from './components/Dashboard.jsx'
import { loadAssignments } from './storage/state.js'
import {
  createHistoryRecord,
  saveReadingPosition,
  getHistoryRecord,
} from './storage/history.js'

// View states: 'landing' | 'dashboard' | 'reader'
// Sprint 6: dashboard added.
// Sprint 7: offline banner.
// Sprint 8: reading history (IndexedDB), continue-reading, settings.

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
  const [view, setView]             = useState(() =>
    loadAssignments().length > 0 ? 'dashboard' : 'landing'
  )
  const [inputText, setInputText]   = useState('')
  const [landingTab, setLandingTab] = useState('paste')
  const [isOnline, setIsOnline]     = useState(() => navigator.onLine)

  // Sprint 8: track the active reading session for history save/resume
  const [readingMeta, setReadingMeta] = useState(null)
  // Shape: { sessionId: string, initialLine: number } | null

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

  // ── Reading session handlers ──────────────────────────────────────────────

  // Called by LandingView when user clicks "Start Reading"
  // meta: { source: 'paste'|'pdf'|'docx', fileName: string|null }
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

  // Called by HistoryZone via Dashboard — resume or restart a past session
  async function handleContinueReading(historyId, { fromStart = false } = {}) {
    const record = await getHistoryRecord(historyId)
    if (!record) return
    setInputText(record.rawText)
    setReadingMeta({
      sessionId:   historyId,
      initialLine: fromStart ? 0 : record.lastLine,
    })
    setView('reader')
  }

  // Called by FocusReader's Exit button (and Quiz done/back buttons)
  // pos: { lastLine: number, isComplete: boolean }
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
    // Return to Dashboard if the user came from there; otherwise back to Landing.
    // Landing now shows reading history so it's always a useful destination.
    setView(loadAssignments().length > 0 ? 'dashboard' : 'landing')
  }

  // ── Navigation helpers ────────────────────────────────────────────────────

  function handleGoToLanding(tab = 'paste') {
    setLandingTab(tab)
    setView('landing')
  }

  function handleGoToDashboard() {
    setView('dashboard')
  }

  function handleReParse() {
    handleGoToLanding('schedule')
  }

  return (
    <div className="min-h-screen">
      {!isOnline && <OfflineBanner />}

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
        />
      )}
      {view === 'reader' && (
        <FocusReader
          rawText={inputText}
          onExit={handleExitReader}
          sessionId={readingMeta?.sessionId ?? null}
          initialLine={readingMeta?.initialLine ?? 0}
          onSavePosition={saveReadingPosition}
        />
      )}
    </div>
  )
}
