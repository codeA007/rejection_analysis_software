import { closeDb } from '../database/connection.js'
import { ensureDefaultRejectionTypes } from '../database/seed-rejection-types.js'

const result = ensureDefaultRejectionTypes()
console.log(`Seeded ${result.inserted} rejection type(s). Total: ${result.types.length}.`)
closeDb()
