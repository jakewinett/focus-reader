import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' })

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { priceId, userId, email } = req.body ?? {}
  if (!priceId || !userId || !email) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Reuse existing customer or create one
    const existing = await stripe.customers.search({
      query: `metadata['userId']:'${userId}'`,
      limit: 1,
    })
    let customer = existing.data[0]
    if (!customer) {
      customer = await stripe.customers.create({
        email,
        metadata: { userId },
      })
    }

    // Validate .edu for student prices
    const studentPrices = [
      'price_1ThYSPC8vC5nJdZSCUnvRbu3',
      'price_1ThYSPC8vC5nJdZSOAFs2bEl',
    ]
    if (studentPrices.includes(priceId) && !email.endsWith('.edu')) {
      return res.status(400).json({ error: 'Student plan requires a .edu email address.' })
    }

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    })

    const intent = subscription.latest_invoice.payment_intent
    return res.status(200).json({
      subscriptionId: subscription.id,
      clientSecret: intent.client_secret,
    })
  } catch (err) {
    console.error('[stripe-create-subscription]', err.message)
    return res.status(500).json({ error: err.message })
  }
}
