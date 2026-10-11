import { getFurnaceChargeKg } from './app-settings-queries.js'
import { listProductionEntries } from './production-queries.js'

function roundRate(value) {
  return Math.round(value * 100) / 100
}

function normalizeHeatKey(heatNumber) {
  return (heatNumber || '').trim().toUpperCase()
}

function parseHeatSortKey(heatNumber) {
  const match = heatNumber.trim().match(/^([A-Za-z]+)-(\d+)$/)
  if (!match) {
    return { prefix: heatNumber.toUpperCase(), sequence: 0 }
  }
  return { prefix: match[1].toUpperCase(), sequence: Number(match[2]) }
}

function compareHeatNumbers(a, b) {
  const pa = parseHeatSortKey(a)
  const pb = parseHeatSortKey(b)
  const prefixCompare = pa.prefix.localeCompare(pb.prefix)
  if (prefixCompare !== 0) return prefixCompare
  return pa.sequence - pb.sequence
}

function toHeatYieldRow(group, chargeKg) {
  const pouredKg = roundRate(group.pouredKg)
  const yieldPercent = chargeKg > 0 ? roundRate((pouredKg / chargeKg) * 100) : 0
  return {
    heatNumber: group.heatNumber,
    entryCount: group.entryCount,
    pouredKg,
    metalCharged: chargeKg,
    yieldPercent,
  }
}

export function getHeatYieldReport({ from, to }) {
  if (!from || !to) {
    throw new Error('Date range (from and to) is required.')
  }

  const chargeKg = getFurnaceChargeKg()
  const entries = listProductionEntries({ from, to })
  const byHeat = new Map()
  const byDate = new Map()
  let missingWeightEntryCount = 0

  for (const entry of entries) {
    const key = normalizeHeatKey(entry.heatNumber)
    if (!key) continue

    if (entry.pouredWeight === null || entry.pouredWeight === undefined) {
      missingWeightEntryCount += 1
    }

    let group = byHeat.get(key)
    if (!group) {
      group = {
        heatNumber: entry.heatNumber.trim(),
        pouredKg: 0,
        entryCount: 0,
        dates: new Set(),
      }
      byHeat.set(key, group)
    }

    group.entryCount += 1
    group.dates.add(entry.productionDate)
    if (entry.pouredWeight !== null && entry.pouredWeight !== undefined) {
      group.pouredKg += entry.pouredWeight
    }

    const productionDate = entry.productionDate
    if (productionDate) {
      let dayMap = byDate.get(productionDate)
      if (!dayMap) {
        dayMap = new Map()
        byDate.set(productionDate, dayMap)
      }

      let dayHeat = dayMap.get(key)
      if (!dayHeat) {
        dayHeat = {
          heatNumber: entry.heatNumber.trim(),
          pouredKg: 0,
          entryCount: 0,
        }
        dayMap.set(key, dayHeat)
      }

      dayHeat.entryCount += 1
      if (entry.pouredWeight !== null && entry.pouredWeight !== undefined) {
        dayHeat.pouredKg += entry.pouredWeight
      }
    }
  }

  const heats = [...byHeat.values()]
    .map((group) => {
      const row = toHeatYieldRow(group, chargeKg)
      const sortedDates = [...group.dates].sort()
      return {
        ...row,
        dateFrom: sortedDates[0] ?? null,
        dateTo: sortedDates[sortedDates.length - 1] ?? null,
      }
    })
    .sort((a, b) => compareHeatNumbers(a.heatNumber, b.heatNumber))

  const days = [...byDate.entries()]
    .map(([productionDate, dayHeatMap]) => {
      const heatsOnDay = [...dayHeatMap.values()]
        .map((group) => toHeatYieldRow(group, chargeKg))
        .sort((a, b) => compareHeatNumbers(a.heatNumber, b.heatNumber))

      const pouredKg = roundRate(heatsOnDay.reduce((sum, row) => sum + row.pouredKg, 0))
      const heatCount = heatsOnDay.length
      const metalCharged = roundRate(heatCount * chargeKg)
      const yieldPercent =
        metalCharged > 0 ? roundRate((pouredKg / metalCharged) * 100) : 0
      const entryCount = heatsOnDay.reduce((sum, row) => sum + row.entryCount, 0)

      return {
        productionDate,
        heatCount,
        entryCount,
        pouredKg,
        metalCharged,
        yieldPercent,
        heats: heatsOnDay,
      }
    })
    .sort((a, b) => b.productionDate.localeCompare(a.productionDate))

  const totalPoured = roundRate(heats.reduce((sum, row) => sum + row.pouredKg, 0))
  const heatCount = heats.length
  const totalMetalCharged = roundRate(heatCount * chargeKg)
  const overallYield =
    totalMetalCharged > 0 ? roundRate((totalPoured / totalMetalCharged) * 100) : 0

  return {
    from,
    to,
    chargeKg,
    heats,
    days,
    summary: {
      heatCount,
      totalMetalCharged,
      totalPoured,
      overallYield,
      missingWeightEntryCount,
    },
  }
}
