// Vercel serverless entry — Fastify auto-detected by @vercel/node v3
import Fastify from 'fastify'

const app = Fastify({ logger: true })

app.addHook('onRequest', async (_req: any, reply: any) => {
  reply.header('Access-Control-Allow-Origin', '*')
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (_req.method === 'OPTIONS') { reply.code(204).send(); return }
})

app.get('/api', async () => ({
  name: 'Passport Agent',
  version: '2.1.0',
  mode: 'serverless',
  status: 'running',
  timestamp: new Date().toISOString(),
  setup: {
    env: ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'],
    demo: 'No Firebase needed for /api health endpoint',
  },
  docs: { repo: 'github.com/jameserez-code/MVP-Netlify-Firebase' },
}))

app.get('/api/health', async () => ({ status: 'ok' }))

export default app
