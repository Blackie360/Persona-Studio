import { Hono } from "hono"

// Placeholder - will be implemented in next commits
export const paymentRoutes = new Hono()

paymentRoutes.get("/health", (c) => {
  return c.json({ status: "ok" })
})

