// Bridges Clerk's useAuth() hook into AuthContext so all app code uses useAppAuth() uniformly.
// Only mounted when VITE_CLERK_PUBLISHABLE_KEY is present (inside ClerkProvider).

import { useAuth, useUser } from '@clerk/react'
import { AuthContext } from './AuthContext.jsx'

export default function ClerkAuthBridge({ children }) {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth()
  const { user } = useUser()
  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null
  return (
    <AuthContext.Provider value={{ isLoaded, isSignedIn, userId: userId ?? null, userEmail, getToken }}>
      {children}
    </AuthContext.Provider>
  )
}
