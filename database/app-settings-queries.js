import { DEFAULT_FURNACE_CHARGE_KG } from '../src/constants/foundry.js'
import { getDb } from './connection.js'

const FURNACE_CHARGE_KEY = 'furnace_charge_kg'
const ELECTRICITY_METER_START_KEY = 'electricity_meter_start_kwh'
const ELECTRICITY_HEAT_COUNT_START_KEY = 'electricity_heat_count_start'

function getSetting(key) {
  const db = getDb()
  const row = db.prepare(`SELECT value FROM app_settings WHERE key = ?`).get(key)
  return row?.value ?? null
}

function setSetting(key, value) {
  const db = getDb()
  db.prepare(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  ).run(key, String(value))
}

export function getFurnaceChargeKg() {
  const raw = getSetting(FURNACE_CHARGE_KEY)
  const parsed = raw !== null ? Number(raw) : DEFAULT_FURNACE_CHARGE_KG
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_FURNACE_CHARGE_KG
  }
  return parsed
}

export function setFurnaceChargeKg(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('Metal charged per heat must be a number greater than zero.')
  }
  setSetting(FURNACE_CHARGE_KEY, parsed)
  return { furnaceChargeKg: parsed }
}

export function getElectricityMeterStartKwh() {
  const raw = getSetting(ELECTRICITY_METER_START_KEY)
  if (raw === null || raw === '') {
    return null
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) {
    return null
  }
  return parsed
}

export function setElectricityMeterStartKwh(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error('Meter start reading must be a non-negative number.')
  }
  setSetting(ELECTRICITY_METER_START_KEY, parsed)
  return { meterStartKwh: parsed }
}

export function getElectricityHeatCountStart() {
  const raw = getSetting(ELECTRICITY_HEAT_COUNT_START_KEY)
  if (raw === null || raw === '') {
    return 0
  }
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    return 0
  }
  return parsed
}

export function setElectricityHeatCountStart(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0 || !Number.isInteger(parsed)) {
    throw new Error('Start heat count must be a non-negative whole number.')
  }
  setSetting(ELECTRICITY_HEAT_COUNT_START_KEY, parsed)
  return { heatCountStart: parsed }
}

export function getElectricitySettings() {
  return {
    meterStartKwh: getElectricityMeterStartKwh(),
    heatCountStart: getElectricityHeatCountStart(),
  }
}

export function updateElectricitySettings({ meterStartKwh, heatCountStart } = {}) {
  if (meterStartKwh !== undefined && meterStartKwh !== null && meterStartKwh !== '') {
    setElectricityMeterStartKwh(meterStartKwh)
  }
  if (heatCountStart !== undefined && heatCountStart !== null && heatCountStart !== '') {
    setElectricityHeatCountStart(heatCountStart)
  }
  return getElectricitySettings()
}
