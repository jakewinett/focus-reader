// One-click "Continue with Google" button — starts Clerk's OAuth flow directly,
// bypassing the modal. Only render this inside a ClerkProvider tree.

import { useSignIn } from '@clerk/react'

const GoogleLogo = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M15.68 8.18c0-.57-.05-1.12-.14-1.64H8v3.1h4.3a3.68 3.68 0 0 1-1.6 2.42v2h2.58C14.8 12.66 15.68 10.6 15.68 8.18Z" fill="#4285F4"/>
    <path d="M8 16c2.16 0 3.97-.72 5.28-1.94l-2.58-2c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H.88v2.07A8 8 0 0 0 8 16Z" fill="#34A853"/>
    <path d="M3.53 9.53A4.8 4.8 0 0 1 3.28 8c0-.53.09-1.04.25-1.53V4.4H.88A8 8 0 0 0 0 8c0 1.29.31 2.51.88 3.6l2.65-2.07Z" fill="#FBBC05"/>
    <path d="M8 3.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 .88 4.4L3.53 6.47C4.16 4.58 5.92 3.18 8 3.18Z" fill="#EA4335"/>
  </svg>
)

export default function GoogleButton({ label = 'Continue with Google', className = '' }) {
  const { signIn, isLoaded } = useSignIn()

  async function handleClick() {
    if (!isLoaded || !signIn) return
    await signIn.authenticateWithRedirect({
      strategy:            'oauth_google',
      redirectUrl:         `${window.location.origin}/sso-callback`,
      redirectUrlComplete: window.location.origin,
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={!isLoaded}
      className={className || [
        'flex items-center justify-center gap-2',
        'text-sm font-medium px-4 py-2 rounded-lg',
        'bg-white border border-ink-200 text-ink-800',
        'hover:bg-ink-50 hover:border-ink-300',
        'transition-colors duration-150 shadow-sm',
        'disabled:opacity-50 disabled:cursor-not-allowed',
      ].join(' ')}
    >
      <GoogleLogo />
      {label}
    </button>
  )
}
