function columnExists(database, tableName, columnName) {
  return database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all()
    .some((column) => column.name === columnName)
}

export function migrateSchemaV2(database) {
  if (!columnExists(database, 'parts', 'part_no')) {
    database.exec(`ALTER TABLE parts ADD COLUMN part_no TEXT`)
  }
  if (!columnExists(database, 'parts', 'description')) {
    database.exec(`ALTER TABLE parts ADD COLUMN description TEXT`)
  }
  if (!columnExists(database, 'parts', 'weight')) {
    database.exec(`ALTER TABLE parts ADD COLUMN weight REAL`)
  }
  if (!columnExists(database, 'parts', 'vendor_name')) {
    database.exec(`ALTER TABLE parts ADD COLUMN vendor_name TEXT`)
  }

  database.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_parts_part_no ON parts (part_no)
    WHERE part_no IS NOT NULL AND part_no != '';
  `)
}
