import { Hono } from 'hono'
import type { LocalFlare } from 'localflare-core'

export function createDurableObjectRoutes(localflare: LocalFlare) {
  const app = new Hono()

  // List all Durable Object bindings
  app.get('/', async (c) => {
    const bindings = localflare.getDiscoveredBindings()
    return c.json({
      durableObjects: bindings?.durableObjects ?? [],
    })
  })

  // Get or create a Durable Object stub by ID
  app.post('/:binding/id', async (c) => {
    try {
      const namespace = await localflare.getDurableObjectNamespace(c.req.param('binding'))
      const { name, id } = await c.req.json<{ name?: string; id?: string }>()

      let doId
      if (id) {
        doId = namespace.idFromString(id)
      } else if (name) {
        doId = namespace.idFromName(name)
      } else {
        doId = namespace.newUniqueId()
      }

      return c.json({
        id: doId.toString(),
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Send a fetch request to a Durable Object
  app.all('/:binding/:id/fetch/*', async (c) => {
    try {
      const namespace = await localflare.getDurableObjectNamespace(c.req.param('binding'))
      const idStr = c.req.param('id')
      const path = c.req.path.split('/fetch')[1] || '/'

      const doId = namespace.idFromString(idStr)
      const stub = namespace.get(doId)

      // Forward the request to the DO
      const url = new URL(path, 'http://do.internal')
      const request = new Request(url, {
        method: c.req.method,
        headers: c.req.raw.headers,
        body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
      })

      const response = await stub.fetch(request)

      return response
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  return app
}
