import { Hono } from 'hono'
import type { LocalFlare } from 'localflare-core'

export function createR2Routes(localflare: LocalFlare) {
  const app = new Hono()

  // List all R2 buckets
  app.get('/', async (c) => {
    const bindings = localflare.getDiscoveredBindings()
    return c.json({
      buckets: bindings?.r2 ?? [],
    })
  })

  // List objects in a bucket
  app.get('/:binding/objects', async (c) => {
    try {
      const r2 = await localflare.getR2Bucket(c.req.param('binding'))
      const prefix = c.req.query('prefix') || undefined
      const cursor = c.req.query('cursor') || undefined
      const limit = Number(c.req.query('limit')) || 100
      const delimiter = c.req.query('delimiter') || undefined

      const list = await r2.list({
        prefix,
        cursor,
        limit,
        delimiter,
      })

      return c.json({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        objects: list.objects.map((obj: any) => ({
          key: obj.key,
          size: obj.size,
          etag: obj.etag,
          httpEtag: obj.httpEtag,
          uploaded: obj.uploaded,
          checksums: obj.checksums,
          customMetadata: obj.customMetadata,
        })),
        truncated: list.truncated,
        cursor: list.cursor,
        delimitedPrefixes: list.delimitedPrefixes,
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Get object metadata (HEAD)
  app.get('/:binding/objects/:key{.+}/meta', async (c) => {
    try {
      const r2 = await localflare.getR2Bucket(c.req.param('binding'))
      const key = c.req.param('key')

      const head = await r2.head(key)

      if (!head) {
        return c.json({ error: 'Object not found' }, 404)
      }

      return c.json({
        key: head.key,
        size: head.size,
        etag: head.etag,
        httpEtag: head.httpEtag,
        uploaded: head.uploaded,
        checksums: head.checksums,
        httpMetadata: head.httpMetadata,
        customMetadata: head.customMetadata,
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Get object content
  app.get('/:binding/objects/:key{.+}', async (c) => {
    try {
      const r2 = await localflare.getR2Bucket(c.req.param('binding'))
      const key = c.req.param('key')

      const object = await r2.get(key)

      if (!object) {
        return c.json({ error: 'Object not found' }, 404)
      }

      // Set appropriate headers
      const headers = new Headers()
      headers.set('Content-Type', object.httpMetadata?.contentType || 'application/octet-stream')
      headers.set('ETag', object.httpEtag)
      headers.set('Content-Length', String(object.size))

      if (object.httpMetadata?.contentDisposition) {
        headers.set('Content-Disposition', object.httpMetadata.contentDisposition)
      }

      return new Response(object.body, { headers })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Upload object
  app.put('/:binding/objects/:key{.+}', async (c) => {
    try {
      const r2 = await localflare.getR2Bucket(c.req.param('binding'))
      const key = c.req.param('key')

      const contentType = c.req.header('Content-Type') || 'application/octet-stream'
      const body = await c.req.arrayBuffer()

      const customMetadata: Record<string, string> = {}
      // Extract custom metadata from X-Amz-Meta-* headers
      for (const [headerKey, value] of Object.entries(c.req.header())) {
        if (headerKey.toLowerCase().startsWith('x-amz-meta-')) {
          const metaKey = headerKey.slice(11)
          customMetadata[metaKey] = value
        }
      }

      const result = await r2.put(key, body, {
        httpMetadata: {
          contentType,
        },
        customMetadata: Object.keys(customMetadata).length > 0 ? customMetadata : undefined,
      })

      return c.json({
        success: true,
        key: result.key,
        size: result.size,
        etag: result.etag,
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Delete object
  app.delete('/:binding/objects/:key{.+}', async (c) => {
    try {
      const r2 = await localflare.getR2Bucket(c.req.param('binding'))
      const key = c.req.param('key')

      await r2.delete(key)

      return c.json({ success: true })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Bulk delete objects
  app.post('/:binding/bulk-delete', async (c) => {
    try {
      const r2 = await localflare.getR2Bucket(c.req.param('binding'))
      const { keys } = await c.req.json<{ keys: string[] }>()

      await r2.delete(keys)

      return c.json({ success: true, deleted: keys.length })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  return app
}
