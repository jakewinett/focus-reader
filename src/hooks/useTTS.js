// Focus Reader — Text-to-speech hook (Sprint 10)
// Uses browser-native window.speechSynthesis — no API key, no backend.
// When enabled, reads each line aloud and auto-advances on utterance end.

import { useState, useEffect, useRef, useCallback } from 'react'

const PREFS_KEY = 'focusreader_preferences'

function getTTSRate() {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')
    return prefs.tts_rate ?? 1.0
  } catch { return 1.0 }
}

function saveTTSRate(rate) {
  try {
    const prefs = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...prefs, tts_rate: rate }))
  } catch {}
}

// Convert a raw line string to speakable text
function lineToSpeech(line) {
  if (!line || line.trim() === '') return ''
  // Block card: strip § prefix, join items with pauses
  if (line.startsWith('§')) {
    return line.slice(1).replace(/\n/g, '. ')
  }
  return line
}

export const TTS_AVAILABLE = typeof window !== 'undefined' && 'speechSynthesis' in window

export function useTTS({ lines, currentIndex, onAdvance, isComplete }) {
  const [isEnabled,  setIsEnabled]  = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [rate,       setRateState]  = useState(() => getTTSRate())

  // Refs to avoid stale closures inside SpeechSynthesisUtterance callbacks
  const isEnabledRef  = useRef(false)
  const isCompleteRef = useRef(isComplete)
  const utterRef      = useRef(null)

  useEffect(() => { isEnabledRef.current = isEnabled },  [isEnabled])
  useEffect(() => { isCompleteRef.current = isComplete }, [isComplete])

  const cancelSpeech = useCallback(() => {
    if (!TTS_AVAILABLE) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    utterRef.current = null
  }, [])

  const speakLine = useCallback((text, currentRate) => {
    if (!TTS_AVAILABLE) return

    const speech = lineToSpeech(text)

    // Skip blank / empty lines immediately
    if (!speech.trim()) {
      if (isEnabledRef.current && !isCompleteRef.current) onAdvance()
      return
    }

    window.speechSynthesis.cancel()

    const utter     = new SpeechSynthesisUtterance(speech)
    utter.rate      = currentRate
    utter.onstart   = () => setIsSpeaking(true)
    utter.onend     = () => {
      setIsSpeaking(false)
      utterRef.current = null
      // Auto-advance only if TTS is still enabled and reading isn't complete
      if (isEnabledRef.current && !isCompleteRef.current) {
        onAdvance()
      }
    }
    utter.onerror   = (e) => {
      // 'interrupted' fires when we cancel intentionally — suppress it
      if (e.error === 'interrupted') return
      setIsSpeaking(false)
      utterRef.current = null
    }

    utterRef.current = utter
    window.speechSynthesis.speak(utter)
  }, [onAdvance])

  // Speak whenever the current line changes (and TTS is enabled)
  useEffect(() => {
    if (!isEnabled || !TTS_AVAILABLE) return
    if (isComplete) { cancelSpeech(); return }
    const line = lines[currentIndex]
    if (line !== undefined) speakLine(line, rate)
  }, [currentIndex, isEnabled]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop when reading completes
  useEffect(() => {
    if (isComplete && isEnabled) cancelSpeech()
  }, [isComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    const next = !isEnabled
    setIsEnabled(next)
    if (!next) cancelSpeech()
    else if (!isComplete && lines[currentIndex] !== undefined) {
      speakLine(lines[currentIndex], rate)
    }
  }

  function togglePause() {
    if (!TTS_AVAILABLE) return
    if (isSpeaking) {
      window.speechSynthesis.pause()
      setIsSpeaking(false)
    } else {
      window.speechSynthesis.resume()
      setIsSpeaking(true)
    }
  }

  function setRate(newRate) {
    setRateState(newRate)
    saveTTSRate(newRate)
    // If currently speaking, restart the current line at the new rate
    if (isEnabled && !isComplete) {
      const line = lines[currentIndex]
      if (line !== undefined) speakLine(line, newRate)
    }
  }

  function stop() {
    setIsEnabled(false)
    cancelSpeech()
  }

  return { isEnabled, toggle, isSpeaking, togglePause, rate, setRate, stop }
}
