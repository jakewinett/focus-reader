import GoogleButton from './GoogleButton.jsx'

// ── Brand Icon helpers ────────────────────────────────────────────────────────
// Each inline SVG gets a unique gradient ID so multiple instances on the same
// page don't conflict. Text is rendered as HTML (not SVG text) so Quicksand
// loads reliably from the page-level Google Fonts import.

function EvanoryWordmark({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="5 40 215 205"
           width="28" height="28" aria-hidden="true">
        <defs>
          <linearGradient id="nav-icon-g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0E8C8C" />
            <stop offset="100%" stopColor="#3373C7" />
          </linearGradient>
        </defs>
        <g transform="translate(30,30) scale(2.2)">
          <path d="M 67.487 22.014 A 33 33 0 1 1 65.493 20.863"
                fill="none" stroke="url(#nav-icon-g)"
                strokeWidth="15.5" strokeLinecap="round" />
          <circle cx="68.150" cy="50.000" r="10.5" fill="#2E6FD0" />
        </g>
      </svg>
      <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
                     fontSize: '18px', color: '#1F2E45', letterSpacing: '-0.4px',
                     lineHeight: 1 }}>
        <span style={{ color: '#0E8C8C' }}>E</span>vanory
      </span>
    </div>
  )
}

function EvanoryWordmarkReversed({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="5 40 215 205"
           width="28" height="28" aria-hidden="true">
        <defs>
          <linearGradient id="footer-icon-g" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2BC4C4" />
            <stop offset="100%" stopColor="#5E9BF2" />
          </linearGradient>
        </defs>
        <g transform="translate(30,30) scale(2.2)">
          <path d="M 67.487 22.014 A 33 33 0 1 1 65.493 20.863"
                fill="none" stroke="url(#footer-icon-g)"
                strokeWidth="15.5" strokeLinecap="round" />
          <circle cx="68.150" cy="50.000" r="10.5" fill="#8FB9FF" />
        </g>
      </svg>
      <span style={{ fontFamily: "'Quicksand', sans-serif", fontWeight: 700,
                     fontSize: '18px', color: '#FFFFFF', letterSpacing: '-0.4px',
                     lineHeight: 1 }}>
        <span style={{ color: '#2BC4C4' }}>E</span>vanory
      </span>
    </div>
  )
}

function BrandSymbol({ className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="5 40 215 205"
         className={className} aria-hidden="true">
      <defs>
        <linearGradient id="hero-icon-g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0E8C8C" />
          <stop offset="100%" stopColor="#3373C7" />
        </linearGradient>
      </defs>
      <g transform="translate(30,30) scale(2.2)">
        <path d="M 67.487 22.014 A 33 33 0 1 1 65.493 20.863"
              fill="none" stroke="url(#hero-icon-g)"
              strokeWidth="15.5" strokeLinecap="round" />
        <circle cx="68.150" cy="50.000" r="10.5" fill="#2E6FD0" />
      </g>
    </svg>
  )
}

// ── Data ──────────────────────────────────────────────────────────────────────

const BENEFITS = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        <path d="M9 12l2 2 4-4"/>
      </svg>
    ),
    headline: 'Lower anxiety',
    body: 'Clear organization and prioritization of assignments so nothing feels urgent all at once.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="4" rx="1"/>
        <rect x="3" y="10" width="12" height="4" rx="1"/>
        <rect x="3" y="17" width="7" height="4" rx="1"/>
      </svg>
    ),
    headline: 'Reduce overwhelm',
    body: "One focused section at a time — no more staring at a wall of text that's impossible to start.",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    headline: 'Know your reading time',
    body: 'See exactly how long an assignment will take before you start — no more guessing.',
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 11l3 3L22 4"/>
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
      </svg>
    ),
    headline: 'Feel confident in your retention',
    body: 'Post-reading quizzes built from what you just read — so you actually know it stuck.',
  },
]

const HOW_STEPS = [
  {
    title: 'Upload your reading',
    body: 'Paste text, drag in a PDF, or upload a Word document. Any format works.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
    ),
  },
  {
    title: 'Read with support',
    body: 'Text-to-speech reads aloud. Key passages are summarized. Press F to flag lines you want to revisit.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
      </svg>
    ),
  },
  {
    title: 'Quiz yourself',
    body: 'AI generates 4–5 retention questions from what you just read — with explanations and source passages.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/>
        <line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
]

