import { Hono } from 'hono'
import type { Env } from '../types.js'
import { getManifest, isQueue } from '../types.js'

export function createQueuesRoutes() {
  const app = new Hono<{ Bindings: Env }>()

  // Helper to get queue from env
  function getQueue(env: Env, binding: string): Queue | null {
    const queue = env[binding]
    if (isQueue(queue)) {
      return queue
    }
    return null
  }

  // List all queues
  app.get('/', async (c) => {
    const manifest = getManifest(c.env)
    return c.json({
      producers: manifest.queues.producers.map((p) => ({
        binding: p.binding,
        queue: p.queue,
      })),
      consumers: manifest.queues.consumers.map((consumer) => ({
        queue: consumer.queue,
        max_batch_size: consumer.max_batch_size ?? 10,
        max_batch_timeout: consumer.max_batch_timeout ?? 5,
        max_retries: consumer.max_retries ?? 3,
        dead_letter_queue: consumer.dead_letter_queue,
      })),
    })
  })

  // Send a message to a queue - THIS IS THE KEY FEATURE!
  app.post('/:binding/send', async (c) => {
    const queue = getQueue(c.env, c.req.param('binding'))
    if (!queue) {
      return c.json({ error: 'Queue not found' }, 404)
    }

    try {
      const { message } = await c.req.json<{ message: unknown }>()

      if (message === undefined) {
        return c.json({ error: 'Message is required' }, 400)
      }

      await queue.send(message)

      return c.json({
        success: true,
        message: 'Message sent! Check your terminal for consumer output.',
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  // Send batch messages to a queue
  app.post('/:binding/send-batch', async (c) => {
    const queue = getQueue(c.env, c.req.param('binding'))
    if (!queue) {
      return c.json({ error: 'Queue not found' }, 404)
    }

    try {
      const { messages } = await c.req.json<{ messages: unknown[] }>()

      if (!Array.isArray(messages) || messages.length === 0) {
        return c.json({ error: 'Messages array is required and must not be empty' }, 400)
      }

      // Convert to MessageSendRequest format
      const batch = messages.map((msg) => ({ body: msg }))
      await queue.sendBatch(batch)

      return c.json({
        success: true,
        count: messages.length,
        message: `${messages.length} message(s) sent! Check your terminal for consumer output.`,
      })
    } catch (error) {
      return c.json({ error: String(error) }, 500)
    }
  })

  return app
}
