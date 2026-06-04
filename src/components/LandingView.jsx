import { useState, useEffect, useRef } from 'react'
import { UserButton } from '@clerk/clerk-react'
import { extractFromPDF, extractFromDOCX } from '../utils/fileUtils.js'
import { loadAssignments, saveAssignments, clearAssignments,
         loadCourses, saveCourses } from '../storage/state.js'
import { loadHistory } from '../storage/history.js'
import { useAppAuth } from '../lib/AuthContext.jsx'
import {
  getAnonDocCount, incrementAnonDoc,
  ANON_DOC_LIMIT,
} from '../lib/auth.js'
import AuthGate from './AuthGate.jsx'
import SyllabusParser from './SyllabusParser.jsx'
import TodayView from './TodayView.jsx'
import CourseManager from './CourseManager.jsx'
import SettingsModal from './SettingsModal.jsx'

const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

// Sprint 1: text paste only.
// Sprint 2: PDF/DOCX file upload via unified input handler.
// Sprint 5: My Schedule tab — syllabus parser + today view.
// Sprint 6+: CourseManager embedded in My Schedule tab.
// Sprint 8: pass file metadata to onStartReading; gear icon for Settings.

const PLACEHOLDER = `Paste your reading here — an article, textbook chapter, PDF text, or anything you need to get through.

Focus Reader will highlight one line at a time so you can move through it without losing your place. When you're done, you'll get a short quiz to check what you retained.

Paste anything above this line and hit Start Reading.`

