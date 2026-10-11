import { DEFAULT_FURNACE_CHARGE_KG } from '../src/constants/foundry.js'
import { getDb } from './connection.js'

const FURNACE_CHARGE_KEY = 'furnace_charge_kg'

function getSetting(key) {
  const db = getDb()
  const row = db.prepare(`SELECT value FROM app_settings WHERE key = ?`).get(key)
  return row?.value ?? null
}

function setSetting(key, value) {
  const db = getDb()
  db.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, String(value))
}

export function getFurnaceChargeKg() {
  const raw = getSetting(FURNACE_CHARGE_KEY)
  const parsed = raw !== null ? Number(raw) : DEFAULT_FURNACE_CHARGE_KG
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_FURNACE_CHARGE_KG
  }
  return parsed
}

export function setFurnaceChargeKg(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Metal charged per heat must be a number greater than zero.')
  }
  setSetting(FURNACE_CHARGE_KEY, parsed)
  return { furnaceChargeKg: parsed }
}
