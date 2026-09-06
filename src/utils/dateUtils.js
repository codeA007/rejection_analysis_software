function formatIsoDate(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getLocalMonthKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function monthKeyToFirstDay(monthKey) {
  if (!monthKey) return ''
  const [year, month] = monthKey.split('-').map(Number)
  return formatIsoDate(year, month, 1)
}

export function isoDateToMonthKey(isoDate) {
  if (!isoDate) return getLocalMonthKey()
  return isoDate.slice(0, 7)
}

export function formatDisplayMonth(monthKey) {
  if (!monthKey) return ''
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })
}

export function getLocalTodayDate() {
  const now = new Date()
  return formatIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
}

export function getMonthBounds(workDate) {
  const [year, month] = workDate.split('-').map(Number)
  const lastDay = new Date(year, month, 0).getDate()
  return {
    start: formatIsoDate(year, month, 1),
    end: formatIsoDate(year, month, lastDay),
  }
}

export function getLastMonthBounds(referenceDate) {
  const [year, month] = referenceDate.split('-').map(Number)
  const lastMonthDate = new Date(year, month - 2, 1)
  const lastYear = lastMonthDate.getFullYear()
  const lastMonth = lastMonthDate.getMonth() + 1
  const lastDay = new Date(lastYear, lastMonth, 0).getDate()

  return {
    start: `${lastYear}-${String(lastMonth).padStart(2, '0')}-01`,
    end: `${lastYear}-${String(lastMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  }
}

export function getMonthsAgoBounds(referenceDate, monthCount) {
  const [year, month] = referenceDate.split('-').map(Number)
  const startDate = new Date(year, month - 1 - (monthCount - 1), 1)
  const startYear = startDate.getFullYear()
  const startMonth = startDate.getMonth() + 1

  return {
    start: `${startYear}-${String(startMonth).padStart(2, '0')}-01`,
    end: referenceDate,
  }
}

export function getYearBounds(workDate) {
  const year = workDate.split('-')[0]
  return { start: `${year}-01-01`, end: `${year}-12-31` }
}

export function getDefaultAnalysisRange() {
  return getMonthsAgoBounds(getLocalTodayDate(), 3)
}

export function formatDisplayDate(isoDate) {
  if (!isoDate) return ''
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatMonthLabel(monthKey) {
  const [year, month] = monthKey.split('-').map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })
}
