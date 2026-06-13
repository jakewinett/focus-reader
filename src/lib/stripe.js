import { loadStripe } from '@stripe/stripe-js'

// Copy from https://dashboard.stripe.com/test/apikeys  (starts with pk_test_)
const PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY

let stripePromise = null

export function getStripe() {
  if (!stripePromise) stripePromise = loadStripe(PUBLISHABLE_KEY)
  return stripePromise
}

export const PRICES = {
  student: {
    annual:  'price_1ThYSPC8vC5nJdZSCUnvRbu3',
    monthly: 'price_1ThYSPC8vC5nJdZSOAFs2bEl',
  },
  standard: {
    annual:  'price_1ThYSQC8vC5nJdZSjf2XuCPW',
    monthly: 'price_1ThYSQC8vC5nJdZSKpTxPQgY',
  },
}
