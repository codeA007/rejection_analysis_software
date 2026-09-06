import XLSX from 'xlsx-js-style'
import { DEFAULT_REJECTION_TYPES } from '../../database/default-rejection-types.js'
import {
  MONTHLY_REPORT_COMPANY_NAME,
  MONTHLY_REPORT_REF_NO,
  MONTHLY_REPORT_REV_DATE,
  MONTHLY_REPORT_REV_NO,
} from '../constants/monthlyReport.js'

const POURED_COLUMNS = ['S.no', 'DATE', 'ITEM', 'HEAT NO', 'WT', 'PROD. QTY', 'POUR. WT']
const REJECTION_FIXED_COLUMNS = ['S.no', 'ITEM', 'WT', 'PROD. QTY', 'REJ. QTY']
const REJECTION_SUMMARY_COLUMNS = ['REJ. WT', 'REJ %']

function round2(value) {
  return Math.round(value * 100) / 100
}

function rejectionRate(productionQty, rejectionQty) {
  if (!productionQty) return 0
  return round2((rejectionQty / productionQty) * 100)
}

function formatMonthTitle(from) {
  if (!from) return ''
  const [year, month] = from.split('-').map(Number)
  const monthLabels = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
  return `${monthLabels[month - 1]} ${String(year).slice(-2)}`
}

function formatPeriodLabel(from, to) {
  if (!from || !to) return ''
  if (from.slice(0, 7) === to.slice(0, 7)) return formatMonthTitle(from)
  return `${from} to ${to}`
}

function formatExcelDate(isoDate) {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-').map(Number)
  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
}

function groupKey(partId, heatNumber, entryDate) {
  return `${partId}::${(heatNumber || '').trim().toUpperCase()}::${entryDate || ''}`
}

function partKey(partId) {
  return String(partId)
}

function sortByDatePartAndHeat(rows) {
  rows.sort((a, b) => {
    const dateCompare = String(a.entryDate).localeCompare(String(b.entryDate))
    if (dateCompare !== 0) return dateCompare
    const partCompare = a.partName.localeCompare(b.partName, undefined, { sensitivity: 'base' })
    if (partCompare !== 0) return partCompare
    return String(a.heatNumber).localeCompare(String(b.heatNumber), undefined, { sensitivity: 'base' })
  })
}

function sortByPartName(rows) {
  rows.sort((a, b) => a.partName.localeCompare(b.partName, undefined, { sensitivity: 'base' }))
}

function buildRejectionTypeColumns(rejectionTypes, rejections) {
  const activeTypeNames = new Set(
    rejectionTypes.filter((type) => type.isActive !== false).map((type) => type.typeName),
  )
  const typesWithData = new Set(rejections.map((rejection) => rejection.rejectionTypeName))
  const customTypes = new Set()

  for (const rejection of rejections) {
    if (!DEFAULT_REJECTION_TYPES.includes(rejection.rejectionTypeName)) {
      customTypes.add(rejection.rejectionTypeName)
    }
  }

  for (const type of rejectionTypes) {
    if (
      !DEFAULT_REJECTION_TYPES.includes(type.typeName) &&
      (activeTypeNames.has(type.typeName) || typesWithData.has(type.typeName))
    ) {
      customTypes.add(type.typeName)
    }
  }

  return [
    ...DEFAULT_REJECTION_TYPES,
    ...[...customTypes].sort((a, b) => a.localeCompare(b)),
  ]
}

function buildPouredRows(productionEntries) {
  const groups = new Map()

  for (const entry of productionEntries) {
    const key = groupKey(entry.partId, entry.heatNumber, entry.productionDate)
    if (!groups.has(key)) {
      groups.set(key, {
        partId: entry.partId,
        partName: entry.partName,
        heatNumber: entry.heatNumber,
        entryDate: entry.productionDate,
        partWeight: entry.partWeight ?? null,
        productionQty: 0,
      })
    }

    const group = groups.get(key)
    group.productionQty += entry.quantity
    if (entry.partWeight !== null && entry.partWeight !== undefined) {
      group.partWeight = entry.partWeight
    }
  }

  const rows = [...groups.values()].map((group) => {
    const weight = group.partWeight ?? 0
    return {
      ...group,
      pouredWeight: round2(group.productionQty * weight),
    }
  })

  sortByDatePartAndHeat(rows)

  const totals = rows.reduce(
    (acc, row) => ({
      productionQty: acc.productionQty + row.productionQty,
      pouredWeight: acc.pouredWeight + row.pouredWeight,
    }),
    { productionQty: 0, pouredWeight: 0 },
  )

  return {
    rows,
    totals: {
      productionQty: totals.productionQty,
      pouredWeight: round2(totals.pouredWeight),
    },
  }
}

function buildMonthlyProductionByPart(pouredRows) {
  const productionByPart = new Map()
  const partInfoByPart = new Map()

  for (const row of pouredRows) {
    productionByPart.set(row.partId, (productionByPart.get(row.partId) ?? 0) + row.productionQty)
    if (!partInfoByPart.has(row.partId)) {
      partInfoByPart.set(row.partId, {
        partName: row.partName,
        partWeight: row.partWeight,
      })
    }
  }

  return { productionByPart, partInfoByPart }
}

