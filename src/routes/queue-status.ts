import type { FastifyInstance } from 'fastify'

export default async function queueStatusRoutes(_app: FastifyInstance, _db: any) {
  _app.get('/queue-status', async (_request, reply) => {
    return { queues: { webhook: { waiting: 0, active: 0 }, email: { waiting: 0, active: 0 } } }
  })
}
