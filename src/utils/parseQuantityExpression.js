/**
 * Parses a quantity field value. Plain numbers and products with * (e.g. 6*2 → 12).
 * Returns null if the value cannot be parsed.
 */
export function parseQuantityExpression(input) {
  const normalized = String(input ?? '')
    .trim()
    .replace(/×/g, '*')
    .replace(/\s+/g, '')

  if (!normalized) return null

  if (!/^[\d.*]+$/.test(normalized)) return null

  const parts = normalized.split('*')
  if (parts.some((part) => part === '' || part === '.')) return null

  let product = 1
  for (const part of parts) {
    const value = Number(part)
    if (!Number.isFinite(value)) return null
    product *= value
  }

  if (!Number.isFinite(product) || product <= 0) return null

  return product
}
