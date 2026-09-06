CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_no TEXT,
  part_name TEXT NOT NULL UNIQUE,
  description TEXT,
  weight REAL,
  vendor_name TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_parts_part_no ON parts (part_no)
WHERE part_no IS NOT NULL AND part_no != '';

CREATE TABLE IF NOT EXISTS production_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER NOT NULL REFERENCES parts (id),
  quantity REAL NOT NULL CHECK (quantity > 0),
  heat_number TEXT NOT NULL,
  production_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_production_entries_date ON production_entries (production_date DESC);

CREATE TABLE IF NOT EXISTS rejection_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_name TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS rejections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  part_id INTEGER NOT NULL REFERENCES parts (id),
  rejection_type_id INTEGER NOT NULL REFERENCES rejection_types (id),
  quantity REAL NOT NULL CHECK (quantity > 0),
  rejection_date TEXT NOT NULL,
  heat_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rejections_date ON rejections (rejection_date DESC);
