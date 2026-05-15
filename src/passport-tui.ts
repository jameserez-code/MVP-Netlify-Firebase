#!/usr/bin/env node
import readline from 'readline'
import { MuteStream } from './utils/mute-stream.js'

const API = 'http://localhost:3000'
const GATE_CODE = 'Thegreatwave'

// ANSI colors
const G = '\x1b[32m', C = '\x1b[36m', Y = '\x1b[33m', R = '\x1b[31m', D = '\x1b[90m', B = '\x1b[1m', N = '\x1b[0m', CLEAR = '\x1b[2J\x1b[H'

const mutableStdout = new MuteStream()
mutableStdout.pipe(process.stdout)

const rl = readline.createInterface({
  input: process.stdin,
  output: mutableStdout,
  terminal: true
})

const question = (query: string, mute: boolean = false): Promise<string> => {
  return new Promise(res => {
    rl.question(query, (answer) => {
      if (mute) console.log('') // add newline after muted input
      res(answer)
    })
    mutableStdout.muted = mute
  })
}

let currentUser: any = null
let token: string = ''

async function api(path: string, opts: any = {}) {
  if (token) opts.headers = { ...opts.headers, 'Authorization': 'Bearer ' + token }
  opts.headers = { ...opts.headers, 'Content-Type': 'application/json' }
  try {
    const res = await fetch(API + path, opts)
    return await res.json()
  } catch { return null }
}

async function main() {
  console.log(CLEAR)
  console.log(`  ${B}${G}PASSPORT AGENT${N}${D} — Secure Terminal${N}`)

  const code = await question(`\n  ${G}>${N} Enter Access Code: `, true)
  if (code !== GATE_CODE) { console.log(`  ${R}ACCESS DENIED${N}`); process.exit(1) }

  while (true) {
    if (!currentUser) {
      await authMenu()
    } else {
      await mainMenu()
    }
  }
}

async function authMenu() {
  console.log(CLEAR)
  console.log(`  ${B}${G}PASSPORT AGENT${N} — Welcome`)
  console.log(`  ${D}Please sign in to continue${N}\n`)
  console.log(`  ${G}[1]${N} Sign In`)
  console.log(`  ${G}[2]${N} Create Account`)
  console.log(`  ${G}[q]${N} Quit`)

  const choice = await question(`\n  ${G}>${N} Selection: `)
  if (choice === 'q') process.exit(0)
  if (choice !== '1' && choice !== '2') return

  const email = await question(`  Email: `)
  const password = await question(`  Password: `, true)

  if (choice === '1') {
    const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    if (r?.token) { token = r.token; currentUser = r.user; }
    else console.log(`\n  ${R}✗ Invalid credentials${N}`), await question('  Press Enter...')
  } else {
    // For demo registration, we call a simulated register or just login with a notice
    console.log(`\n  ${Y}Registration is automated for demo. Attempting registration...${N}`)
    const r = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
    if (r?.token) {
      token = r.token; currentUser = r.user;
      console.log(`  ${G}✓ Account initialized for ${email}${N}`)
      await new Promise(r => setTimeout(r, 1000))
    }
    else {
      console.log(`\n  ${R}✗ Registration failed.${N}`)
      console.log(`  ${D}Hint: admin@acmecorp.com / admin${N}`)
      await question('  Press Enter...')
    }
  }
}

async function mainMenu() {
  console.log(CLEAR)
  console.log(`  ${B}${G}PASSPORT AGENT${N} — ${currentUser.email}`)
  console.log(`  ${D}Status: AUTHORIZED${N}\n`)
  console.log(`  ${G}[1]${N} Issue Passport`)
  console.log(`  ${G}[2]${N} Apply for Visa`)
  console.log(`  ${G}[3]${N} View Credentials`)
  console.log(`  ${G}[s]${N} Sign Out`)

  const choice = await question(`\n  ${G}>${N} Selection: `)
  if (choice === 's') { currentUser = null; token = ''; return }

  if (choice === '1') await issuePassport()
  if (choice === '2') await applyVisa()
  if (choice === '3') await viewCredentials()
}

async function issuePassport() {
  console.log(`\n  ${B}ISSUE PASSPORT${N}`)
  const name = await question(`  Full Name: `)
  const nationality = await question(`  Nationality: `)
  const dob = await question(`  Date of Birth (YYYY-MM-DD): `)

  console.log(`\n  ${C}Initializing Security Check...${N}`)
  await new Promise(r => setTimeout(r, 2000))

  const r = await api('/task', { method: 'POST', body: JSON.stringify({ payload: { type: 'passport_issuance', name, nationality, dob } }) })
  if (r?.id) console.log(`  ${G}✓ Passport application ${r.id} submitted!${N}`)
  else console.log(`  ${R}✗ Submission failed${N}`)
  await question('\n  Press Enter to continue...')
}

async function applyVisa() {
  console.log(`\n  ${B}APPLY FOR VISA${N}`)
  console.log(`  ${D}Select scopes (comma separated):${N}`)
  console.log(`  api:read, api:write, data:share, config:view`)
  const scopes = await question(`\n  Scopes: `)

  const r = await api('/task', { method: 'POST', body: JSON.stringify({ payload: { type: 'visa_application', scopes: scopes.split(',').map(s => s.trim()) } }) })
  if (r?.id) console.log(`\n  ${G}✓ Visa application ${r.id} submitted!${N}`)
  else console.log(`\n  ${R}✗ Submission failed${N}`)
  await question('\n  Press Enter to continue...')
}

async function viewCredentials() {
  console.log(`\n  ${B}YOUR CREDENTIALS${N}`)
  const r = await api('/audit?limit=10')
  if (r?.data && r.data.length > 0) {
    r.data.forEach((c: any) => {
      const type = c.payload?.type || 'unknown'
      console.log(`  ${D}>${N} ${G}${c.id.substring(0,12)}${N} ${type.padEnd(20)} ${c.status || 'pending'}`)
    })
  } else {
    console.log(`  ${D}No credentials found${N}`)
  }
  await question('\n  Press Enter to continue...')
}

main().catch(e => { console.error(e); process.exit(1) })
