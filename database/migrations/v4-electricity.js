export function migrateSchemaV4(database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS electricity_readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reading_date TEXT NOT NULL,
      meter_reading REAL NOT NULL,
      previous_meter_reading REAL NOT NULL,
      consumption_kwh REAL NOT NULL,
      tons_melted REAL NOT NULL,
      kwh_per_ton REAL NOT NULL,
      heat_count INTEGER,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}
