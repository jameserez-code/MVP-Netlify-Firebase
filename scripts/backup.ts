#!/usr/bin/env node
// Backup script — exports Firestore collections to JSON
// Usage: npx tsx scripts/backup.ts

import { initFirebase } from '../src/lib/firebase.js'
import { log } from '../src/lib/logger.js'
import { getStorage } from 'firebase-admin/storage'
import { mkdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import { resolve } from 'path'

const BACKUP_DIR = process.env.BACKUP_DIR || resolve(process.cwd(), 'backups')
const BACKUP_GCS_BUCKET = process.env.BACKUP_GCS_BUCKET
const COLLECTIONS = [
  'agents',
  'policies',
  'tasks',
  'runs',
  'actionIntents',
  'logs',
  'users',
  'sessions',
  'apiKeys',
  'webhooks',
]

async function uploadToGcs(localPath: string, destination: string) {
  if (!BACKUP_GCS_BUCKET) return
  try {
    const storage = getStorage()
    const bucket = storage.bucket(BACKUP_GCS_BUCKET)
    await bucket.upload(localPath, { destination })
    log.success('uploaded backup to GCS', {
      bucket: BACKUP_GCS_BUCKET,
      destination,
    })
  } catch (e: any) {
    log.error('GCS upload failed', { error: e.message })
  }
}

async function main() {
  const db = initFirebase()

  if (!existsSync(BACKUP_DIR)) {
    await mkdir(BACKUP_DIR, { recursive: true })
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupPath = resolve(BACKUP_DIR, timestamp)
  await mkdir(backupPath, { recursive: true })

  log.info('starting backup', { backupPath, collections: COLLECTIONS.length })

  for (const collection of COLLECTIONS) {
    try {
      const snapshot = await db.collection(collection).get()
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      const filePath = resolve(backupPath, `${collection}.json`)
      await writeFile(filePath, JSON.stringify(data, null, 2))
      log.success('backed up collection', {
        collection,
        count: data.length,
        path: filePath,
      })

      await uploadToGcs(
        filePath,
        `backups/${timestamp}/${collection}.json`,
      )
    } catch (e: any) {
      log.error('backup failed for collection', {
        collection,
        error: e.message,
      })
    }
  }

  log.success('backup complete', { path: backupPath })
  process.exit(0)
}

main().catch((err) => {
  log.error('backup failed', { error: err.message })
  console.error(err)
  process.exit(1)
})
