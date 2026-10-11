import { request } from './client.js'

export function fetchFurnaceSettings() {
  return request('/settings/furnace')
}

export function updateFurnaceSettings({ furnaceChargeKg }) {
  return request('/settings/furnace', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ furnaceChargeKg }),
  })
}