export default function LandingView({ onStartReading, initialTab = 'paste', onBack = null, onContinueReading = null }) {
  const { isSignedIn } = useAppAuth()

  const [text, setText]             = useState('')
  const [error, setError]           = useState('')
  const [inputMode, setInputMode]   = useState(initialTab)  // 'paste' | 'upload' | 'schedule'
  const [assignments, setAssignments] = useState([])
  const [courses, setCourses]         = useState([])
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAuthGate, setShowAuthGate] = useState(false)
  // Sprint 8: track uploaded filename so we can pass it to history
  const [uploadedFileName, setUploadedFileName] = useState(null)
  // Recent reading history loaded from IndexedDB / Supabase on mount
  const [recentReadings, setRecentReadings] = useState(null) // null = loading, [] = empty
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadAssignments().then(setAssignments)
    loadCourses().then(setCourses)
    loadHistory()
      .then(records => setRecentReadings(records.slice(0, 3)))
      .catch(() => setRecentReadings([]))
  }, [])

  function handleStart() {
    const trimmed = text.trim()
    if (trimmed.length < 50) {
      setError('Paste at least a paragraph of text to get started.')
      textareaRef.current?.focus()
      return
    }
    setError('')

    // Sprint 9: enforce anonymous session limit when Clerk is configured
    if (CLERK_ENABLED && !isSignedIn) {
      if (getAnonDocCount() >= ANON_DOC_LIMIT) {
        setShowAuthGate(true)
        return
      }
      incrementAnonDoc()
    }

    onStartReading(trimmed, {
      source:   uploadedFileName ? uploadedFileName.split('.').pop().toLowerCase() : 'paste',
      fileName: uploadedFileName ?? null,
    })
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      handleStart()
    }
  }

  async function handleFile(file) {
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    if (!['pdf', 'docx'].includes(ext)) {
      setExtractError('Only PDF and Word (.docx) files are supported.')
      return
    }
    setIsExtracting(true)
    setExtractError('')
    setUploadedFileName(null)
    try {
      const extracted = ext === 'pdf'
        ? await extractFromPDF(file)
        : await extractFromDOCX(file)
      setText(extracted.trim())
      setUploadedFileName(file.name)  // Sprint 8: preserve for history title
      setInputMode('paste')
    } catch (err) {
      setExtractError(
        err.code === 'EMPTY_PDF'
          ? err.message
          : 'Could not read the file. Try copying the text manually.'
      )
    } finally {
      setIsExtracting(false)
    }
  }

  function handleFileInput(e) {
    handleFile(e.target.files[0])
    e.target.value = ''   // reset so same file can be re-selected
  }

  function handleDragOver(e) {
    e.preventDefault()
    setIsDragOver(true)
  }

  function handleDragLeave() {
    setIsDragOver(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setIsDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }

  function handleAssignmentsParsed(parsed) {
    saveAssignments(parsed) // async, fire-and-forget
    setAssignments(parsed)
  }

  function handleAssignmentsUpdate(updated) {
    saveAssignments(updated)
    setAssignments(updated)
  }

  async function handleReParse() {
    await clearAssignments()
    setAssignments([])
  }

  function handleCoursesChange(updated) {
    saveCourses(updated)
    setCourses(updated)
  }

  const wordCount = text.trim()
    ? text.trim().split(/\s+/).filter(Boolean).length
    : 0

  const estimatedMins = wordCount > 0
    ? Math.ceil(wordCount / 200)
    : 0

  return (
    <div className="min-h-screen flex flex-col">

      {/* Header */}
      <header className="border-b border-ink-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-focus-600 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="3" width="12" height="1.5" rx="0.75" fill="white"/>
                <rect x="1" y="6.25" width="8" height="1.5" rx="0.75" fill="white"/>
                <rect x="1" y="9.5" width="10" height="1.5" rx="0.75" fill="white"/>
              </svg>
            </div>
            <span className="font-semibold text-ink-800 tracking-tight">Focus Reader</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-xs text-ink-400 hover:text-ink-600 transition-colors flex items-center gap-1"
            >
              ← Dashboard
            </button>
            {/* Sprint 9: User account button — only rendered when Clerk is configured */}
            {CLERK_ENABLED && <UserButton afterSignOutUrl="/" />}
            {/* Settings gear */}
            <button
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              className="w-7 h-7 flex items-center justify-center rounded-lg
                         text-ink-400 hover:text-ink-700 hover:bg-ink-100
                         transition-colors duration-150"
            >
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M6.16 1.56a.75.75 0 0 1 1.48-.12l.1.6a4.5 4.5 0 0 1 1.5.87l.57-.22a.75.75 0 0 1 .95.96l-.22.56a4.5 4.5 0 0 1 .87 1.5l.6.1a.75.75 0 0 1-.12 1.48l-.6.1a4.5 4.5 0 0 1-.87 1.5l.22.57a.75.75 0 0 1-.96.95l-.56-.22a4.5 4.5 0 0 1-1.5.87l-.1.6a.75.75 0 0 1-1.48-.12l-.1-.6a4.5 4.5 0 0 1-1.5-.87l-.57.22a.75.75 0 0 1-.95-.96l.22-.56a4.5 4.5 0 0 1-.87-1.5l-.6-.1a.75.75 0 0 1 .12-1.48l.6-.1a4.5 4.5 0 0 1 .87-1.5l-.22-.57a.75.75 0 0 1 .96-.95l.56.22a4.5 4.5 0 0 1 1.5-.87l.1-.6ZM7.5 9.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
                  fill="currentColor"/>
              </svg>
            </button>
            <span className="text-xs text-ink-400 font-mono">v1.0 · Sprint 9</span>
          </div>
          {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
          {showAuthGate && CLERK_ENABLED && (
            <AuthGate onClose={() => setShowAuthGate(false)} />
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-12">

        {/* Hero */}
        <div className="mb-10 animate-slide-up">
          <h1 className="text-3xl font-semibold text-ink-900 mb-3 leading-tight">
            Read one line at a time.<br />
            <span className="text-focus-600">Actually finish it.</span>
          </h1>
          <p className="text-ink-500 text-lg leading-relaxed max-w-xl">
            Paste any reading assignment or upload a PDF or Word doc.
            Navigate line by line with your keyboard.
            Get a retention quiz when you're done.
          </p>
        </div>

        {/* Input card */}
        <div className="bg-white rounded-2xl border border-ink-100 shadow-sm overflow-hidden animate-fade-in">

          {/* Tab switcher */}
          <div className="flex border-b border-ink-100">
            {[
              { id: 'paste',    label: 'Paste text' },
              { id: 'upload',   label: 'Upload file' },
              { id: 'schedule', label: 'My Schedule' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setInputMode(tab.id)}
                className={[
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors duration-150',
                  inputMode === tab.id
                    ? 'text-ink-800 border-b-2 border-focus-500 bg-white'
                    : 'text-ink-400 hover:text-ink-600 bg-ink-50/50',
                ].join(' ')}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Paste tab */}
          {inputMode === 'paste' && (
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={text}
                onChange={e => { setText(e.target.value); setError(''); if (uploadedFileName) setUploadedFileName(null) }}
                onKeyDown={handleKeyDown}
                placeholder={PLACEHOLDER}
                rows={14}
                className="w-full px-6 pt-6 pb-4 text-ink-700 text-base leading-relaxed
                           placeholder:text-ink-300 resize-none outline-none font-sans
                           scrollbar-thin"
                aria-label="Paste your reading text here"
                aria-describedby={error ? 'input-error' : undefined}
              />
            </div>
          )}

          {/* Upload tab */}
          {inputMode === 'upload' && (
            <div className="px-6 py-8">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                onChange={handleFileInput}
                className="hidden"
                aria-label="Upload PDF or Word file"
              />

              {isExtracting ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-ink-400">
                  <div className="w-8 h-8 rounded-full border-2 border-ink-200 border-t-focus-500 animate-spin" />
                  <span className="text-sm">Extracting text…</span>
                </div>
              ) : (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={[
                    'flex flex-col items-center justify-center gap-4 py-12 rounded-xl border-2 border-dashed cursor-pointer transition-colors duration-150',
                    isDragOver
                      ? 'border-focus-400 bg-focus-50'
                      : 'border-ink-200 hover:border-focus-300 hover:bg-ink-50/50',
                  ].join(' ')}
                  role="button"
                  aria-label="Drop a PDF or Word file here, or click to browse"
                >
                  <div className="w-12 h-12 rounded-xl bg-ink-100 flex items-center justify-center">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
                            stroke="#8e8a7e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M14 2v6h6M12 12v6M9 15l3-3 3 3"
                            stroke="#8e8a7e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-ink-700">
                      Drop a file here, or <span className="text-focus-600">browse</span>
                    </p>
                    <p className="text-xs text-ink-400 mt-1">PDF and Word (.docx) supported</p>
                  </div>
                </div>
              )}

              {extractError && (
                <p className="mt-4 text-sm text-red-600 flex items-center gap-2 animate-fade-in">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                    <path fillRule="evenodd" d="M7 1a6 6 0 100 12A6 6 0 007 1zm-.75 3.5a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z"/>
                  </svg>
                  {extractError}
                </p>
              )}
            </div>
          )}

          {/* Schedule tab */}
          {inputMode === 'schedule' && (
            <div>
              {/* Course manager — always visible in schedule tab */}
              <div className="px-6 pt-5 pb-4 border-b border-ink-100">
                <CourseManager courses={courses} onChange={handleCoursesChange} />
              </div>

              {/* Assignments section */}
              {assignments.length === 0 ? (
                <SyllabusParser
                  courses={courses}
                  onParsed={handleAssignmentsParsed}
                />
              ) : (
                <TodayView
                  assignments={assignments}
                  onUpdate={handleAssignmentsUpdate}
                  onReParse={handleReParse}
                  onStartReading={() => setInputMode('paste')}
                />
              )}
            </div>
          )}

          {/* Footer bar — only shown on paste tab */}
          {inputMode === 'paste' && (
            <div className="border-t border-ink-100 px-6 py-4 flex items-center justify-between bg-ink-50/50">
              <div className="flex items-center gap-4 text-sm text-ink-400">
                {wordCount > 0 ? (
                  <>
                    <span className="font-mono">{wordCount.toLocaleString()} words</span>
                    <span className="text-ink-200">·</span>
                    <span>~{estimatedMins < 1 ? '< 1' : estimatedMins} min read</span>
                  </>
                ) : (
                  <span>Paste text above to begin</span>
                )}
              </div>
              <button
                onClick={handleStart}
                disabled={wordCount === 0}
                className="px-5 py-2.5 bg-focus-600 text-white text-sm font-medium
                           rounded-xl transition-all duration-150
                           hover:bg-focus-700 active:scale-95
                           disabled:opacity-40 disabled:cursor-not-allowed
                           disabled:hover:bg-focus-600 disabled:active:scale-100"
                aria-label="Start reading"
              >
                Start Reading
                <span className="ml-2 text-focus-300 text-xs font-mono hidden sm:inline">
                  ⌘↵
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Paste tab error */}
        {error && (
          <p id="input-error" role="alert"
             className="mt-3 text-sm text-red-600 flex items-center gap-2 animate-fade-in">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path fillRule="evenodd" d="M7 1a6 6 0 100 12A6 6 0 007 1zm-.75 3.5a.75.75 0 011.5 0v3a.75.75 0 01-1.5 0v-3zm.75 5.5a.75.75 0 110-1.5.75.75 0 010 1.5z"/>
            </svg>
            {error}
          </p>
        )}

        {/* ── Pick up where you left off ──────────────────────── */}
        {recentReadings && recentReadings.length > 0 && onContinueReading && (
          <div className="mt-8 animate-fade-in">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-ink-700">Pick up where you left off</h2>
              {onBack && (
                <button
                  onClick={onBack}
                  className="text-xs text-ink-400 hover:text-focus-600 transition-colors duration-150"
                >
                  View all →
                </button>
              )}
            </div>

            <div className="space-y-2">
              {recentReadings.map(record => {
                const pct = record.isComplete
                  ? 100
                  : Math.min(99, Math.round((record.lastLine / Math.max(record.totalLines, 1)) * 100))
                const isNew       = record.lastLine === 0 && !record.isComplete
                const ctaLabel    = record.isComplete ? 'Read again' : isNew ? 'Start →' : 'Continue →'
                const fromStart   = record.isComplete

                return (
                  <div
                    key={record.id}
                    className="flex items-center gap-3 bg-white border border-ink-100 rounded-xl
                               px-4 py-3 hover:border-ink-200 transition-colors group"
                  >
                    {/* Vertical progress fill on left edge */}
                    <div className="shrink-0 w-1 h-10 bg-ink-100 rounded-full overflow-hidden self-center">
                      <div
                        className="w-full bg-focus-400 rounded-full transition-all duration-300"
                        style={{ height: `${pct}%` }}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-ink-800 truncate leading-snug">
                        {record.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {/* Source badge */}
                        <span className={[
                          'text-xs px-1.5 py-0.5 rounded font-medium',
                          record.source === 'pdf'  ? 'bg-focus-50 text-focus-700' :
                          record.source === 'docx' ? 'bg-sage-50 text-sage-700'  :
                                                     'bg-ink-100 text-ink-500',
                        ].join(' ')}>
                          {record.source === 'pdf' ? 'PDF' : record.source === 'docx' ? 'DOCX' : 'Paste'}
                        </span>
                        <span className="text-ink-200 text-xs">·</span>
                        <span className="text-xs text-ink-400">
                          {record.wordCount.toLocaleString()} words
                        </span>
                        <span className="text-ink-200 text-xs">·</span>
                        {record.isComplete ? (
                          <span className="text-xs text-sage-600 font-medium">Complete ✓</span>
                        ) : isNew ? (
                          <span className="text-xs text-ink-400">Not started</span>
                        ) : (
                          <span className="text-xs text-ink-400">{pct}% read</span>
                        )}
                      </div>
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => onContinueReading(record.id, { fromStart })}
                      className="shrink-0 px-3 py-1.5 bg-ink-100 text-ink-600 text-xs font-medium
                                 rounded-lg hover:bg-focus-600 hover:text-white active:scale-95
                                 transition-all duration-150 whitespace-nowrap"
                    >
                      {ctaLabel}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-12 grid grid-cols-3 gap-6 animate-fade-in">
          {[
            { step: '01', label: 'Add your text', desc: 'Paste an article or chapter, or upload a PDF or Word doc directly.' },
            { step: '02', label: 'Read line by line', desc: 'Space or arrow keys advance one line at a time. No scrolling, no losing your place.' },
            { step: '03', label: 'Prove you got it', desc: 'A short quiz checks retention. Wrong answers point back to the exact passage.' },
          ].map(({ step, label, desc }) => (
            <div key={step} className="flex flex-col gap-2">
              <span className="text-xs font-mono text-focus-500 font-medium">{step}</span>
              <span className="text-sm font-semibold text-ink-700">{label}</span>
              <span className="text-xs text-ink-400 leading-relaxed">{desc}</span>
            </div>
          ))}
        </div>

        {/* FR-26: Privacy disclosure */}
        <p className="mt-10 text-xs text-ink-300 text-center leading-relaxed">
          No account required · Your text is never stored ·{' '}
          <span className="text-ink-400">
            AI features (section analysis, quiz, syllabus parsing) send your text to{' '}
            <a
              href="https://www.anthropic.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-ink-500 transition-colors"
            >
              Anthropic's API
            </a>
          </span>
        </p>

      </main>
    </div>
  )
}
