import { Hono } from "hono"
import { paymentRoutes } from "@/lib/payments/hono-routes"
import type { NextRequest } from "next/server"

const app = new Hono().basePath("/api")

// Mount payment routes
app.route("/payments", paymentRoutes)

// Custom handler for Next.js App Router
async function handleRequest(request: NextRequest) {
  return app.fetch(request)
}

export async function GET(request: NextRequest) {
  return handleRequest(request)
}

export async function POST(request: NextRequest) {
  return handleRequest(request)
}

export async function PUT(request: NextRequest) {
  return handleRequest(request)
}

export async function PATCH(request: NextRequest) {
  return handleRequest(request)
}

export async function DELETE(request: NextRequest) {
  return handleRequest(request)
}


