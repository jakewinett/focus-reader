export const config = { runtime: 'edge' }

const CONFIRMATION_HTML = (email) => `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #f4f7fb; font-family: 'Helvetica Neue', Arial, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .hero { background: linear-gradient(160deg, #0F4C6E 0%, #112244 100%); padding: 40px 40px 32px; text-align: center; }
    .wordmark { font-size: 22px; font-weight: 700; color: white; letter-spacing: -0.3px; }
    .wordmark span { color: #5ECFCF; }
    .hero h1 { color: white; font-size: 26px; font-weight: 700; margin: 20px 0 8px; line-height: 1.2; }
    .hero p { color: rgba(255,255,255,0.65); font-size: 15px; margin: 0; }
    .body { padding: 36px 40px; }
    .body p { color: #374151; font-size: 15px; line-height: 1.65; margin: 0 0 16px; }
    .highlight { background: #f0f9f9; border-left: 3px solid #0E8C8C; border-radius: 4px; padding: 14px 18px; margin: 24px 0; }
    .highlight p { margin: 0; color: #0A3352; font-size: 14px; }
    .footer { padding: 20px 40px; border-top: 1px solid #f0f0f0; text-align: center; }
    .footer p { color: #9ca3af; font-size: 12px; margin: 0; }
    .footer a { color: #0E8C8C; text-decoration: none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="hero">
      <div class="wordmark"><span>E</span>vanreads</div>
      <h1>You're on the list.</h1>
      <p>We'll let you know the moment we launch.</p>
    </div>
    <div class="body">
      <p>Thanks for signing up — we'll email <strong>${email}</strong> as soon as Evanreads is ready.</p>
      <p>We're building a reading tool designed from the ground up for students with ADHD and dyslexia. Line-by-line focus, AI-powered retention quizzes, text-to-speech, and pace tracking — everything that's been missing.</p>
      <div class="highlight">
        <p>🎓 <strong>Student?</strong> If you have a .edu email address, you'll get 33% off at launch — $6/mo or $60/yr.</p>
      </div>
      <p>In the meantime, if you have questions or want to share feedback, just reply to this email.</p>
      <p style="margin-bottom:0">— Jake, founder</p>
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Evanreads · <a href="https://evanreads.ai">evanreads.ai</a></p>
      <p style="margin-top:6px">You received this because you signed up at evanreads.ai</p>
    </div>
  </div>
</body>
</html>`

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let email
  try {
    const body = await req.json()
    email = (body.email || '').trim().toLowerCase()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Valid email required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  // Save to Supabase
  const res = await fetch(`${supabaseUrl}/rest/v1/waitlist`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ email }),
  })

  const isDuplicate = res.status === 409
  if (!res.ok && !isDuplicate) {
    return new Response(JSON.stringify({ error: 'Could not save email' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  // Send confirmation email via Resend
  if (!isDuplicate && process.env.RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Evanreads <hello@evanreads.ai>',
          to: [email],
          subject: "You're on the Evanreads waitlist 🎉",
          html: CONFIRMATION_HTML(email),
        }),
      })
    } catch (err) {
      console.error('Confirmation email failed:', err.message)
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  })
}
