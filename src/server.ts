import Fastify from 'fastify'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { randomUUID } from 'crypto'
import { initFirebase } from './lib/firebase.js'
import { log } from './lib/logger.js'
import { sign, verify } from './lib/jwt.js'
import { transitionTask, transitionRun, failRunWithError } from './transitions.js'
import { generateId } from './lib/crypto.js'
import { attachRequestId, auditTimeline, runTrace, metrics, getMetricsData } from './observability.js'
import { hardenAuth } from './security.js'
import { systemDiagnostics, checkConsistency, repairOrphanedRuns, repairStuckTasks, generateReport } from './diagnostics.js'
import { checkCapability, seedOrg, getOrgMetrics } from './capabilities.js'
import { verifyPassword, hashPassword } from './lib/password.js'
import { registerValidationHooks } from './lib/input-validation.js'
import { validateEnv } from './lib/env.js'
import { AppError, sanitizeErrorForProduction } from './lib/errors.js'
import { createValidationHook } from './lib/validation.js'
import { createRequestLoggerHooks } from './lib/request-logger.js'
import { RateLimiter } from './lib/rate-limiter.js'
import { withCache } from './lib/cache.js'
import { paginate, parsePaginationQuery } from './lib/pagination.js'
import { sendEmail } from './lib/email.js'
import { verificationTemplate, passwordResetTemplate, accountLockedTemplate } from './lib/email-templates.js'

import agentsRoutes from './routes/agents.js'
import policiesRoutes from './routes/policies.js'
import enforceRoutes from './routes/enforce.js'
import healthRoutes from './routes/health.js'
import apiKeysRoutes from './routes/api-keys.js'
import analyticsRoutes from './routes/analytics.js'
import webhooksRoutes from './routes/webhooks.js'
import notificationsRoutes from './routes/notifications.js'
import billingRoutes from './routes/billing.js'
import { deliverWebhook } from './lib/webhook-deliverer.js'
import { initWebSocketServer, closeWebSocketServer } from './lib/websocket.js'
import { publishEvent } from './lib/events.js'
import { startThresholdChecker } from './lib/alerts.js'
import { resetMetrics } from './lib/metrics.js'

// Validate environment before starting
validateEnv()

const db = initFirebase()
const app = Fastify({ logger: false })

// Capture raw body for Stripe webhook signature verification
app.addContentTypeParser('application/json', { parseAs: 'string' }, (req, body, done) => {
  try {
    (req as any).rawBody = body
    const json = JSON.parse(body as string)
    done(null, json)
  } catch (err) {
    done(err as Error, undefined)
  }
})

// Input validation + secure headers
registerValidationHooks(app)

// Zod body validation preHandler
app.addHook('preHandler', createValidationHook())

// Request logging with correlation IDs
const { onRequest: requestLoggerOnRequest, onResponse: requestLoggerOnResponse } = createRequestLoggerHooks()
app.addHook('onRequest', requestLoggerOnRequest)
app.addHook('onResponse', requestLoggerOnResponse)

// Rate limiting — per-IP sliding window, endpoint-specific limits, Redis optional
const rateLimiter = new RateLimiter({
  endpointLimits: {
    '/auth/login': 5,
    '/auth/forgot-password': 3,
    '/auth/register': 10,
    '/enforce': 100,
    '/gateway/execute': 50,
  },
  defaultLimit: 200,
  windowMs: 60_000,
})

// CORS + rate limiting hook
const isDev = process.env.NODE_ENV !== 'production'
const defaultAllowedOrigins = [
  'https://passport-agent.netlify.app',
  'https://passport-agent.vercel.app',
  'https://passport-agent-demo.onrender.com',
]
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : defaultAllowedOrigins

app.addHook('onRequest', async (request, reply) => {
  const origin = (request.headers.origin as string) || ''
  if (isDev) {
    reply.header('Access-Control-Allow-Origin', '*')
  } else if (allowedOrigins.includes(origin)) {
    reply.header('Access-Control-Allow-Origin', origin)
  }
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Agent-Key, X-API-Key')
  reply.header('Access-Control-Allow-Credentials', 'true')
  if (request.method === 'OPTIONS') { reply.code(204).send(); return }
  const ip = ((request.headers['x-forwarded-for'] as string) || request.ip || '127.0.0.1').split(',')[0].trim()
  const result = await rateLimiter.check(ip, request.url)
  reply.header('X-RateLimit-Remaining', String(result.remaining))
  if (!result.allowed) {
    if (result.retryAfter) {
      reply.header('Retry-After', String(result.retryAfter))
    }
    reply.code(429).send({ error: { code: 'rate_limited', message: 'Too many requests' } })
  }
})

// Request ID middleware (kept for backward compat)
attachRequestId(app)

// Global error handler
app.setErrorHandler((error: any, request, reply) => {
  const correlationId = request.correlationId || 'unknown'

  if (error instanceof AppError) {
    log.error('handled error', {
      correlationId,
      code: error.code,
      statusCode: error.statusCode,
      message: error.message,
    })
    reply.code(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        ...(error.detail ? { detail: error.detail } : {}),
      },
    })
    return
  }

  log.error('unhandled error', {
    correlationId,
    message: error.message,
    stack: isDev ? error.stack : undefined,
  })

  const sanitized = sanitizeErrorForProduction(error)
  reply.code(500).send({
    error: {
      code: sanitized.code,
      message: isDev ? error.message : sanitized.message,
      ...(isDev && error.stack ? { stack: error.stack } : {}),
    },
  })
})

