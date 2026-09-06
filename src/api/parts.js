import { request } from './client.js'

export function fetchParts() {
  return request('/parts')
}

export function createPart(payload) {
  return request('/parts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function updatePart(id, payload) {
  return request(`/parts/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deletePart(id) {
  return request(`/parts/${id}`, { method: 'DELETE' })
}

export function previewPartImport(rows) {
  return request('/parts/import/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  })
}

export function importParts(rows) {
  return request('/parts/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rows }),
  })
}
