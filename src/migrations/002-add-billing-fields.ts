import type { Firestore } from 'firebase-admin/firestore'
import type { Migration } from './runner.js'
import { log } from '../lib/logger.js'

/**
 * Migration 002: Add Billing Fields
 * - Adds stripeCustomerId, plan, subscriptionStatus to org docs
 * - Adds verified, verificationToken to user docs
 * - Idempotent: only updates docs missing the fields
 */
const migration: Migration = {
  id: '002',
  name: 'add-billing-fields',
  up: async (db: Firestore) => {
    const now = new Date().toISOString()
    let updatedOrgs = 0
    let updatedUsers = 0

    // Update organizations
    const orgsSnap = await db.collection('organizations').limit(500).get()
    for (const doc of orgsSnap.docs) {
      const data = doc.data() as any
      const updates: Record<string, unknown> = {}

      if (data.stripeCustomerId === undefined) updates.stripeCustomerId = null
      if (data.plan === undefined) updates.plan = data.plan || 'free'
      if (data.subscriptionStatus === undefined) updates.subscriptionStatus = 'active'
      if (data.billingEmail === undefined) updates.billingEmail = data.ownerId || null
      if (data.updatedAt === undefined) updates.updatedAt = now

      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates)
        updatedOrgs++
      }
    }

    // Update users
    const usersSnap = await db.collection('users').limit(500).get()
    for (const doc of usersSnap.docs) {
      const data = doc.data() as any
      const updates: Record<string, unknown> = {}

      if (data.verified === undefined) updates.verified = true
      if (data.verificationToken === undefined) updates.verificationToken = null
      if (data.updatedAt === undefined) updates.updatedAt = now

      if (Object.keys(updates).length > 0) {
        await doc.ref.update(updates)
        updatedUsers++
      }
    }

    log.success('billing fields migration complete', { updatedOrgs, updatedUsers })
  },
  down: async (db: Firestore) => {
    // Remove the added fields
    const orgsSnap = await db.collection('organizations').limit(500).get()
    const usersSnap = await db.collection('users').limit(500).get()

    for (const doc of orgsSnap.docs) {
      await doc.ref.update({
        stripeCustomerId: null,
        plan: null,
        subscriptionStatus: null,
        billingEmail: null,
      })
    }

    for (const doc of usersSnap.docs) {
      await doc.ref.update({
        verified: null,
        verificationToken: null,
      })
    }

    log.info('billing fields rollback complete')
  },
}

export default migration
