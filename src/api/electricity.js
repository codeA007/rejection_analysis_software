import { request } from './client.js'

export function fetchElectricityReadings() {
  return request('/electricity/readings')
}

export function createElectricityReading(payload) {
  return request('/electricity/readings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

export function deleteElectricityReading(id) {
  return request(`/electricity/readings/${id}`, { method: 'DELETE' })
}

export function updateElectricityReading(id, payload) {
  return request(`/electricity/readings/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}
