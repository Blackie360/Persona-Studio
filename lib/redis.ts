import { Redis } from "@upstash/redis"

// Initialize Redis client using Upstash REST API
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

const FREE_GENERATION_LIMIT = 2
const REDIS_KEY_PREFIX = "free-gen"

/**
 * Gets the Redis key for tracking free generations for an IP address
 */
function getFreeGenKey(ip: string): string {
  return `${REDIS_KEY_PREFIX}:${ip}`
}

/**
 * Gets the current generation count for an IP address
 */
export async function getIpGenerationCount(ip: string): Promise<number> {
  try {
    const key = getFreeGenKey(ip)
    const count = await redis.get<number>(key)
    return count ?? 0
  } catch (error) {
    console.error("Error getting IP generation count from Redis:", error)
    // On error, allow the request to proceed (fail open)
    return 0
  }
}

/**
 * Increments the generation count for an IP address
 * Returns the new count after incrementing
 */
export async function incrementIpGenerationCount(ip: string): Promise<number> {
  try {
    const key = getFreeGenKey(ip)
    const newCount = await redis.incr(key)
    return newCount
  } catch (error) {
    console.error("Error incrementing IP generation count in Redis:", error)
    // On error, return a high number to prevent abuse but don't block
    return FREE_GENERATION_LIMIT + 1
  }
}

/**
 * Gets the remaining free generations for an IP address
 */
export async function getRemainingGenerations(ip: string): Promise<number> {
  const count = await getIpGenerationCount(ip)
  return Math.max(0, FREE_GENERATION_LIMIT - count)
}

/**
 * Checks if an IP address has reached the free generation limit
 */
export async function hasReachedLimit(ip: string): Promise<boolean> {
  const count = await getIpGenerationCount(ip)
  return count >= FREE_GENERATION_LIMIT
}

export { FREE_GENERATION_LIMIT }

