// Focus Reader — Display preference hook (Sprint 10)
// Manages bionic reading, dyslexia font, and line spacing.
// All prefs stored in focusreader_preferences alongside font_size and tts_rate.

const PREFS_KEY = 'focusreader_preferences'

function loadPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) ?? '{}')
  } catch { return {} }
}

function savePrefs(patch) {
  try {
    const current = loadPrefs()
    localStorage.setItem(PREFS_KEY, JSON.stringify({ ...current, ...patch }))
  } catch {}
}

const SPACING_STEPS = [1.8, 2.2, 2.8]

import { useState, useEffect } from 'react'

export function useDisplayPrefs() {
  const [bionicMode,   setBionicMode]   = useState(() => !!loadPrefs().bionic_mode)
  const [dyslexiaFont, setDyslexiaFont] = useState(() => !!loadPrefs().dyslexia_font)
  const [lineSpacing,  setLineSpacing]  = useState(() => loadPrefs().line_spacing ?? 1.8)

  // Lazily load the OpenDyslexic font the first time the user enables it
  useEffect(() => {
    if (dyslexiaFont) {
      import('@fontsource/opendyslexic').catch(() => {})
    }
  }, [dyslexiaFont])

  function toggleBionic() {
    setBionicMode(v => {
      savePrefs({ bionic_mode: !v })
      return !v
    })
  }

  function toggleDyslexia() {
    setDyslexiaFont(v => {
      savePrefs({ dyslexia_font: !v })
      return !v
    })
  }

  function cycleSpacing() {
    setLineSpacing(v => {
      const idx  = SPACING_STEPS.indexOf(v)
      const next = SPACING_STEPS[(idx + 1) % SPACING_STEPS.length]
      savePrefs({ line_spacing: next })
      return next
    })
  }

  const anyActive = bionicMode || dyslexiaFont || lineSpacing !== 1.8

  return { bionicMode, toggleBionic, dyslexiaFont, toggleDyslexia, lineSpacing, cycleSpacing, anyActive }
}
