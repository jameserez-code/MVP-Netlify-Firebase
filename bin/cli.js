#!/usr/bin/env node
// Passport Agent CLI — single entry point for all operations
// Usage: npx passport-agent [command]

import { spawn } from 'child_process'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname || process.cwd(), '..')
const args = process.argv.slice(2)
const cmd = args[0] || 'start'

const commands: Record<string, { desc: string; run: string }> = {
  start:     { desc: 'Start the API server (demo mode)', run: 'npx tsx src/demo-server.ts' },
  dev:       { desc: 'Start with Firestore (needs service-account.json)', run: 'npx tsx src/server.ts' },
  worker:    { desc: 'Start execution worker', run: 'npx tsx src/worker.ts' },
  test:      { desc: 'Run unit tests', run: 'node --test tests/unit/crypto.test.js tests/unit/evaluator.test.js' },
  setup:     { desc: 'Seed collections + validate', run: 'npx tsx src/bootstrap.ts' },
  health:    { desc: 'Verify Firestore connectivity', run: 'npx tsx src/healthcheck.ts' },
}

if (cmd === 'help' || cmd === '--help' || cmd === '-h') {
  console.log('\nPassport Agent CLI\n')
  for (const [name, info] of Object.entries(commands)) {
    console.log(`  ${name.padEnd(10)} ${info.desc}`)
  }
  console.log('\n  npm run ${cmd}  also works for all commands\n')
  process.exit(0)
}

const target = commands[cmd]
if (!target) { console.error(`Unknown command: ${cmd}. Try "help".`); process.exit(1) }

const [bin, ...rest] = target.run.split(' ')
const child = spawn(bin, rest, { cwd: ROOT, stdio: 'inherit', shell: true })

child.on('close', code => process.exit(code || 0))
