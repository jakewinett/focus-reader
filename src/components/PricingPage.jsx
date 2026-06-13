import { useState } from 'react'
import { PRICES } from '../lib/stripe.js'
import CheckoutModal from './CheckoutModal'

const plans = [
  {
    key: 'free',
    name: 'Free',
    price: { annual: '$0', monthly: '$0' },
    period: '',
    features: [
      '20 documents / month',
      '1 AI summary per document',
      '2 AI quizzes per document',
      'Focus reading mode',
      'Text-to-speech',
      'Flagged sections',
    ],
    cta: 'Get started free',
    highlight: false,
    priceId: null,
  },
  {
    key: 'student',
    name: 'Student Premium',
    price: { annual: '$60', monthly: '$6' },
    period: { annual: '/year', monthly: '/month' },
    badge: 'Most popular',
    features: [
      'Unlimited documents',
      'Unlimited AI summaries',
      'Unlimited AI quizzes',
      'Everything in Free',
      'Priority support',
      '.edu verification required',
    ],
    cta: 'Start Student plan',
    highlight: true,
    priceId: PRICES.student,
  },
  {
    key: 'standard',
    name: 'Standard Premium',
    price: { annual: '$80', monthly: '$9' },
    period: { annual: '/year', monthly: '/month' },
    features: [
      'Unlimited documents',
      'Unlimited AI summaries',
      'Unlimited AI quizzes',
      'Everything in Free',
      'Priority support',
    ],
    cta: 'Start Standard plan',
    highlight: false,
    priceId: PRICES.standard,
  },
]

export default function PricingPage({ currentTier = 'free', onUpgraded, onBack }) {
  const [billing, setBilling] = useState('annual')
  const [checkout, setCheckout] = useState(null) // { priceId, label }

  function handleSelect(plan) {
    if (!plan.priceId) return
    if (plan.key === currentTier) return
    setCheckout({
      priceId: plan.priceId[billing],
      label: `${plan.name} — ${plan.price[billing]}${plan.period?.[billing] ?? ''}`,
    })
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {onBack && (
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-6 transition"
        >
          <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back
        </button>
      )}
      <h1 className="text-3xl font-bold text-center mb-2">Choose your plan</h1>
      <p className="text-center text-gray-500 dark:text-gray-400 mb-6">
        Upgrade anytime. Cancel anytime.
      </p>

      {/* Billing toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden text-sm font-medium">
          {['annual', 'monthly'].map(b => (
            <button
              key={b}
              onClick={() => setBilling(b)}
              className={`px-5 py-1.5 transition ${billing === b
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              {b === 'annual' ? 'Annual (save ~17%)' : 'Monthly'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map(plan => {
          const isCurrent = plan.key === currentTier
          return (
            <div
              key={plan.key}
              className={`relative rounded-2xl border p-6 flex flex-col gap-4 ${
                plan.highlight
                  ? 'border-indigo-500 ring-2 ring-indigo-500 bg-indigo-50 dark:bg-indigo-950/30'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-semibold px-3 py-0.5 rounded-full">
                  {plan.badge}
                </span>
              )}
              <div>
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <p className="text-3xl font-bold mt-1">
                  {plan.price[billing]}
                  <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                    {plan.period?.[billing] ?? ''}
                  </span>
                </p>
              </div>

              <ul className="space-y-2 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSelect(plan)}
                disabled={isCurrent || !plan.priceId}
                className={`w-full py-2.5 rounded-xl text-sm font-semibold transition ${
                  isCurrent
                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-default'
                    : plan.highlight
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    : plan.priceId
                    ? 'border border-indigo-500 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 cursor-default'
                }`}
              >
                {isCurrent ? 'Current plan' : plan.cta}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-center text-xs text-gray-400 mt-6">
        Student plan requires a .edu email address. Verified at checkout.
      </p>

      {checkout && (
        <CheckoutModal
          priceId={checkout.priceId}
          planLabel={checkout.label}
          onSuccess={() => { setCheckout(null); onUpgraded?.() }}
          onClose={() => setCheckout(null)}
        />
      )}
    </div>
  )
}
