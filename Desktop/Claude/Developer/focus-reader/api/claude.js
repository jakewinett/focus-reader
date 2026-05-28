// Vercel Edge Function — Claude API proxy (FR-25)
//
// Keeps ANTHROPIC_API_KEY server-side so it never appears in the client bundle.
// Set the key in the Vercel dashboard under Project → Settings → Environment Variables.
// Name it `ANTHROPIC_API_KEY` (no VITE_ prefix — intentionally server-only).
//
// The function accepts the same request body the frontend would send to
// https://api.anthropic.com/v1/messages and forwards it verbatim, so the
// client code in src/api/claude.js doesn't need to know which transport is active.

export const config = { runtime: 'edge' }

const ANTHROPIC_URL     = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

export default async function handler(req) {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY
  if (!API_KEY) {
    return new Response(
      JSON.stringify({ error: 'ANTHROPIC_API_KEY is not configured on this server.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Parse and forward the request body
  let body
  try {
    body = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify(body),
  })

  const data = await upstream.text()

  return new Response(data, {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json' },
  })
}
