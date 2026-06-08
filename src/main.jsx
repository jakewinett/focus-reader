import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider, AuthenticateWithRedirectCallback } from '@clerk/react'
import ClerkAuthBridge from './lib/ClerkAuthBridge.jsx'
import App from './App.jsx'
import './styles/index.css'

const KEY  = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const root = ReactDOM.createRoot(document.getElementById('root'))

// Detect the OAuth callback path so we can render Clerk's handler instead of the app.
// Google (and other OAuth providers) redirect back to /sso-callback after authorisation.
const isOAuthCallback = window.location.pathname.startsWith('/sso-callback')

// Wrap with ClerkProvider only when a publishable key is configured.
// Without one (local install / dev without Clerk), the app runs in anonymous-only mode
// via the default AuthContext values — no auth features, no cloud sync.
root.render(
  <React.StrictMode>
    {KEY ? (
      <ClerkProvider publishableKey={KEY}>
        {isOAuthCallback ? (
          // Clerk reads the OAuth state from the URL, completes sign-in,
          // then redirects to redirectUrlComplete (window.location.origin).
          <AuthenticateWithRedirectCallback />
        ) : (
          <ClerkAuthBridge>
            <App />
          </ClerkAuthBridge>
        )}
      </ClerkProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
)
