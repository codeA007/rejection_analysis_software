import { request } from './client.js'

export function fetchRejections({ from, to } = {}) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const query = params.toString()
  return request(`/rejections${query ? `?${query}` : ''}`)
}

export function createRejection(payload) {
  return request('/rejections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteRejection(id) {
  return request(`/rejections/${id}`, { method: 'DELETE' })
}
