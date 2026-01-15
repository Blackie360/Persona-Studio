import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { blockedUser } from "@/lib/db/schema"
import { eq, and, or } from "drizzle-orm"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await auth.api.getSession({ headers: request.headers })
    const userId = session?.user?.id || null
    const userEmail = session?.user?.email || null
    const sessionId = session?.session?.id || null

    // Check if user is blocked (check userId, email, or sessionId)
    const blocks = await db
      .select()
      .from(blockedUser)
      .where(
        and(
          eq(blockedUser.isActive, true),
          or(
            userId ? eq(blockedUser.userId, userId) : undefined,
            userEmail ? eq(blockedUser.email, userEmail) : undefined,
            sessionId ? eq(blockedUser.sessionId, sessionId) : undefined
          )!
        )
      )
      .limit(1)

    if (blocks.length > 0) {
      const block = blocks[0]
      return NextResponse.json({
        blocked: true,
        reason: block.reason || "User has been blocked by an administrator",
      })
    }

    return NextResponse.json({ blocked: false })
  } catch (error) {
    console.error("Error checking block status:", error)
    // Don't block on error - allow generation to proceed
    return NextResponse.json({ blocked: false })
  }
}





