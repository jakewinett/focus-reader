import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { parseLines, parseParagraphs, countWords, countTotalWords, calcProgress, formatMinutes, isBlankLine } from '../utils/textUtils.js'
import { getBlockLabel } from '../utils/fileUtils.js'
import { useReadingPace, useFontSize } from '../hooks/useReadingPace.js'
import { analyzeText, generateQuiz } from '../api/claude.js'
import Quiz from './Quiz.jsx'

// ── Block card ───────────────────────────────────────────────────────────────
// Renders a § block entry (TOC, list, table rows) as a self-contained card.
// All items are visible at once; one "Next" press advances past the whole block.
function BlockCard({ line, isActive, isRead, activeRef, onClick, fontSize }) {
  const content  = line.slice(1)           // strip leading §
  const items    = content.split('\n')
  const label    = getBlockLabel(items[0]) // recognise "Table of Contents" etc.
  // If first item is a recognised label, show it as a header; otherwise show all items equally
  const header   = label ? items[0] : null
  const entries  = label ? items.slice(1) : items

  return (
    <div
      ref={activeRef}
      onClick={onClick}
      className={[
        'my-3 rounded-2xl border overflow-hidden cursor-pointer select-none',
        'transition-all duration-200',
        isActive
          ? 'border-focus-300 shadow-sm'
          : isRead
          ? 'border-ink-100 opacity-40'
          : 'border-ink-100 opacity-20',
      ].join(' ')}
    >
      {/* Card header */}
      <div className={[
        'px-4 py-2 flex items-center gap-2 border-b',
        isActive ? 'bg-focus-50 border-focus-100' : 'bg-ink-50 border-ink-100',
      ].join(' ')}>
        {/* Stacked-lines icon */}
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
             className={isActive ? 'text-focus-500' : 'text-ink-400'}>
          <rect x="1" y="2" width="11" height="1.5" rx="0.75" fill="currentColor"/>
          <rect x="1" y="5.75" width="8" height="1.5" rx="0.75" fill="currentColor"/>
          <rect x="1" y="9.5" width="9.5" height="1.5" rx="0.75" fill="currentColor"/>
        </svg>
        <span className={[
          'text-xs font-mono uppercase tracking-wider',
          isActive ? 'text-focus-600' : 'text-ink-400',
        ].join(' ')}>
          {label ?? 'List'}
        </span>
      </div>

      {/* Entries */}
      <div className={[
        'px-4 py-3 space-y-1',
        isActive ? 'bg-focus-50/30' : 'bg-white',
      ].join(' ')}>
        {header && (
          <p style={{ fontSize: `${fontSize}px` }}
             className="font-semibold text-ink-700 leading-snug pb-1.5 border-b border-ink-100 mb-2">
            {header}
          </p>
        )}
        {entries.map((entry, ei) => (
          <p key={ei}
             style={{ fontSize: `${Math.max(fontSize - 1, 13)}px` }}
             className="text-ink-500 leading-snug">
            {entry}
          </p>
        ))}
      </div>
    </div>
  )
}

// Sprint 1: line-by-line navigation, progress bar, pace calibration, font size control.
// Sprint 3: section chunking + previews (AI call).
// Sprint 4 adds: quiz trigger on completion.
// Sprint 8: sessionId + initialLine for history resume; debounced auto-save; exit payload.

