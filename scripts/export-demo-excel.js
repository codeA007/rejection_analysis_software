import { existsSync, mkdirSync, renameSync } from 'fs'
import { join } from 'path'
import { listProductionEntries } from '../database/production-queries.js'
import { listRejections } from '../database/rejection-queries.js'
import { listRejectionTypes } from '../database/rejection-type-queries.js'
import { downloadMonthlyExcel } from '../src/utils/monthlyExcelExport.js'

const from = '2026-09-01'
const to = '2026-09-30'

const productionEntries = listProductionEntries({ from, to })
const rejections = listRejections({ from, to })
const rejectionTypes = listRejectionTypes({ includeInactive: true })

const outputDir = join(process.cwd(), 'sample-exports')
mkdirSync(outputDir, { recursive: true })

const fileName = 'September-2026.xlsx'
const outputPath = join(outputDir, fileName)

downloadMonthlyExcel({
  from,
  to,
  productionEntries,
  rejections,
  rejectionTypes,
})

if (existsSync(fileName)) {
  renameSync(fileName, outputPath)
}

console.log(`Excel exported to: ${outputPath}`)
console.log(`Production rows: ${productionEntries.length}`)
console.log(`Rejection rows: ${rejections.length}`)
