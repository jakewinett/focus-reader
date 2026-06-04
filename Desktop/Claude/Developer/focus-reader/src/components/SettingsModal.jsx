// Focus Reader — Settings modal (Sprint 9 update)
// Signed-in users: API key stored in Supabase user_settings (never in browser).
// Anonymous / local-install users: API key stored in localStorage (existing behaviour).

import { useState, useEffect } from 'react'
import { useAppAuth } from '../lib/AuthContext.jsx'
import { supabase, SUPABASE_ENABLED } from '../lib/supabase.js'

const LOCAL_KEY = 'focusreader_api_key'

export default function SettingsModal({ onClose }) {
  const { isSignedIn, userId } = useAppAuth()
  const useCloud = isSignedIn && SUPABASE_ENABLED

  const [apiKey,   setApiKey]   = useState('')
  const [showKey,  setShowKey]  = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [loading,  setLoading]  = useState(useCloud)
  const [hasKey,   setHasKey]   = useState(false)
  const [usage,    setUsage]    = useState(null) // { used, limit } | null

  const DAILY_LIMIT = Number(import.meta.env.VITE_DAILY_AI_LIMIT ?? 25)

  // Load existing API key and today's usage on mount
  useEffect(() => {
    if (useCloud && supabase && userId) {
      // Fetch stored API key
      supabase
        .from('user_settings')
        .select('api_key')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          const key = data?.api_key ?? ''
          setApiKey(key)
          setHasKey(!!key)
          setLoading(false)
        })
        .catch(() => setLoading(false))

      // Fetch today's usage
      const since = new Date(Date.now() - 86_400_000).toISOString()
      supabase
        .from('ai_usage')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', since)
        .then(({ count }) => {
          setUsage({ used: count ?? 0, limit: DAILY_LIMIT })
        })
    } else {
      const stored = localStorage.getItem(LOCAL_KEY) ?? ''
      setApiKey(stored)
      setHasKey(!!stored)
      setLoading(false)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleSave() {
    const trimmed = apiKey.trim()
    if (!trimmed) return

    if (useCloud && supabase && userId) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: userId, api_key: trimmed, updated_at: new Date().toISOString() })
    } else {
      try { localStorage.setItem(LOCAL_KEY, trimmed) } catch {}
    }
    setHasKey(true)
    setSaved(true)
    setTimeout(() => setSaved(false), 1500)
  }

  async function handleRemove() {
    if (useCloud && supabase && userId) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: userId, api_key: null, updated_at: new Date().toISOString() })
    } else {
      try { localStorage.removeItem(LOCAL_KEY) } catch {}
    }
    setApiKey('')
    setHasKey(false)
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
          >×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">

          {/* AI usage (signed-in users on operator key) */}
          {usage && !hasKey && (
            <div className="bg-ink-50 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-ink-600 mb-1.5 uppercase tracking-wide">
                AI calls today
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-ink-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-focus-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.round((usage.used / usage.limit) * 100))}%` }}
                  />
                </div>
                <span className="text-xs text-ink-500 font-mono shrink-0">
                  {usage.used} / {usage.limit}
                </span>
              </div>
              <p className="text-xs text-ink-400 mt-1.5">
                Add your own key below for unlimited access.
              </p>
            </div>
          )}

          {/* API key section */}
          {loading ? (
            <div className="h-16 bg-ink-50 rounded-xl animate-pulse-soft" />
          ) : (
            <div>
              <label className="block text-xs font-semibold text-ink-600 mb-1.5 uppercase tracking-wide">
                Your Anthropic API key
                <span className="ml-2 text-ink-300 font-normal normal-case tracking-normal">(optional — unlimited AI)</span>
              </label>

              {/* Status badge */}
              <div className="flex items-center gap-2 mb-3">
                <span className={[
                  'inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium',
                  hasKey ? 'bg-sage-50 text-sage-700' : 'bg-ink-100 text-ink-500',
                ].join(' ')}>
                  <span className={['w-1.5 h-1.5 rounded-full', hasKey ? 'bg-sage-400' : 'bg-ink-300'].join(' ')} />
                  {hasKey ? 'Key saved' : 'Using shared key'}
                </span>
                {useCloud && (
                  <span className="text-xs text-ink-400">
                    · stored securely on server
                  </span>
                )}
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
                    saved ? 'bg-sage-500 text-white'
                           : 'bg-focus-600 text-white hover:bg-focus-700 active:scale-95',
                    !apiKey.trim() && 'opacity-40 cursor-not-allowed',
                  ].join(' ')}
                >
                  {saved ? 'Saved ✓' : 'Save'}
                </button>
              </div>

              {hasKey && (
                <button
                  onClick={handleRemove}
                  className="mt-2 text-xs text-ink-400 hover:text-red-500 transition-colors"
                >
                  Remove saved key
                </button>
              )}
            </div>
          )}

          {/* Info note */}
          <div className="bg-ink-50 rounded-xl px-4 py-3 text-xs text-ink-500 leading-relaxed space-y-1.5">
            <p>
              <span className="font-semibold text-ink-700">AI features are optional.</span>{' '}
              Section analysis, retention quiz, and syllabus parsing require a key.
              Core reading works without one.
            </p>
            <p>
              Get a key at{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
                 className="text-focus-600 hover:underline">
                console.anthropic.com
              </a>
              .
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
