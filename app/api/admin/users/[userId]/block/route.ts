import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { db } from "@/lib/db"
import { blockedUser } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"
import { nanoid } from "nanoid"

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const adminSession = await requireAdmin()
    const { userId } = params
    const body = await request.json()
    const { reason } = body

    // Check if user is already blocked
    const existingBlock = await db
      .select()
      .from(blockedUser)
      .where(and(eq(blockedUser.userId, userId), eq(blockedUser.isActive, true)))
      .limit(1)

    if (existingBlock.length > 0) {
      return NextResponse.json(
        { error: "User is already blocked" },
        { status: 400 }
      )
    }

    // Create block record
    await db.insert(blockedUser).values({
      id: nanoid(),
      userId,
      reason: reason || null,
      blockedBy: adminSession.adminId,
      isActive: true,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error blocking user:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}



