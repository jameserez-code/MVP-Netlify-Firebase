import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'
import { stripe, getOrCreateProPrice } from '../lib/stripe.js'
import type Stripe from 'stripe'
import { verify } from '../lib/jwt.js'
import { log } from '../lib/logger.js'

function getAuthClaims(
  request: any
): { orgId: string; sub: string; role: string } | null {
  const header = ((request.headers.authorization || '') as string).trim()
  const token = header.startsWith('Bearer ') ? header.substring(7) : null
  if (token) {
    const claims = verify(token)
    if (claims) {
      return {
        orgId: (claims as any).orgId || process.env.DEFAULT_ORG_ID || 'default',
        sub: claims.sub,
        role: (claims as any).role || 'org_admin',
      }
    }
  }
  return null
}

function err(reply: any, code: number, category: string, message: string) {
  reply.code(code)
  return { error: { code: category, message } }
}

export default async function billingRoutes(app: FastifyInstance, db: Firestore) {
  // ---------------------------------------------------------------------------
  // GET /billing/plans
  // ---------------------------------------------------------------------------
  app.get('/billing/plans', async (_request, reply) => {
    return {
      plans: [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          interval: 'month',
          features: [
            '1 organization',
            '3 agents',
            '100 enforcements/day',
            'Basic policies',
            'Community support',
          ],
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 2900,
          interval: 'month',
          features: [
            'Unlimited agents',
            '10,000 enforcements/day',
            'Advanced policies + webhooks',
            'Team members',
            'Priority email support',
          ],
        },
      ],
    }
  })

  // ---------------------------------------------------------------------------
  // GET /billing/usage
  // ---------------------------------------------------------------------------
  app.get('/billing/usage', async (request, reply) => {
    const claims = getAuthClaims(request)
    if (!claims) return err(reply, 401, 'unauthorized', 'Authentication required')

    const today = new Date().toISOString().split('T')[0]
    const usageSnap = await db.collection('usage').doc(`${claims.orgId}_${today}`).get()
    const count = usageSnap.exists ? ((usageSnap.data() as any).count as number) || 0 : 0

    const orgSnap = await db.collection('organizations').doc(claims.orgId).get()
    const plan = orgSnap.exists ? ((orgSnap.data() as any).plan as string) || 'free' : 'free'
    const limit = plan === 'pro' ? 10000 : 100

    return { count, limit, plan }
  })

  // ---------------------------------------------------------------------------
  // POST /billing/checkout
  // ---------------------------------------------------------------------------
  app.post('/billing/checkout', async (request, reply) => {
    const claims = getAuthClaims(request)
    if (!claims) return err(reply, 401, 'unauthorized', 'Authentication required')

    const { planId, successUrl, cancelUrl } = (request.body || {}) as any
    if (planId !== 'pro') return err(reply, 400, 'validation', 'Invalid planId')

    const orgRef = db.collection('organizations').doc(claims.orgId)
    const orgSnap = await orgRef.get()
    const org = orgSnap.exists ? (orgSnap.data() as any) : null
    if (!org) return err(reply, 404, 'not_found', 'Organization not found')

    let customerId = org.stripeCustomerId as string | undefined
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: org.ownerId || org.email || undefined,
        name: org.name || undefined,
        metadata: { orgId: claims.orgId },
      })
      customerId = customer.id
      await orgRef.set({ stripeCustomerId: customerId }, { merge: true })
    }

    const priceId = await getOrCreateProPrice()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${appUrl}/dashboard/billing?success=1`,
      cancel_url: cancelUrl || `${appUrl}/dashboard/billing?canceled=1`,
      metadata: { orgId: claims.orgId, planId },
    })

    return { sessionId: session.id, url: session.url }
  })

  // ---------------------------------------------------------------------------
  // POST /billing/portal
  // ---------------------------------------------------------------------------
  app.post('/billing/portal', async (request, reply) => {
    const claims = getAuthClaims(request)
    if (!claims) return err(reply, 401, 'unauthorized', 'Authentication required')

    const orgSnap = await db.collection('organizations').doc(claims.orgId).get()
    const org = orgSnap.exists ? (orgSnap.data() as any) : null
    if (!org?.stripeCustomerId)
      return err(reply, 404, 'not_found', 'No subscription found')

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: `${appUrl}/dashboard/billing`,
    })

    return { url: session.url }
  })

  // ---------------------------------------------------------------------------
  // GET /billing/subscription
  // ---------------------------------------------------------------------------
  app.get('/billing/subscription', async (request, reply) => {
    const claims = getAuthClaims(request)
    if (!claims) return err(reply, 401, 'unauthorized', 'Authentication required')

    const orgSnap = await db.collection('organizations').doc(claims.orgId).get()
    const org = orgSnap.exists ? (orgSnap.data() as any) : { plan: 'free' }

    if (org.stripeSubscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(org.stripeSubscriptionId) as any
        return {
          plan: org.plan || 'free',
          status: sub.status,
          currentPeriodEnd: new Date(sub.current_period_end * 1000).toISOString(),
          cancelAtPeriodEnd: sub.cancel_at_period_end,
        }
      } catch {
        // fall through to stored data
      }
    }

    return {
      plan: org.plan || 'free',
      status: org.subscriptionStatus || 'active',
      currentPeriodEnd: org.currentPeriodEnd || null,
      cancelAtPeriodEnd: org.cancelAtPeriodEnd || false,
    }
  })

  // ---------------------------------------------------------------------------
  // GET /billing/invoices
  // ---------------------------------------------------------------------------
  app.get('/billing/invoices', async (request, reply) => {
    const claims = getAuthClaims(request)
    if (!claims) return err(reply, 401, 'unauthorized', 'Authentication required')

    const orgSnap = await db.collection('organizations').doc(claims.orgId).get()
    const org = orgSnap.exists ? (orgSnap.data() as any) : null
    if (!org?.stripeCustomerId) return { invoices: [] }

    const invoices = await stripe.invoices.list({
      customer: org.stripeCustomerId,
      limit: 20,
    })

    return {
      invoices: invoices.data.map((i) => ({
        id: i.id,
        number: i.number,
        amount_due: i.amount_due,
        status: i.status,
        created: i.created,
        pdf: i.invoice_pdf,
      })),
    }
  })

  // ---------------------------------------------------------------------------
  // POST /billing/cancel
  // ---------------------------------------------------------------------------
  app.post('/billing/cancel', async (request, reply) => {
    const claims = getAuthClaims(request)
    if (!claims) return err(reply, 401, 'unauthorized', 'Authentication required')

    const orgSnap = await db.collection('organizations').doc(claims.orgId).get()
    const org = orgSnap.exists ? (orgSnap.data() as any) : null
    if (!org?.stripeSubscriptionId)
      return err(reply, 404, 'not_found', 'No subscription found')

    await stripe.subscriptions.update(org.stripeSubscriptionId, {
      cancel_at_period_end: true,
    })
    await orgSnap.ref.set({ cancelAtPeriodEnd: true }, { merge: true })

    return { canceled: true }
  })

  // ---------------------------------------------------------------------------
  // POST /billing/webhook
  // ---------------------------------------------------------------------------
  app.post('/billing/webhook', async (request, reply) => {
    const payload = (request as any).rawBody || JSON.stringify(request.body)
    const sig = (request.headers['stripe-signature'] as string) || ''
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        payload,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err: any) {
      log.error('stripe webhook error', { message: err.message })
      reply.code(400)
      return { error: { code: 'invalid_signature', message: err.message } }
    }

    const data = event.data.object as any

    switch (event.type) {
      case 'checkout.session.completed': {
        const orgId = data.metadata?.orgId
        const planId = data.metadata?.planId
        if (orgId && planId) {
          await db
            .collection('organizations')
            .doc(orgId)
            .set(
              {
                plan: planId,
                stripeSubscriptionId: data.subscription,
                subscriptionStatus: 'active',
              },
              { merge: true }
            )
        }
        break
      }
      case 'invoice.paid': {
        const customerId = data.customer
        const orgSnap = await db
          .collection('organizations')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get()
        if (!orgSnap.empty) {
          const doc = orgSnap.docs[0]
          const periodEnd =
            data.lines?.data?.[0]?.period?.end ||
            Math.floor(Date.now() / 1000)
          await doc.ref.set(
            {
              subscriptionStatus: 'active',
              currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
            },
            { merge: true }
          )
        }
        break
      }
      case 'invoice.payment_failed': {
        const customerId = data.customer
        const orgSnap = await db
          .collection('organizations')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get()
        if (!orgSnap.empty) {
          const doc = orgSnap.docs[0]
          await doc.ref.set(
            { subscriptionStatus: 'past_due' },
            { merge: true }
          )
        }
        break
      }
      case 'customer.subscription.deleted': {
        const customerId = data.customer
        const orgSnap = await db
          .collection('organizations')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get()
        if (!orgSnap.empty) {
          const doc = orgSnap.docs[0]
          await doc.ref.set(
            {
              plan: 'free',
              subscriptionStatus: 'canceled',
              stripeSubscriptionId: null,
              cancelAtPeriodEnd: false,
            },
            { merge: true }
          )
        }
        break
      }
      case 'customer.subscription.updated': {
        const customerId = data.customer
        const orgSnap = await db
          .collection('organizations')
          .where('stripeCustomerId', '==', customerId)
          .limit(1)
          .get()
        if (!orgSnap.empty) {
          const doc = orgSnap.docs[0]
          await doc.ref.set(
            {
              subscriptionStatus: data.status,
              currentPeriodEnd: new Date(
                data.current_period_end * 1000
              ).toISOString(),
              cancelAtPeriodEnd: data.cancel_at_period_end,
            },
            { merge: true }
          )
        }
        break
      }
    }

    return { received: true }
  })
}
