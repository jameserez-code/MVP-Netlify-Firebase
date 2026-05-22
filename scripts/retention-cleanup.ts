#!/usr/bin/env node
// Manual retention cleanup script
// Usage: npx tsx scripts/retention-cleanup.ts

import { initFirebase } from '../src/lib/firebase.js'
import { log } from '../src/lib/logger.js'
import { enforceRetention } from '../src/lib/retention.js'

async function main() {
  const db = initFirebase()
  log.info('starting manual retention cleanup')
  const results = await enforceRetention(db)
  log.success('manual retention cleanup complete', { results })
  process.exit(0)
}

main().catch((err) => {
  log.error('retention cleanup failed', { error: err.message })
  console.error(err)
  process.exit(1)
})
