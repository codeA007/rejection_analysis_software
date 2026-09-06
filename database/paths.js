import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const ROOT_DIR = path.resolve(__dirname, '..')
export const DB_PATH = path.join(ROOT_DIR, 'data', 'rejection.db')
export const SCHEMA_PATH = path.join(__dirname, 'schema.sql')
