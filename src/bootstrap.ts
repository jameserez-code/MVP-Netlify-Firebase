import { existsSync } from 'fs'
import { resolve } from 'path'
import { execSync } from 'child_process'

const ROOT = process.cwd()
const SA_PATH = resolve(ROOT, 'service-account.json')

console.log('\n╔════════════════════════════════╗')
console.log('║  PASSPORT AGENT — BOOTSTRAP   ║')
console.log('╚════════════════════════════════╝\n')

// 1. Check service account
console.log('1. Checking Firebase credentials...')
if (!existsSync(SA_PATH)) {
  console.error('   ✗ service-account.json not found')
  console.error('   Get it from: Firebase Console → Project Settings → Service accounts')
  process.exit(1)
}
console.log('   ✓ service-account.json found\n')

// 2. Run healthcheck
console.log('2. Validating Firestore connection...')
try {
  execSync('npx tsx src/healthcheck.ts', { cwd: ROOT, stdio: 'pipe', timeout: 20000 })
  console.log('   ✓ Firestore read/write verified\n')
} catch {
  console.error('   ✗ Firestore validation failed — check your service account')
  process.exit(1)
}

// 3. Seed collections
console.log('3. Seeding collections...')
try {
  execSync('npx tsx src/seed.ts', { cwd: ROOT, stdio: 'pipe', timeout: 20000 })
  console.log('   ✓ 5 collections seeded\n')
} catch {
  console.log('   ⚠ Seed may have partially failed (existing data may prevent overwrites)\n')
}

// 4. Run unit tests
console.log('4. Running unit tests...')
try {
  execSync('node --test tests/unit/crypto.test.js tests/unit/evaluator.test.js', { cwd: ROOT, stdio: 'pipe', timeout: 20000 })
  console.log('   ✓ Unit tests passed\n')
} catch {
  console.log('   ⚠ Some tests failed (may need Firebase)\n')
}

// 5. Print available endpoints
console.log('5. Available commands:')
console.log('   npm run dev             — Start API server on :3000')
console.log('   npm run worker          — Start execution worker')
console.log('   npm test                — Run unit tests')
console.log('   npm run test:integration — Run integration tests')
console.log('   npm run demo:lifecycle  — Run full lifecycle demo')
console.log('   npm run schema:seed     — Re-seed collections\n')

console.log('6. API endpoints (start with npm run dev):')
console.log('   POST /auth/login        — Authenticate')
console.log('   POST /task              — Create task [auth]')
console.log('   GET  /task/:id          — Read task')
console.log('   POST /agent/run         — Start run [auth]')
console.log('   POST /run/:id/log       — Log action [auth]')
console.log('   PATCH /run/:id/complete — Complete run [auth]')
console.log('   PATCH /run/:id/fail     — Fail run [auth]')
console.log('   POST /agents/register   — Register agent [auth]')
console.log('   GET  /agents            — List agents')
console.log('   POST /policies          — Create policy [auth]')
console.log('   GET  /policies          — List policies')
console.log('   POST /enforce           — Evaluate intent [auth]')
console.log('   POST /gateway/execute   — Execute with ticket')
console.log('   GET  /audit             — Query action intents')
console.log('   GET  /audit/timeline    — Execution timeline')
console.log('   GET  /run/:id/trace     — Run execution trace')
console.log('   GET  /metrics           — Operational metrics')
console.log('   GET  /security/ping     — Auth status check\n')

console.log('╔════════════════════════════════╗')
console.log('║  BOOTSTRAP COMPLETE            ║')
console.log('╚════════════════════════════════╝\n')
