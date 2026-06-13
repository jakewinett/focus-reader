// Focus Reader — Display preference hook (Sprint 10)
// Manages bionic reading, dyslexia font, line spacing, dark mode, and highlight color.
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

// 6 highlight colors for light mode — all tested for readability with dark ink-900 text
export const HIGHLIGHT_COLORS = {
  teal:   { bg: '#CCFBF1', border: '#0F766E', label: 'Teal'   },
  yellow: { bg: '#FEF9C3', border: '#A16207', label: 'Yellow' },
  green:  { bg: '#DCFCE7', border: '#15803D', label: 'Green'  },
  purple: { bg: '#EDE9FE', border: '#7C3AED', label: 'Purple' },
  blue:   { bg: '#DBEAFE', border: '#1D4ED8', label: 'Blue'   },
  rose:   { bg: '#FFE4E6', border: '#BE123C', label: 'Rose'   },
}

import { useState, useEffect } from 'react'

export function useDisplayPrefs() {
  const [bionicMode,      setBionicMode]      = useState(() => !!loadPrefs().bionic_mode)
  const [dyslexiaFont,    setDyslexiaFont]    = useState(() => !!loadPrefs().dyslexia_font)
  const [lineSpacing,     setLineSpacing]     = useState(() => loadPrefs().line_spacing ?? 1.8)
  const [darkMode,        setDarkModeState]   = useState(() => !!loadPrefs().dark_mode)
  const [highlightColor,  setHighlightColorState] = useState(
    () => loadPrefs().highlight_color ?? 'teal'
  )

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

  function toggleDarkMode() {
    setDarkModeState(v => {
      savePrefs({ dark_mode: !v })
      return !v
    })
  }

  function setHighlightColor(key) {
    setHighlightColorState(key)
    savePrefs({ highlight_color: key })
  }

  const anyActive = bionicMode || dyslexiaFont || lineSpacing !== 1.8

  return {
    bionicMode, toggleBionic,
    dyslexiaFont, toggleDyslexia,
    lineSpacing, cycleSpacing,
    darkMode, toggleDarkMode,
    highlightColor, setHighlightColor,
    anyActive,
  }
}
