import { getDb } from './connection.js'
import { getTotalPouredWeight } from './production-queries.js'
import { getTotalRejectedWeight } from './rejection-queries.js'

function roundRate(value) {
  return Math.round(value * 100) / 100
}

export function getMonthlyAnalysis({ from, to }) {
  if (!from || !to) {
    throw new Error('Date range (from and to) is required.')
  }

  const db = getDb()

  const totals = db
    .prepare(
      `SELECT
         COALESCE((SELECT SUM(quantity) FROM production_entries WHERE production_date BETWEEN ? AND ?), 0) AS totalProduction,
         COALESCE((SELECT SUM(quantity) FROM rejections WHERE rejection_date BETWEEN ? AND ?), 0) AS totalRejections`,
    )
    .get(from, to, from, to)

  const totalProduction = totals.totalProduction
  const totalRejections = totals.totalRejections
  const rejectionRate =
    totalProduction > 0 ? roundRate((totalRejections / totalProduction) * 100) : 0

  const byType = db
    .prepare(
      `SELECT
         rt.id AS rejectionTypeId,
         rt.type_name AS rejectionTypeName,
         COUNT(r.id) AS entryCount,
         COALESCE(SUM(r.quantity), 0) AS totalQuantity
       FROM rejections r
       JOIN rejection_types rt ON rt.id = r.rejection_type_id
       WHERE r.rejection_date BETWEEN ? AND ?
       GROUP BY rt.id, rt.type_name
       ORDER BY totalQuantity DESC, rt.type_name ASC`,
    )
    .all(from, to)

  const byPart = db
    .prepare(
      `SELECT
         p.id AS partId,
         p.part_name AS partName,
         COALESCE(prod.totalProduction, 0) AS totalProduction,
         COALESCE(rej.totalRejections, 0) AS totalRejections
       FROM parts p
       LEFT JOIN (
         SELECT part_id, SUM(quantity) AS totalProduction
         FROM production_entries
         WHERE production_date BETWEEN ? AND ?
         GROUP BY part_id
       ) prod ON prod.part_id = p.id
       LEFT JOIN (
         SELECT part_id, SUM(quantity) AS totalRejections
         FROM rejections
         WHERE rejection_date BETWEEN ? AND ?
         GROUP BY part_id
       ) rej ON rej.part_id = p.id
       WHERE COALESCE(prod.totalProduction, 0) > 0 OR COALESCE(rej.totalRejections, 0) > 0
       ORDER BY p.part_name COLLATE NOCASE ASC`,
    )
    .all(from, to, from, to)
    .map((row) => ({
      ...row,
      rejectionRate:
        row.totalProduction > 0
          ? roundRate((row.totalRejections / row.totalProduction) * 100)
          : 0,
    }))

  const dailyTrend = db
    .prepare(
      `WITH dates AS (
         SELECT production_date AS entry_date, quantity, 0 AS rejected_qty
         FROM production_entries
         WHERE production_date BETWEEN ? AND ?
         UNION ALL
         SELECT rejection_date AS entry_date, 0 AS quantity, quantity AS rejected_qty
         FROM rejections
         WHERE rejection_date BETWEEN ? AND ?
       )
       SELECT
         entry_date AS date,
         SUM(quantity) AS production,
         SUM(rejected_qty) AS rejections
       FROM dates
       GROUP BY entry_date
       ORDER BY entry_date ASC`,
    )
    .all(from, to, from, to)
    .map((row) => ({
      date: row.date,
      production: row.production,
      rejections: row.rejections,
      rejectionRate:
        row.production > 0 ? roundRate((row.rejections / row.production) * 100) : 0,
    }))

  const monthlyTrend = db
    .prepare(
      `WITH months AS (
         SELECT substr(production_date, 1, 7) AS month_key, quantity, 0 AS rejected_qty
         FROM production_entries
         WHERE production_date BETWEEN ? AND ?
         UNION ALL
         SELECT substr(rejection_date, 1, 7) AS month_key, 0 AS quantity, quantity AS rejected_qty
         FROM rejections
         WHERE rejection_date BETWEEN ? AND ?
       )
       SELECT
         month_key AS month,
         SUM(quantity) AS production,
         SUM(rejected_qty) AS rejections
       FROM months
       GROUP BY month_key
       ORDER BY month_key ASC`,
    )
    .all(from, to, from, to)
    .map((row) => ({
      month: row.month,
      production: row.production,
      rejections: row.rejections,
      rejectionRate:
        row.production > 0 ? roundRate((row.rejections / row.production) * 100) : 0,
    }))

  const totalPouredWeight = getTotalPouredWeight({ from, to })
  const totalRejectedWeight = getTotalRejectedWeight({ from, to })

  return {
    from,
    to,
    totalProduction,
    totalRejections,
    totalPouredWeight,
    totalRejectedWeight,
    rejectionRate,
    byType,
    byPart,
    dailyTrend,
    monthlyTrend,
  }
}

export function getDashboardSummary({ from, to }) {
  const analysis = getMonthlyAnalysis({ from, to })
  return {
    from,
    to,
    totalProduction: analysis.totalProduction,
    totalRejections: analysis.totalRejections,
    totalPouredWeight: analysis.totalPouredWeight,
    rejectionRate: analysis.rejectionRate,
    partCount: analysis.byPart.length,
    topRejectionType: analysis.byType[0] ?? null,
  }
}
