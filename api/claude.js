// Focus Reader — Vercel Edge Function (Sprint 9)
// Proxies Anthropic API calls with auth, BYOK lookup, and per-user rate limiting.
//
// Flow:
//   1. Extract JWT from Authorization header (optional — anonymous calls allowed)
//   2. If JWT present: look up user's BYOK from user_settings in Supabase
//        BYOK → use their key, no rate limit
//        No BYOK → enforce daily operator-key limit, insert ai_usage row
//   3. Anonymous (no JWT): use operator key; client enforces VITE_ANON_AI_LIMIT

export const config = { runtime: 'edge' }

const DAILY_LIMIT = parseInt(process.env.DAILY_AI_LIMIT ?? '25', 10)

// ── Lightweight Supabase REST client ──────────────────────────────────────────
// Uses fetch directly (no SDK import needed) for maximum edge-runtime compatibility.
function makeSupabase(userToken) {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null

  // For reading user data: authenticate as the calling user (RLS enforcement)
  // For writing ai_usage: use service role key so we can insert regardless of RLS
  const userHeaders = {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${userToken}`,
  }
  const serviceHeaders = {
    'Content-Type': 'application/json',
    'apikey': key,
    'Authorization': `Bearer ${key}`,
    'Prefer': 'return=minimal',
  }

  return {
    async getSettings(userId) {
      const r = await fetch(
        `${url}/rest/v1/user_settings?select=api_key&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
        { headers: userHeaders }
      )
      if (!r.ok) return null
      const data = await r.json()
      return data?.[0] ?? null
    },
    async countUsageToday(userId) {
      const since = new Date(Date.now() - 86_400_000).toISOString()
      const r = await fetch(
        `${url}/rest/v1/ai_usage?select=id&user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(since)}`,
        { headers: userHeaders }
      )
      if (!r.ok) return 0
      return (await r.json())?.length ?? 0
    },
    async insertUsage(userId, requestType) {
      await fetch(`${url}/rest/v1/ai_usage`, {
        method: 'POST',
        headers: serviceHeaders,
        body: JSON.stringify({ user_id: userId, request_type: requestType }),
      })
    },
  }
}

// ── JWT payload decode (no crypto verification) ───────────────────────────────
// Supabase enforces RLS using the same token, so a forged token would fail on DB ops.
function decodePayload(token) {
  try {
    const [, b64] = token.split('.')
    return JSON.parse(atob(b64.replace(/-/g, '+').replace(/_/g, '/')))
  } catch { return null }
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    })
  }

  let body
  try { body = await req.json() }
  catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const requestType = req.headers.get('x-request-type') ?? 'analyze'
  const authHeader  = req.headers.get('Authorization') ?? ''
  const userToken   = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null

  let anthropicKey   = null
  let remainingCalls = null

  if (userToken) {
    const payload = decodePayload(userToken)
    const userId  = payload?.user_id ?? payload?.sub ?? null
    const db      = makeSupabase(userToken)

    if (db && userId) {
      const settings = await db.getSettings(userId)

      if (settings?.api_key) {
        // BYOK: unlimited, use their own key, no usage tracking
        anthropicKey = settings.api_key
      } else {
        // Operator key: enforce daily limit
        const usedToday = await db.countUsageToday(userId)

        if (usedToday >= DAILY_LIMIT) {
          return new Response(JSON.stringify({
            error: 'rate_limit',
            message: `Daily limit of ${DAILY_LIMIT} AI calls reached. Add your own API key in Settings for unlimited access.`,
            remaining: 0,
          }), { status: 429, headers: { 'Content-Type': 'application/json' } })
        }

        anthropicKey   = process.env.ANTHROPIC_API_KEY
        remainingCalls = DAILY_LIMIT - usedToday - 1
        // Record usage (fire-and-forget — don't await)
        db.insertUsage(userId, requestType)
      }
    } else {
      anthropicKey = process.env.ANTHROPIC_API_KEY
    }
  } else {
    // Anonymous request — operator key, no server-side limit
    anthropicKey = process.env.ANTHROPIC_API_KEY
  }

  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: 'AI features unavailable' }), {
      status: 503, headers: { 'Content-Type': 'application/json' },
    })
  }

  // Forward to Anthropic
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  const resHeaders = { 'Content-Type': 'application/json' }
  if (remainingCalls != null) resHeaders['x-ai-remaining'] = String(remainingCalls)

  return new Response(upstream.body, { status: upstream.status, headers: resHeaders })
}
