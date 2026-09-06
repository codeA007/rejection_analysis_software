import { request } from './client.js'

export function fetchMonthlyAnalysis({ from, to }) {
  const params = new URLSearchParams({ from, to })
  return request(`/analysis/monthly?${params}`)
}

export function fetchDashboardSummary({ from, to }) {
  const params = new URLSearchParams({ from, to })
  return request(`/analysis/dashboard?${params}`)
}