export default function FocusReader({
  rawText,
  onExit,
  sessionId    = null,   // Sprint 8: history session id
  initialLine  = 0,      // Sprint 8: resume position
  onSavePosition = null, // Sprint 8: ({ id, lastLine, isComplete }) => Promise<void>
}) {
  const lines      = parseLines(rawText)
  const totalLines = lines.length
  const totalWords = countTotalWords(lines)

  const [readMode, setReadMode]         = useState('line')  // 'line' | 'paragraph'
  const [currentIndex, setCurrentIndex] = useState(initialLine ?? 0)
  const [currentParaIndex, setCurrentParaIndex] = useState(0)
  const [isComplete, setIsComplete]     = useState(false)

  // Paragraph groupings derived from lines
  const paragraphs = useMemo(() => parseParagraphs(lines), [lines]) // eslint-disable-line react-hooks/exhaustive-deps
  const [sections, setSections]               = useState([])    // [{title, startLine}]
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [quizQuestions, setQuizQuestions]     = useState(null)  // null | QuizQuestion[]
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)

  const { estimatedMinutes, isCalibrated, recordProgress } = useReadingPace(totalWords)
  const { fontSize, increase, decrease }   = useFontSize()

  const containerRef  = useRef(null)
  const activeLineRef = useRef(null)

  const progress = calcProgress(currentIndex, totalLines)

  // ── Section analysis (Sprint 3) ──────────────────────────────
  useEffect(() => {
    if (lines.length === 0) return
    setSectionsLoading(true)
    analyzeText(lines)
      .then(result => setSections(Array.isArray(result) ? result : []))
      .catch(() => setSections([]))
      .finally(() => setSectionsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Quiz generation (Sprint 4) ───────────────────────────────
  useEffect(() => {
    if (!isComplete) return
    setIsGeneratingQuiz(true)
    generateQuiz(lines)
      .then(qs => setQuizQuestions(Array.isArray(qs) && qs.length ? qs : null))
      .catch(() => setQuizQuestions(null))
      .finally(() => setIsGeneratingQuiz(false))
  }, [isComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sprint 8: Debounced position auto-save ───────────────────
  const saveTimerRef = useRef(null)
  useEffect(() => {
    if (!onSavePosition || !sessionId) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      onSavePosition({ id: sessionId, lastLine: currentIndex, isComplete })
    }, 2000)
    return () => clearTimeout(saveTimerRef.current)
  }, [currentIndex, isComplete, sessionId, onSavePosition])

  // Immediate save when reading is completed
  useEffect(() => {
    if (isComplete && onSavePosition && sessionId) {
      onSavePosition({ id: sessionId, lastLine: currentIndex, isComplete: true })
    }
  }, [isComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  // Which section is the reader currently in?
  const currentSectionIdx = sections.reduce((acc, s, i) =>
    currentIndex >= s.startLine ? i : acc, -1)

  // Show "Up next" chip when within 5 lines of the next section boundary
  const nextSection = sections[currentSectionIdx + 1] ?? null
  const upNext = nextSection && (nextSection.startLine - currentIndex) <= 5
    ? nextSection : null

  // ── Navigation ───────────────────────────────────────────────
  const advance = useCallback(() => {
    if (readMode === 'paragraph') {
      setCurrentParaIndex(prev => {
        if (prev >= paragraphs.length - 1) { setIsComplete(true); return prev }
        const next = prev + 1
        const nextLineIdx = paragraphs[next].startLine
        setCurrentIndex(nextLineIdx)
        recordProgress(
          countTotalWords(lines.slice(0, paragraphs[prev].endLine + 1)),
          countTotalWords(lines.slice(nextLineIdx))
        )
        return next
      })
    } else {
      setCurrentIndex(prev => {
        if (prev >= totalLines - 1) { setIsComplete(true); return prev }
        const next = prev + 1
        recordProgress(countWords(lines[prev]), countTotalWords(lines.slice(next)))
        return next
      })
    }
  }, [readMode, totalLines, lines, paragraphs, recordProgress])

  const retreat = useCallback(() => {
    if (readMode === 'paragraph') {
      setCurrentParaIndex(prev => {
        if (prev <= 0) return 0
        const next = prev - 1
        setCurrentIndex(paragraphs[next].startLine)
        return next
      })
    } else {
      setCurrentIndex(prev => Math.max(0, prev - 1))
    }
    if (isComplete) setIsComplete(false)
  }, [readMode, isComplete, paragraphs])

  // ── Keyboard handler ─────────────────────────────────────────
  useEffect(() => {
    function handleKey(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      switch (e.key) {
        case ' ':
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault()
          advance()
          break
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault()
          retreat()
          break
        default:
          break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [advance, retreat])

  // ── Auto-scroll active line into view ────────────────────────
  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentIndex])

  // ── Focus container on mount ─────────────────────────────────
  useEffect(() => {
    containerRef.current?.focus()
  }, [])

  const wordsRead      = countTotalWords(lines.slice(0, currentIndex + 1))
  const wordsRemaining = Math.max(0, totalWords - wordsRead)

  return (
    <div className="min-h-screen flex flex-col bg-white">

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-ink-100">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">

          {/* Exit */}
          <button
            onClick={() => onExit({ lastLine: currentIndex, isComplete })}
            className="flex items-center gap-1.5 text-ink-400 hover:text-ink-700
                       text-sm transition-colors duration-150 shrink-0"
            aria-label="Exit reader"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Exit
          </button>

          {/* Progress bar */}
          <div className="flex-1 flex items-center gap-3">
            <div className="flex-1 h-1.5 bg-ink-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-focus-500 rounded-full progress-fill"
                style={{ width: `${progress}%` }}
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${progress}% complete`}
              />
            </div>
            <span className="text-xs font-mono text-ink-400 shrink-0 w-9 text-right">
              {progress}%
            </span>
          </div>

          {/* Time estimate */}
          <div className="shrink-0 text-xs text-ink-400 flex items-center gap-1.5">
            {isCalibrated ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-sage-400 inline-block"
                      title="Calibrated to your reading pace" />
                <span>{formatMinutes(estimatedMinutes)} left</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-ink-300 inline-block animate-pulse-soft" />
                <span>{formatMinutes(estimatedMinutes)} est.</span>
              </>
            )}
          </div>

          {/* Up next chip */}
          {upNext && (
            <div className="shrink-0 hidden sm:flex items-center gap-1.5 text-xs
                            text-ink-500 bg-ink-100 rounded-lg px-2.5 py-1 animate-fade-in">
              <span className="text-ink-400">▸</span>
              <span>Up next: <span className="font-medium text-ink-700">{upNext.title}</span></span>
            </div>
          )}

          {/* Font size controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={decrease}
              className="w-7 h-7 flex items-center justify-center rounded-lg
                         text-ink-400 hover:text-ink-700 hover:bg-ink-100
                         transition-colors duration-150 text-sm font-medium"
              aria-label="Decrease font size"
            >A−</button>
            <button
              onClick={increase}
              className="w-7 h-7 flex items-center justify-center rounded-lg
                         text-ink-400 hover:text-ink-700 hover:bg-ink-100
                         transition-colors duration-150 text-sm font-medium"
              aria-label="Increase font size"
            >A+</button>
          </div>

        </div>
      </header>

      {/* ── Reading area ─────────────────────────────────────── */}
      <main
        ref={containerRef}
        tabIndex={-1}
        className="flex-1 max-w-3xl mx-auto w-full px-6 py-10 outline-none"
        aria-label="Reading area. Use spacebar or arrow keys to advance lines."
      >
        {/* Context bar */}
        <div className="mb-6 flex items-center justify-between">
          {/* Position counter */}
          <span className="text-xs text-ink-300 font-mono">
            {readMode === 'paragraph'
              ? `Para ${currentParaIndex + 1} of ${paragraphs.length}`
              : `Line ${currentIndex + 1} of ${totalLines}`}
          </span>

          <div className="flex items-center gap-3">
            {sectionsLoading && (
              <span className="text-xs text-ink-300 font-mono animate-pulse-soft">analysing…</span>
            )}
            <span className="text-xs text-ink-300 font-mono">{totalWords.toLocaleString()} words</span>

            {/* Read-mode toggle */}
            <div className="flex items-center bg-ink-100 rounded-lg p-0.5 gap-0.5">
              <button
                onClick={() => setReadMode('line')}
                className={[
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150',
                  readMode === 'line'
                    ? 'bg-white text-ink-800 shadow-sm'
                    : 'text-ink-400 hover:text-ink-600',
                ].join(' ')}
                aria-pressed={readMode === 'line'}
                title="Navigate line by line"
              >
                ≡ Line
              </button>
              <button
                onClick={() => setReadMode('paragraph')}
                className={[
                  'px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150',
                  readMode === 'paragraph'
                    ? 'bg-white text-ink-800 shadow-sm'
                    : 'text-ink-400 hover:text-ink-600',
                ].join(' ')}
                aria-pressed={readMode === 'paragraph'}
                title="Navigate paragraph by paragraph"
              >
                ¶ Para
              </button>
            </div>
          </div>
        </div>

        {/* Lines */}
        <div className="space-y-0.5 select-none">
          {lines.map((line, index) => {
            const activePara = readMode === 'paragraph' ? paragraphs[currentParaIndex] : null
            const isActive   = readMode === 'paragraph'
              ? (activePara && index >= activePara.startLine && index <= activePara.endLine)
              : index === currentIndex
            const isRead     = readMode === 'paragraph'
              ? (activePara && index < activePara.startLine)
              : index < currentIndex
            const isBlank    = isBlankLine(line)
            const isBlock    = line.startsWith('\u00A7')
            const sectionAtLine   = sections.find(s => s.startLine === index)
            const isSectionStart  = !!sectionAtLine && index > 0

            const handleClick = () => {
              setCurrentIndex(index)
              if (isComplete) setIsComplete(false)
            }

            return (
              <div key={index}>
                {/* Section divider \u2014 appears above the first line of each section (skip line 0) */}
                {isSectionStart && (
                  <div className="flex items-center gap-3 py-3 mt-2 mb-1 select-none">
                    <div className="flex-1 h-px bg-ink-100" />
                    <span className="text-xs font-mono text-ink-400 tracking-wide uppercase shrink-0">
                      {sectionAtLine.title}
                    </span>
                    <div className="flex-1 h-px bg-ink-100" />
                  </div>
                )}

                {/* Block card (TOC, list, table) */}
                {isBlock ? (
                  <BlockCard
                    line={line}
                    isActive={isActive}
                    isRead={isRead}
                    activeRef={isActive ? activeLineRef : null}
                    onClick={handleClick}
                    fontSize={fontSize}
                  />
                ) : (
                  /* Regular / blank line */
                  <div
                    ref={isActive ? activeLineRef : null}
                    onClick={handleClick}
                    className={[
                      'reading-line',
                      isBlank ? 'py-2' : '',
                      isActive
                        ? 'line-active'
                        : isRead
                        ? 'line-read'
                        : 'line-inactive',
                    ].join(' ')}
                    style={{ fontSize: `${fontSize}px`, lineHeight: '1.8' }}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {isBlank ? '\u00A0' : line}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Completion state — Quiz (Sprint 4) */}
        {isComplete && (
          <div className="mt-12 animate-slide-up">
            <Quiz
              lines={lines}
              questions={quizQuestions}
              isLoading={isGeneratingQuiz}
              onExit={() => onExit({ lastLine: currentIndex, isComplete: true })}
            />
          </div>
        )}
      </main>

      {/* ── Bottom nav bar ───────────────────────────────────── */}
      <footer className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-ink-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">

          {/* Back button */}
          <button
            onClick={retreat}
            disabled={currentIndex === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                       text-ink-500 hover:text-ink-800 hover:bg-ink-100
                       disabled:opacity-30 disabled:cursor-not-allowed
                       transition-all duration-150"
            aria-label="Previous line"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          {/* Keyboard hint */}
          <div className="text-xs text-ink-300 font-mono hidden sm:flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-ink-100 rounded text-ink-400">space</kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 bg-ink-100 rounded text-ink-400">↓</kbd>
            <span>{readMode === 'paragraph' ? 'next paragraph' : 'next line'}</span>
          </div>

          {/* Next button */}
          <button
            onClick={advance}
            disabled={isComplete}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium
                       bg-focus-600 text-white
                       hover:bg-focus-700 active:scale-95
                       disabled:opacity-40 disabled:cursor-not-allowed
                       disabled:active:scale-100
                       transition-all duration-150"
            aria-label="Next line"
          >
            Next
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5"
                    strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>

        </div>
      </footer>

    </div>
  )
}
