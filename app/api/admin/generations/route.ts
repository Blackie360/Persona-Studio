import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { db } from "@/lib/db"
import { generationLog, user } from "@/lib/db/schema"
import { desc, eq, gte, lte, and, sql } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit
    const userId = searchParams.get("userId")
    const status = searchParams.get("status")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // Build filter conditions
    const conditions = []
    if (userId) {
      conditions.push(eq(generationLog.userId, userId))
    }
    if (status) {
      conditions.push(eq(generationLog.status, status))
    }
    if (startDate) {
      conditions.push(gte(generationLog.createdAt, new Date(startDate)))
    }
    if (endDate) {
      conditions.push(lte(generationLog.createdAt, new Date(endDate)))
    }

    // Build query with filters applied before orderBy/limit/offset
    let query = db
      .select({
        id: generationLog.id,
        userId: generationLog.userId,
        sessionId: generationLog.sessionId,
        status: generationLog.status,
        prompt: generationLog.prompt,
        imageUrl: generationLog.imageUrl,
        avatarStyle: generationLog.avatarStyle,
        background: generationLog.background,
        colorMood: generationLog.colorMood,
        createdAt: generationLog.createdAt,
        completedAt: generationLog.completedAt,
        ipAddress: generationLog.ipAddress,
        userAgent: generationLog.userAgent,
        userName: user.name,
        userEmail: user.email,
      })
      .from(generationLog)
      .leftJoin(user, eq(generationLog.userId, user.id))

    if (conditions.length > 0) {
      query = query.where(and(...conditions))
    }

    const generations = await query
      .orderBy(desc(generationLog.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count (with same filters)
    let countQuery = db
      .select({ count: sql<number>`COUNT(*)` })
      .from(generationLog)

    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions))
    }

    const totalResult = await countQuery

    return NextResponse.json({
      generations: generations.map((gen) => ({
        id: gen.id,
        userId: gen.userId,
        sessionId: gen.sessionId,
        status: gen.status,
        prompt: gen.prompt,
        imageUrl: gen.imageUrl,
        avatarStyle: gen.avatarStyle,
        background: gen.background,
        colorMood: gen.colorMood,
        createdAt: gen.createdAt,
        completedAt: gen.completedAt,
        ipAddress: gen.ipAddress,
        userAgent: gen.userAgent,
        userName: gen.userName,
        userEmail: gen.userEmail,
      })),
      pagination: {
        page,
        limit,
        total: Number(totalResult[0]?.count) || 0,
        totalPages: Math.ceil((Number(totalResult[0]?.count) || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching generations:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const errorMessage = error instanceof Error ? error.message : "Internal server error"
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}

