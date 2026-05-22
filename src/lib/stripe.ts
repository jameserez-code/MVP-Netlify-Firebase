import Stripe from 'stripe'
import { CircuitBreaker } from './circuit-breaker.js'

const secretKey = process.env.STRIPE_SECRET_KEY
if (!secretKey) {
  throw new Error('STRIPE_SECRET_KEY is required')
}

export const stripe = new Stripe(secretKey, {
  apiVersion: '2024-06-20',
} as any)

const stripeCircuitBreaker = new CircuitBreaker({
  name: 'stripe-api',
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxCalls: 3,
})

export async function getOrCreateProPrice(): Promise<string> {
  return stripeCircuitBreaker.execute(async () => {
    const prices = await stripe.prices.list({ limit: 10 })
    const existing = prices.data.find((p) => p.metadata?.plan === 'pro' && p.active)
    if (existing) return existing.id

    const product = await stripe.products.create({
      name: 'Passport Agent Pro',
      metadata: { plan: 'pro' },
    })

    const price = await stripe.prices.create({
      unit_amount: 2900,
      currency: 'usd',
      recurring: { interval: 'month' },
      product: product.id,
      metadata: { plan: 'pro' },
    })

    return price.id
  })
}
