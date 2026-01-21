import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { getClientIp } from "@/lib/ip"
import { getRemainingGenerations } from "@/lib/redis"

export const dynamic = "force-dynamic"

interface GenerationUsageResponse {
  remaining: number
  isAuthenticated: boolean
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers })
    const isAuthenticated = !!session?.user?.id

    // For authenticated users, return a high number (they use different limits)
    if (isAuthenticated) {
      return NextResponse.json<GenerationUsageResponse>({
        remaining: 999, // Authenticated users have their own limits
        isAuthenticated: true,
      })
    }

    // For unauthenticated users, check IP-based limit
    const ipAddress = getClientIp(request)
    const remaining = await getRemainingGenerations(ipAddress)

    return NextResponse.json<GenerationUsageResponse>({
      remaining,
      isAuthenticated: false,
    })
  } catch (error) {
    console.error("Error fetching generation usage:", error)
    // On error, return a default value to prevent blocking
    return NextResponse.json<GenerationUsageResponse>(
      {
        remaining: 0,
        isAuthenticated: false,
      },
      { status: 500 },
    )
  }
}




