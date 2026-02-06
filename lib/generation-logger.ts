import { db } from "./db"
import { generationLog } from "./db/schema"
import { eq, and, isNull, sql } from "drizzle-orm"
import { nanoid } from "nanoid"

const FREE_GENERATION_LIMIT = 2

export interface GenerationLogData {
  userId?: string | null
  sessionId?: string
  status: "loading" | "complete" | "error"
  prompt: string
  imageUrl?: string | null
  avatarStyle?: string
  background?: string
  colorMood?: string
  regenerationType?: string
  ipAddress?: string
  userAgent?: string
}

export async function logGeneration(data: GenerationLogData): Promise<void> {
  try {
    const logId = nanoid()
    const now = new Date()
    
    await db.insert(generationLog).values({
      id: logId,
      userId: data.userId || null,
      sessionId: data.sessionId || nanoid(),
      status: data.status,
      prompt: data.prompt,
      imageUrl: data.imageUrl || null,
      avatarStyle: data.avatarStyle || null,
      background: data.background || null,
      colorMood: data.colorMood || null,
      regenerationType: data.regenerationType || null,
      createdAt: now,
      completedAt: data.status === "complete" || data.status === "error" ? now : null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    })
  } catch (error) {
    // Don't throw - logging should not break the generation flow
    console.error("Error logging generation:", error)
  }
}

export async function logGenerationStart(data: Omit<GenerationLogData, "status" | "imageUrl">): Promise<string> {
  const logId = nanoid()
  try {
    await db.insert(generationLog).values({
      id: logId,
      userId: data.userId || null,
      sessionId: data.sessionId || nanoid(),
      status: "loading",
      prompt: data.prompt,
      imageUrl: null,
      avatarStyle: data.avatarStyle || null,
      background: data.background || null,
      colorMood: data.colorMood || null,
      regenerationType: data.regenerationType || null,
      createdAt: new Date(),
      completedAt: null,
      ipAddress: data.ipAddress || null,
      userAgent: data.userAgent || null,
    })
    return logId
  } catch (error) {
    console.error("Error logging generation start:", error)
    return logId // Return ID even if logging fails
  }
}

export async function logGenerationComplete(
  logId: string,
  imageUrl: string | null,
  status: "complete" | "error" = "complete"
): Promise<void> {
  try {
    await db
      .update(generationLog)
      .set({
        status,
        imageUrl: imageUrl || null,
        completedAt: new Date(),
      })
      .where(eq(generationLog.id, logId))
  } catch (error) {
    console.error("Error updating generation log:", error)
  }
}

/**
 * Counts non-failed generations for an IP address (unauthenticated users only).
 * Counts both 'loading' (in-progress) and 'complete' rows to prevent
 * concurrent requests from bypassing the limit.
 */
export async function getIpGenerationCount(ip: string): Promise<number> {
  try {
    const result = await db
      .select({ count: sql<number>`cast(count(*) as integer)` })
      .from(generationLog)
      .where(
        and(
          eq(generationLog.ipAddress, ip),
          isNull(generationLog.userId),
          sql`${generationLog.status} IN ('loading', 'complete')`
        )
      )
    return result[0]?.count ?? 0
  } catch (error) {
    console.error("Error counting IP generations:", error)
    // Fail open — don't block users if the DB query fails
    return 0
  }
}

/**
 * Returns the number of free generations remaining for an IP address.
 */
export async function getRemainingGenerations(ip: string): Promise<number> {
  const count = await getIpGenerationCount(ip)
  return Math.max(0, FREE_GENERATION_LIMIT - count)
}

/**
 * Checks whether an IP address has exceeded the free generation limit.
 * Uses strict greater-than because the current request's own "loading"
 * row is already included in the count (insert-then-check pattern).
 */
export async function hasReachedLimit(ip: string): Promise<boolean> {
  const count = await getIpGenerationCount(ip)
  return count > FREE_GENERATION_LIMIT
}

export { FREE_GENERATION_LIMIT }

