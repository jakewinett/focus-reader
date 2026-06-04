// Shows remaining daily AI calls when the user is on the operator key.
// Rendered in FocusReader's top bar. Hidden when remaining is null (BYOK user or anon).

export default function RateLimitBanner({ remaining, limit }) {
  if (remaining == null) return null
  const isLow = remaining <= 3

  return (
    <div className={[
      'flex items-center gap-1.5 text-xs font-mono shrink-0',
      isLow ? 'text-amber-500' : 'text-ink-400',
    ].join(' ')}
    title={`${remaining} of ${limit} daily AI calls remaining`}
    >
      <span className={[
        'w-1.5 h-1.5 rounded-full',
        isLow ? 'bg-amber-400 animate-pulse-soft' : 'bg-sage-400',
      ].join(' ')} />
      <span>{remaining} AI call{remaining !== 1 ? 's' : ''} left</span>
    </div>
  )
}
