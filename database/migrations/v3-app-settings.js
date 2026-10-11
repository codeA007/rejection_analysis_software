import { DEFAULT_FURNACE_CHARGE_KG } from '../../src/constants/foundry.js'

const FURNACE_CHARGE_KEY = 'furnace_charge_kg'

export function migrateSchemaV3(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `)

  const existing = database
    .prepare(`SELECT value FROM app_settings WHERE key = ?`)
    .get(FURNACE_CHARGE_KEY)

  if (!existing) {
    database
      .prepare(`INSERT INTO app_settings (key, value) VALUES (?, ?)`)
      .run(FURNACE_CHARGE_KEY, String(DEFAULT_FURNACE_CHARGE_KG))
  }
}
