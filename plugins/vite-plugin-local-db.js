import { getDb } from '../database/connection.js'
import { getMonthlyAnalysis, getDashboardSummary } from '../database/analysis-queries.js'
import { getFurnaceChargeKg, setFurnaceChargeKg } from '../database/app-settings-queries.js'
import { getHeatYieldReport } from '../database/yield-queries.js'
import { createPart, deletePart, listParts, updatePart } from '../database/part-queries.js'
import { importParts, previewPartImport } from '../database/part-import-queries.js'
import {
  createProductionEntry,
  deleteProductionEntry,
  listProductionEntries,
} from '../database/production-queries.js'
import {
  createRejection,
  deleteRejection,
  listRejections,
} from '../database/rejection-queries.js'
import {
  createRejectionType,
  deleteRejectionType,
  listRejectionTypes,
  reorderRejectionTypes,
  updateRejectionType,
} from '../database/rejection-type-queries.js'
import { ensureDefaultRejectionTypes } from '../database/seed-rejection-types.js'

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(payload))
}

const MAX_BODY_BYTES = 1024 * 1024

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''

    req.on('data', (chunk) => {
      data += chunk
      if (data.length > MAX_BODY_BYTES) {
        reject(new Error('Request body too large'))
      }
    })

    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })

    req.on('error', reject)
  })
}

function getDateRange(searchParams) {
  return {
    from: searchParams.get('from') || undefined,
    to: searchParams.get('to') || undefined,
  }
}

async function handleApiRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const { pathname } = url
  const searchParams = url.searchParams

  try {
    getDb()

    if (pathname === '/api/parts') {
      if (req.method === 'GET') {
        sendJson(res, 200, listParts())
        return
      }
      if (req.method === 'POST') {
        const body = await readJsonBody(req)
        sendJson(res, 201, createPart(body))
        return
      }
    }

    const partIdMatch = pathname.match(/^\/api\/parts\/(\d+)$/)
    if (partIdMatch) {
      const partId = Number(partIdMatch[1])
      if (req.method === 'DELETE') {
        sendJson(res, 200, deletePart(partId))
        return
      }
      if (req.method === 'PUT') {
        const body = await readJsonBody(req)
        sendJson(res, 200, updatePart(partId, body))
        return
      }
    }

    if (pathname === '/api/parts/import/preview' && req.method === 'POST') {
      const body = await readJsonBody(req)
      sendJson(res, 200, previewPartImport(body.rows))
      return
    }

    if (pathname === '/api/parts/import' && req.method === 'POST') {
      const body = await readJsonBody(req)
      sendJson(res, 200, importParts(body.rows))
      return
    }

    if (pathname === '/api/production') {
      if (req.method === 'GET') {
        sendJson(res, 200, listProductionEntries(getDateRange(searchParams)))
        return
      }
      if (req.method === 'POST') {
        const body = await readJsonBody(req)
        sendJson(res, 201, createProductionEntry(body))
        return
      }
    }

    const productionDeleteMatch = pathname.match(/^\/api\/production\/(\d+)$/)
    if (productionDeleteMatch && req.method === 'DELETE') {
      sendJson(res, 200, deleteProductionEntry(Number(productionDeleteMatch[1])))
      return
    }

    if (pathname === '/api/rejections') {
      if (req.method === 'GET') {
        sendJson(res, 200, listRejections(getDateRange(searchParams)))
        return
      }
      if (req.method === 'POST') {
        const body = await readJsonBody(req)
        sendJson(res, 201, createRejection(body))
        return
      }
    }

    const rejectionDeleteMatch = pathname.match(/^\/api\/rejections\/(\d+)$/)
    if (rejectionDeleteMatch && req.method === 'DELETE') {
      sendJson(res, 200, deleteRejection(Number(rejectionDeleteMatch[1])))
      return
    }

    if (pathname === '/api/rejection-types') {
      if (req.method === 'GET') {
        const includeInactive = searchParams.get('includeInactive') === '1'
        sendJson(res, 200, listRejectionTypes({ includeInactive }))
        return
      }
      if (req.method === 'POST') {
        const body = await readJsonBody(req)
        sendJson(res, 201, createRejectionType(body))
        return
      }
      if (req.method === 'PUT') {
        const body = await readJsonBody(req)
        if (body.orderedIds) {
          sendJson(res, 200, reorderRejectionTypes(body.orderedIds))
          return
        }
        if (!body.id) {
          sendJson(res, 400, { error: 'Rejection type id is required.' })
          return
        }
        const { id, ...updates } = body
        sendJson(res, 200, updateRejectionType(id, updates))
        return
      }
    }

    const rejectionTypeDeleteMatch = pathname.match(/^\/api\/rejection-types\/(\d+)$/)
    if (rejectionTypeDeleteMatch && req.method === 'DELETE') {
      sendJson(res, 200, deleteRejectionType(Number(rejectionTypeDeleteMatch[1])))
      return
    }

    if (pathname === '/api/analysis/monthly' && req.method === 'GET') {
      sendJson(res, 200, getMonthlyAnalysis(getDateRange(searchParams)))
      return
    }

    if (pathname === '/api/analysis/dashboard' && req.method === 'GET') {
      sendJson(res, 200, getDashboardSummary(getDateRange(searchParams)))
      return
    }

    if (pathname === '/api/analysis/yield' && req.method === 'GET') {
      sendJson(res, 200, getHeatYieldReport(getDateRange(searchParams)))
      return
    }

    if (pathname === '/api/settings/furnace') {
      if (req.method === 'GET') {
        sendJson(res, 200, { furnaceChargeKg: getFurnaceChargeKg() })
        return
      }
      if (req.method === 'PUT') {
        const body = await readJsonBody(req)
        sendJson(res, 200, setFurnaceChargeKg(body.furnaceChargeKg))
        return
      }
    }

    sendJson(res, 404, { error: 'Not found' })
  } catch (error) {
    sendJson(res, 400, { error: error.message || 'Request failed.' })
  }
}

export default function localDbPlugin() {
  let initPromise

  function initOnce() {
    getDb()
    ensureDefaultRejectionTypes()
  }

  return {
    name: 'local-db',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          next()
          return
        }

        try {
          if (!initPromise) {
            initPromise = Promise.resolve().then(initOnce)
          }
          await initPromise
          await handleApiRequest(req, res)
        } catch (error) {
          sendJson(res, 400, { error: error.message || 'Request failed.' })
        }
      })
    },
  }
}
