const MONTH_PREFIXES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function getHeatMonthPrefix(isoDate) {
  if (!isoDate) return MONTH_PREFIXES[new Date().getMonth()]
  const [, month] = isoDate.split('-').map(Number)
  return MONTH_PREFIXES[month - 1]
}

export function formatHeatNumber(prefix, sequence) {
  return `${prefix}-${String(sequence).padStart(2, '0')}`
}

export function parseHeatNumber(heatNumber) {
  if (!heatNumber?.trim()) return null
  const match = heatNumber.trim().match(/^([A-Za-z]+)-(\d+)$/)
  if (!match) return null
  return {
    prefix: match[1].toUpperCase(),
    sequence: Number(match[2]),
  }
}

/** Default heat number for a month — always starts at 01, not derived from existing entries. */
export function getDefaultHeatNumberForMonth(isoDate) {
  return formatHeatNumber(getHeatMonthPrefix(isoDate), 1)
}

export function getSuggestedHeatNumberForMonth(isoDate, entries = []) {
  const prefix = getHeatMonthPrefix(isoDate)
  let maxSequence = 0

  for (const entry of entries) {
    const parsed = parseHeatNumber(entry.heatNumber)
    if (parsed?.prefix === prefix) {
      maxSequence = Math.max(maxSequence, parsed.sequence)
    }
  }

  return formatHeatNumber(prefix, maxSequence > 0 ? maxSequence : 1)
}

export function incrementHeatNumber(heatNumber, isoDate) {
  const prefix = getHeatMonthPrefix(isoDate)
  const parsed = parseHeatNumber(heatNumber)

  if (parsed?.prefix === prefix && Number.isFinite(parsed.sequence)) {
    return formatHeatNumber(prefix, parsed.sequence + 1)
  }

  return formatHeatNumber(prefix, 1)
}

export function heatNumberMatchesMonth(heatNumber, isoDate) {
  const parsed = parseHeatNumber(heatNumber)
  if (!parsed) return false
  return parsed.prefix === getHeatMonthPrefix(isoDate)
}
