#!/usr/bin/env node
// Database migration runner
// Usage: npx tsx scripts/migrate.ts

import { initFirebase } from '../src/lib/firebase.js'
import { log } from '../src/lib/logger.js'
import { runMigrations } from '../src/migrations/runner.js'

import initialSchema from '../src/migrations/001-initial-schema.js'
import addBillingFields from '../src/migrations/002-add-billing-fields.js'

const db = initFirebase()

const MIGRATIONS = [initialSchema, addBillingFields]

async function main() {
  log.info('starting migrations', { count: MIGRATIONS.length })
  await runMigrations(db, MIGRATIONS)
  log.success('migrations finished')
  process.exit(0)
}

main().catch((err) => {
  log.error('migration runner failed', { error: err.message })
  console.error(err)
  process.exit(1)
})
