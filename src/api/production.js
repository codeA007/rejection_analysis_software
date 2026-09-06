import { request } from './client.js'

export function fetchProductionEntries({ from, to } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.toString()
  return request(`/production${query ? `?${query}` : ''}`)
}

export function createProductionEntry(payload) {
  return request('/production', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteProductionEntry(id) {
  return request(`/production/${id}`, { method: 'DELETE' })
}