// Auth middleware
interface Claims { sub: string; role: string; orgId?: string; scopes?: string[]; iat: number; exp: number; jti: string }
async function requireAuth(request: any, reply: any): Promise<Claims | null> {
  // Check JWT first
  const header = (request.headers.authorization || '') as string
  const token = header.startsWith('Bearer ') ? header.substring(7) : null
  if (token) {
    const claims = verify(token)
    if (!claims) { reply.code(401).send({ error: { code: 'unauthorized', message: 'invalid or expired token' } }); return null }
    request.claims = claims as Claims
    return claims as Claims
  }

  // Fall back to API key
  const apiKey = (request.headers['x-api-key'] || '') as string
  if (apiKey) {
    const keySnap = await db.collection('apiKeys').get()
    let matchedDoc: any = null
    for (const doc of keySnap.docs) {
      const data = doc.data() as any
      if (data.status !== 'active') continue
      const { verifyKey } = await import('./lib/crypto.js')
      if (verifyKey(apiKey, data.keyHash, data.keySalt, data.iterations || 50000)) {
        matchedDoc = { id: doc.id, ...data }
        break
      }
    }

    if (!matchedDoc) {
      reply.code(401).send({ error: { code: 'unauthorized', message: 'invalid API key' } })
      return null
    }

    // Update usage stats (fire-and-forget)
    db.collection('apiKeys').doc(matchedDoc.id).update({
      requestCount: (matchedDoc.requestCount || 0) + 1,
      lastUsedAt: new Date().toISOString(),
    }).catch(() => {})

    const claims: Claims = {
      sub: matchedDoc.orgId || matchedDoc.name || matchedDoc.id,
      role: 'api_key',
      orgId: matchedDoc.orgId,
      scopes: matchedDoc.scopes || ['read'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      jti: matchedDoc.id,
    }
    request.claims = claims
    return claims
  }

  reply.code(401).send({ error: { code: 'unauthorized', message: 'missing Authorization header or X-API-Key header' } })
  return null
}

// Require verified email middleware — allows GET for unverified, blocks mutations
async function requireVerified(request: any, reply: any): Promise<boolean> {
  const claims = request.claims as Claims | undefined
  if (!claims) {
    reply.code(401).send({ error: { code: 'unauthorized', message: 'authentication required' } })
    return false
  }
  // API keys are exempt from verification
  if (claims.role === 'api_key') return true

  try {
    const snap = await db.collection('users').where('email', '==', claims.sub).limit(1).get()
    if (!snap.empty) {
      const userData = snap.docs[0].data() as any
      if (userData.verified === false) {
        reply.code(403).send({ error: { code: 'email_not_verified', message: 'Please verify your email before performing this action' } })
        return false
      }
    }
    return true
  } catch {
    reply.code(503).send({ error: { code: 'firestore', message: 'auth service unavailable' } })
    return false
  }
}

function err(reply: any, code: number, category: string, message: string, detail?: Record<string, unknown>) {
  reply.code(code)
  return { error: { code: category, message, ...(detail || {}) } }
}

async function fetchDoc(collection: string, id: string) {
  const snap = await db.collection(collection).doc(id).get()
  return snap.exists ? { id, ...snap.data() } : null
}

function getOrgId(claims: Claims | null): string {
  return claims?.orgId || process.env.DEFAULT_ORG_ID || 'default'
}

async function broadcastMetrics(orgId: string) {
  try {
    const data = await getMetricsData(db)
    publishEvent(orgId, 'metrics', data)
  } catch {
    // silent fail
  }
}

// ==================== ENDPOINTS ====================

// GET / — root (live mini-dashboard)
app.get('/', async (_request, reply) => {
  reply.header('Content-Type', 'text/html')
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Passport Agent</title>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Geist,sans-serif;background:#0d1117;color:#c9d1d9;min-height:100vh;overflow-x:hidden}
body::after{content:"";position:fixed;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(46,160,67,.008) 50%);background-size:100% 4px;pointer-events:none;z-index:9999}
header{background:rgba(13,17,23,.92);backdrop-filter:blur(20px);border-bottom:1px solid rgba(46,160,67,.15);position:sticky;top:0;z-index:100;padding:14px 32px;display:flex;justify-content:space-between;align-items:center}
h1{font-family:"JetBrains Mono",monospace;font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:3px;color:#2ea043;text-shadow:0 0 12px rgba(46,160,67,.3)}
.status{display:flex;align-items:center;gap:8px;font-family:"JetBrains Mono",monospace;font-size:11px;color:#8b949e}
.status-dot{width:8px;height:8px;border-radius:50%;background:#2ea043;box-shadow:0 0 6px rgba(46,160,67,.5);animation:pulse 2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
@keyframes slideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes countIn{from{opacity:0}to{opacity:1}}
@keyframes borderPulse{0%,100%{border-color:rgba(46,160,67,.15)}50%{border-color:rgba(46,160,67,.35)}}
.card{background:rgba(22,27,34,.7);border:1px solid rgba(48,54,61,.5);border-radius:6px;padding:18px 20px;transition:all .2s ease;animation:slideUp .4s ease both}
.card:hover{border-color:rgba(46,160,67,.25);transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,.3)}
.card:nth-child(1){animation-delay:.05s}.card:nth-child(2){animation-delay:.1s}.card:nth-child(3){animation-delay:.15s}.card:nth-child(4){animation-delay:.2s}.card:nth-child(5){animation-delay:.25s}.card:nth-child(6){animation-delay:.3s}
.card-label{font-family:"JetBrains Mono",monospace;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#8b949e;margin-bottom:8px}
.card-value{font-family:"JetBrains Mono",monospace;font-size:28px;font-weight:700;animation:countIn .6s ease}
.link-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 16px;background:rgba(46,160,67,.06);border:1px solid rgba(46,160,67,.15);border-radius:4px;font-family:"JetBrains Mono",monospace;font-size:11px;color:#2ea043;text-decoration:none;transition:all .2s ease}
.link-btn:hover{background:rgba(46,160,67,.12);border-color:rgba(46,160,67,.35);box-shadow:0 0 12px rgba(46,160,67,.1);transform:translateY(-1px)}
.link-btn-secondary{border-color:rgba(48,54,61,.4);color:#8b949e}
.link-btn-secondary:hover{border-color:rgba(139,148,158,.3);color:#c9d1d9}
.shimmer-bar{position:fixed;top:0;left:0;width:100%;height:2px;background:linear-gradient(90deg,transparent,#2ea043,transparent);background-size:200% 100%;animation:shimmer 3s infinite linear;z-index:200}
.endpoint-table td{transition:background .15s}
.endpoint-table tr:hover td{background:rgba(46,160,67,.03)}
.method-tag{transition:transform .15s}
tr:hover .method-tag{transform:scale(1.1)}
.endpoint-table{width:100%;border-collapse:collapse;font-family:"JetBrains Mono",monospace;font-size:12px}
.endpoint-table th{text-align:left;padding:8px 14px;font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#8b949e;border-bottom:1px solid rgba(48,54,61,.3);font-weight:600}
.endpoint-table td{padding:7px 14px;border-bottom:1px solid rgba(48,54,61,.15);color:#c9d1d9}
.method-tag{display:inline-block;width:44px;text-align:center;padding:2px 0;border-radius:3px;font-size:10px;font-weight:700;letter-spacing:1px}
.g{background:rgba(46,160,67,.12);color:#2ea043}.p{background:rgba(210,153,29,.12);color:#d2991d}.pt{background:rgba(88,166,255,.12);color:#58a6ff}
.auth-yes{color:#2ea043;font-size:10px}.auth-no{color:#484f58;font-size:10px}
.path-mono{color:#c9d1d9}.desc-cell{color:#8b949e;font-size:11px}
.refresh{font-family:"JetBrains Mono",monospace;font-size:10px;color:#484f58}
footer{text-align:center;padding:24px;font-family:"JetBrains Mono",monospace;font-size:10px;color:#30363d}
</style></head><body>
<div class="shimmer-bar"></div>
<header>
<h1>Passport Agent</h1>
<div class="status"><span class="status-dot" id="dot"></span><span id="statusText">initializing</span></div>
</header>
<main>
<div class="grid" id="stats"></div>
<div class="section">
<div class="section-title">Console Pages</div>
<div class="link-row">
<a class="link-btn" href="/landing.html">&#9654; Landing</a>
<a class="link-btn" href="/operator.html">&#9632; Operator Console</a>
<a class="link-btn" href="/agents.html">&#9783; Agent Manager</a>
<a class="link-btn" href="/admin-portal.html">&#9881; Admin Portal</a>
<a class="link-btn" href="/dev-dashboard.html">&#9776; Dev Dashboard</a>
<a class="link-btn link-btn-secondary" href="/sdk-demo.html">SDK Demo</a>
<a class="link-btn link-btn-secondary" href="/verify-demo.html">Verify Demo</a>
</div>
</div>
<div class="section">
<div class="section-title">API Endpoints</div>
<table class="endpoint-table">
<tr><th></th><th>Path</th><th>Auth</th><th>Purpose</th></tr>
<tr><td><span class="method-tag p">POST</span></td><td class="path-mono">/auth/login</td><td class="auth-no">—</td><td class="desc-cell">Get JWT token</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/task</td><td class="auth-yes">JWT</td><td class="desc-cell">Create task</td></tr>
<tr><td><span class="method-tag g">GET</span></td><td>/task/:id</td><td class="auth-no">—</td><td class="desc-cell">Read task</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/agent/run</td><td class="auth-yes">JWT</td><td class="desc-cell">Start run</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/run/:id/log</td><td class="auth-yes">JWT</td><td class="desc-cell">Log action</td></tr>
<tr><td><span class="method-tag pt">PATCH</span></td><td>/run/:id/complete</td><td class="auth-yes">JWT</td><td class="desc-cell">Complete run</td></tr>
<tr><td><span class="method-tag pt">PATCH</span></td><td>/run/:id/fail</td><td class="auth-yes">JWT</td><td class="desc-cell">Fail run</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/agents/register</td><td class="auth-yes">JWT</td><td class="desc-cell">Register agent</td></tr>
<tr><td><span class="method-tag g">GET</span></td><td>/agents</td><td class="auth-no">—</td><td class="desc-cell">List agents</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/policies</td><td class="auth-yes">JWT</td><td class="desc-cell">Create policy</td></tr>
<tr><td><span class="method-tag g">GET</span></td><td>/policies</td><td class="auth-no">—</td><td class="desc-cell">List policies</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/enforce</td><td class="auth-yes">JWT</td><td class="desc-cell">Evaluate intent</td></tr>
<tr><td><span class="method-tag p">POST</span></td><td>/gateway/execute</td><td class="auth-no">—</td><td class="desc-cell">Execute with ticket</td></tr>
<tr><td><span class="method-tag g">GET</span></td><td>/audit</td><td class="auth-no">—</td><td class="desc-cell">Query intents</td></tr>
<tr><td><span class="method-tag g">GET</span></td><td>/metrics</td><td class="auth-no">—</td><td class="desc-cell">Operational metrics</td></tr>
<tr><td><span class="method-tag g">GET</span></td><td>/diagnostics</td><td class="auth-no">—</td><td class="desc-cell">System health</td></tr>
</table>
</div>
<div class="refresh">auto-refreshing every 10s</div>
</main>
<footer>Passport Agent v2.1 &middot; 2 runtime deps &middot; 18 endpoints &middot; Zero frameworks</footer>
<script>
function countUp(el,target){if(!el)return;var cur=parseInt(el.textContent)||0;if(cur===target)return;var step=Math.ceil(Math.abs(target-cur)/20);if(step<1)step=1;var go=function(){cur+=step;if((step>0&&cur>=target)||(step<0&&cur<=target)){el.textContent=target;return}el.textContent=cur;requestAnimationFrame(go)};go()}
async function refresh(){try{var r=await fetch("/metrics"),d=await r.json();if(!d.error){var t=d.tasks||{},ra=d.runs||{},ag=d.agents||{};
document.getElementById("stats").innerHTML=
'<div class=card><div class=card-label>Total Tasks</div><div class="card-value val-green" id=tTotal>0</div></div>'+
'<div class=card><div class=card-label>Pending</div><div class="card-value val-amber" id=tPending>0</div></div>'+
'<div class=card><div class=card-label>Active</div><div class="card-value val-cyan" id=tActive>0</div></div>'+
'<div class=card><div class=card-label>Failed</div><div class="card-value val-red" id=tFailed>0</div></div>'+
'<div class=card><div class=card-label>Active Runs</div><div class="card-value val-white" id=tRuns>0</div></div>'+
'<div class=card><div class=card-label>Active Agents</div><div class="card-value val-white" id=tAgents>0</div></div>';
countUp(document.getElementById("tTotal"),t.total||0);countUp(document.getElementById("tPending"),t.pending||0);
countUp(document.getElementById("tActive"),t.active||0);countUp(document.getElementById("tFailed"),t.failed||0);
countUp(document.getElementById("tRuns"),ra.active||0);countUp(document.getElementById("tAgents"),ag.active||0);
document.getElementById("dot").style.background="#2ea043";document.getElementById("statusText").textContent="healthy"}}catch(e){document.getElementById("dot").style.background="#f85149";document.getElementById("statusText").textContent="offline"}}
refresh();setInterval(refresh,10000)
</script></body></html>`
})

// POST /auth/login
app.post('/auth/login', async (request, reply) => {
  const { email, password } = (request.body || {}) as { email?: string; password?: string }
  if (!email || !password) return err(reply, 400, 'validation', 'email and password are required')
  try {
    const snap = await db.collection('users').where('email', '==', email).limit(1).get()

    // Check against stored PBKDF2 hash
    let authenticated = false
    let userData: any = null
    let userDocId = ''
    if (!snap.empty) {
      userData = snap.docs[0].data() as any
      userDocId = snap.docs[0].id
      if (userData.passwordHash && userData.passwordSalt) {
        authenticated = verifyPassword(password, userData.passwordHash, userData.passwordSalt)
      }
    }

    // Account lockout check
    if (userData && userData.lockedUntil) {
      const now = Date.now()
      const lockedUntil = new Date(userData.lockedUntil).getTime()
      if (now < lockedUntil) {
        const retryAfter = Math.ceil((lockedUntil - now) / 1000)
        reply.header('Retry-After', String(retryAfter))
        return err(reply, 403, 'account_locked', 'Too many failed attempts. Try again in 30 minutes.', { retryAfter })
      }
    }

    if (!authenticated) {
      // Track failed attempts
      if (userData) {
        const failedAttempts = (userData.failedLoginAttempts || 0) + 1
        const update: any = { failedLoginAttempts: failedAttempts }
        if (failedAttempts >= 5) {
          const lockedUntil = new Date(Date.now() + 30 * 60_000).toISOString()
          update.lockedUntil = lockedUntil
          update.failedLoginAttempts = 0
          // Send lockout email (best-effort)
          ;(async () => {
            try {
              const { html, text } = accountLockedTemplate({ email, lockoutMinutes: 30 })
              await sendEmail({ to: email, subject: 'Account Temporarily Locked', html, text, orgId: userData.orgId })
            } catch {}
          })()
        }
        db.collection('users').doc(userDocId).update(update).catch(() => {})
      }
      return err(reply, 401, 'unauthorized', 'invalid credentials')
    }

    // Reset failed attempts on success
    if (userDocId) {
      db.collection('users').doc(userDocId).update({ failedLoginAttempts: 0, lockedUntil: null }).catch(() => {})
    }

    const user = { id: userDocId, ...userData }
    const token = sign({ sub: email, role: userData.role || 'org_admin' })
    log.success('login', { user: email })
    return { token, user: { email, role: userData.role, verified: userData.verified ?? true } }
  } catch (e: any) { return err(reply, 503, 'firestore', 'auth service unavailable') }
})

// POST /auth/register
app.post('/auth/register', async (request, reply) => {
  const { name, email, password } = (request.body || {}) as { name?: string; email?: string; password?: string }
  if (!name || !email || !password) return err(reply, 400, 'validation', 'name, email and password are required')
  try {
    const existing = await db.collection('users').where('email', '==', email).limit(1).get()
    if (!existing.empty) return err(reply, 409, 'conflict', 'an account with this email already exists')

    const verificationToken = `verify_${randomUUID()}`
    const { hash, salt } = hashPassword(password)
    const now = new Date().toISOString()

    const userRef = db.collection('users').doc(email)
    await userRef.set({
      email,
      displayName: name,
      role: 'org_admin',
      passwordHash: hash,
      passwordSalt: salt,
      verified: false,
      verificationToken,
      createdAt: now,
    })

    // Send verification email (best-effort)
    const frontendUrl = process.env.FRONTEND_URL || 'https://passport-agent.netlify.app'
    const verificationUrl = `${frontendUrl}/verify?token=${verificationToken}`
    ;(async () => {
      try {
        const { html, text } = verificationTemplate({ email, verificationUrl })
        await sendEmail({ to: email, subject: 'Verify Your Email — Passport Agent', html, text })
      } catch {}
    })()

    reply.code(201)
    return { message: 'Account created. Please check your email for verification link.', email }
  } catch (e: any) { return err(reply, 503, 'firestore', 'auth service unavailable') }
})

// GET /auth/verify
app.get('/auth/verify', async (request, reply) => {
  const { token: verificationToken } = request.query as { token?: string }
  if (!verificationToken) return err(reply, 400, 'validation', 'token is required')
  try {
    const snap = await db.collection('users').where('verificationToken', '==', verificationToken).limit(1).get()
    if (snap.empty) return err(reply, 400, 'validation', 'invalid or expired token')

    const userDoc = snap.docs[0]
    const userData = userDoc.data() as any
    const tokenCreated = userData.createdAt ? new Date(userData.createdAt).getTime() : Date.now()
    const now = Date.now()
    if (now - tokenCreated > 24 * 60 * 60_000) {
      return err(reply, 400, 'validation', 'invalid or expired token')
    }

    await db.collection('users').doc(userDoc.id).update({
      verified: true,
      verificationToken: null,
    })
    return { verified: true }
  } catch (e: any) { return err(reply, 503, 'firestore', 'auth service unavailable') }
})

// POST /auth/resend-verification
app.post('/auth/resend-verification', async (request, reply) => {
  const { email } = (request.body || {}) as { email?: string }
  if (!email) return err(reply, 400, 'validation', 'email is required')
  try {
    const snap = await db.collection('users').where('email', '==', email).limit(1).get()
    if (snap.empty) {
      // Security through obscurity: return success even if email not found
      return { message: 'If an account exists, a verification email has been sent.' }
    }
    const userDoc = snap.docs[0]
    const userData = userDoc.data() as any
    if (userData.verified) {
      return { message: 'If an account exists, a verification email has been sent.' }
    }

    const newToken = `verify_${randomUUID()}`
    await db.collection('users').doc(userDoc.id).update({
      verificationToken: newToken,
      createdAt: new Date().toISOString(),
    })

    const frontendUrl = process.env.FRONTEND_URL || 'https://passport-agent.netlify.app'
    const verificationUrl = `${frontendUrl}/verify?token=${newToken}`
    ;(async () => {
      try {
        const { html, text } = verificationTemplate({ email, verificationUrl })
        await sendEmail({ to: email, subject: 'Verify Your Email — Passport Agent', html, text })
      } catch {}
    })()

    return { message: 'If an account exists, a verification email has been sent.' }
  } catch (e: any) { return err(reply, 503, 'firestore', 'auth service unavailable') }
})

// POST /auth/forgot-password
app.post('/auth/forgot-password', async (request, reply) => {
  const { email } = (request.body || {}) as { email?: string }
  if (!email) return err(reply, 400, 'validation', 'email is required')
  try {
    const snap = await db.collection('users').where('email', '==', email).limit(1).get()
    if (!snap.empty) {
      const userDoc = snap.docs[0]
      const resetToken = `reset_${randomUUID()}`
      const resetExpires = new Date(Date.now() + 60 * 60_000).toISOString()
      await db.collection('users').doc(userDoc.id).update({
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      })

      const frontendUrl = process.env.FRONTEND_URL || 'https://passport-agent.netlify.app'
      const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`
      ;(async () => {
        try {
          const { html, text } = passwordResetTemplate({ email, resetUrl })
          await sendEmail({ to: email, subject: 'Reset Your Password — Passport Agent', html, text })
        } catch {}
      })()
    }
    // Security through obscurity: always return 200
    return { message: 'If an account exists, a reset email has been sent.' }
  } catch (e: any) { return err(reply, 503, 'firestore', 'auth service unavailable') }
})

// POST /auth/reset-password
app.post('/auth/reset-password', async (request, reply) => {
  const { token: resetToken, newPassword } = (request.body || {}) as { token?: string; newPassword?: string }
  if (!resetToken || !newPassword) return err(reply, 400, 'validation', 'token and newPassword are required')
  try {
    const snap = await db.collection('users').where('passwordResetToken', '==', resetToken).limit(1).get()
    if (snap.empty) return err(reply, 400, 'validation', 'invalid or expired token')

    const userDoc = snap.docs[0]
    const userData = userDoc.data() as any
    const expires = new Date(userData.passwordResetExpires || 0).getTime()
    if (Date.now() > expires) {
      return err(reply, 400, 'validation', 'invalid or expired token')
    }

    const { hash, salt } = hashPassword(newPassword)
    await db.collection('users').doc(userDoc.id).update({
      passwordHash: hash,
      passwordSalt: salt,
      passwordResetToken: null,
      passwordResetExpires: null,
    })
    return { message: 'Password updated successfully' }
  } catch (e: any) { return err(reply, 503, 'firestore', 'auth service unavailable') }
})

// POST /auth/change-password
app.post('/auth/change-password', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const { currentPassword, newPassword } = (request.body || {}) as { currentPassword?: string; newPassword?: string }
  if (!currentPassword || !newPassword) return err(reply, 400, 'validation', 'currentPassword and newPassword are required')
  try {
    const snap = await db.collection('users').where('email', '==', claims.sub).limit(1).get()
    if (snap.empty) return err(reply, 404, 'not_found', 'user not found')

    const userDoc = snap.docs[0]
    const userData = userDoc.data() as any
    const valid = verifyPassword(currentPassword, userData.passwordHash, userData.passwordSalt)
    if (!valid) return err(reply, 401, 'unauthorized', 'current password is incorrect')

    const { hash, salt } = hashPassword(newPassword)
    await db.collection('users').doc(userDoc.id).update({
      passwordHash: hash,
      passwordSalt: salt,
    })
    return { message: 'Password changed successfully' }
  } catch (e: any) { return err(reply, 503, 'firestore', 'auth service unavailable') }
})

// GET /auth/sessions
app.get('/auth/sessions', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  // Stub: return current session info
  const now = new Date().toISOString()
  return {
    sessions: [{
      id: 'current',
      createdAt: now,
      ip: ((request.headers['x-forwarded-for'] as string) || request.ip || '127.0.0.1').split(',')[0].trim(),
      userAgent: (request.headers['user-agent'] as string) || 'unknown',
    }],
  }
})

// DELETE /auth/sessions/:id
app.delete('/auth/sessions/:id', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const { id } = request.params as { id: string }
  // Stub: in a full implementation, add session token to blocklist
  return { revoked: true, sessionId: id }
})

// POST /task
app.post('/task', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const verified = await requireVerified(request, reply); if (!verified) return
  const { payload } = (request.body || {}) as { payload?: Record<string, unknown> }
  if (!payload) return err(reply, 400, 'validation', 'payload is required')
  try {
    const docRef = db.collection('tasks').doc()
    const now = new Date().toISOString()
    await docRef.set({ payload, status: 'pending', createdAt: now, updatedAt: now, queuedAt: null, startedAt: null, completedAt: null, failedAt: null, cancelledAt: null, error: null, runCount: 0 })
    log.success('task created', { taskId: docRef.id })
    broadcastMetrics(getOrgId(claims))
    reply.code(201); return { id: docRef.id, payload, status: 'pending', createdAt: now }
  } catch (e: any) { return err(reply, 503, 'firestore', 'write failed') }
})

// GET /task/:id
app.get('/task/:id', async (request, reply) => {
  const { id } = request.params as { id: string }
  try {
    const doc = await fetchDoc('tasks', id)
    if (!doc) return err(reply, 404, 'not_found', `task ${id} not found`)
    return doc
  } catch (e: any) { return err(reply, 503, 'firestore', 'read failed') }
})

// GET /tasks — paginated list
app.get('/tasks', async (request, reply) => {
  try {
    const { status } = request.query as { status?: string }
    const snap = await db.collection('tasks').orderBy('createdAt', 'desc').get()
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    const options = parsePaginationQuery(request.query as Record<string, unknown>)
    if (status) options.filters = { ...options.filters, status }
    return paginate(data, options)
  } catch (e: any) { reply.code(503); return { error: { code: 'firestore', message: e.message } } }
})

// POST /agent/run
app.post('/agent/run', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const verified = await requireVerified(request, reply); if (!verified) return
  const { agentId, taskId } = (request.body || {}) as { agentId?: string; taskId?: string }
  if (!agentId || !taskId) return err(reply, 400, 'validation', 'agentId and taskId are required')
  try {
    const agent = await fetchDoc('agents', agentId); if (!agent) return err(reply, 400, 'agent_not_found', `agent ${agentId} not found`)
    const task = await fetchDoc('tasks', taskId) as any; if (!task) return err(reply, 400, 'task_not_found', `task ${taskId} not found`)
    if (task.status !== 'pending') return err(reply, 409, 'conflict', `task ${taskId} is ${task.status}`, { currentStatus: task.status })
    const requestId = generateId('req_', 8)
    await transitionTask(db, taskId, 'queued', {}, requestId)
    const docRef = db.collection('runs').doc(); const now = new Date().toISOString()
    await db.runTransaction(async (tx) => {
      tx.update(db.collection('tasks').doc(taskId), { status: 'running', startedAt: now, updatedAt: now })
      tx.set(docRef, { agentId, taskId, sessionId: `sess_${docRef.id}`, status: 'running', startedAt: now, endedAt: null, error: null, updatedAt: now, createdAt: now, totalActions: 0, allowedActions: 0, deniedActions: 0 })
    })
    await db.collection('tasks').doc(taskId).update({ runCount: (task.runCount || 0) + 1 })
    log.success('run started', { runId: docRef.id, agentId, taskId, requestId })
    broadcastMetrics(getOrgId(claims))
    reply.code(201); return { id: docRef.id, agentId, taskId, sessionId: `sess_${docRef.id}`, status: 'running', startedAt: now }
  } catch (e: any) { return err(reply, 503, 'firestore', 'write failed') }
})

// GET /runs — paginated list
app.get('/runs', async (request, reply) => {
  try {
    const { status } = request.query as { status?: string }
    let q = db.collection('runs').orderBy('createdAt', 'desc')
    if (status) q = q.where('status', '==', status)
    const snap = await q.get()
    const data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    return paginate(data, parsePaginationQuery(request.query as Record<string, unknown>))
  } catch (e: any) { reply.code(503); return { error: { code: 'firestore', message: e.message } } }
})

// POST /run/:id/log
app.post('/run/:id/log', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const verified = await requireVerified(request, reply); if (!verified) return
  const { id } = request.params as { id: string }
  const { tool, decision, parameters, reason } = (request.body || {}) as any
  if (!tool || !decision) return err(reply, 400, 'validation', 'tool and decision are required')
  const run = await fetchDoc('runs', id) as any; if (!run) return err(reply, 404, 'not_found', `run ${id} not found`)
  if (run.status !== 'running') return err(reply, 409, 'conflict', `run ${id} is ${run.status}`)
  const logRef = db.collection('logs').doc()
  const logDoc = { agentId: run.agentId, runId: id, tool, decision, reason: reason || null, parameters: parameters || {}, timestamp: new Date().toISOString(), requestId: generateId('req_', 8) }
  await db.runTransaction(async (tx) => {
    tx.set(logRef, logDoc)
    tx.update(db.collection('runs').doc(id), { totalActions: run.totalActions + 1, allowedActions: run.allowedActions + (decision === 'allow' ? 1 : 0), deniedActions: run.deniedActions + (decision === 'deny' ? 1 : 0) })
  })
  log.success('action logged', { runId: id, tool, decision })
  broadcastMetrics(getOrgId(claims))
  reply.code(201); return { id: logRef.id, ...logDoc }
})

// PATCH /run/:id/complete
app.patch('/run/:id/complete', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const verified = await requireVerified(request, reply); if (!verified) return
  const { id } = request.params as { id: string }
  const requestId = generateId('req_', 8)
  const run = await fetchDoc('runs', id) as any; if (!run) return err(reply, 404, 'not_found', `run ${id} not found`)
  try {
    await transitionRun(db, id, 'completed', {}, requestId)
    if (run.taskId) await transitionTask(db, run.taskId, 'completed', { runId: id }, requestId)
    broadcastMetrics(getOrgId(claims))
    return { id, status: 'completed', taskId: run.taskId }
  } catch (e: any) { return err(reply, 409, 'conflict', e.message) }
})

// PATCH /run/:id/fail
app.patch('/run/:id/fail', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const verified = await requireVerified(request, reply); if (!verified) return
  const { id } = request.params as { id: string }
  const { error: runError } = (request.body || {}) as { error?: string }
  const requestId = generateId('req_', 8)
  try {
    await failRunWithError(db, id, runError || 'Unknown error', requestId)
    const run = await fetchDoc('runs', id) as any
    deliverWebhook(db, 'run.failed', {
      event: 'run.failed',
      timestamp: new Date().toISOString(),
      runId: id,
      agentId: run?.agentId || null,
      taskId: run?.taskId || null,
      error: runError || 'Unknown error',
    }, run?.orgId || process.env.DEFAULT_ORG_ID).catch(() => {})
    broadcastMetrics(getOrgId(claims))
    return { id, status: 'failed' }
  } catch (e: any) { return err(reply, 409, 'conflict', e.message) }
})

// GET /audit — paginated with filtering
app.get('/audit', async (request, reply) => {
  try {
    const { decision, tool } = request.query as { decision?: string; tool?: string }
    let q = db.collection('actionIntents').orderBy('createdAt', 'desc')
    if (decision) q = q.where('decision', '==', decision)
    const snap = await q.get()
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() }))
    if (tool) data = data.filter((d: any) => d.tool === tool)
    return paginate(data, parsePaginationQuery(request.query as Record<string, unknown>))
  } catch (e: any) { reply.code(503); return { error: { code: 'firestore', message: 'audit query failed' } } }
})

// GET /sessions, GET /sessions/:id
app.get('/sessions', async (_request, reply) => {
  try { const snap = await db.collection('sessions').orderBy('startedAt', 'desc').limit(20).get(); return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })) } }
  catch (e: any) { reply.code(503); return { error: { code: 'firestore' } } }
})

