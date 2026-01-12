import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { db } from "@/lib/db"
import { user, blockedUser, generationLog } from "@/lib/db/schema"
import { eq, sql, desc, and } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = (page - 1) * limit

    // Get users with their generation counts and blocked status
    const users = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        createdAt: user.createdAt,
        generationCount: sql<number>`COUNT(${generationLog.id})`,
        isBlocked: sql<boolean>`EXISTS(
          SELECT 1 FROM ${blockedUser} 
          WHERE ${blockedUser.userId} = ${user.id} 
          AND ${blockedUser.isActive} = true
        )`,
      })
      .from(user)
      .leftJoin(generationLog, eq(generationLog.userId, user.id))
      .groupBy(user.id)
      .orderBy(desc(user.createdAt))
      .limit(limit)
      .offset(offset)

    // Get total count
    const totalUsers = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(user)

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        image: u.image,
        createdAt: u.createdAt,
        generationCount: Number(u.generationCount) || 0,
        isBlocked: u.isBlocked || false,
      })),
      pagination: {
        page,
        limit,
        total: Number(totalUsers[0]?.count) || 0,
        totalPages: Math.ceil((Number(totalUsers[0]?.count) || 0) / limit),
      },
    })
  } catch (error) {
    console.error("Error fetching users:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}



