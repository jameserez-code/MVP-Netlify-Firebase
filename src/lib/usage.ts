import type { Firestore } from 'firebase-admin/firestore'
import { FieldValue } from 'firebase-admin/firestore'

const LIMITS = {
  free: { agents: 3, enforcementsPerDay: 100 },
  pro: { agents: Infinity, enforcementsPerDay: 10000 },
  enterprise: { agents: Infinity, enforcementsPerDay: Infinity },
}

export async function checkLimit(
  db: Firestore,
  orgId: string,
  feature: 'agents' | 'enforcements'
): Promise<{ allowed: boolean; limit: number; current: number; remaining: number }> {
  const orgSnap = await db.collection('organizations').doc(orgId).get()
  const org = orgSnap.exists ? (orgSnap.data() as any) : { plan: 'free' }
  const plan: keyof typeof LIMITS = (org.plan as any) || 'free'
  const config = LIMITS[plan] || LIMITS.free

  if (feature === 'agents') {
    const agentsSnap = await db.collection('agents').where('orgId', '==', orgId).get()
    const current = agentsSnap.size
    const limit = config.agents
    return { allowed: current < limit, limit, current, remaining: Math.max(0, limit - current) }
  }

  if (feature === 'enforcements') {
    const today = new Date().toISOString().split('T')[0]
    const usageSnap = await db.collection('usage').doc(`${orgId}_${today}`).get()
    const current = usageSnap.exists ? ((usageSnap.data() as any).count as number) || 0 : 0
    const limit = config.enforcementsPerDay
    return { allowed: current < limit, limit, current, remaining: Math.max(0, limit - current) }
  }

  return { allowed: true, limit: Infinity, current: 0, remaining: Infinity }
}

export async function incrementEnforcement(db: Firestore, orgId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0]
  const ref = db.collection('usage').doc(`${orgId}_${today}`)
  await ref.set(
    {
      orgId,
      date: today,
      count: FieldValue.increment(1),
    },
    { merge: true }
  )
}
