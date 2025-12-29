import { Hono } from "hono";

const app = new Hono();

// Health check endpoint
app.get("/api/health", (c) => {
  return c.json({ status: "ok", service: "localflare-www" });
});

export default app;
