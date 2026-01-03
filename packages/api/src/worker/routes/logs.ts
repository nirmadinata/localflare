import { Hono } from 'hono'
import type { Env } from '../types.js'

export function createLogsRoutes() {
  const app = new Hono<{ Bindings: Env }>()

  // Get recent logs (placeholder - logs are shown in terminal in sidecar mode)
  app.get('/', (c) => {
    return c.json({
      logs: [],
      message: 'In sidecar mode, logs are displayed in your terminal where localflare is running.',
    })
  })

  // Clear logs (no-op in sidecar mode)
  app.delete('/', (c) => {
    return c.json({ success: true })
  })

  // SSE stream endpoint (placeholder - returns immediately)
  app.get('/stream', (c) => {
    // Return a minimal SSE response that closes immediately
    // In sidecar mode, logs go directly to the terminal
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        // Send a comment to keep connection alive briefly, then close
        controller.enqueue(encoder.encode(': Logs are displayed in your terminal in sidecar mode\n\n'))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  })

  return app
}
