import { useState } from 'react'

const FAQS = [
  {
    q: 'What is Evanreads?',
    a: 'Evanreads is a web-based reading tool built for students with ADHD and dyslexia. It guides you through your reading one focused section at a time, with text-to-speech, pace tracking, and retention quizzes — so you stay present and actually retain what you read.',
  },
  {
    q: 'Who is Evanreads for?',
    a: 'Evanreads is designed for college and high school students who struggle with reading comprehension due to ADHD, dyslexia, or other learning differences. It works with any reading material — textbooks, PDFs, articles, or Word documents.',
  },
  {
    q: 'How is Evanreads different from just highlighting or re-reading?',
    a: 'Re-reading is one of the least effective study strategies for long-term retention. Evanreads uses active recall (post-reading quizzes) and focused single-section reading to reduce cognitive load and improve how much you actually remember — backed by peer-reviewed research.',
  },
  {
    q: 'Is Evanreads free?',
    a: 'Yes — Evanreads has a free plan with no time limit. Paid plans unlock unlimited documents, AI-powered summaries, and more. Students with a .edu email get 33% off paid plans.',
  },
  {
    q: 'When will Evanreads launch?',
    a: 'We are currently in pre-launch development. Join the waitlist and we will email you the moment it is ready.',
  },
]

const FAQ_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map(f => ({
    '@type': 'Question',
    name: f.q,
    acceptedAnswer: { '@type': 'Answer', text: f.a },
  })),
}

const BENEFITS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/>
        <circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    label: 'Line-by-line focus',
    body: 'Read one section at a time — no more losing your place or re-reading the same line.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    label: 'Know your reading time',
    body: 'Automatically estimates how long each assignment will take — updated as you go.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
    label: 'Prove you retained it',
    body: 'Post-reading quizzes dynamically created from what you just read.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18v-6a9 9 0 0118 0v6"/>
        <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3z"/>
      </svg>
    ),
    label: 'Read aloud support',
    body: 'Text-to-speech reads along with you — proven to improve comprehension for ADHD and dyslexia.',
  },
]

function BrandMark({ width = 40, height = 40, gradId = 'wl-g-1' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 30 245 230" width={width} height={height} aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5ECFCF" />
          <stop offset="100%" stopColor="#6BAAF5" />
        </linearGradient>
      </defs>
      <g transform="translate(30,30) scale(2.2)">
        <path d="M 67.487 22.014 A 33 33 0 1 1 65.493 20.863"
          fill="none" stroke={`url(#${gradId})`}
          strokeWidth="15.5" strokeLinecap="round" />
        <circle cx="68.15" cy="50" r="10.5" fill="#93C5FD" />
      </g>
    </svg>
  )
}

