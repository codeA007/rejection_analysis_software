export function parsePartNoFromExcel(value) {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return ''
    return String(Math.trunc(value))
  }
  return String(value).trim()
}
