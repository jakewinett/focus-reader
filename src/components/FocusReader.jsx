import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { parseLines, parseParagraphs, countWords, countTotalWords, formatMinutes, isBlankLine, bionicize } from '../utils/textUtils.js'
import { getBlockLabel } from '../utils/fileUtils.js'
import { useReadingPace, useFontSize } from '../hooks/useReadingPace.js'
import { useTTS, TTS_AVAILABLE, isTTSVoiceQualityLow } from '../hooks/useTTS.js'
import { useDisplayPrefs, HIGHLIGHT_COLORS } from '../hooks/useDisplayPrefs.js'
import { useFlaggedLines } from '../hooks/useFlaggedLines.js'
import { analyzeText, generateQuiz } from '../api/claude.js'
import RateLimitBanner from './RateLimitBanner.jsx'
import Quiz from './Quiz.jsx'

const DAILY_LIMIT = Number(import.meta.env.VITE_DAILY_AI_LIMIT ?? 25)

// ── Block card ───────────────────────────────────────────────────────────────
function BlockCard({ line, isActive, isRead, activeRef, onClick, fontSize, lineSpacing, dyslexiaFont, bionicMode }) {
  const content  = line.slice(1)
  const items    = content.split('\n')
  const label    = getBlockLabel(items[0])
  const header   = label ? items[0] : null
  const entries  = label ? items.slice(1) : items

  const textStyle = {
    fontSize: `${Math.max(fontSize - 1, 13)}px`,
    lineHeight: lineSpacing,
    fontFamily: dyslexiaFont ? '"OpenDyslexic", sans-serif' : undefined,
  }

  return (
    <div
      ref={activeRef}
      onClick={onClick}
      className={[
        'my-3 rounded-2xl border overflow-hidden cursor-pointer select-none',
        'transition-all duration-200',
        isActive  ? 'border-focus-300 shadow-sm'
        : isRead  ? 'border-ink-100 opacity-40'
                  : 'border-ink-100 opacity-20',
      ].join(' ')}
    >
      <div className={[
        'px-4 py-2 flex items-center gap-2 border-b',
        isActive ? 'bg-focus-50 border-focus-100' : 'bg-ink-50 border-ink-100',
      ].join(' ')}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none"
             className={isActive ? 'text-focus-500' : 'text-ink-400'}>
          <rect x="1" y="2"   width="11" height="1.5" rx="0.75" fill="currentColor"/>
          <rect x="1" y="5.75" width="8"  height="1.5" rx="0.75" fill="currentColor"/>
          <rect x="1" y="9.5"  width="9.5" height="1.5" rx="0.75" fill="currentColor"/>
        </svg>
        <span className={[
          'text-xs font-mono uppercase tracking-wider',
          isActive ? 'text-focus-600' : 'text-ink-400',
        ].join(' ')}>
          {label ?? 'List'}
        </span>
      </div>
      <div className={['px-4 py-3 space-y-1', isActive ? 'bg-focus-50/30' : 'bg-white'].join(' ')}>
        {header && (
          <p style={{ fontSize: `${fontSize}px`, lineHeight: lineSpacing, fontFamily: dyslexiaFont ? '"OpenDyslexic", sans-serif' : undefined }}
             className="font-semibold text-ink-700 leading-snug pb-1.5 border-b border-ink-100 mb-2">
            {bionicMode ? bionicize(header) : header}
          </p>
        )}
        {entries.map((entry, ei) => (
          <p key={ei} style={textStyle} className="text-ink-500 leading-snug">
            {bionicMode ? bionicize(entry) : entry}
          </p>
        ))}
      </div>
    </div>
  )
}

// ── Focus modes popover ──────────────────────────────────────────────────────
function FocusModeRow({ label, active, onToggle }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ink-600">{label}</span>
      <button
        onClick={onToggle}
        aria-pressed={active}
        className={[
          'w-8 h-4 rounded-full transition-colors duration-200 relative shrink-0',
          active ? 'bg-focus-500' : 'bg-ink-200',
        ].join(' ')}
      >
        <span className={[
          'absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200',
          active ? 'translate-x-4' : 'translate-x-0.5',
        ].join(' ')} />
      </button>
    </div>
  )
}