export default function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [openFaq, setOpenFaq] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.ok) {
        setStatus('success')
      } else {
        setErrorMsg(data.error || 'Something went wrong. Please try again.')
        setStatus('error')
      }
    } catch {
      setErrorMsg('Network error. Please try again.')
      setStatus('error')
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">

      {/* ── NAV ── */}
      <header className="relative z-10 px-8 py-5 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5 select-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 30 245 230" width="32" height="32" aria-hidden="true">
            <defs>
              <linearGradient id="nav-g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0E8C8C" />
                <stop offset="100%" stopColor="#3373C7" />
              </linearGradient>
            </defs>
            <g transform="translate(30,30) scale(2.2)">
              <path d="M 67.487 22.014 A 33 33 0 1 1 65.493 20.863"
                fill="none" stroke="url(#nav-g)" strokeWidth="15.5" strokeLinecap="round" />
              <circle cx="68.15" cy="50" r="10.5" fill="#2E6FD0" />
            </g>
          </svg>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: '20px', color: '#1F2E45', letterSpacing: '-0.3px', lineHeight: 1 }}>
            <span style={{ color: '#0E8C8C' }}>E</span>vanreads
          </span>
        </div>
        <a href="mailto:hello@evanreads.ai" className="text-xs text-ink-400 hover:text-ink-700 transition-colors hidden sm:block">
          hello@evanreads.ai
        </a>
      </header>

      {/* ── HERO (gradient section) ── */}
      <section
        className="relative overflow-hidden flex flex-col items-center text-center px-6 pt-16 pb-24"
        style={{ background: 'linear-gradient(160deg, #0F4C6E 0%, #0A3352 40%, #0E2B47 70%, #112244 100%)' }}
      >
        {/* Decorative blurred blobs */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div style={{ position: 'absolute', top: '-80px', left: '50%', transform: 'translateX(-60%)', width: '600px', height: '600px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(14,140,140,0.18) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-100px', right: '10%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(51,115,199,0.2) 0%, transparent 70%)' }} />
          {/* Subtle dot grid */}
          <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.06 }}>
            <defs>
              <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="white" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots)" />
          </svg>
        </div>

        {/* Brand mark */}
        <div className="relative mb-8">
          <BrandMark width={88} height={88} gradId="hero-mark-g" />
        </div>

        <span className="relative inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.18em] uppercase text-teal-300 mb-5">
          <span className="inline-block w-4 h-px bg-teal-400 opacity-70" />
          Coming soon
          <span className="inline-block w-4 h-px bg-teal-400 opacity-70" />
        </span>

        <h1 className="relative text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-[1.1] tracking-tight mb-6 max-w-2xl">
          Stop re-reading.<br />
          <span style={{ background: 'linear-gradient(90deg, #5ECFCF, #6BAAF5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Start retaining.
          </span>
        </h1>

        <p className="relative text-base md:text-lg leading-relaxed max-w-[500px] mb-3" style={{ color: 'rgba(255,255,255,0.72)' }}>
          For students struggling with ADHD and dyslexia, the same sentence can take ten tries — and still not feel like it sank in.
        </p>
        <p className="relative text-base md:text-lg leading-relaxed max-w-[500px] mb-10" style={{ color: 'rgba(255,255,255,0.72)' }}>
          Evanreads guides you through your reading one focused section at a time, so you stay present, absorb more, and stop feeling like your time is being wasted.
        </p>

        {/* Waitlist form */}
        {status === 'success' ? (
          <div className="relative flex flex-col items-center gap-3 py-5 px-8 rounded-2xl max-w-md w-full text-center"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5ECFCF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <p className="font-semibold text-white">You're on the list!</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
              We'll email you at <span className="text-teal-300 font-medium">{email}</span> when Evanreads is ready.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="relative flex flex-col sm:flex-row gap-3 w-full max-w-md">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={status === 'loading'}
              className="flex-1 px-4 py-3.5 rounded-xl text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:opacity-50"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}
            />
            <button
              type="submit"
              disabled={status === 'loading' || !email.trim()}
              className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #0E8C8C, #3373C7)', color: 'white' }}
            >
              {status === 'loading' ? 'Joining…' : 'Join the waitlist'}
            </button>
          </form>
        )}
        {status === 'error' && (
          <p className="relative mt-3 text-sm text-red-300">{errorMsg}</p>
        )}

        <p className="relative mt-4 text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          No spam. Just a heads-up when we launch.
        </p>

        {/* Student pricing callout */}
        <div className="relative mt-6 flex items-center gap-2.5 px-5 py-3 rounded-full text-xs"
          style={{ background: 'rgba(94,207,207,0.12)', border: '1px solid rgba(94,207,207,0.25)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5ECFCF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>
            Students with a <span style={{ color: '#5ECFCF', fontWeight: 600 }}>.edu email</span> get 33% off — <span style={{ color: 'rgba(255,255,255,0.9)' }}>$6/mo or $60/yr</span>
          </span>
        </div>

        {/* Wave divider */}
        <div aria-hidden="true" className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 56" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" style={{ width: '100%', height: '56px', display: 'block' }}>
            <path d="M0,32 C360,56 1080,8 1440,32 L1440,56 L0,56 Z" fill="white" />
          </svg>
        </div>
      </section>

      {/* ── BENEFITS ── */}
      <section className="px-6 py-20 flex flex-col items-center">
        <p className="text-xs font-semibold tracking-widest text-focus-600 uppercase mb-3">Built for how your brain works</p>
        <h2 className="text-2xl md:text-3xl font-bold text-ink-900 text-center mb-12 max-w-lg leading-snug">
          Every feature designed for students who learn differently
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl w-full">
          {BENEFITS.map(b => (
            <div key={b.label}
              className="group flex gap-4 p-6 rounded-2xl border border-ink-100 hover:border-focus-200 hover:shadow-md transition-all"
              style={{ background: 'linear-gradient(135deg, #f8fbff 0%, #f0f9f9 100%)' }}>
              <div className="shrink-0 mt-0.5 w-10 h-10 rounded-xl flex items-center justify-center text-focus-600"
                style={{ background: 'linear-gradient(135deg, #e0f2fe, #ccfbf1)' }}>
                {b.icon}
              </div>
              <div>
                <p className="font-semibold text-ink-900 text-sm mb-1.5">{b.label}</p>
                <p className="text-xs text-ink-500 leading-relaxed">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FOUNDER QUOTE ── */}
      <section className="px-6 pb-20 flex justify-center">
        <div className="max-w-xl w-full rounded-3xl p-8 md:p-10 text-center"
          style={{ background: 'linear-gradient(160deg, #0F4C6E 0%, #112244 100%)' }}>
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="mx-auto mb-6" aria-hidden="true">
            <text x="0" y="28" fontSize="36" fill="rgba(94,207,207,0.5)">"</text>
          </svg>
          <p className="text-base md:text-lg leading-relaxed mb-6 font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>
            When he started college, I watched him spend hours re-reading the same pages — exhausted, frustrated, falling further behind. His tools weren't built for how his brain works.
            <br /><br />
            So I built one that is.
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-8 h-px" style={{ background: 'rgba(94,207,207,0.4)' }} />
            <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Jake, father and founder</p>
            <div className="w-8 h-px" style={{ background: 'rgba(94,207,207,0.4)' }} />
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="px-6 pb-20 flex flex-col items-center">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_LD) }} />
        <p className="text-xs font-semibold tracking-widest text-focus-600 uppercase mb-3">FAQ</p>
        <h2 className="text-2xl md:text-3xl font-bold text-ink-900 text-center mb-10 max-w-lg leading-snug">
          Common questions
        </h2>
        <div className="max-w-2xl w-full divide-y divide-ink-100">
          {FAQS.map((f, i) => (
            <div key={i}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 py-5 text-left group"
                aria-expanded={openFaq === i}
              >
                <span className="font-semibold text-ink-900 text-sm group-hover:text-focus-600 transition-colors">{f.q}</span>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                  className={`shrink-0 text-ink-400 transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {openFaq === i && (
                <p className="pb-5 text-sm text-ink-500 leading-relaxed">{f.a}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-ink-100 py-7 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-5xl mx-auto w-full text-xs text-ink-400">
        <div className="flex items-center gap-2 select-none">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 30 245 230" width="20" height="20" aria-hidden="true">
            <defs>
              <linearGradient id="ft-g" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0E8C8C" />
                <stop offset="100%" stopColor="#3373C7" />
              </linearGradient>
            </defs>
            <g transform="translate(30,30) scale(2.2)">
              <path d="M 67.487 22.014 A 33 33 0 1 1 65.493 20.863"
                fill="none" stroke="url(#ft-g)" strokeWidth="15.5" strokeLinecap="round" />
              <circle cx="68.15" cy="50" r="10.5" fill="#2E6FD0" />
            </g>
          </svg>
          <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700, fontSize: '14px', color: '#1F2E45' }}>
            <span style={{ color: '#0E8C8C' }}>E</span>vanreads
          </span>
        </div>
        <p>© {new Date().getFullYear()} Evanreads</p>
        <a href="mailto:hello@evanreads.ai" className="hover:text-ink-700 transition-colors">hello@evanreads.ai</a>
      </footer>
    </div>
  )
}
