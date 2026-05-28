import { useState } from 'react'

// Sprint 8: Optional API key configuration (FR-25 supplement).
// The app works fully without a key — AI features are optional enhancements.
// Stored in localStorage as 'focusreader_api_key' and read dynamically by
// src/api/claude.js on every request (no page reload needed).

const STORAGE_KEY = 'focusreader_api_key'

export default function SettingsModal({ onClose }) {
  const [apiKey, setApiKey]   = useState(() => localStorage.getItem(STORAGE_KEY) ?? '')
  const [showKey, setShowKey] = useState(false)
  const [saved, setSaved]     = useState(false)

  const hasStoredKey = Boolean(localStorage.getItem(STORAGE_KEY))

  function handleSave() {
    const trimmed = apiKey.trim()
    if (!trimmed) return
    localStorage.setItem(STORAGE_KEY, trimmed)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  function handleRemove() {
    localStorage.removeItem(STORAGE_KEY)
    setApiKey('')
    setSaved(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
    >
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* Header */}
        <div className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink-800">Settings</h2>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg
                       text-ink-400 hover:text-ink-700 hover:bg-ink-100
                       transition-colors text-lg leading-none"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* API key section */}
          <div>
            <label className="block text-xs font-semibold text-ink-600 mb-1.5 uppercase tracking-wide">
              Anthropic API key
              <span className="ml-2 text-ink-300 font-normal normal-case tracking-normal">
                (optional)
              </span>
            </label>

            {/* Status badge */}
            <div className="flex items-center gap-2 mb-3">
              <span className={[
                'inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium',
                hasStoredKey
                  ? 'bg-sage-50 text-sage-700'
                  : 'bg-ink-100 text-ink-500',
              ].join(' ')}>
                <span className={[
                  'w-1.5 h-1.5 rounded-full',
                  hasStoredKey ? 'bg-sage-400' : 'bg-ink-300',
                ].join(' ')} />
                {hasStoredKey ? 'Key saved' : 'No key set'}
              </span>
            </div>

            {/* Input row */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={e => setApiKey(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="sk-ant-api03-…"
                  className="w-full px-3 py-2 pr-9 text-xs font-mono rounded-xl border border-ink-200
                             focus:outline-none focus:ring-2 focus:ring-focus-300 focus:border-focus-400
                             placeholder:text-ink-300 text-ink-700 bg-white"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <button
                  onClick={() => setShowKey(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-300
                             hover:text-ink-500 transition-colors text-xs"
                  aria-label={showKey ? 'Hide key' : 'Show key'}
                  tabIndex={-1}
                >
                  {showKey ? '🙈' : '👁'}
                </button>
              </div>

              <button
                onClick={handleSave}
                disabled={!apiKey.trim()}
                className={[
                  'px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150',
                  saved
                    ? 'bg-sage-500 text-white'
                    : 'bg-focus-600 text-white hover:bg-focus-700 active:scale-95',
                  !apiKey.trim() && 'opacity-40 cursor-not-allowed',
                ].join(' ')}
              >
                {saved ? 'Saved ✓' : 'Save'}
              </button>
            </div>

            {/* Remove link */}
            {hasStoredKey && (
              <button
                onClick={handleRemove}
                className="mt-2 text-xs text-ink-400 hover:text-red-500 transition-colors"
              >
                Remove saved key
              </button>
            )}
          </div>

          {/* Info note */}
          <div className="bg-ink-50 rounded-xl px-4 py-3 text-xs text-ink-500 leading-relaxed space-y-1.5">
            <p>
              <span className="font-semibold text-ink-700">AI features are optional.</span>{' '}
              Section analysis, retention quiz, and syllabus parsing require a key.
              Core reading works without one.
            </p>
            <p>
              Get a key at{' '}
              <a
                href="https://console.anthropic.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-focus-600 hover:underline"
              >
                console.anthropic.com
              </a>
              . Your key is stored only on this device.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ink-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-ink-600 hover:text-ink-800
                       bg-ink-100 hover:bg-ink-200 rounded-xl transition-colors duration-150"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  )
}
