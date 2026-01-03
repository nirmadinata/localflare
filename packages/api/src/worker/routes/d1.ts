import { Hono } from 'hono'
import type { Env } from '../types.js'
import { getManifest, isD1Database } from '../types.js'

/**
 * D1 Database Routes
 * 
 * Provides comprehensive CRUD operations for D1 databases including:
 * - Schema introspection (tables, columns, indexes, foreign keys)
 * - Paginated data querying with sorting
 * - Row-level CRUD operations with primary key support
 * - Bulk operations for efficient batch updates
 * - Arbitrary SQL query execution
 */
export function createD1Routes() {
  const app = new Hono<{ Bindings: Env }>()

  // ============================================================================
  // Helpers
  // ============================================================================

  /** Get database instance from binding name */
  function getDatabase(env: Env, binding: string): D1Database | null {
    const db = env[binding]
    if (isD1Database(db)) {
      return db
    }
    return null
  }

  /** Escape identifier for safe SQL usage */
  function escapeIdentifier(name: string): string {
    return `"${name.replace(/"/g, '""')}"`
  }

  /** Get primary key columns for a table */
  async function getPrimaryKeys(db: D1Database, tableName: string): Promise<string[]> {
    const result = await db.prepare(`PRAGMA table_info(${escapeIdentifier(tableName)})`).all()
    return (result.results as Array<{ name: string; pk: number }>)
      .filter(col => col.pk > 0)
      .sort((a, b) => a.pk - b.pk)
      .map(col => col.name)
  }

  /** Build WHERE clause from primary key values */
  function buildPrimaryKeyWhere(
    primaryKeys: string[], 
    rowId: string | Record<string, unknown>
  ): { clause: string; values: unknown[] } {
    // Handle composite keys passed as JSON
    if (typeof rowId === 'string' && rowId.startsWith('[')) {
      try {
        const keyValues = JSON.parse(rowId) as unknown[]
        const conditions = primaryKeys.map(pk => `${escapeIdentifier(pk)} = ?`)
        return { clause: conditions.join(' AND '), values: keyValues }
      } catch {
        // Fall through to single key handling
      }
    }

    // Handle object format
    if (typeof rowId === 'object' && rowId !== null) {
      const conditions = primaryKeys.map(pk => `${escapeIdentifier(pk)} = ?`)
      const values = primaryKeys.map(pk => rowId[pk])
      return { clause: conditions.join(' AND '), values }
    }

    // Single primary key
    if (primaryKeys.length === 1) {
      return { 
        clause: `${escapeIdentifier(primaryKeys[0])} = ?`, 
        values: [rowId] 
      }
    }

    throw new Error('Invalid row identifier for composite primary key')
  }

  // ============================================================================
  // Database Routes
  // ============================================================================

  /** List all D1 databases */
  app.get('/', async (c) => {
    const manifest = getManifest(c.env)
    return c.json({
      databases: manifest.d1.map((db) => ({
        binding: db.binding,
        database_name: db.database_name,
      })),
    })
  })

  // ============================================================================
  // Schema Routes
  // ============================================================================

  /** Get full schema for a database (tables with CREATE statements) */
  app.get('/:binding/schema', async (c) => {
    const db = getDatabase(c.env, c.req.param('binding'))
    if (!db) {
      return c.json({ error: 'Database not found' }, 404)
    }

    try {
      const result = await db.prepare(
        `SELECT name, sql FROM sqlite_master
         WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name NOT LIKE '_mf_%'
         ORDER BY name`
      ).all()

      return c.json({ tables: result.results })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  /** Get detailed table information (columns, primary keys, indexes, foreign keys) */
  app.get('/:binding/tables/:table', async (c) => {
    const db = getDatabase(c.env, c.req.param('binding'))
    if (!db) {
      return c.json({ error: 'Database not found' }, 404)
    }

    try {
      const tableName = c.req.param('table')
      const escapedTable = escapeIdentifier(tableName)

      // Run all schema queries in parallel for better performance
      const [columnsResult, countResult, indexesResult, foreignKeysResult] = await Promise.all([
        // Column info
        db.prepare(`PRAGMA table_info(${escapedTable})`).all(),
        // Row count
        db.prepare(`SELECT COUNT(*) as count FROM ${escapedTable}`).first<{ count: number }>(),
        // Index info
        db.prepare(`PRAGMA index_list(${escapedTable})`).all(),
        // Foreign key info
        db.prepare(`PRAGMA foreign_key_list(${escapedTable})`).all(),
      ])

      // Derive primary keys from columns
      const columns = columnsResult.results as Array<{
        cid: number
        name: string
        type: string
        notnull: number
        dflt_value: unknown
        pk: number
      }>
      
      const primaryKeys = columns
        .filter(col => col.pk > 0)
        .sort((a, b) => a.pk - b.pk)
        .map(col => col.name)

      return c.json({
        table: tableName,
        columns: columnsResult.results,
        primaryKeys,
        indexes: indexesResult.results,
        foreignKeys: foreignKeysResult.results,
        rowCount: countResult?.count ?? 0,
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // ============================================================================
  // Data Query Routes
  // ============================================================================

  /** Query data from a table with pagination and sorting */
  app.get('/:binding/tables/:table/rows', async (c) => {
    const db = getDatabase(c.env, c.req.param('binding'))
    if (!db) {
      return c.json({ error: 'Database not found' }, 404)
    }

    try {
      const tableName = c.req.param('table')
      const escapedTable = escapeIdentifier(tableName)
      
      // Pagination params
      const limit = Math.min(Number(c.req.query('limit')) || 50, 1000)
      const offset = Number(c.req.query('offset')) || 0
      
      // Sorting params
      const sortColumn = c.req.query('sort')
      const sortDirection = c.req.query('dir')?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC'

      // Build query
      let sql = `SELECT * FROM ${escapedTable}`
      
      if (sortColumn) {
        sql += ` ORDER BY ${escapeIdentifier(sortColumn)} ${sortDirection}`
      }
      
      sql += ` LIMIT ? OFFSET ?`

      const result = await db.prepare(sql).bind(limit, offset).all()

      return c.json({
        rows: result.results,
        meta: { 
          limit, 
          offset,
          duration: result.meta?.duration,
        },
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  /** Execute arbitrary SQL query */
  app.post('/:binding/query', async (c) => {
    const db = getDatabase(c.env, c.req.param('binding'))
    if (!db) {
      return c.json({ error: 'Database not found' }, 404)
    }

    try {
      const { sql, params = [] } = await c.req.json<{ sql: string; params?: unknown[] }>()

      if (!sql) {
        return c.json({ error: 'SQL query is required' }, 400)
      }

      // Determine query type for response formatting
      const trimmedSql = sql.trim().toUpperCase()
      const isRead = trimmedSql.startsWith('SELECT') || 
                     trimmedSql.startsWith('PRAGMA') ||
                     trimmedSql.startsWith('EXPLAIN')

      const stmt = db.prepare(sql)
      const boundStmt = params.length > 0 ? stmt.bind(...params) : stmt

      if (isRead) {
        const result = await boundStmt.all()
        return c.json({
          success: true,
          results: result.results,
          rowCount: result.results?.length ?? 0,
          meta: { 
            changes: 0, 
            duration: result.meta?.duration,
          },
        })
      } else {
        const result = await boundStmt.run()
        return c.json({
          success: true,
          meta: {
            changes: result.meta?.changes ?? 0,
            last_row_id: result.meta?.last_row_id,
            duration: result.meta?.duration,
          },
        })
      }
    } catch (error) {
      return c.json({ error: String(error), success: false }, 500)
    }
  })

  // ============================================================================
  // Row CRUD Routes
  // ============================================================================

  /** Insert a new row */
  app.post('/:binding/tables/:table/rows', async (c) => {
    const db = getDatabase(c.env, c.req.param('binding'))
    if (!db) {
      return c.json({ error: 'Database not found' }, 404)
    }

    try {
      const tableName = c.req.param('table')
      const data = await c.req.json<Record<string, unknown>>()

      // Filter out null/undefined values for columns with defaults
      const entries = Object.entries(data).filter(([_, v]) => v !== undefined)
      const columns = entries.map(([k]) => escapeIdentifier(k))
      const values = entries.map(([_, v]) => v)
      const placeholders = columns.map(() => '?').join(', ')

      if (columns.length === 0) {
        return c.json({ error: 'No data provided' }, 400)
      }

      const sql = `INSERT INTO ${escapeIdentifier(tableName)} (${columns.join(', ')}) VALUES (${placeholders})`
      const result = await db.prepare(sql).bind(...values).run()

      return c.json({
        success: true,
        meta: {
          changes: result.meta?.changes ?? 0,
          last_row_id: result.meta?.last_row_id,
          duration: result.meta?.duration,
        },
      })
    } catch (error) {
      return c.json({ error: String(error), success: false }, 500)
    }
  })

  /** Update a row by primary key */
  app.put('/:binding/tables/:table/rows/:rowId', async (c) => {
    const db = getDatabase(c.env, c.req.param('binding'))
    if (!db) {
      return c.json({ error: 'Database not found' }, 404)
    }

    try {
      const tableName = c.req.param('table')
      const rowId = c.req.param('rowId')
      const data = await c.req.json<Record<string, unknown>>()

      // Get primary keys for the table
      const primaryKeys = await getPrimaryKeys(db, tableName)
      if (primaryKeys.length === 0) {
        return c.json({ error: 'Table has no primary key' }, 400)
      }

      // Build WHERE clause
      const { clause: whereClause, values: whereValues } = buildPrimaryKeyWhere(primaryKeys, rowId)

      // Filter out primary key columns from update data
      const updateEntries = Object.entries(data).filter(
        ([k]) => !primaryKeys.includes(k)
      )

      if (updateEntries.length === 0) {
        return c.json({ error: 'No data to update' }, 400)
      }

      const setClause = updateEntries
        .map(([k]) => `${escapeIdentifier(k)} = ?`)
        .join(', ')
      const updateValues = updateEntries.map(([_, v]) => v)

      const sql = `UPDATE ${escapeIdentifier(tableName)} SET ${setClause} WHERE ${whereClause}`
      const result = await db.prepare(sql).bind(...updateValues, ...whereValues).run()

      return c.json({
        success: true,
        meta: { 
          changes: result.meta?.changes ?? 0,
          duration: result.meta?.duration,
        },
      })
    } catch (error) {
      return c.json({ error: String(error), success: false }, 500)
    }
  })

  /** Update a single cell value */
  app.patch('/:binding/tables/:table/rows/:rowId', async (c) => {
    const db = getDatabase(c.env, c.req.param('binding'))
    if (!db) {
      return c.json({ error: 'Database not found' }, 404)
    }

    try {
      const tableName = c.req.param('table')
      const rowId = c.req.param('rowId')
      const { column, value } = await c.req.json<{ column: string; value: unknown }>()

      if (!column) {
        return c.json({ error: 'Column name is required' }, 400)
      }

      // Get primary keys for the table
      const primaryKeys = await getPrimaryKeys(db, tableName)
      if (primaryKeys.length === 0) {
        return c.json({ error: 'Table has no primary key' }, 400)
      }

      // Build WHERE clause
      const { clause: whereClause, values: whereValues } = buildPrimaryKeyWhere(primaryKeys, rowId)

      const sql = `UPDATE ${escapeIdentifier(tableName)} SET ${escapeIdentifier(column)} = ? WHERE ${whereClause}`
      const result = await db.prepare(sql).bind(value, ...whereValues).run()

      return c.json({
        success: true,
        meta: { 
          changes: result.meta?.changes ?? 0,
          duration: result.meta?.duration,
        },
      })
    } catch (error) {
      return c.json({ error: String(error), success: false }, 500)
    }
  })

  /** Delete a row by primary key */
  app.delete('/:binding/tables/:table/rows/:rowId', async (c) => {
    const db = getDatabase(c.env, c.req.param('binding'))
    if (!db) {
      return c.json({ error: 'Database not found' }, 404)
    }

    try {
      const tableName = c.req.param('table')
      const rowId = c.req.param('rowId')

      // Get primary keys for the table
      const primaryKeys = await getPrimaryKeys(db, tableName)
      if (primaryKeys.length === 0) {
        return c.json({ error: 'Table has no primary key' }, 400)
      }

      // Build WHERE clause
      const { clause: whereClause, values: whereValues } = buildPrimaryKeyWhere(primaryKeys, rowId)

      const sql = `DELETE FROM ${escapeIdentifier(tableName)} WHERE ${whereClause}`
      const result = await db.prepare(sql).bind(...whereValues).run()

      return c.json({
        success: true,
        meta: { 
          changes: result.meta?.changes ?? 0,
          duration: result.meta?.duration,
        },
      })
    } catch (error) {
      return c.json({ error: String(error), success: false }, 500)
    }
  })

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /** Bulk delete multiple rows */
  app.post('/:binding/tables/:table/bulk-delete', async (c) => {
    const db = getDatabase(c.env, c.req.param('binding'))
    if (!db) {
      return c.json({ error: 'Database not found' }, 404)
    }

    try {
      const tableName = c.req.param('table')
      const { rowIds } = await c.req.json<{ rowIds: (string | Record<string, unknown>)[] }>()

      if (!rowIds || rowIds.length === 0) {
        return c.json({ error: 'No row IDs provided' }, 400)
      }

      // Get primary keys for the table
      const primaryKeys = await getPrimaryKeys(db, tableName)
      if (primaryKeys.length === 0) {
        return c.json({ error: 'Table has no primary key' }, 400)
      }

      // Execute deletes in a batch - collect prepared statements
      const statements = []
      
      for (const rowId of rowIds) {
        const { clause: whereClause, values: whereValues } = buildPrimaryKeyWhere(primaryKeys, rowId)
        const sql = `DELETE FROM ${escapeIdentifier(tableName)} WHERE ${whereClause}`
        statements.push(db.prepare(sql).bind(...whereValues))
      }

      const results = await db.batch(statements)
      let totalChanges = 0
      for (const r of results) {
        totalChanges += r.meta?.changes ?? 0
      }

      return c.json({
        success: true,
        meta: { 
          changes: totalChanges,
          rowsProcessed: rowIds.length,
        },
      })
    } catch (error) {
      return c.json({ error: String(error), success: false }, 500)
    }
  })

  /** Bulk update multiple rows with same values */
  app.post('/:binding/tables/:table/bulk-update', async (c) => {
    const db = getDatabase(c.env, c.req.param('binding'))
    if (!db) {
      return c.json({ error: 'Database not found' }, 404)
    }

    try {
      const tableName = c.req.param('table')
      const { rowIds, data } = await c.req.json<{ 
        rowIds: (string | Record<string, unknown>)[]
        data: Record<string, unknown>
      }>()

      if (!rowIds || rowIds.length === 0) {
        return c.json({ error: 'No row IDs provided' }, 400)
      }

      if (!data || Object.keys(data).length === 0) {
        return c.json({ error: 'No data provided' }, 400)
      }

      // Get primary keys for the table
      const primaryKeys = await getPrimaryKeys(db, tableName)
      if (primaryKeys.length === 0) {
        return c.json({ error: 'Table has no primary key' }, 400)
      }

      // Filter out primary key columns from update data
      const updateEntries = Object.entries(data).filter(
        ([k]) => !primaryKeys.includes(k)
      )

      if (updateEntries.length === 0) {
        return c.json({ error: 'No data to update (only primary key columns provided)' }, 400)
      }

      const setClause = updateEntries
        .map(([k]) => `${escapeIdentifier(k)} = ?`)
        .join(', ')
      const updateValues = updateEntries.map(([_, v]) => v)

      // Execute updates in a batch - collect prepared statements
      const statements = []
      
      for (const rowId of rowIds) {
        const { clause: whereClause, values: whereValues } = buildPrimaryKeyWhere(primaryKeys, rowId)
        const sql = `UPDATE ${escapeIdentifier(tableName)} SET ${setClause} WHERE ${whereClause}`
        statements.push(db.prepare(sql).bind(...updateValues, ...whereValues))
      }

      const results = await db.batch(statements)
      let totalChanges = 0
      for (const r of results) {
        totalChanges += r.meta?.changes ?? 0
      }

      return c.json({
        success: true,
        meta: { 
          changes: totalChanges,
          rowsProcessed: rowIds.length,
        },
      })
    } catch (error) {
      return c.json({ error: String(error), success: false }, 500)
    }
  })

  return app
}
