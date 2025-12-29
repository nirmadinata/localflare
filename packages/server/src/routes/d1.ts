import { Hono } from 'hono'
import type { LocalFlare } from 'localflare-core'

export function createD1Routes(localflare: LocalFlare) {
  const app = new Hono()

  // List all D1 databases
  app.get('/', async (c) => {
    const bindings = localflare.getDiscoveredBindings()
    return c.json({
      databases: bindings?.d1 ?? [],
    })
  })

  // Get schema for a database
  app.get('/:binding/schema', async (c) => {
    try {
      const db = await localflare.getD1Database(c.req.param('binding'))
      const tables = await db
        .prepare(`
          SELECT name, sql FROM sqlite_master
          WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'
          ORDER BY name
        `)
        .all()

      return c.json({ tables: tables.results })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Get table info (columns)
  app.get('/:binding/tables/:table', async (c) => {
    try {
      const db = await localflare.getD1Database(c.req.param('binding'))
      const tableName = c.req.param('table')

      const columns = await db.prepare(`PRAGMA table_info("${tableName}")`).all()
      const count = await db.prepare(`SELECT COUNT(*) as count FROM "${tableName}"`).first()

      return c.json({
        table: tableName,
        columns: columns.results,
        rowCount: count?.count ?? 0,
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Query data from a table with pagination
  app.get('/:binding/tables/:table/rows', async (c) => {
    try {
      const db = await localflare.getD1Database(c.req.param('binding'))
      const tableName = c.req.param('table')
      const limit = Number(c.req.query('limit')) || 100
      const offset = Number(c.req.query('offset')) || 0

      const rows = await db
        .prepare(`SELECT * FROM "${tableName}" LIMIT ? OFFSET ?`)
        .bind(limit, offset)
        .all()

      return c.json({
        rows: rows.results,
        meta: rows.meta,
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Execute arbitrary SQL query
  app.post('/:binding/query', async (c) => {
    try {
      const db = await localflare.getD1Database(c.req.param('binding'))
      const { sql, params = [] } = await c.req.json<{ sql: string; params?: unknown[] }>()

      if (!sql) {
        return c.json({ error: 'SQL query is required' }, 400)
      }

      // Determine if it's a read or write query
      const isRead = sql.trim().toUpperCase().startsWith('SELECT')

      if (isRead) {
        const result = await db.prepare(sql).bind(...params).all()
        return c.json({
          success: true,
          results: result.results,
          meta: result.meta,
        })
      } else {
        const result = await db.prepare(sql).bind(...params).run()
        return c.json({
          success: result.success,
          meta: result.meta,
        })
      }
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Insert a row
  app.post('/:binding/tables/:table/rows', async (c) => {
    try {
      const db = await localflare.getD1Database(c.req.param('binding'))
      const tableName = c.req.param('table')
      const data = await c.req.json<Record<string, unknown>>()

      const columns = Object.keys(data)
      const values = Object.values(data)
      const placeholders = columns.map(() => '?').join(', ')

      const sql = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`
      const result = await db.prepare(sql).bind(...values).run()

      return c.json({
        success: result.success,
        meta: result.meta,
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Update a row
  app.put('/:binding/tables/:table/rows/:id', async (c) => {
    try {
      const db = await localflare.getD1Database(c.req.param('binding'))
      const tableName = c.req.param('table')
      const id = c.req.param('id')
      const data = await c.req.json<Record<string, unknown>>()

      const setClause = Object.keys(data)
        .map((col) => `"${col}" = ?`)
        .join(', ')
      const values = [...Object.values(data), id]

      // Assumes 'id' is the primary key - could be made configurable
      const sql = `UPDATE "${tableName}" SET ${setClause} WHERE id = ?`
      const result = await db.prepare(sql).bind(...values).run()

      return c.json({
        success: result.success,
        meta: result.meta,
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Delete a row
  app.delete('/:binding/tables/:table/rows/:id', async (c) => {
    try {
      const db = await localflare.getD1Database(c.req.param('binding'))
      const tableName = c.req.param('table')
      const id = c.req.param('id')

      const result = await db.prepare(`DELETE FROM "${tableName}" WHERE id = ?`).bind(id).run()

      return c.json({
        success: result.success,
        meta: result.meta,
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  return app
}