const STUDIES = [
  {
    claim: 'Active recall beats re-reading',
    body: 'Students who self-test on material retain significantly more over time than those who re-read the same passages passively.',
    cite: 'Roediger & Karpicke, Psychological Science, 2006',
  },
  {
    claim: 'ADHD affects 1 in 5 college students',
    body: 'Executive function differences make sustained reading especially challenging in higher education — not a motivation problem, a neurological one.',
    cite: 'Weyandt & DuPaul, Developmental Disabilities Research Reviews, 2008',
  },
  {
    claim: 'Listening while reading improves comprehension',
    body: 'Text-to-speech support reduces cognitive load and improves reading comprehension for students with ADHD, dyslexia, and processing differences.',
    cite: 'Hecker, Burns, Elkind et al., Annals of Dyslexia, 2002',
  },
]

// Placeholder — replace with real quotes before launch
const TESTIMONIALS = [
  {
    quote: 'I actually remembered what I read for the first time in years.',
    name: 'Jordan M.',
    detail: 'Junior, Biology',
  },
  {
    quote: "The quiz sounds annoying but it's genuinely the only thing that made lecture readings stick for me.",
    name: 'Priya K.',
    detail: 'Sophomore, Communications',
  },
  {
    quote: "I can finally get through a chapter without losing my place ten times.",
    name: 'Marcus T.',
    detail: 'Freshman, Psychology',
  },
]

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      '10 documents / month',
      'PDF, DOCX, or paste text',
      'Text-to-speech',
      'AI quiz (4 questions)',
    ],
    cta: 'Start free',
    featured: false,
  },
  {
    name: 'Monthly',
    price: '$4.99',
    period: '/ month',
    features: [
      'Unlimited documents',
      'All free features',
      '5-question quiz with flagged sections',
      'Cross-session flagged review',
      'Cloud sync',
    ],
    cta: 'Get started',
    featured: false,
  },
  {
    name: 'Semester',
    price: '$22.99',
    period: '/ 6 months ($3.83/mo)',
    features: [
      'Everything in Monthly',
      'Pause billing up to 3 months, no penalty',
    ],
    cta: 'Get semester',
    featured: false,
  },
  {
    name: 'Annual',
    price: '$29.99',
    period: '/ year ($2.50/mo)',
    features: [
      'Everything in Monthly',
      'Best per-month value',
      'Pause billing up to 3 months, no penalty',
    ],
    cta: 'Get annual',
    featured: true,
    badge: 'Best value',
  },
]

const TYPEFORM_URL = 'https://form.typeform.com/to/PLACEHOLDER' // TODO: replace with live Typeform URL

// ── Shared primary button ─────────────────────────────────────────────────────

function PrimaryButton({ label, className = '' }) {
  return (
    <GoogleButton
      label={label}
      className={[
        'flex items-center justify-center gap-2',
        'bg-focus-500 text-white font-medium rounded-xl',
        'hover:bg-focus-600 active:scale-95 transition-all duration-150',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      ].join(' ')}
    />
  )
}

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-ink-100">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <EvanoryWordmark />
        <div className="flex items-center gap-3">
          <GoogleButton
            label="Sign in"
            className="flex items-center gap-2 text-sm text-ink-600 border border-ink-200
                       px-3 py-1.5 rounded-lg hover:bg-ink-50 transition-colors duration-150"
          />
          <PrimaryButton label="Start free" className="px-4 py-2 text-sm" />
        </div>
      </div>
    </header>
  )
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero({ onTryApp }) {
  function scrollTo(id) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section className="max-w-3xl mx-auto px-6 pt-20 pb-16 text-center">
      <BrandSymbol className="w-12 h-12 mx-auto mb-6" />
      <p className="text-[11px] font-semibold tracking-[0.2em] text-[#0E8C8C] uppercase mb-4">
        Built for ADHD &amp; learning differences
      </p>
      <h1
        className="text-3xl md:text-[42px] font-semibold text-ink-900 leading-tight mb-5 tracking-tight"
        style={{ fontFamily: "'Quicksand', sans-serif" }}
      >
        Stop re-reading<br className="hidden sm:block" /> and start retaining.
      </h1>
      <p className="text-base md:text-lg text-ink-500 leading-relaxed mb-10 max-w-[500px] mx-auto">
        For students with ADHD and dyslexia, the same sentence can take ten tries — and still not
        feel like it sank in. Evanory guides you through your reading one focused section at a time,
        so you stay present, absorb more, and stop starting over.
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <PrimaryButton label="Start reading free" className="px-7 py-3.5 text-sm" />
        <button
          onClick={() => scrollTo('how-it-works')}
          className="text-sm text-ink-400 hover:text-ink-600 transition-colors duration-150"
        >
          See how it works ↓
        </button>
      </div>
      {onTryApp && (
        <button
          onClick={onTryApp}
          className="mt-5 text-xs text-ink-300 hover:text-ink-500 transition-colors duration-150"
        >
          Try without an account
        </button>
      )}
    </section>
  )
}