app.get('/sessions/:id', async (request, reply) => {
  try {
    const id = (request.params as any).id
    const ssn = await db.collection('sessions').doc(id).get(); if (!ssn.exists) { reply.code(404); return { error: { code: 'not_found' } } }
    const runs = await db.collection('runs').where('sessionId', '==', id).get()
    const logs = runs.docs.length > 0 ? await db.collection('logs').where('runId', 'in', runs.docs.map(d => d.id)).get() : { docs: [] }
    return { session: { id, ...ssn.data() }, runs: runs.docs.map(d => ({ id: d.id, ...d.data() })), logs: logs.docs.map(d => ({ id: d.id, ...d.data() })) }
  } catch (e: any) { reply.code(503); return { error: { code: 'firestore' } } }
})

// GET /diagnostics — full system health (cached 60s)
app.get('/diagnostics', {
  handler: withCache(async (_req, reply) => {
    try { return await systemDiagnostics(db) }
    catch (e: any) { reply.code(500); return { error: { code: 'diagnostics_failed', message: e.message } } }
  }, 60),
})

// GET /consistency — detect bad states
app.get('/consistency', async (_req, reply) => {
  try { return await checkConsistency(db) }
  catch (e: any) { reply.code(500); return { error: { code: 'consistency_failed', message: e.message } } }
})

