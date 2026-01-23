import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set')
}

// Reuse pool across module reloads to prevent connection storms
const globalForDb = globalThis as unknown as { pgPool?: Pool }

const pool = globalForDb.pgPool ?? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
})

if (!globalForDb.pgPool) {
  globalForDb.pgPool = pool
}

let hasShutdownHandlers = false

function registerShutdownHandlers () {
  if (hasShutdownHandlers) return
  hasShutdownHandlers = true

  const shutdown = async () => {
    try {
      await pool.end()
    } catch (err) {
      console.error('Failed to close database pool', err)
    }
  }

  process.once('beforeExit', shutdown)
  process.once('SIGTERM', shutdown)
  process.once('SIGINT', shutdown)
}

registerShutdownHandlers()

export const db = drizzle(pool)
export const dbPool = pool









