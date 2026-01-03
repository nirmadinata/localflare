import { Hono } from 'hono'
import type { Env } from '../types.js'
import { getManifest, isR2Bucket } from '../types.js'

export function createR2Routes() {
  const app = new Hono<{ Bindings: Env }>()

  // Helper to get R2 bucket from env
  function getR2(env: Env, binding: string): R2Bucket | null {
    const r2 = env[binding]
    if (isR2Bucket(r2)) {
      return r2
    }
    return null
  }

  // List all R2 buckets
  app.get('/', async (c) => {
    const manifest = getManifest(c.env)
    return c.json({
      buckets: manifest.r2.map((r2) => ({
        binding: r2.binding,
        bucket_name: r2.bucket_name,
      })),
    })
  })

  // List objects in a bucket
  app.get('/:binding/objects', async (c) => {
    const r2 = getR2(c.env, c.req.param('binding'))
    if (!r2) {
      return c.json({ error: 'Bucket not found' }, 404)
    }

    try {
      const prefix = c.req.query('prefix') || undefined
      const limit = Number(c.req.query('limit')) || 100
      const cursor = c.req.query('cursor') || undefined
      const delimiter = c.req.query('delimiter') || undefined

      const result = await r2.list({
        prefix,
        limit,
        cursor,
        delimiter,
      })

      return c.json({
        objects: result.objects.map((obj) => ({
          key: obj.key,
          size: obj.size,
          etag: obj.etag,
          httpEtag: obj.httpEtag,
          uploaded: obj.uploaded.toISOString(),
          checksums: obj.checksums,
          customMetadata: obj.customMetadata,
        })),
        truncated: result.truncated,
        cursor: result.cursor || undefined,
        delimitedPrefixes: result.delimitedPrefixes,
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Get object metadata (HEAD)
  app.get('/:binding/objects/:key{.+}/meta', async (c) => {
    const r2 = getR2(c.env, c.req.param('binding'))
    if (!r2) {
      return c.json({ error: 'Bucket not found' }, 404)
    }

    try {
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
        uploaded: head.uploaded.toISOString(),
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
    const r2 = getR2(c.env, c.req.param('binding'))
    if (!r2) {
      return c.json({ error: 'Bucket not found' }, 404)
    }

    try {
      const key = c.req.param('key')
      const object = await r2.get(key)

      if (!object) {
        return c.json({ error: 'Object not found' }, 404)
      }

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
    const r2 = getR2(c.env, c.req.param('binding'))
    if (!r2) {
      return c.json({ error: 'Bucket not found' }, 404)
    }

    try {
      const key = c.req.param('key')
      const contentType = c.req.header('Content-Type') || 'application/octet-stream'
      const body = c.req.raw.body

      // Extract custom metadata from headers
      const customMetadata: Record<string, string> = {}
      c.req.raw.headers.forEach((value, headerKey) => {
        if (headerKey.toLowerCase().startsWith('x-amz-meta-')) {
          const metaKey = headerKey.slice(11)
          customMetadata[metaKey] = value
        }
      })

      const result = await r2.put(key, body, {
        httpMetadata: { contentType },
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
    const r2 = getR2(c.env, c.req.param('binding'))
    if (!r2) {
      return c.json({ error: 'Bucket not found' }, 404)
    }

    try {
      const key = c.req.param('key')
      await r2.delete(key)
      return c.json({ success: true })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Bulk delete objects
  app.post('/:binding/bulk-delete', async (c) => {
    const r2 = getR2(c.env, c.req.param('binding'))
    if (!r2) {
      return c.json({ error: 'Bucket not found' }, 404)
    }

    try {
      const { keys } = await c.req.json<{ keys: string[] }>()

      // R2 supports bulk delete
      await r2.delete(keys)

      return c.json({ success: true, deleted: keys.length })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  return app
}