// POST /repair — safely repair common inconsistency
app.post('/repair', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const verified = await requireVerified(request, reply); if (!verified) return
  const { action } = (request.body || {}) as { action?: string }
  try {
    if (action === 'orphaned') return await repairOrphanedRuns(db)
    if (action === 'stuck') return await repairStuckTasks(db)
    return { repaired: 0, message: 'Specify action: "orphaned" or "stuck"' }
  } catch (e: any) { reply.code(500); return { error: { code: 'repair_failed', message: e.message } } }
})

// GET /report — operational summary (cached 120s)
app.get('/report', {
  handler: withCache(async (_req, reply) => {
    try { return await generateReport(db) }
    catch (e: any) { reply.code(500); return { error: { code: 'report_failed', message: e.message } } }
  }, 120),
})

// POST /org/seed — create isolated demo org
app.post('/org/seed', async (request, reply) => {
  const claims = await requireAuth(request, reply); if (!claims) return
  const verified = await requireVerified(request, reply); if (!verified) return
  const { name, email } = (request.body || {}) as { name?: string; email?: string }
  if (!name || !email) return err(reply, 400, 'validation', 'name and email are required')
  try {
    const result = await seedOrg(db, name, email)
    reply.code(201); return result
  } catch (e: any) { reply.code(500); return { error: { code: 'seed_failed', message: e.message } } }
})

