function roundRate(value) {
  return Math.round(value * 100) / 100
}

export function normalizeHeatKey(heatNumber) {
  return (heatNumber || '').trim().toUpperCase()
}

export function sumPouredKgForHeat(entries, heatNumber) {
  const key = normalizeHeatKey(heatNumber)
  if (!key) return 0

  return entries.reduce((sum, entry) => {
    if (normalizeHeatKey(entry.heatNumber) !== key) return sum
    if (entry.pouredWeight === null || entry.pouredWeight === undefined) return sum
    return sum + entry.pouredWeight
  }, 0)
}

export function computeHeatYield({ pouredKg, chargeKg }) {
  if (!chargeKg || chargeKg <= 0) {
    return { pouredKg: 0, yieldPercent: 0 }
  }
  const poured = roundRate(pouredKg)
  const yieldPercent = roundRate((poured / chargeKg) * 100)
  return { pouredKg: poured, yieldPercent }
}