function buildRejectionRows({ rejections, rejectionTypes, pouredRows, productionEntries }) {
  const typeColumns = buildRejectionTypeColumns(rejectionTypes, rejections)
  const { productionByPart, partInfoByPart } = buildMonthlyProductionByPart(pouredRows)
  const partWeights = new Map()
  const emptyRejectionsByType = () => Object.fromEntries(typeColumns.map((name) => [name, 0]))

  for (const entry of productionEntries) {
    if (entry.partWeight !== null && entry.partWeight !== undefined) {
      partWeights.set(entry.partId, entry.partWeight)
    }
  }

  const rejectionGroups = new Map()

  for (const rejection of rejections) {
    const key = partKey(rejection.partId)
    if (!rejectionGroups.has(key)) {
      rejectionGroups.set(key, {
        partId: rejection.partId,
        partName: rejection.partName,
        rejectionsByType: emptyRejectionsByType(),
      })
    }

    const group = rejectionGroups.get(key)
    const typeName = rejection.rejectionTypeName
    if (!group.rejectionsByType[typeName]) {
      group.rejectionsByType[typeName] = 0
    }
    group.rejectionsByType[typeName] += rejection.quantity
  }

  const mergedRows = new Map()

  for (const [partId, productionQty] of productionByPart) {
    const info = partInfoByPart.get(partId)
    const rejectionGroup = rejectionGroups.get(partKey(partId))

    mergedRows.set(partKey(partId), {
      partId,
      partName: info.partName,
      partWeight: info.partWeight,
      productionQty,
      rejectionsByType: rejectionGroup
        ? { ...emptyRejectionsByType(), ...rejectionGroup.rejectionsByType }
        : emptyRejectionsByType(),
    })
  }

  for (const [key, rejectionGroup] of rejectionGroups) {
    if (mergedRows.has(key)) continue

    mergedRows.set(key, {
      partId: rejectionGroup.partId,
      partName: rejectionGroup.partName,
      partWeight: partWeights.get(rejectionGroup.partId) ?? null,
      productionQty: productionByPart.get(rejectionGroup.partId) ?? 0,
      rejectionsByType: rejectionGroup.rejectionsByType,
    })
  }

  const rows = [...mergedRows.values()].map((group) => {
    const rejectionQty = Object.values(group.rejectionsByType).reduce((sum, qty) => sum + qty, 0)
    const weight = group.partWeight ?? partWeights.get(group.partId) ?? 0
    const productionQty = group.productionQty ?? productionByPart.get(group.partId) ?? 0

    return {
      ...group,
      partWeight: weight,
      productionQty,
      rejectionQty,
      rejectedWeight: round2(rejectionQty * weight),
      rejectionRate: rejectionRate(productionQty, rejectionQty),
    }
  })

  sortByPartName(rows)

  const totals = {
    rejectionQty: 0,
    rejectedWeight: 0,
    byType: Object.fromEntries(typeColumns.map((name) => [name, 0])),
  }

  for (const row of rows) {
    totals.rejectionQty += row.rejectionQty
    totals.rejectedWeight += row.rejectedWeight
    for (const typeName of typeColumns) {
      totals.byType[typeName] += row.rejectionsByType[typeName] || 0
    }
  }

  const totalProductionQty = pouredRows.reduce((sum, row) => sum + row.productionQty, 0)

  return {
    typeColumns,
    rows,
    totals: {
      rejectionQty: totals.rejectionQty,
      rejectedWeight: round2(totals.rejectedWeight),
      byType: totals.byType,
      rejectionRate: rejectionRate(totalProductionQty, totals.rejectionQty),
    },
  }
}

