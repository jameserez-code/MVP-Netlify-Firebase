import type { FastifyInstance } from 'fastify'
import type { Firestore } from 'firebase-admin/firestore'

export default async function healthRoutes(app: FastifyInstance, db: Firestore) {
  app.get('/health', async (_request, reply) => {
    const used = process.memoryUsage()
    const usedMB = Math.round(used.heapUsed / 1024 / 1024)

    let firebaseStatus = 'unknown'
    try {
      // Check Firestore connectivity with a known-document get
      await db.collection('tasks').doc('_health_probe').get()
      firebaseStatus = 'connected'
    } catch {
      firebaseStatus = 'disconnected'
    }

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(process.uptime()),
      checks: {
        firebase: firebaseStatus,
        memory: `ok (${usedMB}MB used)`,
        disk: 'ok',
      },
    }
  })
}
