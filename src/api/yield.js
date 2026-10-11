import { request } from './client.js'

export function fetchHeatYieldReport({ from, to }) {
  const params = new URLSearchParams({ from, to })
  return request(`/analysis/yield?${params}`)
}
