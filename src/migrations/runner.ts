import type { Firestore } from 'firebase-admin/firestore'
import { log } from '../lib/logger.js'

export interface Migration {
  id: string
  name: string
  up: (db: Firestore) => Promise<void>
  down?: (db: Firestore) => Promise<void>
  validate?: (db: Firestore) => Promise<boolean>
}

interface MigrationRecord {
  id: string
  name: string
  appliedAt: string
}

async function getAppliedMigrations(db: Firestore): Promise<MigrationRecord[]> {
  const snap = await db.collection('_migrations').orderBy('id').get()
  return snap.docs.map(d => d.data() as MigrationRecord)
}

async function recordMigration(
  db: Firestore,
  migration: Migration,
  success: boolean,
  dryRun = false,
) {
  const now = new Date().toISOString()
  if (dryRun) {
    log.info('[dry-run] would record migration', {
      id: migration.id,
      name: migration.name,
      success,
    })
    return
  }
  if (success) {
    await db.collection('_migrations').doc(migration.id).set({
      id: migration.id,
      name: migration.name,
      appliedAt: now,
    })
    log.success('migration applied', { id: migration.id, name: migration.name })
  } else {
    log.error('migration failed', { id: migration.id, name: migration.name })
  }
}

export async function runMigrations(
  db: Firestore,
  migrations: Migration[],
  options: { dryRun?: boolean } = {},
) {
  const { dryRun = false } = options
  const applied = await getAppliedMigrations(db)
  const appliedIds = new Set(applied.map(m => m.id))

  log.info('checking migrations', {
    total: migrations.length,
    applied: applied.length,
    dryRun,
  })

  for (const migration of migrations) {
    if (appliedIds.has(migration.id)) {
      log.info('migration already applied, skipping', { id: migration.id })
      continue
    }

    log.info('running migration', {
      id: migration.id,
      name: migration.name,
      dryRun,
    })

    if (dryRun) {
      log.info('[dry-run] would apply migration', {
        id: migration.id,
        name: migration.name,
      })
      if (migration.validate) {
        log.info('[dry-run] would validate migration', { id: migration.id })
      }
      continue
    }

    try {
      await migration.up(db)

      if (migration.validate) {
        log.info('validating migration', { id: migration.id })
        const valid = await migration.validate(db)
        if (!valid) {
          throw new Error(`Migration ${migration.id} validation failed`)
        }
        log.success('migration validation passed', { id: migration.id })
      }

      await recordMigration(db, migration, true)
    } catch (error: any) {
      await recordMigration(db, migration, false)
      log.error('migration failed, rolling back', {
        id: migration.id,
        error: error.message,
      })

      if (migration.down) {
        try {
          await migration.down(db)
          log.info('rollback completed', { id: migration.id })
        } catch (rollbackError: any) {
          log.error('rollback failed', {
            id: migration.id,
            error: rollbackError.message,
          })
        }
      }

      throw new Error(`Migration ${migration.id} failed: ${error.message}`)
    }
  }

  log.success('all migrations completed')
}
