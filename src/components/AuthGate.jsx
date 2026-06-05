// Shown when an anonymous user tries to start a 4th reading session.
// Triggers Clerk's hosted sign-in / sign-up overlay.
// Only ever rendered when VITE_CLERK_PUBLISHABLE_KEY is set (ClerkProvider is in the tree).

import { useClerk } from '@clerk/react'

const LIMIT = Number(import.meta.env.VITE_ANON_DOC_LIMIT ?? 3)

export default function AuthGate({ onClose }) {
  const { openSignIn, openSignUp } = useClerk()

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose?.()}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6 animate-slide-up">

        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-focus-100 flex items-center justify-center mb-4">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-focus-600">
            <path d="M10 2a6 6 0 0 0-6 6v1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1h-1V8a6 6 0 0 0-6-6Zm4 7H6V8a4 4 0 0 1 8 0v1Zm-4 4a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z"
                  fill="currentColor"/>
          </svg>
        </div>

        <h2 className="text-lg font-semibold text-ink-900 mb-1">
          Save your reading progress
        </h2>
        <p className="text-sm text-ink-500 mb-6">
          You've used your {LIMIT} free anonymous sessions. Create a free account to continue —
          reading history syncs across all your devices.
        </p>

        <div className="space-y-2">
          <button
            onClick={() => { onClose?.(); openSignUp() }}
            className="w-full px-4 py-2.5 bg-focus-600 text-white text-sm font-medium
                       rounded-xl hover:bg-focus-700 active:scale-95 transition-all duration-150"
          >
            Create free account
          </button>
          <button
            onClick={() => { onClose?.(); openSignIn() }}
            className="w-full px-4 py-2.5 bg-ink-50 text-ink-700 text-sm font-medium
                       rounded-xl hover:bg-ink-100 transition-colors duration-150"
          >
            Sign in
          </button>
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-xs text-ink-400 hover:text-ink-600 transition-colors"
        >
          Maybe later
        </button>
      </div>
    </div>
  )
}
