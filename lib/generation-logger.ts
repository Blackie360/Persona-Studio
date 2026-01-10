import { db } from "./db"
import { generationLog } from "./db/schema"
import { eq } from "drizzle-orm"
import { nanoid } from "nanoid"

export interface GenerationLogData {
  userId?: string | null
  sessionId?: string
  status: "loading" | "complete" | "error"
  prompt: string
  imageUrl?: string | null
  avatarStyle?: string
  background?: string
  colorMood?: string
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

