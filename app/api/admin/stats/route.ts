import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/admin-auth"
import { db } from "@/lib/db"
import { generationLog, user, blockedUser } from "@/lib/db/schema"
import { sql, count, eq, and, gte } from "drizzle-orm"

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)

    // Total generations
    const totalGenerationsResult = await db
      .select({ count: count() })
      .from(generationLog)
    const totalGenerations = totalGenerationsResult[0]?.count || 0

    // Total users
    const totalUsersResult = await db
      .select({ count: count() })
      .from(user)
    const totalUsers = totalUsersResult[0]?.count || 0

    // Blocked users
    const blockedUsersResult = await db
      .select({ count: count() })
      .from(blockedUser)
      .where(eq(blockedUser.isActive, true))
    const blockedUsers = blockedUsersResult[0]?.count || 0

    // Generations in last 7 days
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const recentGenerationsResult = await db
      .select({ count: count() })
      .from(generationLog)
      .where(gte(generationLog.createdAt, sevenDaysAgo))
    const recentGenerations = recentGenerationsResult[0]?.count || 0

    // Generations by status
    const generationsByStatusResult = await db
      .select({
        status: generationLog.status,
        count: count(),
      })
      .from(generationLog)
      .groupBy(generationLog.status)
    
    const generationsByStatus = generationsByStatusResult.reduce((acc, item) => {
      acc[item.status] = Number(item.count) || 0
      return acc
    }, {} as Record<string, number>)

    // Generations over time (last 7 days, grouped by day)
    // Use PostgreSQL's date_trunc for better compatibility
    let generationsOverTime: Array<{ date: string; count: number }> = []
    try {
      const generationsOverTimeResult = await db
        .select({
          date: sql<string>`DATE(${generationLog.createdAt})`.as("date"),
          count: count(),
        })
        .from(generationLog)
        .where(gte(generationLog.createdAt, sevenDaysAgo))
        .groupBy(sql`DATE(${generationLog.createdAt})`)
        .orderBy(sql`DATE(${generationLog.createdAt})`)
      
      generationsOverTime = generationsOverTimeResult.map((item) => ({
        date: item.date,
        count: Number(item.count) || 0,
      }))
    } catch (error) {
      console.error("Error fetching generations over time:", error)
      // Return empty array if this query fails
      generationsOverTime = []
    }

    return NextResponse.json({
      totalGenerations,
      totalUsers,
      blockedUsers,
      recentGenerations,
      generationsByStatus,
      generationsOverTime,
    })
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      // Log the actual error message for debugging
      console.error("Error details:", error.message, error.stack)
    }
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}

