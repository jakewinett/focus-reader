// Focus Reader — Supabase client
// Single shared client; call setSupabaseToken() whenever the Clerk auth token changes.
// All reads/writes are protected by RLS policies keyed on the JWT's user_id claim.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

export const SUPABASE_ENABLED = !!(SUPABASE_URL && SUPABASE_KEY)

export const supabase = SUPABASE_ENABLED
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
  : null

// Call from App.jsx whenever Clerk auth state changes.
// Supabase uses this token to enforce RLS (user_id claim must match row user_id).
export async function setSupabaseToken(token) {
  if (!supabase || !token) return
  try {
    await supabase.auth.setSession({ access_token: token, refresh_token: '' })
  } catch {
    // Token may be stale; App.jsx will call getToken() + setSupabaseToken() again on next change
  }
}
