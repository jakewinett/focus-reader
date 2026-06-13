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
function loadVoiceName() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}').tts_voice ?? '' }
  catch { return '' }
}
function saveVoiceName(name) {
  try {
    const p = JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...p, tts_voice: name }))
  } catch {}
}

export const TTS_AVAILABLE = typeof window !== 'undefined' && 'speechSynthesis' in window

// Pre-warm voices as early as possible so they're ready when the user clicks.
if (TTS_AVAILABLE) window.speechSynthesis.getVoices()

// Score an English voice: higher = more natural-sounding.
//
// Priority ladder:
//  6 — Google US English (Chrome cloud TTS, very natural)
//  5 — Any other Google voice
//  4 — Explicitly labelled Enhanced / Premium / Neural
//  3 — Apple Siri-generation neural families (macOS 13+): Sandy, Shelley, Reed,
//       Rocko, Flo, Eddy, Grandma, Grandpa — sound like real people, no label.
//       en-US variants preferred over other locales.
//  2 — Same families, non-US locale
//  1 — Any other local en-US voice (e.g. Samantha, Daniel)
//  0 — Any other local voice
// -1 — eSpeak or non-local fallback (avoid)
const SIRI_FAMILIES = /^(Sandy|Shelley|Reed|Rocko|Flo|Eddy|Grandma|Grandpa)\b/i
const SIRI_VOICE    = /^Siri Voice [12]\b/i
function scoreVoice(v) {
  if (v.name.includes('Google') && v.lang === 'en-US') return 6
  if (v.name.includes('Google')) return 5
  if (/Enhanced|Premium|Neural/i.test(v.name)) return 4
  if (SIRI_FAMILIES.test(v.name) && v.lang === 'en-US') return 3
  if (SIRI_VOICE.test(v.name)    && v.lang === 'en-US') return 3
  if (SIRI_FAMILIES.test(v.name)) return 2
  if (SIRI_VOICE.test(v.name))    return 2
  if (v.localService && !/espeak/i.test(v.name) && v.lang === 'en-US') return 1
  if (v.localService && !/espeak/i.test(v.name)) return 0
  return -1
}

// Returns English voices sorted best-first.
export function getSortedVoices() {
  if (!TTS_AVAILABLE) return []
  return window.speechSynthesis.getVoices()
    .filter(v => v.lang.startsWith('en'))
    .sort((a, b) => scoreVoice(b) - scoreVoice(a))
}

// True when no available voice scores ≥ 3 (i.e. no neural/cloud/Google voice).
export function isTTSVoiceQualityLow() {
  if (!TTS_AVAILABLE) return false
  const best = getSortedVoices()[0]
  return !best || scoreVoice(best) < 3
}

// Pick the best voice given a saved preference name.
function resolveVoice(savedName) {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null
  if (savedName) {
    const match = voices.find(v => v.name === savedName)
    if (match) return match
  }
  // Fall back to highest-scoring English voice
  const eng = voices.filter(v => v.lang.startsWith('en'))
  const sorted = [...eng].sort((a, b) => scoreVoice(b) - scoreVoice(a))
  return sorted[0] || voices[0] || null
}

function toSpeech(line) {
  if (!line || !line.trim()) return ''
  if (line.startsWith('§')) return line.slice(1).replace(/\n/g, '. ')
  return line
}

// Retry wrapper: Chrome sometimes fires 'canceled' spuriously on the first
// speak() call even when the queue was empty. Retry once with a short delay.
function speakWithRetry(utter, attempt = 0) {
  if (!TTS_AVAILABLE) return
  const originalError = utter.onerror
  if (attempt === 0) {
    utter.onerror = e => {
      if (e.error === 'canceled' && attempt === 0) {
        // Re-create utterance (used utterances can't be re-spoken)
        const retry = new SpeechSynthesisUtterance(utter.text)
        retry.rate   = utter.rate
        retry.lang   = utter.lang
        retry.volume = utter.volume
        if (utter.voice) retry.voice = utter.voice
        retry.onstart = utter.onstart
        retry.onend   = utter.onend
        retry.onerror = originalError  // use original handler for retry
        setTimeout(() => window.speechSynthesis.speak(retry), 100)
        return
      }
      originalError?.(e)
    }
  }
  window.speechSynthesis.speak(utter)
}

export function useTTS({ lines, currentIndex, onAdvance, isComplete }) {
  const [isEnabled,      setIsEnabled]      = useState(false)
  const [isSpeaking,     setIsSpeaking]     = useState(false)
  const [isPaused,       setIsPaused]       = useState(false)
  const [rate,           setRateState]      = useState(loadRate)
  const [voiceName,      setVoiceNameState] = useState(loadVoiceName)
  const [voiceOptions,   setVoiceOptions]   = useState(() => getSortedVoices())

  // Plain refs — no closure magic needed
  const enabledRef   = useRef(false)
  const completeRef  = useRef(false)
  const advanceRef   = useRef(onAdvance)
  const voiceNameRef = useRef(loadVoiceName())

  useEffect(() => { enabledRef.current  = isEnabled },  [isEnabled])
  useEffect(() => { completeRef.current = isComplete }, [isComplete])
  useEffect(() => { advanceRef.current  = onAdvance  }, [onAdvance])
  useEffect(() => { voiceNameRef.current = voiceName  }, [voiceName])

  // Chrome loads voices asynchronously — refresh options when they arrive.
  // Also auto-select the best voice if no preference has been saved yet.
  useEffect(() => {
    if (!TTS_AVAILABLE) return
    const refresh = () => {
      const sorted = getSortedVoices()
      setVoiceOptions(sorted)
      if (!voiceNameRef.current && sorted.length) {
        const best = sorted[0].name
        voiceNameRef.current = best
        setVoiceNameState(best)
        saveVoiceName(best)
      }
    }
    window.speechSynthesis.addEventListener('voiceschanged', refresh)
    // Also run immediately in case voices are already loaded (e.g. Safari)
    refresh()
    return () => window.speechSynthesis.removeEventListener('voiceschanged', refresh)
  }, [])

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

    // Resolve voice: honour saved preference, fall back to highest-quality English voice.
    const engVoice = resolveVoice(voiceNameRef.current)

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

    // Only cancel if something is already speaking/queued — avoids the Chrome
    // bug where cancel() on an empty queue triggers 'canceled' on the next speak()
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel()
    }
    utterRef.current = utter
    speakWithRetry(utter)
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

  function setVoiceName(name) {
    voiceNameRef.current = name
    setVoiceNameState(name)
    saveVoiceName(name)
    // Restart current line with the new voice if TTS is active
    if (enabledRef.current && !isComplete) {
      const line = lines[currentIndex]
      if (line !== undefined) speak(line, rate)
    }
  }

  return {
    isEnabled, toggle, isSpeaking, isPaused, togglePause,
    rate, setRate, stop,
    voiceName, setVoiceName, voiceOptions,
  }
}
