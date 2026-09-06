import * as XLSX from 'xlsx'
import { parsePartNoFromExcel } from '../../shared/part-code-utils.js'

const REQUIRED_HEADERS = {
  partNo: 'PART NO',
  weight: 'WEIGHT',
}

const OPTIONAL_HEADERS = {
  description: ['PART DESCRIPTION', 'PART NAME', 'PART DESC', 'DESCRIPTION'],
  vendorName: ['VENDOR NAME', 'VENDOR'],
}

function trimHeader(value) {
  return String(value ?? '').trim()
}

function normalizeHeader(value) {
  return trimHeader(value).toUpperCase().replace(/\s+/g, ' ')
}

function buildHeaderMap(headers) {
  const headerMap = {}
  const normalizedHeaders = headers.map((header) => ({
    original: trimHeader(header),
    normalized: normalizeHeader(header),
  }))

  for (const [field, requiredLabel] of Object.entries(REQUIRED_HEADERS)) {
    const exact = normalizedHeaders.find((header) => header.original === requiredLabel)
    if (exact) {
      headerMap[field] = exact.original
      continue
    }

    const loose = normalizedHeaders.find((header) => header.normalized === requiredLabel)
    if (loose) {
      headerMap[field] = loose.original
    }
  }

  for (const [field, aliases] of Object.entries(OPTIONAL_HEADERS)) {
    const match = normalizedHeaders.find((header) => aliases.includes(header.normalized))
    if (match) {
      headerMap[field] = match.original
    }
  }

  return headerMap
}

function missingRequiredColumns(headerMap) {
  return Object.entries(REQUIRED_HEADERS)
    .filter(([field]) => !headerMap[field])
    .map(([, label]) => label)
}

function parseNumeric(value) {
  if (value === undefined || value === null || value === '') return NaN
  if (typeof value === 'number') return value
  return Number(String(value).replace(/,/g, '').trim())
}

function isEmptyRow(row) {
  return Object.values(row).every(
    (value) => value === undefined || value === null || String(value).trim() === '',
  )
}

export async function parsePartExcelFile(file) {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  const sheet = workbook.Sheets[workbook.SheetNames[0]]

  if (!sheet) {
    throw new Error('The Excel file has no worksheets.')
  }

  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true })

  if (rawRows.length === 0) {
    throw new Error('The Excel file is empty.')
  }

  const headerMap = buildHeaderMap(Object.keys(rawRows[0]))
  const missing = missingRequiredColumns(headerMap)

  if (missing.length > 0) {
    throw new Error(`Invalid Excel: missing required column(s): ${missing.join(', ')}.`)
  }

  const rows = []

  rawRows.forEach((rawRow, index) => {
    if (isEmptyRow(rawRow)) return

    rows.push({
      rowNumber: index + 2,
      partNo: parsePartNoFromExcel(rawRow[headerMap.partNo]),
      description: headerMap.description ? String(rawRow[headerMap.description] ?? '').trim() : '',
      weight: parseNumeric(rawRow[headerMap.weight]),
      vendorName: headerMap.vendorName ? String(rawRow[headerMap.vendorName] ?? '').trim() : '',
    })
  })

  if (rows.length === 0) {
    throw new Error('No data rows found in the Excel file.')
  }

  return rows
}
