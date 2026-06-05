// Focus Reader — Text-to-speech hook (Sprint 10)
// Uses browser-native window.speechSynthesis — no API key, no backend.
//
// Deliberately simple: no cancel-before-speak (which can break Chrome's
// user-gesture unlock), no useCallback complexity. Each speak() call
// clears the previous utterance only after a new one is ready.

import { useState, useEffect, useRef } from 'react'

const PREFS_KEY = 'focusreader_preferences'

function loadRate() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}').tts_rate ?? 1.0 }
  catch { return 1.0 }
}
function saveRate(r) {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...p, tts_rate: r }))
  } catch {}
}

function toSpeech(line) {
  if (!line || !line.trim()) return ''
  if (line.startsWith('§')) return line.slice(1).replace(/\n/g, '. ')
  return line
}

export const TTS_AVAILABLE = typeof window !== 'undefined' && 'speechSynthesis' in window

// Pre-warm voices as early as possible so they're ready when the user clicks.
if (TTS_AVAILABLE) window.speechSynthesis.getVoices()

export function useTTS({ lines, currentIndex, onAdvance, isComplete }) {
  const [isEnabled,  setIsEnabled]  = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused,   setIsPaused]   = useState(false)
  const [rate,       setRateState]  = useState(loadRate)

  // Plain refs — no closure magic needed
  const enabledRef  = useRef(false)
  const completeRef = useRef(false)
  const advanceRef  = useRef(onAdvance)

  useEffect(() => { enabledRef.current  = isEnabled },  [isEnabled])
  useEffect(() => { completeRef.current = isComplete }, [isComplete])
  useEffect(() => { advanceRef.current  = onAdvance  }, [onAdvance])

  // The single utterance in flight
  const utterRef = useRef(null)

  function speak(text, spRate) {
    if (!TTS_AVAILABLE) return

    const speech = toSpeech(text)
    if (!speech.trim()) {
      // Silent line — advance immediately
      if (enabledRef.current && !completeRef.current) advanceRef.current?.()
      return
    }

    // Pick a voice. Attempt each call to getVoices() in case they loaded since last call.
    const voices    = window.speechSynthesis.getVoices()
    const engVoice  = voices.find(v => v.lang.startsWith('en') && v.localService)
                   || voices.find(v => v.lang.startsWith('en'))
                   || voices[0]
                   || null

    const utter     = new SpeechSynthesisUtterance(speech)
    utter.rate      = spRate ?? 1.0
    utter.volume    = 1.0
    utter.lang      = 'en-US'
    if (engVoice) utter.voice = engVoice

    utter.onstart   = () => { setIsSpeaking(true);  setIsPaused(false) }
    utter.onend     = () => {
      setIsSpeaking(false)
      setIsPaused(false)
      utterRef.current = null
      if (enabledRef.current && !completeRef.current) advanceRef.current?.()
    }
    utter.onerror   = e => {
      if (e.error === 'interrupted') return  // intentional cancel — ignore
      console.warn('[TTS] SpeechSynthesisUtterance error:', e.error)
      setIsSpeaking(false)
      setIsPaused(false)
      utterRef.current = null
    }

    // Stop whatever is playing, then start the new utterance
    window.speechSynthesis.cancel()
    utterRef.current = utter
    window.speechSynthesis.speak(utter)
  }

  // When the line advances while TTS is on, speak the new line
  useEffect(() => {
    if (!enabledRef.current || !TTS_AVAILABLE) return
    if (completeRef.current) { window.speechSynthesis.cancel(); return }
    const line = lines[currentIndex]
    if (line !== undefined) speak(line, rate)
  }, [currentIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stop on completion
  useEffect(() => {
    if (isComplete && enabledRef.current) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
    }
  }, [isComplete]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public interface ────────────────────────────────────────────────────────

  function toggle() {
    const next = !isEnabled
    enabledRef.current = next   // sync before any async state updates
    setIsEnabled(next)

    if (!next) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
    } else {
      // This branch runs directly inside a user-click handler — Chrome allows speak() here
      const line = lines[currentIndex]
      if (line !== undefined && !isComplete) speak(line, rate)
    }
  }

  function togglePause() {
    if (!TTS_AVAILABLE) return
    if (isSpeaking) {
      window.speechSynthesis.pause()
      setIsSpeaking(false)
      setIsPaused(true)
    } else if (isPaused) {
      window.speechSynthesis.resume()
      setIsSpeaking(true)
      setIsPaused(false)
    } else {
      // Between lines or failed to start — re-speak current line (also a user gesture)
      const line = lines[currentIndex]
      if (line !== undefined && !isComplete) speak(line, rate)
    }
  }

  function setRate(newRate) {
    setRateState(newRate)
    saveRate(newRate)
    // Restart current line at new speed
    if (enabledRef.current && !isComplete) {
      const line = lines[currentIndex]
      if (line !== undefined) speak(line, newRate)
    }
  }

  function stop() {
    enabledRef.current = false
    setIsEnabled(false)
    window.speechSynthesis.cancel()
    setIsSpeaking(false)
    setIsPaused(false)
  }

  return { isEnabled, toggle, isSpeaking, isPaused, togglePause, rate, setRate, stop }
}
