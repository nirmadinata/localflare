import { Hono } from 'hono'
import type { LocalFlare } from 'localflare-core'

export function createKVRoutes(localflare: LocalFlare) {
  const app = new Hono()

  // List all KV namespaces
  app.get('/', async (c) => {
    const bindings = localflare.getDiscoveredBindings()
    return c.json({
      namespaces: bindings?.kv ?? [],
    })
  })

  // List keys in a namespace
  app.get('/:binding/keys', async (c) => {
    try {
      const kv = await localflare.getKVNamespace(c.req.param('binding'))
      const prefix = c.req.query('prefix') || undefined
      const cursor = c.req.query('cursor') || undefined
      const limit = Number(c.req.query('limit')) || 100

      const list = await kv.list({
        prefix,
        cursor,
        limit,
      })

      return c.json({
        keys: list.keys,
        cursor: list.cursor,
        list_complete: list.list_complete,
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Get a value
  app.get('/:binding/keys/:key', async (c) => {
    try {
      const kv = await localflare.getKVNamespace(c.req.param('binding'))
      const key = c.req.param('key')
      const type = c.req.query('type') || 'text'

      let value: unknown
      const metadata = await kv.getWithMetadata(key, { type: 'text' })

      switch (type) {
        case 'json':
          value = await kv.get(key, { type: 'json' })
          break
        case 'arrayBuffer':
          const buffer = await kv.get(key, { type: 'arrayBuffer' })
          value = buffer ? Buffer.from(buffer).toString('base64') : null
          break
        default:
          value = await kv.get(key, { type: 'text' })
      }

      if (value === null) {
        return c.json({ error: 'Key not found' }, 404)
      }

      return c.json({
        key,
        value,
        metadata: metadata.metadata,
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Set a value
  app.put('/:binding/keys/:key', async (c) => {
    try {
      const kv = await localflare.getKVNamespace(c.req.param('binding'))
      const key = c.req.param('key')
      const body = await c.req.json<{
        value: string
        metadata?: Record<string, unknown>
        expirationTtl?: number
        expiration?: number
      }>()

      await kv.put(key, body.value, {
        metadata: body.metadata,
        expirationTtl: body.expirationTtl,
        expiration: body.expiration,
      })

      return c.json({ success: true })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Delete a key
  app.delete('/:binding/keys/:key', async (c) => {
    try {
      const kv = await localflare.getKVNamespace(c.req.param('binding'))
      const key = c.req.param('key')

      await kv.delete(key)

      return c.json({ success: true })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Bulk delete keys
  app.post('/:binding/bulk-delete', async (c) => {
    try {
      const kv = await localflare.getKVNamespace(c.req.param('binding'))
      const { keys } = await c.req.json<{ keys: string[] }>()

      await Promise.all(keys.map((key) => kv.delete(key)))

      return c.json({ success: true, deleted: keys.length })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  return app
}
