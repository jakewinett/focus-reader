// Focus Reader — Text-to-speech hook (Sprint 10)
// Uses browser-native window.speechSynthesis — no API key, no backend.
//
// Key design rule: only the first speak() call can safely come from a user-gesture
// handler (Chrome 71+ requirement). Subsequent calls (on line advance) happen in
// speechSynthesis.onend callbacks which browsers treat as legitimate event contexts.
//
// To avoid double-calling speak(): toggle() handles the initial utterance directly
// (in user-gesture context). The useEffect only fires on currentIndex changes —
// NOT on isEnabled changes — so it never races with toggle().

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
  const [rate,       setRateState]  = useState(() => getTTSRate())

  // Refs — allow callbacks to read latest values without being in deps arrays
  const isEnabledRef  = useRef(false)
  const isCompleteRef = useRef(isComplete)

  // Keep refs in sync with state (synchronously in toggle/stop, and via effects)
  useEffect(() => { isCompleteRef.current = isComplete }, [isComplete])

  const cancelSpeech = useCallback(() => {
    if (!TTS_AVAILABLE) return
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [])

  const speakLine = useCallback((text, currentRate) => {
    if (!TTS_AVAILABLE) return

    const speech = lineToSpeech(text)

    // Blank / empty line — skip immediately
    if (!speech.trim()) {
      if (isEnabledRef.current && !isCompleteRef.current) onAdvance()
      return
    }

    window.speechSynthesis.cancel()

    const utter   = new SpeechSynthesisUtterance(speech)
    utter.rate    = currentRate
    utter.onstart = () => setIsSpeaking(true)
    utter.onend   = () => {
      setIsSpeaking(false)
      if (isEnabledRef.current && !isCompleteRef.current) onAdvance()
    }
    utter.onerror = e => {
      if (e.error === 'interrupted') return  // we cancelled intentionally — suppress
      setIsSpeaking(false)
    }

    window.speechSynthesis.speak(utter)
  }, [onAdvance])

  // Auto-speak on line change ONLY — NOT on isEnabled change.
  // toggle() handles the first utterance directly in user-gesture context.
  // Subsequent utterances fire here, triggered by currentIndex advancing.
  useEffect(() => {
    if (!isEnabledRef.current || !TTS_AVAILABLE) return
    if (isCompleteRef.current) { cancelSpeech(); return }
    if (lines[currentIndex] !== undefined) speakLine(lines[currentIndex], rate)
  }, [currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop on reading completion
  useEffect(() => {
    if (isComplete && isEnabledRef.current) cancelSpeech()
  }, [isComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle() {
    const next = !isEnabled
    // Update ref synchronously so speakLine's onend callback sees the right value
    isEnabledRef.current = next
    setIsEnabled(next)
    if (!next) {
      cancelSpeech()
    } else if (!isComplete && lines[currentIndex] !== undefined) {
      // Called directly in user-gesture handler — Chrome allows speak() here
      speakLine(lines[currentIndex], rate)
    }
  }

  function togglePause() {
    if (!TTS_AVAILABLE) return
    const ss = window.speechSynthesis
    if (ss.speaking && !ss.paused) {
      ss.pause()
      setIsSpeaking(false)
    } else if (ss.paused) {
      ss.resume()
      setIsSpeaking(true)
    } else {
      // Not speaking and not paused (e.g. between lines) — restart current line
      speakLine(lines[currentIndex], rate)
    }
  }

  function setRate(newRate) {
    setRateState(newRate)
    saveTTSRate(newRate)
    // Restart current line at new rate if actively speaking
    if (isEnabledRef.current && !isComplete) speakLine(lines[currentIndex], newRate)
  }

  function stop() {
    isEnabledRef.current = false
    setIsEnabled(false)
    cancelSpeech()
  }

  return { isEnabled, toggle, isSpeaking, togglePause, rate, setRate, stop }
}
