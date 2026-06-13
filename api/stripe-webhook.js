import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const STUDENT_PRICES = new Set([
  'price_1ThYSPC8vC5nJdZSCUnvRbu3',
  'price_1ThYSPC8vC5nJdZSOAFs2bEl',
])

function tierFromPrice(priceId) {
  return STUDENT_PRICES.has(priceId) ? 'student' : 'standard'
}

export const config = { api: { bodyParser: false } }

async function buffer(readable) {
  const chunks = []
  for await (const chunk of readable) chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  let event
  try {
    const body = await buffer(req)
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[webhook] signature verify failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  const obj = event.data.object

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const priceId = obj.items.data[0]?.price.id
      const customer = await stripe.customers.retrieve(obj.customer)
      const userId = customer.metadata?.userId
      if (!userId) break

      await supabase.from('subscriptions').upsert({
        user_id:            userId,
        stripe_customer_id: obj.customer,
        stripe_sub_id:      obj.id,
        tier:               tierFromPrice(priceId),
        status:             obj.status,
        price_id:           priceId,
        current_period_end: new Date(obj.current_period_end * 1000).toISOString(),
        updated_at:         new Date().toISOString(),
      }, { onConflict: 'user_id' })
      break
    }

    case 'customer.subscription.deleted': {
      const customer = await stripe.customers.retrieve(obj.customer)
      const userId = customer.metadata?.userId
      if (!userId) break

      await supabase.from('subscriptions').upsert({
        user_id:   userId,
        tier:      'free',
        status:    'canceled',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      break
    }
  }

  res.json({ received: true })
}
