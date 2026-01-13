import { handle } from "hono/nextjs"
import { Hono } from "hono"
import { paymentRoutes } from "@/lib/payments/hono-routes"

const app = new Hono().basePath("/api")

// Mount payment routes
app.route("/payments", paymentRoutes)

export const GET = handle(app)
export const POST = handle(app)
export const PUT = handle(app)
export const PATCH = handle(app)
export const DELETE = handle(app)

