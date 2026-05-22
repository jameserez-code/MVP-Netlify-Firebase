#!/usr/bin/env node
// Database migration runner
// Usage: npx tsx scripts/migrate.ts [--dry-run]

import { initFirebase } from '../src/lib/firebase.js'
import { log } from '../src/lib/logger.js'
import { runMigrations } from '../src/migrations/runner.js'

import initialSchema from '../src/migrations/001-initial-schema.js'
import addBillingFields from '../src/migrations/002-add-billing-fields.js'

const db = initFirebase()
const dryRun = process.argv.includes('--dry-run')

const MIGRATIONS = [initialSchema, addBillingFields]

async function main() {
  log.info('starting migrations', { count: MIGRATIONS.length, dryRun })
  await runMigrations(db, MIGRATIONS, { dryRun })
  log.success('migrations finished')
  process.exit(0)
}

main().catch((err) => {
  log.error('migration runner failed', { error: err.message })
  console.error(err)
  process.exit(1)
})
