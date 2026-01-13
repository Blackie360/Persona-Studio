import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { db } from "@/lib/db"
import { blockedUser } from "@/lib/db/schema"
import { eq, and } from "drizzle-orm"

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    await requireAdmin()
    const { userId } = params

    // Deactivate all active blocks for this user
    await db
      .update(blockedUser)
      .set({ isActive: false })
      .where(and(eq(blockedUser.userId, userId), eq(blockedUser.isActive, true)))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error unblocking user:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}




