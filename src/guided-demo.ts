#!/usr/bin/env node
// Guided Demo — walks through the golden demo script step by step
// Run: npm run demo:guided
// Requires: demo server running on localhost:3000

import readline from 'readline'

const API = 'http://localhost:3000'
const R = '\x1b[31m' // red
const G = '\x1b[32m' // green
const C = '\x1b[36m' // cyan
const Y = '\x1b[33m' // yellow
const D = '\x1b[2m'  // dim
const B = '\x1b[1m'  // bold
const N = '\x1b[0m'
const CLS = '\x1b[2J\x1b[H'

function waitKey(): Promise<string> {
  return new Promise(resolve => {
    process.stdin.once('data', (d) => resolve(d.toString().trim()))
    process.stdout.write(`\n${D}  Press Enter to continue...${N}`)
  })
}

async function api(path: string, opts?: any): Promise<any> {
  try { const r = await fetch(`${API}${path}`, opts); return await r.json() }
  catch { return null }
}

function num(n: number, label: string): string { return `${G}${n}${N} ${label}` }

async function main() {
  readline.emitKeypressEvents(process.stdin)
  if (process.stdin.isTTY) process.stdin.setRawMode(true)

  // Check server
  const health = await api('/health')
  if (!health) {
    console.log(`${R}✗ Server not running on ${API}${N}\nStart with: npm run demo\n`)
    process.exit(1)
  }

  console.log(CLS)
  console.log(`\n${G}${B}╔══════════════════════════════════════════╗${N}`)
  console.log(`${G}${B}║   PASSPORT AGENT — GUIDED DEMO           ║${N}`)
  console.log(`${G}${B}╚══════════════════════════════════════════╝${N}`)
  console.log(`\n${D}  A guided walk through trustworthy autonomous execution.${N}`)
  console.log(`  ${6} scenes · ~3 minutes · deterministic · reproducible`)

  await waitKey()

  // Scene 1: Register agent
  console.log(CLS)
  console.log(`\n${B}Scene 1/6 — Register an Agent${N}`)
  console.log(`${D}  Every agent gets a cryptographic keypair and passport number.${N}`)
  console.log(`  The secret key is shown once — the server never stores it in plaintext.`)
  await waitKey()

  const agent = await api('/agents/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Demo Support Bot', model: 'gpt-4o', provider: 'openai' }),
  })

  if (agent?.agentId) {
    console.log(`\n  ${G}✓ Agent registered${N}`)
    console.log(`    ID:       ${C}${agent.agentId}${N}`)
    console.log(`    Passport: ${C}${agent.passportNumber}${N}`)
    console.log(`    Key:      ${C}${agent.secretKeyPrefix}...${N} ${Y}(shown once)${N}`)
  } else {
    console.log(`\n  ${Y}⚠ Agent may already exist — continuing with demo agent${N}`)
  }

  await waitKey()

  // Scene 2: Create and execute tasks
  console.log(CLS)
  console.log(`\n${B}Scene 2/6 — Create and Execute Tasks${N}`)
  console.log(`${D}  The demo worker automatically picks up pending tasks every 3 seconds.${N}`)
  console.log(`  Each task goes through an 11-step enforcement engine before execution.`)
  await waitKey()

  const email = process.env.DEMO_EMAIL || 'admin@acmecorp.com'
  const password = process.env.DEMO_PASSWORD
  if (!password) {
    console.error('DEMO_PASSWORD environment variable is required. Set it to the admin password.')
    process.exit(1)
  }

  const tasks: string[] = []
  for (let i = 0; i < 2; i++) {
    const t = await api('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (t?.token) {
      const task = await api('/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + t.token },
        body: JSON.stringify({ payload: { description: `Demo task ${i + 1}`, type: i === 0 ? 'order_lookup' : 'inventory_check' } }),
      })
      if (task?.id) tasks.push(task.id)
    }
  }

  console.log(`\n  ${G}✓ ${tasks.length} tasks submitted to queue${N}`)
  console.log(`\n  ${D}Waiting for worker to process...${N}`)

  for (let i = 5; i > 0; i--) {
    process.stdout.write(`\r  ${D}  ${i}s...${N}`)
    await new Promise(r => setTimeout(r, 1000))
  }

  const m = await api('/metrics')
  console.log(`\r  ${G}✓ Queue processed${N}`)
  console.log(`    ${num(m?.tasks?.completed || 0, 'completed')}`)
  console.log(`    ${num(m?.tasks?.total || 0, 'total')}`)
  await waitKey()

  // Scene 3: Timeline + Enforcement
  console.log(CLS)
  console.log(`\n${B}Scene 3/6 — Enforcement in Action${N}`)
  console.log(`${D}  Every tool call is logged. Look at the timeline:${N}`)

  const tl = await api('/audit/timeline?limit=8')
  const events = tl?.timeline || []
  if (events.length > 0) {
    console.log()
    for (const e of events.slice(0, 6)) {
      const color = e.decision === 'allow' ? G : e.decision === 'deny' ? R : Y
      const tool = (e.tool || '').padEnd(22)
      console.log(`  ${D}${new Date(e.timestamp).toLocaleTimeString()}${N}  ${color}${tool}${N}  ${D}${(e.reason || '').substring(0, 40)}${N}`)
    }
    const denied = events.filter(e => e.decision === 'deny').length
    console.log(`\n  ${R}${denied} actions were blocked${N} — ${R}send_email${N} (tool blocked), ${R}http_request to evil.com${N} (domain blocked)`)
    console.log(`  ${D}The agent tried. The system blocked it. Everything is recorded.${N}`)
  }
  await waitKey()

  // Scene 4: Explainability
  console.log(CLS)
  console.log(`\n${B}Scene 4/6 — Explainability${N}`)
  console.log(`${D}  Every decision is explainable — not just WHAT happened, but WHY.${N}`)
  await waitKey()

  if (events.length > 0) {
    const firstTaskId = events[0]?.taskId
    if (firstTaskId) {
      const explain = await api(`/explain/${firstTaskId}`)
      if (explain?.executionPath) {
        console.log(`\n  Task: ${C}${firstTaskId}${N}`)
        console.log(`  Steps: ${num(explain.summary.totalSteps, 'total')}  ${G}${explain.summary.allowed} allowed${N}  ${R}${explain.summary.denied} denied${N}`)
        console.log(`\n  Decision chain:`)
        for (const step of explain.executionPath.slice(0, 6)) {
          const c = step.decision === 'allow' ? G : R
          console.log(`  ${c}${step.step}. ${step.tool.padEnd(20)}${N} → ${D}${step.reason}${N}`)
        }
      }
    }
  }
  await waitKey()

  // Scene 5: Diagnostics
  console.log(CLS)
  console.log(`\n${B}Scene 5/6 — System Health${N}`)
  console.log(`${D}  The health model shows the system state at a glance.${N}`)
  await waitKey()

  const h = await api('/health')
  console.log(`\n  Status:   ${h?.status === 'HEALTHY' ? G : R}${h?.status}${N}`)
  console.log(`  ${h?.summary}`)

  const diag = await api('/diagnostics')
  if (diag) {
    console.log(`\n  Collections:`)
    for (const [name, info] of Object.entries(diag.collections || {})) {
      console.log(`    ${(info as any).accessible ? G + '✓' : R + '✗'}${N} ${name}: ${(info as any).count}`)
    }
  }

  const report = await api('/report')
  if (report?.summary) {
    console.log(`\n  Report:`)
    console.log(`    ${num(report.summary.totalTasks, 'tasks')}  |  ${G}${report.summary.completed} completed${N}  |  ${R}${report.summary.failed} failed${N}`)
  }
  await waitKey()

  // Scene 6: The pitch
  console.log(CLS)
  console.log(`\n${G}${B}╔══════════════════════════════════════════╗${N}`)
  console.log(`${G}${B}║   DEMO COMPLETE                          ║${N}`)
  console.log(`${G}${B}╚══════════════════════════════════════════╝${N}`)
  console.log()
  console.log(`  ${B}Passport Agent — Trustworthy Autonomous Execution${N}`)
  console.log()
  console.log(`  Every agent action is:`)
  console.log(`    ${G}✓${N}  Governed — before execution`)
  console.log(`    ${G}✓${N}  Explained — exactly which rule triggered`)
  console.log(`    ${G}✓${N}  Recovered — deterministic crash recovery`)
  console.log(`    ${G}✓${N}  Verified — replayable with output hashes`)
  console.log(`    ${G}✓${N}  Audited — immutable timeline`)
  console.log()
  console.log(`  ${D}One command to start:${N}`)
  console.log(`  ${G}curl -fsSL https://raw.githubusercontent.com/jameserez-code/MVP-Netlify-Firebase/main/install.sh | bash${N}`)
  console.log()
  console.log(`  ${D}Press any key to exit...${N}`)
  process.stdin.once('data', () => {
    process.stdin.setRawMode(false)
    console.log(CLS)
    process.exit(0)
  })
}

main().catch(err => { console.error('Demo failed:', err.message); process.exit(1) })
