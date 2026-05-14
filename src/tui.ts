#!/usr/bin/env node
// Terminal UI — real-time operational dashboard in the terminal
// Run: npx tsx src/tui.ts  or  npm run tui
// Requires: demo server running on localhost:3000

import readline from 'readline'

const API = 'http://localhost:3000'
const REFRESH_MS = 3000

// ANSI
const CLEAR = '\x1b[2J\x1b[H'
const HIDE_CURSOR = '\x1b[?25l'
const SHOW_CURSOR = '\x1b[?25h'
const G = '\x1b[32m'   // green
const C = '\x1b[36m'   // cyan
const Y = '\x1b[33m'   // yellow
const R = '\x1b[31m'   // red
const W = '\x1b[37m'   // white
const D = '\x1b[90m'   // dim
const B = '\x1b[1m'    // bold
const N = '\x1b[0m'    // reset

process.stdout.write(HIDE_CURSOR)

async function api(path: string, opts?: any) {
  try {
    const res = await fetch(`${API}${path}`, opts)
    return await res.json()
  } catch { return null }
}

function bar(value: number, max: number, width: number, color: string): string {
  const filled = Math.round((value / Math.max(max, 1)) * width)
  return color + '█'.repeat(Math.min(filled, width)) + D + '░'.repeat(Math.max(width - filled, 0)) + N
}

async function render() {
  const m = await api('/metrics')
  const d = await api('/diagnostics')
  const tl = await api('/audit/timeline?limit=5')

  process.stdout.write(CLEAR)

  // Header
  console.log(`  ${B}${G}PASSPORT AGENT${N}${D} — Terminal Dashboard${N}`)
  console.log(`  ${d?.mode === 'demo' ? `${Y}⚡ DEMO MODE${N}` : `${G}● PRODUCTION${N}`}${D}  ${API}  ${getTime()}${N}`)
  console.log('')

  // Stats
  const t = m?.tasks || {}
  console.log(`  ${B}${D}Tasks${N}    ${G}${(t.total || 0).toString().padEnd(4)}${N} ${bar(t.total || 0, 100, 20, G)}`)
  console.log(`  ${B}${D}Pending${N}  ${Y}${(t.pending || 0).toString().padEnd(4)}${N} ${bar(t.pending || 0, 20, 20, Y)}`)
  console.log(`  ${B}${D}Active${N}   ${C}${(t.active || 0).toString().padEnd(4)}${N} ${bar(t.active || 0, 10, 20, C)}`)
  console.log(`  ${B}${D}Failed${N}   ${R}${(t.failed || 0).toString().padEnd(4)}${N} ${bar(t.failed || 0, 10, 20, R)}`)
  console.log(`  ${B}${D}Completed${N}${G}${(t.completed || 0).toString().padEnd(4)}${N} ${bar(t.completed || 0, 100, 20, C)}`)
  console.log(`  ${B}${D}Agents${N}   ${W}${(m?.agents?.active || 0).toString().padEnd(4)}${N}`)
  console.log(`  ${B}${D}Runs${N}     ${W}${(m?.runs?.active || 0).toString().padEnd(4)}${N}`)
  console.log('')

  // Timeline
  console.log(`  ${B}${D}Recent Events${N}`)
  const events = tl?.timeline || []
  if (events.length === 0) {
    console.log(`  ${D}  No events yet${N}`)
  } else {
    for (const e of events.slice(0, 5)) {
      const color = e.decision === 'allow' ? G : e.decision === 'deny' ? R : Y
      const time = new Date(e.timestamp).toLocaleTimeString()
      console.log(`  ${D}${time}${N} ${color}${(e.tool || 'transition').substring(0, 22).padEnd(22)}${N} ${D}${(e.reason || '').substring(0, 40)}${N}`)
    }
  }
  console.log('')

  // Quick actions
  console.log(`  ${B}${D}Quick Actions${N}`)
  console.log(`  ${G}[t]${N} Create Task    ${G}[a]${N} Register Agent    ${G}[p]${N} Create Policy    ${G}[l]${N} Login`)
  console.log(`  ${G}[m]${N} Metrics JSON   ${G}[d]${N} Diagnostics JSON  ${G}[q]${N} Quit`)
  console.log('')
  console.log(`  ${D}Auto-refresh: ${REFRESH_MS / 1000}s${N}`)
}

// Quick action handlers
async function quickTask() {
  const token = await getToken()
  if (!token) { console.log(`\n${R}✗ Login first: press 'l'${N}\n`); return }
  const r = await api('/task', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ payload: { description: 'TUI task ' + new Date().toISOString() } }) })
  console.log(`\n${r?.id ? G + '✓ Task created: ' + r.id.substring(0, 16) : R + '✗ Failed'}${N}\n`)
}

async function quickAgent() {
  const token = await getToken()
  if (!token) return
  const r = await api('/agents/register', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ name: 'TUI Agent', model: 'gpt-4o', provider: 'openai' }) })
  console.log(`\n${r?.agentId ? G + '✓ Agent: ' + r.agentId.substring(0, 16) + ' | Key: ' + r.secretKeyPrefix : R + '✗ Failed'}${N}\n`)
}

async function quickPolicy() {
  const token = await getToken()
  if (!token) return
  const agents = await api('/agents')
  const agentId = agents?.data?.[0]?.id || 'agent_demo'
  const r = await api('/policies', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: JSON.stringify({ name: 'TUI Policy', priority: 10, scope: { agentId }, rules: { allowedTools: [{ toolName: 'lookup_order', parameterConstraints: { orderId: { type: 'string' } } }], deniedTools: ['send_email'], allowedDomains: [{ pattern: '*.internal.com', methods: ['GET'] }], deniedDomains: ['*.evil.com'] } }) })
  console.log(`\n${r?.id ? G + '✓ Policy created' : R + '✗ Failed'}${N}\n`)
}

let cachedToken = ''
async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken
  const r = await api('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'admin@acmecorp.com', password: 'admin' }) })
  if (r?.token) { cachedToken = r.token; console.log(`\n${G}✓ Logged in${N}\n`); return cachedToken }
  console.log(`\n${R}✗ Login failed${N}\n`)
  return ''
}

async function showJson(path: string) {
  const r = await api(path)
  console.log('\n' + JSON.stringify(r, null, 2).substring(0, 2000) + '\n')
}

function getTime(): string { return new Date().toLocaleTimeString() }

// Start TUI
console.log(CLEAR)
console.log(`\n  ${G}Starting TUI...${N}`)

// Refresh loop
setInterval(render, REFRESH_MS)
render()

// Keyboard input
readline.emitKeypressEvents(process.stdin)
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
  process.stdin.on('keypress', async (_str, key: any) => {
    if (key.ctrl && key.name === 'c') { cleanup() }
    switch (key.name) {
      case 't': await quickTask(); render(); break
      case 'a': await quickAgent(); render(); break
      case 'p': await quickPolicy(); render(); break
      case 'l': await getToken(); render(); break
      case 'm': await showJson('/metrics'); break
      case 'd': await showJson('/diagnostics'); break
      case 'q': cleanup(); break
    }
  })
}

function cleanup() {
  process.stdout.write(SHOW_CURSOR)
  process.stdout.write(CLEAR)
  console.log('  Passport Agent TUI — stopped')
  process.exit(0)
}

process.on('SIGINT', cleanup)
