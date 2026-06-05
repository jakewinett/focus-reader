// Focus Reader — Text-to-speech hook (Sprint 10)
// Uses browser-native window.speechSynthesis — no API key, no backend.

import { useState, useEffect, useRef, useCallback } from 'react'

const PREFS_KEY = 'focusreader_preferences'

function getTTSRate() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}').tts_rate ?? 1.0 }
  catch { return 1.0 }
}

function saveTTSRate(rate) {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...p, tts_rate: rate }))
  } catch {}
}

function lineToSpeech(line) {
  if (!line || line.trim() === '') return ''
  if (line.startsWith('§')) return line.slice(1).replace(/\n/g, '. ')
  return line
}

export const TTS_AVAILABLE = typeof window !== 'undefined' && 'speechSynthesis' in window

export function useTTS({ lines, currentIndex, onAdvance, isComplete }) {
  const [isEnabled,  setIsEnabled]  = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused,   setIsPaused]   = useState(false)
  const [rate,       setRateState]  = useState(() => getTTSRate())

  const isEnabledRef  = useRef(false)
  const isCompleteRef = useRef(isComplete)

  useEffect(() => { isCompleteRef.current = isComplete }, [isComplete])

  const cancelSpeech = useCallback(() => {
    if (!TTS_AVAILABLE) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsPaused(false)
  }, [])

  const speakLine = useCallback((text, currentRate) => {
    if (!TTS_AVAILABLE) return

    const speech = lineToSpeech(text)
    if (!speech.trim()) {
      if (isEnabledRef.current && !isCompleteRef.current) onAdvance()
      return
    }

    // Chrome bug: synthesis can get stuck if it was paused (e.g. page was backgrounded).
    // Resume first to wake it up, then cancel to clear the queue.
    if (window.speechSynthesis.paused) window.speechSynthesis.resume()
    window.speechSynthesis.cancel()

    const utter   = new SpeechSynthesisUtterance(speech)
    utter.rate    = currentRate
    utter.onstart = () => { setIsSpeaking(true); setIsPaused(false) }
    utter.onend   = () => {
      setIsSpeaking(false)
      setIsPaused(false)
      if (isEnabledRef.current && !isCompleteRef.current) onAdvance()
    }
    utter.onerror = e => {
      if (e.error === 'interrupted') return
      setIsSpeaking(false)
      setIsPaused(false)
    }

    window.speechSynthesis.speak(utter)
  }, [onAdvance])

  // Speak when the current line index changes — NOT when isEnabled changes.
  // toggle() owns the first utterance (user-gesture context); this effect
  // handles all subsequent auto-advances after onend fires.
  useEffect(() => {
    if (!isEnabledRef.current || !TTS_AVAILABLE) return
    if (isCompleteRef.current) { cancelSpeech(); return }
    if (lines[currentIndex] !== undefined) speakLine(lines[currentIndex], rate)
  }, [currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isComplete && isEnabledRef.current) cancelSpeech()
  }, [isComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    const next = !isEnabled
    isEnabledRef.current = next   // sync update so onend/onstart callbacks see it immediately
    setIsEnabled(next)
    if (!next) {
      cancelSpeech()
    } else if (!isComplete && lines[currentIndex] !== undefined) {
      // Directly in user-gesture handler — Chrome allows speak() here
      speakLine(lines[currentIndex], rate)
    }
  }

  function togglePause() {
    if (!TTS_AVAILABLE) return
    const ss = window.speechSynthesis
    if (isSpeaking && !ss.paused) {
      ss.pause()
      setIsSpeaking(false)
      setIsPaused(true)
    } else if (isPaused || ss.paused) {
      ss.resume()
      setIsSpeaking(true)
      setIsPaused(false)
    } else {
      // Not speaking, not paused — manually start current line.
      // Also covers the case where the initial auto-speak silently failed.
      speakLine(lines[currentIndex], rate)
    }
  }

  function setRate(newRate) {
    setRateState(newRate)
    saveTTSRate(newRate)
    if (isEnabledRef.current && !isComplete) speakLine(lines[currentIndex], newRate)
  }

  function stop() {
    isEnabledRef.current = false
    setIsEnabled(false)
    cancelSpeech()
  }

  // isPaused: true only when user explicitly paused — not when speech is between lines
  return { isEnabled, toggle, isSpeaking, isPaused, togglePause, rate, setRate, stop }
}
