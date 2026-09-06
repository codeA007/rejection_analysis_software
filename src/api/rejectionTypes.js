import { request } from './client.js'

export function fetchRejectionTypes({ includeInactive = false } = {}) {
  const params = new URLSearchParams()
  if (includeInactive) params.set('includeInactive', '1')
  const query = params.toString()
  return request(`/rejection-types${query ? `?${query}` : ''}`)
}

export function createRejectionType(payload) {
  return request('/rejection-types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updateRejectionType(payload) {
  return request('/rejection-types', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function reorderRejectionTypes(orderedIds) {
  return request('/rejection-types', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderedIds }),
  })
}

export function deleteRejectionType(id) {
  return request(`/rejection-types/${id}`, { method: 'DELETE' })
}
