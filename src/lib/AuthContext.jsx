// Focus Reader — auth context
// Provides a uniform auth interface whether Clerk is configured or not.
// When Clerk is present, ClerkAuthBridge populates this with real values.
// When absent (local install without VITE_CLERK_PUBLISHABLE_KEY), defaults to anon state.

import { createContext, useContext } from 'react'

const defaults = {
  isLoaded:   true,
  isSignedIn: false,
  userId:     null,
  userEmail:  null,
  getToken:   () => Promise.resolve(null),
}

export const AuthContext = createContext(defaults)
export const useAppAuth  = () => useContext(AuthContext)