function SpacingRow({ spacing, onCycle }) {
  const labels = { 1.8: 'Normal', 2.2: 'Relaxed', 2.8: 'Loose' }
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-ink-600">Line spacing</span>
      <button
        onClick={onCycle}
        className="text-xs font-mono text-focus-600 bg-focus-50 hover:bg-focus-100
                   px-2 py-0.5 rounded-lg transition-colors"
      >
        {labels[spacing] ?? spacing}
      </button>
    </div>
  )
}

// Sprint 1: line-by-line navigation, progress bar, pace calibration, font size control.
// Sprint 3: section chunking + previews (AI call).
// Sprint 4: quiz trigger on completion.
// Sprint 8: sessionId + initialLine for history resume; debounced auto-save; exit payload.
// Sprint 9: auth token for Edge Function; rate limit banner.
// Sprint 10: TTS, bionic reading, dyslexia font, line spacing.

export default function FocusReader({
  rawText,
  onExit,
  sessionId           = null,
  initialLine         = 0,
  initialFlaggedLines = [],
  onSavePosition      = null,
}) {
  const lines      = parseLines(rawText)
  const totalLines = lines.length
  const totalWords = countTotalWords(lines)

  const [readMode, setReadMode]         = useState('line')
  const [currentIndex, setCurrentIndex] = useState(initialLine ?? 0)
  const [currentParaIndex, setCurrentParaIndex] = useState(0)
  const [isComplete, setIsComplete]     = useState(false)
  const [aiRemaining, setAiRemaining]   = useState(null)

  const paragraphs = useMemo(() => parseParagraphs(lines), [lines]) // eslint-disable-line react-hooks/exhaustive-deps
  const [sections, setSections]               = useState([])
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [quizQuestions, setQuizQuestions]     = useState(null)
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false)

  // Focus modes popover
  const [showFocusModes, setShowFocusModes] = useState(false)
  const focusModeRef = useRef(null)

  const { estimatedMinutes, isCalibrated, recordProgress } = useReadingPace(totalWords)
  const { fontSize, increase, decrease }   = useFontSize()
  const { bionicMode, toggleBionic, dyslexiaFont, toggleDyslexia,
          lineSpacing, cycleSpacing, anyActive: anyFocusActive,
          darkMode, toggleDarkMode,
          highlightColor, setHighlightColor } = useDisplayPrefs()

  const { flaggedLines, toggleFlag } = useFlaggedLines(sessionId, initialFlaggedLines)

  const containerRef  = useRef(null)
  const activeLineRef = useRef(null)

  // Progress (non-blank lines only)
  const nonBlankTotal  = lines.filter(l => l !== '').length
  const nonBlankPassed = lines.slice(0, currentIndex + 1).filter(l => l !== '').length
  const progress = nonBlankTotal > 0 ? Math.round((nonBlankPassed / nonBlankTotal) * 100) : 0

  // ── Section analysis ─────────────────────────────────────────────
  useEffect(() => {
    if (lines.length === 0) return
    setSectionsLoading(true)
    analyzeText(lines)
      .then(result => {
        setSections(Array.isArray(result.sections) ? result.sections : [])
        if (result.aiRemaining != null) setAiRemaining(result.aiRemaining)
      })
      .catch(() => setSections([]))
      .finally(() => setSectionsLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Quiz generation ──────────────────────────────────────────────
  useEffect(() => {
    if (!isComplete) return
    setIsGeneratingQuiz(true)
    generateQuiz(lines, [...flaggedLines].sort((a, b) => a - b))
      .then(result => {
        setQuizQuestions(result.questions ?? null)
        if (result.aiRemaining != null) setAiRemaining(result.aiRemaining)
      })
      .catch(() => setQuizQuestions(null))
      .finally(() => setIsGeneratingQuiz(false))
  }, [isComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sprint 8: Debounced position auto-save ───────────────────────
  const saveTimerRef = useRef(null)
  useEffect(() => {
    if (!onSavePosition || !sessionId) return
    clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      onSavePosition({ id: sessionId, lastLine: currentIndex, isComplete })
    }, 2000)
    return () => clearTimeout(saveTimerRef.current)
  }, [currentIndex, isComplete, sessionId, onSavePosition])

  useEffect(() => {
    if (isComplete && onSavePosition && sessionId)
      onSavePosition({ id: sessionId, lastLine: currentIndex, isComplete: true })
  }, [isComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close focus modes popover on outside click ───────────────────
  useEffect(() => {
    if (!showFocusModes) return
    function handleClick(e) {
      if (focusModeRef.current && !focusModeRef.current.contains(e.target)) {
        setShowFocusModes(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showFocusModes])

  // Section info
  const currentSectionIdx = sections.reduce((acc, s, i) =>
    currentIndex >= s.startLine ? i : acc, -1)
  const nextSection = sections[currentSectionIdx + 1] ?? null
  const upNext = nextSection && (nextSection.startLine - currentIndex) <= 5 ? nextSection : null

  // ── Navigation ───────────────────────────────────────────────────
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
        let next = prev + 1
        while (next < totalLines && lines[next] === '') next++
        if (next >= totalLines) { setIsComplete(true); return prev }
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
      setCurrentIndex(prev => {
        if (prev <= 0) return 0
        let next = prev - 1
        while (next > 0 && lines[next] === '') next--
        return next
      })
    }
    if (isComplete) setIsComplete(false)
  }, [readMode, isComplete, paragraphs, lines])

  // ── TTS ──────────────────────────────────────────────────────────
  const { isEnabled: ttsEnabled, toggle: toggleTTS, isSpeaking, isPaused: ttsPaused,
          togglePause, rate: ttsRate, setRate: setTTSRate, stop: stopTTS,
          voiceName: ttsVoiceName, setVoiceName: setTTSVoiceName,
          voiceOptions: ttsVoiceOptions } = useTTS({
    lines, currentIndex, onAdvance: advance, isComplete,
  })

  // ── Keyboard handler ─────────────────────────────────────────────
  useEffect(() => {
    function handleKey(e) {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return
      switch (e.key) {
        case ' ':
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault(); advance(); break
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault(); retreat(); break
        case 'f':
        case 'F':
          e.preventDefault(); toggleFlag(currentIndex); break
        default: break
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [advance, retreat])

  // ── Auto-scroll ──────────────────────────────────────────────────
  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentIndex])

  useEffect(() => { containerRef.current?.focus() }, [])

  const wordsRead      = countTotalWords(lines.slice(0, currentIndex + 1))
  const wordsRemaining = Math.max(0, totalWords - wordsRead)

  function handleExit() {
    stopTTS()
    onExit({ lastLine: currentIndex, isComplete })
  }

  return (
    <div
      className={`min-h-screen flex flex-col ${darkMode ? '' : 'bg-white'}`}
      data-reader-dark={darkMode ? 'true' : undefined}
      style={!darkMode ? {
        '--hl-bg':     HIGHLIGHT_COLORS[highlightColor]?.bg     ?? HIGHLIGHT_COLORS.teal.bg,
        '--hl-border': HIGHLIGHT_COLORS[highlightColor]?.border ?? HIGHLIGHT_COLORS.teal.border,
      } : undefined}
    >

      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-ink-100">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-4">

          {/* Exit */}
          <button
            onClick={handleExit}
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
            <div className="flex-1 h-1.5 reader-progress-track bg-ink-100 rounded-full overflow-hidden">
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
                <span className="w-1.5 h-1.5 rounded-full bg-sage-400 inline-block" title="Calibrated to your reading pace" />
                <span>{formatMinutes(estimatedMinutes)} left</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-ink-300 inline-block animate-pulse-soft" />
                <span>{formatMinutes(estimatedMinutes)} est.</span>
              </>
            )}
          </div>

          {/* Rate limit banner (Sprint 9 — shown for operator-key users) */}
          <RateLimitBanner remaining={aiRemaining} limit={DAILY_LIMIT} />

          {/* Up next chip */}
          {upNext && (
            <div className="shrink-0 hidden sm:flex items-center gap-1.5 text-xs
                            text-ink-500 bg-ink-100 rounded-lg px-2.5 py-1 animate-fade-in">
              <span className="text-ink-400">▸</span>
              <span>Up next: <span className="font-medium text-ink-700">{upNext.title}</span></span>
            </div>
          )}

          {/* ── TTS controls ── */}
          {TTS_AVAILABLE && (
            <div className="flex items-center gap-1 shrink-0">
              {/* Speaker toggle */}
              <button
                onClick={toggleTTS}
                aria-pressed={ttsEnabled}
                aria-label={ttsEnabled ? 'Disable text to speech' : 'Enable text to speech'}
                title="Text to speech"
                className={[
                  'w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-150',
                  ttsEnabled ? 'text-focus-600 bg-focus-50' : 'text-ink-400 hover:text-ink-700 hover:bg-ink-100',
                ].join(' ')}
              >
                {/* Speaker icon */}
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                  <path d="M2 5.5h2.5l3.5-3v10L4.5 9.5H2a.5.5 0 0 1-.5-.5v-3A.5.5 0 0 1 2 5.5Z"
                        stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                  {ttsEnabled ? (
                    <path d="M10.5 5a3 3 0 0 1 0 5M12 3.5a5.5 5.5 0 0 1 0 8"
                          stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  ) : (
                    <path d="M10.5 5.5l3 4M13.5 5.5l-3 4"
                          stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                  )}
                </svg>
              </button>

              {/* Pause/resume — visible whenever TTS is on so users always have a manual control. */}
              {ttsEnabled && (
                <button
                  onClick={togglePause}
                  aria-label={isSpeaking ? 'Pause' : 'Resume'}
                  className="w-7 h-7 flex items-center justify-center rounded-lg
                             text-focus-600 bg-focus-50 hover:bg-focus-100 transition-colors duration-150"
                >
                  {isSpeaking ? (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <rect x="2" y="1.5" width="3" height="9" rx="1" fill="currentColor"/>
                      <rect x="7" y="1.5" width="3" height="9" rx="1" fill="currentColor"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 1.5l8 4.5-8 4.5V1.5Z" fill="currentColor"/>
                    </svg>
                  )}
                </button>
              )}

              {/* Speed selector — only when TTS is on */}
              {ttsEnabled && (
                <select
                  value={ttsRate}
                  onChange={e => setTTSRate(Number(e.target.value))}
                  aria-label="Playback speed"
                  className="text-xs font-mono text-focus-600 bg-focus-50 hover:bg-focus-100
                             border-none outline-none rounded-lg px-1.5 py-1 cursor-pointer
                             transition-colors duration-150"
                >
                  {[0.75, 1, 1.25, 1.5, 2].map(r => (
                    <option key={r} value={r}>{r}×</option>
                  ))}
                </select>
              )}

              {/* Voice selector — only when TTS is on and voices are available */}
              {ttsEnabled && ttsVoiceOptions.length > 1 && (
                <select
                  value={ttsVoiceName}
                  onChange={e => setTTSVoiceName(e.target.value)}
                  aria-label="Voice"
                  title="Choose voice"
                  className="text-xs text-focus-600 bg-focus-50 hover:bg-focus-100
                             border-none outline-none rounded-lg px-1.5 py-1 cursor-pointer
                             transition-colors duration-150 max-w-[120px] truncate"
                >
                  {ttsVoiceOptions.map(v => (
                    <option key={v.name} value={v.name}>
                      {v.name
                        .replace(/\s*\(English \([^)]+\)\)/g, '')  // "Sandy (English (United States))" → "Sandy"
                        .replace('Google ', '')                      // "Google US English" → "US English"
                        .replace(/ \(Enhanced\)$/, ' ★')
                        .replace(/ \(Premium\)$/, ' ★')
                        .trim() || v.name}
                    </option>
                  ))}
                </select>
              )}

              {/* Low-quality voice warning */}
              {ttsEnabled && isTTSVoiceQualityLow() && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  For natural-sounding voice, use Chrome or{' '}
                  <a
                    href="x-apple.systempreferences:com.apple.preference.universalaccess?Spoken"
                    className="underline"
                    title="Open macOS Spoken Content settings"
                  >
                    download better voices
                  </a>{' '}
                  in System Settings.
                </span>
              )}
            </div>
          )}

          {/* ── Flag current line ── */}
          {!isComplete && (
            <button
              onClick={() => toggleFlag(currentIndex)}
              aria-pressed={flaggedLines.has(currentIndex)}
              aria-label={flaggedLines.has(currentIndex) ? 'Unflag this line' : 'Flag as important'}
              title="Flag as important (F)"
              className={[
                'w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-150 shrink-0',
                flaggedLines.has(currentIndex)
                  ? 'text-amber-500 bg-amber-50'
                  : 'text-ink-400 hover:text-ink-700 hover:bg-ink-100',
              ].join(' ')}
            >
              {flaggedLines.has(currentIndex) ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M3 1h8a1 1 0 0 1 1 1v10.5l-4.5-2-4.5 2V2a1 1 0 0 1 1-1Z"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 1h8a1 1 0 0 1 1 1v10.5l-4.5-2-4.5 2V2a1 1 0 0 1 1-1Z"
                        stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                </svg>
              )}
            </button>
          )}

          {/* ── Dark mode toggle ── */}
          <button
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            title={darkMode ? 'Light mode' : 'Dark mode'}
            className={[
              'w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-150 shrink-0',
              darkMode
                ? 'text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20'
                : 'text-ink-400 hover:text-ink-700 hover:bg-ink-100',
            ].join(' ')}
          >
            {darkMode ? (
              /* Sun */
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="7.5" cy="7.5" r="2.5" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M7.5 1v1.5M7.5 12.5V14M14 7.5h-1.5M2.5 7.5H1M11.95 3.05l-1.06 1.06M4.11 10.89l-1.06 1.06M11.95 11.95l-1.06-1.06M4.11 4.11L3.05 3.05"
                      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
            ) : (
              /* Moon */
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M12.5 9.5A5.5 5.5 0 0 1 5.5 2.5a5.5 5.5 0 1 0 7 7Z"
                      stroke="currentColor" strokeWidth="1.2"
                      strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>

          {/* ── Focus modes popover ── */}
          <div className="relative shrink-0" ref={focusModeRef}>
            <button
              onClick={() => setShowFocusModes(v => !v)}
              aria-label="Focus modes"
              title="Focus modes"
              className={[
                'w-7 h-7 flex items-center justify-center rounded-lg transition-colors duration-150 relative',
                anyFocusActive ? 'text-focus-600 bg-focus-50' : 'text-ink-400 hover:text-ink-700 hover:bg-ink-100',
              ].join(' ')}
            >
              {/* Wand / sparkle icon */}
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                <path d="M2 13L9 6M9 6l1-3 3-1-1 3-3 1ZM9 6l-1-1" stroke="currentColor"
                      strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="3" r="0.75" fill="currentColor"/>
              </svg>
              {anyFocusActive && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-focus-500" />
              )}
            </button>

            {showFocusModes && (
              <div className="absolute right-0 top-9 z-20 bg-white rounded-xl shadow-lg
                              border border-ink-100 p-3 w-52 space-y-3 animate-fade-in">
                <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide">Focus modes</p>
                <FocusModeRow label="Bionic reading" active={bionicMode}   onToggle={toggleBionic} />
                <FocusModeRow label="Dyslexia font"  active={dyslexiaFont} onToggle={toggleDyslexia} />
                <SpacingRow   spacing={lineSpacing}  onCycle={cycleSpacing} />
                {!darkMode && (
                  <div className="pt-1 border-t border-ink-100">
                    <p className="text-xs font-semibold text-ink-400 uppercase tracking-wide mb-2">Highlight color</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {Object.entries(HIGHLIGHT_COLORS).map(([key, { bg, border, label }]) => (
                        <button
                          key={key}
                          onClick={() => setHighlightColor(key)}
                          title={label}
                          aria-label={label}
                          className="w-6 h-6 rounded-full transition-transform duration-100 hover:scale-110"
                          style={{
                            backgroundColor: bg,
                            boxShadow: highlightColor === key
                              ? `0 0 0 2px white, 0 0 0 3.5px ${border}`
                              : `0 0 0 1.5px ${border}55`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Font size controls */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={decrease}
              className="w-7 h-7 flex items-center justify-center rounded-lg
                         text-ink-400 hover:text-ink-700 hover:bg-ink-100
                         transition-colors duration-150 text-sm font-medium"
              aria-label="Decrease font size">A−</button>
            <button onClick={increase}
              className="w-7 h-7 flex items-center justify-center rounded-lg
                         text-ink-400 hover:text-ink-700 hover:bg-ink-100
                         transition-colors duration-150 text-sm font-medium"
              aria-label="Increase font size">A+</button>
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
          <span className="text-xs text-ink-300 font-mono">
            {readMode === 'paragraph'
              ? `Para ${currentParaIndex + 1} of ${paragraphs.length}`
              : `Line ${nonBlankPassed} of ${nonBlankTotal}`}
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
                className={['px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150',
                  readMode === 'line' ? 'bg-white text-ink-800 shadow-sm' : 'text-ink-400 hover:text-ink-600',
                ].join(' ')}
                aria-pressed={readMode === 'line'} title="Navigate line by line">≡ Line</button>
              <button
                onClick={() => setReadMode('paragraph')}
                className={['px-2.5 py-1 text-xs font-medium rounded-md transition-all duration-150',
                  readMode === 'paragraph' ? 'bg-white text-ink-800 shadow-sm' : 'text-ink-400 hover:text-ink-600',
                ].join(' ')}
                aria-pressed={readMode === 'paragraph'} title="Navigate paragraph by paragraph">¶ Para</button>
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
            const isBlock    = line.startsWith('§')
            const sectionAtLine  = sections.find(s => s.startLine === index)
            const isSectionStart = !!sectionAtLine && index > 0

            const isFlagged  = !isBlank && !isBlock && flaggedLines.has(index)

            const handleClick = () => {
              setCurrentIndex(index)
              if (isComplete) setIsComplete(false)
            }

            return (
              <div key={index} className={isFlagged ? 'border-l-2 border-amber-300 pl-1' : ''}>
                {isSectionStart && (
                  <div className="flex items-center gap-3 py-3 mt-2 mb-1 select-none">
                    <div className="flex-1 h-px reader-section-divider bg-ink-100" />
                    <span className="text-xs font-mono reader-section-label text-ink-400 tracking-wide uppercase shrink-0">
                      {sectionAtLine.title}
                    </span>
                    <div className="flex-1 h-px reader-section-divider bg-ink-100" />
                  </div>
                )}

                {isBlock ? (
                  <BlockCard
                    line={line}
                    isActive={isActive}
                    isRead={isRead}
                    activeRef={isActive ? activeLineRef : null}
                    onClick={handleClick}
                    fontSize={fontSize}
                    lineSpacing={lineSpacing}
                    dyslexiaFont={dyslexiaFont}
                    bionicMode={bionicMode}
                  />
                ) : (
                  <div
                    ref={isActive ? activeLineRef : null}
                    onClick={handleClick}
                    className={[
                      'reading-line',
                      isBlank ? 'py-2' : '',
                      isActive ? 'line-active' : isRead ? 'line-read' : 'line-inactive',
                    ].join(' ')}
                    style={{
                      fontSize:   `${fontSize}px`,
                      lineHeight: lineSpacing,
                      fontFamily: dyslexiaFont ? '"OpenDyslexic", sans-serif' : undefined,
                    }}
                    aria-current={isActive ? 'true' : undefined}
                  >
                    {isBlank
                      ? ' '
                      : bionicMode
                        ? bionicize(line)
                        : line}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Completion state — Quiz */}
        {isComplete && (
          <div className="mt-12 animate-slide-up">
            <Quiz
              lines={lines}
              questions={quizQuestions}
              isLoading={isGeneratingQuiz}
              onExit={() => { stopTTS(); onExit({ lastLine: currentIndex, isComplete: true }) }}
            />
          </div>
        )}
      </main>

      {/* ── Bottom nav bar ───────────────────────────────────── */}
      <footer className="sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-ink-100">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">

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

          <div className="text-xs text-ink-300 font-mono hidden sm:flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-ink-100 rounded text-ink-400">space</kbd>
            <span>or</span>
            <kbd className="px-1.5 py-0.5 bg-ink-100 rounded text-ink-400">↓</kbd>
            <span>{readMode === 'paragraph' ? 'next paragraph' : 'next line'}</span>
          </div>

          <button
            onClick={advance}
            disabled={isComplete}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium
                       bg-focus-600 text-white hover:bg-focus-700 active:scale-95
                       disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100
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
