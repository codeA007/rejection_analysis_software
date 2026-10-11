import Database from 'better-sqlite3'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { DB_PATH, SCHEMA_PATH } from './paths.js'
import { migrateSchemaV2 } from './migrations/v2-parts-columns.js'
import { migrateSchemaV3 } from './migrations/v3-app-settings.js'

let db

function openDatabase() {
  mkdirSync(path.dirname(DB_PATH), { recursive: true })
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  const schema = readFileSync(SCHEMA_PATH, 'utf8')
  db.exec(schema)
  migrateSchemaV2(db)
  migrateSchemaV3(db)
}

export function getDb() {
  if (!db) {
    openDatabase()
  } else {
    migrateSchemaV2(db)
    migrateSchemaV3(db)
  }
  return db
}

export function closeDb() {
  if (db) {
    try {
      db.pragma('wal_checkpoint(PASSIVE)')
    } catch {
      // Ignore checkpoint failures during shutdown.
    }
    db.close()
    db = undefined
  }
}
