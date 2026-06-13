import { useState, useEffect } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { getStripe } from '../lib/stripe'
import { useAppAuth } from '../lib/AuthContext.jsx'

function CheckoutForm({ onSuccess, onCancel }) {
  const stripe   = useStripe()
  const elements = useElements()
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return
    setLoading(true)
    setError(null)

    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.origin + '/?checkout=success' },
      redirect: 'if_required',
    })

    if (confirmError) {
      setError(confirmError.message)
      setLoading(false)
    } else {
      onSuccess?.()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: 'tabs',
          wallets: { applePay: 'auto', googlePay: 'auto' },
        }}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!stripe || loading}
          className="flex-1 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium transition"
        >
          {loading ? 'Processing…' : 'Subscribe'}
        </button>
      </div>
    </form>
  )
}

export default function CheckoutModal({ priceId, planLabel, onSuccess, onClose }) {
  const { userId, userEmail } = useAppAuth()
  const [clientSecret, setClientSecret] = useState(null)
  const [fetchError, setFetchError]     = useState(null)

  useEffect(() => {
    if (!priceId || !userId) return

    fetch('/api/stripe-create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priceId, userId, email: userEmail }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.clientSecret) setClientSecret(d.clientSecret)
        else setFetchError(d.error ?? 'Failed to start checkout')
      })
      .catch(() => setFetchError('Network error'))
  }, [priceId, userId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-xl p-6">
        <h2 className="text-lg font-semibold mb-1">{planLabel}</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Apple Pay, Google Pay, or card accepted.
        </p>

        {fetchError && <p className="text-sm text-red-600">{fetchError}</p>}

        {!clientSecret && !fetchError && (
          <p className="text-sm text-gray-400 animate-pulse">Loading payment form…</p>
        )}

        {clientSecret && (
          <Elements
            stripe={getStripe()}
            options={{ clientSecret, appearance: { theme: 'stripe' } }}
          >
            <CheckoutForm onSuccess={onSuccess} onCancel={onClose} />
          </Elements>
        )}
      </div>
    </div>
  )
}