function buildWorksheetData({ from, to, productionEntries, rejections, rejectionTypes }) {
  const { rows: pouredRows, totals: pouredTotals } = buildPouredRows(productionEntries)
  const { typeColumns, rows: rejectionRows, totals: rejectionTotals } = buildRejectionRows({
    rejections,
    rejectionTypes,
    pouredRows,
    productionEntries,
  })

  const pouredHeader = [...POURED_COLUMNS]
  const rejectionHeader = [...REJECTION_FIXED_COLUMNS, ...typeColumns, ...REJECTION_SUMMARY_COLUMNS]
  const refColumnIndex = Math.max(pouredHeader.length, rejectionHeader.length)

  const sheet = []
  const blank = (count) => Array.from({ length: count }, () => '')

  sheet.push([
    MONTHLY_REPORT_COMPANY_NAME,
    '',
    'MONTHLY REJECTION ANALYSIS REPORT',
    ...blank(refColumnIndex - 3),
    'REF NO :',
    MONTHLY_REPORT_REF_NO,
  ])
  sheet.push([...blank(refColumnIndex), 'REV NO :', MONTHLY_REPORT_REV_NO])
  sheet.push([...blank(refColumnIndex), 'REV DATE :', MONTHLY_REPORT_REV_DATE])
  sheet.push(['MONTH', '', formatPeriodLabel(from, to), ...blank(refColumnIndex - 2)])

  sheet.push(['POURED DATA', ...blank(refColumnIndex - 1)])
  sheet.push(pouredHeader)

  pouredRows.forEach((row, index) => {
    sheet.push([
      index + 1,
      formatExcelDate(row.entryDate),
      row.partName,
      row.heatNumber,
      row.partWeight ?? '',
      row.productionQty || '',
      row.pouredWeight || '',
    ])
  })

  sheet.push([
    '',
    '',
    'TOTAL',
    '',
    '',
    pouredTotals.productionQty || '',
    pouredTotals.pouredWeight || '',
  ])
  const pouredTotalRowIndex = sheet.length - 1

  sheet.push(blank(refColumnIndex))

  sheet.push(['REJECTION DATA', ...blank(refColumnIndex - 1)])
  sheet.push(rejectionHeader)

  rejectionRows.forEach((row, index) => {
    const dataRow = [
      index + 1,
      row.partName,
      row.partWeight ?? '',
      row.productionQty || '',
      row.rejectionQty || '',
    ]

    for (const typeName of typeColumns) {
      dataRow.push(row.rejectionsByType[typeName] || '')
    }

    dataRow.push(row.rejectedWeight || '')
    dataRow.push(row.rejectionRate || '')

    sheet.push(dataRow)
  })

  const rejectionTotalRow = [
    '',
    'TOTAL',
    '',
    pouredTotals.productionQty || '',
    rejectionTotals.rejectionQty || '',
  ]

  for (const typeName of typeColumns) {
    rejectionTotalRow.push(rejectionTotals.byType[typeName] || '')
  }

  rejectionTotalRow.push(rejectionTotals.rejectedWeight || '')
  rejectionTotalRow.push(rejectionTotals.rejectionRate || '')

  sheet.push(rejectionTotalRow)
  const rejectionTotalRowIndex = sheet.length - 1

  return {
    sheet,
    pouredHeader,
    rejectionHeader,
    pouredTotalRowIndex,
    rejectionTotalRowIndex,
    columnCount: refColumnIndex,
  }
}

function getColumnWidth(header) {
  if (header === 'S.no') return 6
  if (header === 'DATE') return 12
  if (header === 'ITEM') return 22
  if (header === 'HEAT NO') return 12
  if (header === 'WT') return 8
  if (header === 'PROD. QTY' || header === 'REJ. QTY') return 10
  if (header === 'POUR. WT' || header === 'REJ. WT') return 12
  if (header === 'REJ %') return 8
  return Math.max(10, String(header).length + 1)
}

function applyColumnWidths(worksheet, pouredHeader, rejectionHeader) {
  const maxLen = Math.max(pouredHeader.length, rejectionHeader.length)
  const widths = []

  for (let i = 0; i < maxLen; i += 1) {
    const pouredWidth = pouredHeader[i] ? getColumnWidth(pouredHeader[i]) : 0
    const rejectionWidth = rejectionHeader[i] ? getColumnWidth(rejectionHeader[i]) : 0
    widths.push({ wch: Math.max(pouredWidth, rejectionWidth) || 10 })
  }

  worksheet['!cols'] = widths
}

const TOTAL_ROW_STYLE = {
  font: { bold: true },
  fill: {
    patternType: 'solid',
    fgColor: { rgb: 'E8F4F4' },
  },
}

function applyTotalRowHighlight(worksheet, rowIndex, columnCount) {
  if (rowIndex < 0) return

  for (let col = 0; col < columnCount; col += 1) {
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: col })
    if (!worksheet[cellRef]) {
      worksheet[cellRef] = { t: 's', v: '' }
    }
    worksheet[cellRef].s = TOTAL_ROW_STYLE
  }
}

function buildFileName(from, to) {
  if (from && to && from.slice(0, 7) === to.slice(0, 7)) {
    const [year, month] = from.split('-').map(Number)
    const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long' })
    return `${monthName}-${year}.xlsx`
  }
  return `Rejection-Analysis-${from}-to-${to}.xlsx`
}

export function downloadMonthlyExcel({ from, to, productionEntries, rejections, rejectionTypes }) {
  const {
    sheet,
    pouredHeader,
    rejectionHeader,
    pouredTotalRowIndex,
    rejectionTotalRowIndex,
    columnCount,
  } = buildWorksheetData({
    from,
    to,
    productionEntries,
    rejections,
    rejectionTypes,
  })

  const worksheet = XLSX.utils.aoa_to_sheet(sheet)
  applyColumnWidths(worksheet, pouredHeader, rejectionHeader)
  applyTotalRowHighlight(worksheet, pouredTotalRowIndex, columnCount)
  applyTotalRowHighlight(worksheet, rejectionTotalRowIndex, columnCount)

  const workbook = XLSX.utils.book_new()
  const sheetName = formatMonthTitle(from) || 'Report'
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))

  XLSX.writeFile(workbook, buildFileName(from, to))
}