// ── Benefits ──────────────────────────────────────────────────────────────────

function Benefits() {
  return (
    <section className="bg-[#EAF3F4] py-20">
      <div className="max-w-4xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {BENEFITS.map((b, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 flex gap-4">
              <div className="shrink-0 w-10 h-10 bg-[#EAF3F4] text-[#0E8C8C] rounded-xl
                              flex items-center justify-center">
                {b.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-ink-800 mb-1">{b.headline}</p>
                <p className="text-sm text-ink-500 leading-relaxed">{b.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── How it works ──────────────────────────────────────────────────────────────

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20">
      <div className="max-w-4xl mx-auto px-6">
        <h2
          className="text-xl font-semibold text-ink-800 text-center mb-12"
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {HOW_STEPS.map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-12 h-12 bg-[#EAF3F4] text-[#0E8C8C] rounded-2xl flex items-center
                              justify-center mx-auto mb-5">
                {step.icon}
              </div>
              <h3 className="text-sm font-semibold text-ink-800 mb-2">{step.title}</h3>
              <p className="text-sm text-ink-500 leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Origin story ──────────────────────────────────────────────────────────────

function OriginStory() {
  return (
    <section className="bg-[#EAF3F4] py-20">
      <div className="max-w-2xl mx-auto px-6">
        <div className="border-l-[3px] border-[#0E8C8C] pl-8">
          <p className="text-base md:text-lg text-ink-700 leading-relaxed mb-4 font-medium">
            I built Evanory for my son.
          </p>
          <p className="text-base text-ink-500 leading-relaxed mb-4">
            When he started college with ADHD and autism, I watched him spend hours re-reading
            the same pages — exhausted, frustrated, falling further behind. His tools weren't
            built for how his brain works.
          </p>
          <p className="text-base text-ink-500 leading-relaxed mb-6">
            So I built one that is.
          </p>
          <p className="text-sm text-ink-400">— Jake, father and founder</p>
        </div>
      </div>
    </section>
  )
}

// ── Research ──────────────────────────────────────────────────────────────────

function Research() {
  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-6">
        <h2
          className="text-xl font-semibold text-ink-800 text-center mb-2"
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          The science behind it
        </h2>
        <p className="text-sm text-ink-400 text-center mb-12">Built on evidence-based learning principles.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STUDIES.map((s, i) => (
            <div key={i} className="bg-white border border-ink-100 rounded-2xl p-6">
              <p className="text-sm font-semibold text-ink-800 mb-3 leading-snug">{s.claim}</p>
              <p className="text-sm text-ink-500 leading-relaxed mb-5">{s.body}</p>
              <p className="text-[11px] text-ink-300 leading-snug">{s.cite}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Testimonials ──────────────────────────────────────────────────────────────

function Testimonials() {
  return (
    <section className="bg-[#EAF3F4] py-20">
      <div className="max-w-4xl mx-auto px-6">
        <h2
          className="text-xl font-semibold text-ink-800 text-center mb-12"
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          What students say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, i) => (
            <div key={i} className="bg-white border border-ink-100 rounded-2xl p-6 flex flex-col">
              <p className="text-sm text-ink-600 leading-relaxed flex-1 mb-5">"{t.quote}"</p>
              <div>
                <p className="text-xs font-semibold text-ink-500">{t.name}</p>
                <p className="text-xs text-ink-300">{t.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Pricing ───────────────────────────────────────────────────────────────────

function Pricing() {
  return (
    <section id="pricing" className="py-20">
      <div className="max-w-5xl mx-auto px-6">
        <h2
          className="text-xl font-semibold text-ink-800 text-center mb-2"
          style={{ fontFamily: "'Quicksand', sans-serif" }}
        >
          Simple pricing
        </h2>
        <p className="text-sm text-ink-400 text-center mb-12">Start free. Upgrade when you're ready.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={[
                'rounded-2xl p-6 flex flex-col',
                plan.featured
                  ? 'bg-[#1F2E45] border-2 border-[#152336]'
                  : 'bg-white border border-ink-100',
              ].join(' ')}
            >
              {plan.badge && (
                <span className="self-start text-[10px] font-semibold bg-[#0E8C8C] text-white
                                 px-2.5 py-0.5 rounded-full mb-3">
                  {plan.badge}
                </span>
              )}
              <p className={[
                'text-[11px] font-semibold uppercase tracking-wider mb-2',
                plan.featured ? 'text-[#7BA8B8]' : 'text-ink-400',
              ].join(' ')}>
                {plan.name}
              </p>
              <p className={['text-2xl font-semibold mb-0.5', plan.featured ? 'text-white' : 'text-ink-900'].join(' ')}>
                {plan.price}
              </p>
              <p className={['text-[11px] mb-6', plan.featured ? 'text-[#7BA8B8]' : 'text-ink-400'].join(' ')}>
                {plan.period}
              </p>
              <ul className="flex-1 space-y-2.5 mb-6">
                {plan.features.map(f => (
                  <li key={f} className={[
                    'text-xs flex items-start gap-2',
                    plan.featured ? 'text-[#B8CDD9]' : 'text-ink-500',
                  ].join(' ')}>
                    <svg className="shrink-0 mt-0.5" width="12" height="12" viewBox="0 0 12 12"
                         fill="none" aria-hidden="true">
                      <path d="M2 6l3 3 5-5"
                            stroke={plan.featured ? '#2BC4C4' : '#0E8C8C'}
                            strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              <GoogleButton
                label={plan.cta}
                className={[
                  'flex items-center justify-center gap-2 text-xs font-medium w-full',
                  'py-2.5 rounded-xl transition-all duration-150 active:scale-95',
                  plan.featured
                    ? 'bg-white text-[#0E8C8C] hover:bg-[#EAF3F4]'
                    : 'bg-focus-500 text-white hover:bg-focus-600',
                ].join(' ')}
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-ink-300 text-center mt-6">
          All paid plans include the option to pause billing for up to 3 months — no penalty.
        </p>
      </div>
    </section>
  )
}

// ── Feedback ──────────────────────────────────────────────────────────────────

function Feedback() {
  return (
    <section className="bg-[#EAF3F4] py-16">
      <div className="max-w-xl mx-auto px-6 text-center">
        <h2 className="text-lg font-semibold text-ink-800 mb-2">Help us improve</h2>
        <p className="text-sm text-ink-500 leading-relaxed mb-6">
          Evanory is early-stage. Your feedback directly shapes what we build next.
        </p>
        <a
          href={TYPEFORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 border border-ink-200 bg-white text-ink-600
                     text-sm font-medium px-5 py-2.5 rounded-xl hover:border-ink-300
                     hover:text-ink-800 transition-colors duration-150"
        >
          Share feedback
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor"
               strokeWidth="1.5" aria-hidden="true">
            <path d="M2 6h8M6 2l4 4-4 4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </a>
      </div>
    </section>
  )
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-[#1F2E45] py-10">
      <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
        <EvanoryWordmarkReversed />
        <nav className="flex items-center gap-6 text-xs text-[#6B8FA6]" aria-label="Footer links">
          <a href="/privacy" className="hover:text-white transition-colors duration-150">Privacy</a>
          <a href="/terms"   className="hover:text-white transition-colors duration-150">Terms</a>
          <a href="mailto:hello@evanory.com"
             className="hover:text-white transition-colors duration-150">Contact</a>
        </nav>
        <p className="text-xs text-[#6B8FA6]">© {new Date().getFullYear()} Evanory</p>
      </div>
    </footer>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function MarketingPage({ onTryApp }) {
  return (
    <div className="min-h-screen bg-white">
      <Nav />
      <main>
        <Hero onTryApp={onTryApp} />
        <Benefits />
        <HowItWorks />
        <OriginStory />
        <Research />
        <Testimonials />
        <Pricing />
        <Feedback />
      </main>
      <Footer />
    </div>
  )
}
