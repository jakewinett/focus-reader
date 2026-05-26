import { useState, useEffect, useRef, useCallback } from 'react'

// Reads calibrated WPM from localStorage (set by a previous session).
// After 60 seconds of active reading, measures actual pace and updates.
// Returns: { estimatedMinutes, isCalibrated, recordProgress }

const STORAGE_KEY = 'focusreader_preferences'
const CALIBRATION_WINDOW_MS = 60_000  // 60 seconds
const DEFAULT_WPM = 200               // fallback before calibration

function loadPreferences() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { font_size: 18, calibrated_wpm: null }
    return JSON.parse(raw)
  } catch {
    return { font_size: 18, calibrated_wpm: null }
  }
}

function savePreferences(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // localStorage unavailable — silently continue
  }
}

export function useReadingPace(totalWords) {
  const prefs                   = loadPreferences()
  const [isCalibrated, setIsCalibrated] = useState(!!prefs.calibrated_wpm)
  const [wpm, setWpm]           = useState(prefs.calibrated_wpm || DEFAULT_WPM)
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    Math.ceil(totalWords / (prefs.calibrated_wpm || DEFAULT_WPM))
  )

  // Calibration tracking
  const startTimeRef   = useRef(null)
  const wordsReadRef   = useRef(0)
  const calibratedRef  = useRef(!!prefs.calibrated_wpm)

  // Called each time the reader advances a line.
  // wordsInLine: word count of the line just completed.
  // remainingWords: words not yet read.
  const recordProgress = useCallback((wordsInLine, remainingWords) => {
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now()
    }

    wordsReadRef.current += wordsInLine

    const elapsed = Date.now() - startTimeRef.current

    // Calibrate after 60 seconds of reading
    if (!calibratedRef.current && elapsed >= CALIBRATION_WINDOW_MS) {
      const measuredWpm = Math.round((wordsReadRef.current / elapsed) * 60_000)
      const clampedWpm  = Math.min(Math.max(measuredWpm, 80), 600) // sanity clamp

      calibratedRef.current = true
      setIsCalibrated(true)
      setWpm(clampedWpm)

      // Persist for future sessions
      const updated = { ...loadPreferences(), calibrated_wpm: clampedWpm }
      savePreferences(updated)
    }

    // Always update the estimate
    const currentWpm = calibratedRef.current ? wpm : DEFAULT_WPM
    const mins = Math.ceil(remainingWords / currentWpm)
    setEstimatedMinutes(Math.max(0, mins))
  }, [wpm])

  return { estimatedMinutes, isCalibrated, wpm, recordProgress }
}

// Separate hook for font size preference
export function useFontSize() {
  const prefs = loadPreferences()
  const [fontSize, setFontSize] = useState(prefs.font_size || 18)

  function increase() {
    setFontSize(prev => {
      const next = Math.min(prev + 2, 28)
      savePreferences({ ...loadPreferences(), font_size: next })
      return next
    })
  }

  function decrease() {
    setFontSize(prev => {
      const next = Math.max(prev - 2, 14)
      savePreferences({ ...loadPreferences(), font_size: next })
      return next
    })
  }

  return { fontSize, increase, decrease }
}
