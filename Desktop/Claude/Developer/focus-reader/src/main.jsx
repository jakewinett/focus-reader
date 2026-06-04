import React from 'react'
import ReactDOM from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import ClerkAuthBridge from './lib/ClerkAuthBridge.jsx'
import App from './App.jsx'
import './styles/index.css'

const KEY  = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
const root = ReactDOM.createRoot(document.getElementById('root'))

// Wrap with ClerkProvider only when a publishable key is configured.
// Without one (local install / dev without Clerk), the app runs in anonymous-only mode
// via the default AuthContext values — no auth features, no cloud sync.
root.render(
  <React.StrictMode>
    {KEY ? (
      <ClerkProvider publishableKey={KEY}>
        <ClerkAuthBridge>
          <App />
        </ClerkAuthBridge>
      </ClerkProvider>
    ) : (
      <App />
    )}
  </React.StrictMode>
)
