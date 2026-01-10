import { NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { db } from "@/lib/db"
import { generationLog, user, blockedUser } from "@/lib/db/schema"
import { sql, count, eq, and, gte } from "drizzle-orm"

export async function GET() {
  try {
    await requireAdmin()

    // Total generations
    const totalGenerations = await db
      .select({ count: count() })
      .from(generationLog)

    // Total users
    const totalUsers = await db
      .select({ count: count() })
      .from(user)

    // Blocked users
    const blockedUsers = await db
      .select({ count: count() })
      .from(blockedUser)
      .where(eq(blockedUser.isActive, true))

    // Generations in last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentGenerations = await db
      .select({ count: count() })
      .from(generationLog)
      .where(gte(generationLog.createdAt, sevenDaysAgo))

    // Generations by status
    const generationsByStatus = await db
      .select({
        status: generationLog.status,
        count: count(),
      })
      .from(generationLog)
      .groupBy(generationLog.status)

    // Generations over time (last 7 days, grouped by day)
    const generationsOverTime = await db
      .select({
        date: sql<string>`DATE(${generationLog.createdAt})`,
        count: count(),
      })
      .from(generationLog)
      .where(gte(generationLog.createdAt, sevenDaysAgo))
      .groupBy(sql`DATE(${generationLog.createdAt})`)
      .orderBy(generationLog.createdAt)

    return NextResponse.json({
      totalGenerations: totalGenerations[0]?.count || 0,
      totalUsers: totalUsers[0]?.count || 0,
      blockedUsers: blockedUsers[0]?.count || 0,
      recentGenerations: recentGenerations[0]?.count || 0,
      generationsByStatus: generationsByStatus.reduce((acc, item) => {
        acc[item.status] = item.count
        return acc
      }, {} as Record<string, number>),
      generationsOverTime: generationsOverTime.map((item) => ({
        date: item.date,
        count: item.count,
      })),
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

