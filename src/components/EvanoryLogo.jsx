// Evanory wordmark — mark + logotype, used in header across all views.
// Mark uses inline SVG so no image request is needed and it scales crisp at any size.

export default function EvanoryLogo() {
  return (
    <div className="flex items-center gap-2">
      {/* Memory loop mark */}
      <svg
        width="30" height="30"
        viewBox="0 0 512 512"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="evMarkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor="#0E8C8C" />
            <stop offset="100%" stopColor="#3373C7" />
          </linearGradient>
        </defs>
        <g transform="translate(101,101) scale(3.1)">
          <path
            d="M 67.487 22.014 A 33 33 0 1 1 65.493 20.863"
            fill="none"
            stroke="url(#evMarkGrad)"
            strokeWidth="15.5"
            strokeLinecap="round"
          />
          <circle cx="68.15" cy="50" r="10.5" fill="#2E6FD0" />
        </g>
      </svg>

      {/* Wordmark */}
      <span className="font-brand font-bold text-lg tracking-tight text-ink-900 leading-none">
        Evanory
      </span>
    </div>
  )
}