// GET /org/metrics — org-scoped metrics
app.get('/org/metrics', async (request, reply) => {
  const { orgId } = (request.query || {}) as { orgId?: string }
  if (!orgId) return err(reply, 400, 'validation', 'orgId query parameter required')
  try { return await getOrgMetrics(db, orgId) }
  catch (e: any) { reply.code(500); return { error: { code: 'metrics_failed', message: e.message } } }
})

  // Register sub-routes, security, observability
  agentsRoutes(app, db)
  policiesRoutes(app, db)
  enforceRoutes(app, db)
  healthRoutes(app, db)
  apiKeysRoutes(app, db)
  webhooksRoutes(app, db)
  notificationsRoutes(app, db)
  billingRoutes(app, db)
  hardenAuth(app, db)
  auditTimeline(app, db)
  runTrace(app, db)
  metrics(app, db)

// Serve static HTML files (catch-all for unmatched GETs)
app.get('/*', async (request, reply) => {
  const url = (request.url || '/').split('?')[0]
  const staticFiles = ['index.html', 'landing.html', 'operator.html', 'admin-portal.html',
    'agents.html', 'dev-dashboard.html', 'verify-demo.html', 'sdk-demo.html']
  if (staticFiles.includes(url.substring(1))) {
    try {
      const path = resolve(process.cwd(), url.substring(1))
      if (existsSync(path)) {
        reply.header('Content-Type', 'text/html')
        return readFileSync(path, 'utf-8')
      }
    } catch {}
  }
  reply.code(404).send({ error: { code: 'not_found', message: `Route ${request.method}:${url} not found` } })
})

// Start threshold checker
startThresholdChecker()

// Reset metrics every hour
setInterval(resetMetrics, 60 * 60 * 1000)

// Start
const PORT = parseInt(process.env.PORT || '3000', 10)
const HOST = '0.0.0.0'
app.listen({ port: PORT, host: HOST }, (listenErr) => {
  if (listenErr) { log.error('server start failed', { error: listenErr.message }); process.exit(1) }
  console.log(`\n  server → http://${HOST}:${PORT}`)
  initWebSocketServer(app.server)
})

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  log.info(`received ${signal}, shutting down gracefully`)

  // Close HTTP server
  await app.close()

  // Close WebSocket connections
  closeWebSocketServer()

  // Flush any pending logs
  await new Promise(resolve => setTimeout(resolve, 500))

  log.info('shutdown complete')
  process.exit(0)
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
